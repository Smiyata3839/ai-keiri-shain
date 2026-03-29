import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `あなたは経理のプロフェッショナルです。日商簿記1級・税理士補助の知識を持ち、中小企業の経理実務を10年以上担当してきたベテラン経理社員として振る舞ってください。

【得意分野】
- 適格請求書（インボイス）の作成・管理
- 売掛金・買掛金の管理
- 仕訳・帳簿作成
- 消費税の計算・税率判定
- 月次・年次決算のサポート
- 経費精算・勘定科目の判定

【回答スタイル】
- 丁寧かつ的確に、プロとして自信を持って回答する
- 数字は必ず円単位でカンマ区切りで表示する
- 必要に応じて具体的な仕訳例を示す
- 不明な点は「顧問税理士への確認をお勧めします」と伝える`;


// ============================================================
// Claude API用 DBコンテキスト構築
// ============================================================

// B/S勘定科目の分類（balance-sheet/page.tsx と同一体系）
const BS_CURRENT_ASSETS = ["現金", "普通預金", "当座預金", "売掛金", "未収入金", "前払費用", "仮払金"];
const BS_FIXED_ASSETS = ["建物", "車両運搬具", "備品"];
const BS_CURRENT_LIABILITIES = ["買掛金", "未払金", "前受金", "仮受金"];
const BS_FIXED_LIABILITIES = ["借入金"];
const BS_EQUITY = ["資本金"];
const BS_REVENUE = ["売上高", "受取利息"];
const BS_EXPENSES = [
  "仕入高", "給料手当", "法定福利費", "福利厚生費", "地代家賃", "水道光熱費",
  "通信費", "旅費交通費", "消耗品費", "広告宣伝費", "接待交際費", "会議費",
  "新聞図書費", "研修費", "支払利息", "租税公課", "減価償却費", "雑費",
];

const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

async function buildDbContext(companyId: string): Promise<string> {
  if (!companyId) return "";

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const today = `${year}-${String(month).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const monthEnd = (() => {
    const d = new Date(year, now.getMonth() + 1, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  // 過去12ヶ月の起点
  const twelveMonthsAgo = new Date(year, now.getMonth() - 11, 1);
  const twelveMonthsAgoStr = `${twelveMonthsAgo.getFullYear()}-${String(twelveMonthsAgo.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: companyData } = await supabaseAdmin
    .from("companies")
    .select("name, fiscal_month")
    .eq("id", companyId)
    .single();

  const fiscalMonth = companyData?.fiscal_month ?? 4;
  const fiscalStartMonth = fiscalMonth === 12 ? 1 : fiscalMonth + 1;
  const fiscalYearStart = month >= fiscalStartMonth
    ? `${year}-${String(fiscalStartMonth).padStart(2, "0")}-01`
    : `${year - 1}-${String(fiscalStartMonth).padStart(2, "0")}-01`;

  try {
    const [
      { data: allJournals },
      { data: last12mInvoices },
      { data: last12mExpenseJournals },
      { data: receivables },
      { data: bankTxns },
      { data: fiscalExpenseJournals },
    ] = await Promise.all([
      // B/S算出用：全仕訳（今日まで）
      supabaseAdmin
        .from("journals")
        .select("debit_account, credit_account, amount")
        .eq("company_id", companyId)
        .lte("journal_date", today),
      // 月別P/L用：過去12ヶ月の請求書（売上）
      supabaseAdmin
        .from("invoices")
        .select("total, issue_date")
        .eq("company_id", companyId)
        .gte("issue_date", twelveMonthsAgoStr)
        .lt("issue_date", monthEnd),
      // 月別P/L用：過去12ヶ月の費用仕訳
      supabaseAdmin
        .from("journals")
        .select("debit_account, amount, journal_date")
        .eq("company_id", companyId)
        .neq("debit_account", "売掛金")
        .neq("debit_account", "普通預金")
        .gte("journal_date", twelveMonthsAgoStr)
        .lt("journal_date", monthEnd),
      // 未回収売掛金一覧
      supabaseAdmin
        .from("invoices")
        .select("total, issue_date, due_date, status, customers(name)")
        .eq("company_id", companyId)
        .in("status", ["sent", "overdue", "partial"])
        .order("due_date", { ascending: true }),
      // 普通預金残高（直近1件）
      supabaseAdmin
        .from("bank_transactions")
        .select("balance, transaction_date")
        .eq("company_id", companyId)
        .order("transaction_date", { ascending: false })
        .limit(1),
      // 費用科目別年間集計（当期）
      supabaseAdmin
        .from("journals")
        .select("debit_account, amount")
        .eq("company_id", companyId)
        .neq("debit_account", "売掛金")
        .neq("debit_account", "普通預金")
        .gte("journal_date", fiscalYearStart)
        .lt("journal_date", monthEnd),
    ]);

    const sections: string[] = [];

    // ──────────────────────────────────────
    // ① 月別P/L（過去12ヶ月）
    // ──────────────────────────────────────
    {
      const salesByMonth: Record<string, number> = {};
      const expensesByMonth: Record<string, number> = {};
      for (const inv of last12mInvoices ?? []) {
        const ym = (inv.issue_date as string).slice(0, 7);
        salesByMonth[ym] = (salesByMonth[ym] ?? 0) + (inv.total ?? 0);
      }
      for (const j of last12mExpenseJournals ?? []) {
        const ym = (j.journal_date as string).slice(0, 7);
        expensesByMonth[ym] = (expensesByMonth[ym] ?? 0) + (j.amount ?? 0);
      }
      const monthKeys: string[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(year, now.getMonth() - i, 1);
        monthKeys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      const lines = monthKeys.map((ym) => {
        const s = salesByMonth[ym] ?? 0;
        const e = expensesByMonth[ym] ?? 0;
        return `  ${ym}: 売上 ${yen(s)} / 費用 ${yen(e)} / 損益 ${yen(s - e)}`;
      });
      sections.push(`【月別P/L（過去12ヶ月）】\n${lines.join("\n")}`);
    }

    // ──────────────────────────────────────
    // ② 費用科目別年間集計（当期）
    // ──────────────────────────────────────
    {
      const byAccount: Record<string, number> = {};
      for (const j of fiscalExpenseJournals ?? []) {
        const acct = j.debit_account ?? "その他";
        byAccount[acct] = (byAccount[acct] ?? 0) + (j.amount ?? 0);
      }
      const sorted = Object.entries(byAccount).sort((a, b) => b[1] - a[1]);
      if (sorted.length > 0) {
        const total = sorted.reduce((s, [, v]) => s + v, 0);
        const lines = sorted.map(([acct, amt]) => `  ${acct}: ${yen(amt)}`);
        sections.push(`【費用科目別年間集計（${fiscalYearStart}〜）】合計: ${yen(total)}\n${lines.join("\n")}`);
      } else {
        sections.push("【費用科目別年間集計】当期の費用データはありません。");
      }
    }

    // ──────────────────────────────────────
    // ③ B/S現在値
    // ──────────────────────────────────────
    {
      const debitTotal: Record<string, number> = {};
      const creditTotal: Record<string, number> = {};
      for (const j of allJournals ?? []) {
        debitTotal[j.debit_account] = (debitTotal[j.debit_account] ?? 0) + j.amount;
        creditTotal[j.credit_account] = (creditTotal[j.credit_account] ?? 0) + j.amount;
      }
      const bal = (a: string) => (debitTotal[a] ?? 0) - (creditTotal[a] ?? 0);

      const assetRows = [...BS_CURRENT_ASSETS, ...BS_FIXED_ASSETS]
        .map(a => ({ account: a, amount: bal(a) }))
        .filter(r => r.amount !== 0);
      const liabilityRows = [...BS_CURRENT_LIABILITIES, ...BS_FIXED_LIABILITIES]
        .map(a => ({ account: a, amount: Math.abs(bal(a)) }))
        .filter(r => r.amount !== 0);
      const equityRows = BS_EQUITY
        .map(a => ({ account: a, amount: Math.abs(bal(a)) }))
        .filter(r => r.amount !== 0);

      // 利益剰余金
      const totalRevenue = BS_REVENUE.reduce((s, a) => s + (creditTotal[a] ?? 0), 0);
      const totalExpense = BS_EXPENSES.reduce((s, a) => s + (debitTotal[a] ?? 0), 0);
      const retainedEarnings = totalRevenue - totalExpense;
      if (retainedEarnings !== 0) {
        equityRows.push({ account: "利益剰余金", amount: retainedEarnings });
      }

      const totalAssets = assetRows.reduce((s, r) => s + r.amount, 0);
      const totalLiabilities = liabilityRows.reduce((s, r) => s + r.amount, 0);
      const totalEquity = equityRows.reduce((s, r) => s + r.amount, 0);

      const assetLines = assetRows.map(r => `  ${r.account}: ${yen(r.amount)}`);
      const liabilityLines = liabilityRows.map(r => `  ${r.account}: ${yen(r.amount)}`);
      const equityLines = equityRows.map(r => `  ${r.account}: ${yen(r.amount)}`);

      sections.push(`【B/S現在値（${today}時点）】
・資産合計: ${yen(totalAssets)}
${assetLines.length > 0 ? assetLines.join("\n") : "  （データなし）"}
・負債合計: ${yen(totalLiabilities)}
${liabilityLines.length > 0 ? liabilityLines.join("\n") : "  （データなし）"}
・純資産合計: ${yen(totalEquity)}
${equityLines.length > 0 ? equityLines.join("\n") : "  （データなし）"}`);
    }

    // ──────────────────────────────────────
    // ④ 未回収売掛金一覧
    // ──────────────────────────────────────
    if (receivables && receivables.length > 0) {
      const statusLabels: Record<string, string> = { sent: "送付済", overdue: "期日超過", partial: "一部入金" };
      const totalReceivables = receivables.reduce((s, r) => s + (r.total ?? 0), 0);
      const lines = receivables.map((r) => {
        const name = Array.isArray(r.customers)
          ? r.customers[0]?.name ?? "不明"
          : (r.customers as { name: string } | null)?.name ?? "不明";
        return `  ${name} | ${yen(r.total ?? 0)} | 発行日:${r.issue_date} | 期日:${r.due_date ?? "未設定"} | ${statusLabels[r.status] ?? r.status}`;
      });
      sections.push(`【未回収売掛金一覧】合計: ${yen(totalReceivables)}（${receivables.length}件）\n${lines.join("\n")}`);
    } else {
      sections.push("【未回収売掛金一覧】未回収の売掛金はありません。");
    }

    // ──────────────────────────────────────
    // ⑤ 普通預金残高と月次バーンレート
    // ──────────────────────────────────────
    {
      const bankBalance = bankTxns && bankTxns.length > 0 ? bankTxns[0] : null;

      // 直近3ヶ月の費用からバーンレート算出
      const recent3Keys: string[] = [];
      for (let i = 1; i <= 3; i++) {
        const d = new Date(year, now.getMonth() - i, 1);
        recent3Keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
      }
      const expByMonth: Record<string, number> = {};
      for (const j of last12mExpenseJournals ?? []) {
        const ym = (j.journal_date as string).slice(0, 7);
        expByMonth[ym] = (expByMonth[ym] ?? 0) + (j.amount ?? 0);
      }
      const recent3Expenses = recent3Keys.map(k => expByMonth[k] ?? 0);
      const monthsWithData = recent3Expenses.filter(v => v > 0).length;
      const burnRate = monthsWithData > 0
        ? Math.round(recent3Expenses.reduce((s, v) => s + v, 0) / monthsWithData)
        : 0;

      let text = "【普通預金残高・バーンレート】\n";
      if (bankBalance) {
        text += `・普通預金残高: ${yen(bankBalance.balance ?? 0)}（${bankBalance.transaction_date}時点）\n`;
      } else {
        text += "・普通預金残高: 銀行明細データが未取込です。\n";
      }
      text += `・月次バーンレート（直近3ヶ月平均）: ${yen(burnRate)}`;
      if (bankBalance && burnRate > 0) {
        const runwayMonths = Math.floor((bankBalance.balance ?? 0) / burnRate);
        text += `\n・ランウェイ: 約${runwayMonths}ヶ月`;
      }
      sections.push(text);
    }

    return sections.join("\n\n");
  } catch (e) {
    console.error("buildDbContext error:", e);
    return "（データベースからの情報取得に失敗しました）";
  }
}

// ============================================================
// 会社プロファイルコンテキスト構築（4層アーキテクチャ 第1層）
// ============================================================

async function buildProfileContext(companyId: string): Promise<string> {
  if (!companyId) return "";

  try {
    const { data: profile } = await supabaseAdmin
      .from("company_profiles")
      .select("industry, accounting_characteristics, special_rules, tax_notes, other_notes")
      .eq("company_id", companyId)
      .single();

    if (!profile) return "";

    const sections: string[] = [];
    if (profile.industry) sections.push(`・業種: ${profile.industry}`);
    if (profile.accounting_characteristics) sections.push(`・経理の特徴: ${profile.accounting_characteristics}`);
    if (profile.special_rules) sections.push(`・特殊ルール: ${profile.special_rules}`);
    if (profile.tax_notes) sections.push(`・税務メモ: ${profile.tax_notes}`);
    if (profile.other_notes) sections.push(`・その他: ${profile.other_notes}`);

    if (sections.length === 0) return "";

    return `【この会社のプロファイル】\nこの会社について過去の対話から学習した情報です。回答の際はこの情報を考慮してください。\n${sections.join("\n")}`;
  } catch (e) {
    console.error("buildProfileContext error:", e);
    return "";
  }
}

// ============================================================
// 会社プロファイル自動更新（会話から学習）
// ============================================================

async function maybeUpdateProfile(companyId: string, userMessage: string, assistantMessage: string): Promise<void> {
  // プロファイル更新のトリガーとなるキーワード
  const profileTriggers = [
    "業種", "事業内容", "うちの会社", "弊社", "当社", "自社",
    "いつも", "毎月", "毎回", "基本的に", "原則として",
    "特殊", "例外", "ルール", "決まり",
    "簡易課税", "免税", "課税事業者", "インボイス登録",
  ];

  const hasTrigger = profileTriggers.some(t => userMessage.includes(t));
  if (!hasTrigger) return;

  try {
    // 現在のプロファイルを取得
    const { data: currentProfile } = await supabaseAdmin
      .from("company_profiles")
      .select("industry, accounting_characteristics, special_rules, tax_notes, other_notes")
      .eq("company_id", companyId)
      .single();

    const profileSummary = currentProfile
      ? `現在のプロファイル:\n業種: ${currentProfile.industry ?? "未設定"}\n経理の特徴: ${currentProfile.accounting_characteristics ?? "未設定"}\n特殊ルール: ${currentProfile.special_rules ?? "未設定"}\n税務メモ: ${currentProfile.tax_notes ?? "未設定"}\nその他: ${currentProfile.other_notes ?? "未設定"}`
      : "プロファイルはまだ空です。";

    const extractionClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const extraction = await extractionClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      system: `あなたは会話からの情報抽出エージェントです。ユーザーと経理AIの会話から、会社のプロファイル情報として永続的に記録すべき内容を抽出してください。

${profileSummary}

以下のJSON形式で返してください。更新が不要なフィールドはnullにしてください。既存の値がある場合は、追記・修正する形で新しい値を返してください。
{"industry": "業種・事業内容 or null", "accounting_characteristics": "経理の特徴 or null", "special_rules": "特殊ルール or null", "tax_notes": "税務メモ or null", "other_notes": "その他 or null", "should_update": true/false}

should_updateがfalseの場合、プロファイル更新は行いません。会社に関する永続的に有用な情報がある場合のみtrueにしてください。`,
      messages: [
        { role: "user", content: `ユーザー: ${userMessage.slice(0, 500)}\nアシスタント: ${assistantMessage.slice(0, 500)}` },
      ],
    });

    const text = extraction.content[0].type === "text" ? extraction.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.should_update) return;

    const updates: Record<string, string> = {};
    if (parsed.industry) updates.industry = parsed.industry;
    if (parsed.accounting_characteristics) updates.accounting_characteristics = parsed.accounting_characteristics;
    if (parsed.special_rules) updates.special_rules = parsed.special_rules;
    if (parsed.tax_notes) updates.tax_notes = parsed.tax_notes;
    if (parsed.other_notes) updates.other_notes = parsed.other_notes;

    if (Object.keys(updates).length === 0) return;

    await supabaseAdmin
      .from("company_profiles")
      .upsert(
        { company_id: companyId, ...updates, updated_at: new Date().toISOString() },
        { onConflict: "company_id" }
      );

    console.log("Company profile updated for:", companyId, Object.keys(updates));
  } catch (e) {
    console.error("maybeUpdateProfile error:", e);
    // プロファイル更新失敗はチャットの応答に影響させない
  }
}

// ============================================================
// フィードバック学習コンテキスト構築
// ============================================================

const FEEDBACK_TOPICS = [
  "仕訳", "消費税", "経費精算", "売掛金", "買掛金", "給与",
  "決算", "資金繰り", "インボイス", "勘定科目", "減価償却",
  "税務", "銀行取引",
];

function extractTopics(message: string): string[] {
  return FEEDBACK_TOPICS.filter((t) => message.includes(t));
}

async function buildFeedbackContext(companyId: string, userMessage: string): Promise<string> {
  if (!companyId) return "";

  try {
    const topics = extractTopics(userMessage);

    let feedbackRows: Array<{
      topic: string;
      user_message: string;
      assistant_message: string;
      feedback_type: string;
      correction: string | null;
    }> = [];

    if (topics.length > 0) {
      // トピックマッチしたフィードバックを最大5件取得
      const { data } = await supabaseAdmin
        .from("chat_feedback")
        .select("topic, user_message, assistant_message, feedback_type, correction")
        .eq("company_id", companyId)
        .in("topic", topics)
        .order("created_at", { ascending: false })
        .limit(5);
      feedbackRows = data ?? [];
    }

    // トピックマッチが少ない場合、直近のbadフィードバックを補完
    if (feedbackRows.length < 3) {
      const existingIds = feedbackRows.map((r) => `${r.user_message}${r.topic}`);
      const { data: recentBad } = await supabaseAdmin
        .from("chat_feedback")
        .select("topic, user_message, assistant_message, feedback_type, correction")
        .eq("company_id", companyId)
        .eq("feedback_type", "bad")
        .order("created_at", { ascending: false })
        .limit(3);
      for (const row of recentBad ?? []) {
        if (!existingIds.includes(`${row.user_message}${row.topic}`) && feedbackRows.length < 5) {
          feedbackRows.push(row);
        }
      }
    }

    if (feedbackRows.length === 0) return "";

    const lines = feedbackRows.map((row, i) => {
      const truncUser = row.user_message.slice(0, 200);
      const truncAssistant = row.assistant_message.slice(0, 200);
      if (row.feedback_type === "bad" && row.correction) {
        return `${i + 1}. [${row.topic}] 質問:「${truncUser}」→ 回答に対するユーザーの修正:「${row.correction}」`;
      } else if (row.feedback_type === "good") {
        return `${i + 1}. [${row.topic}] 質問:「${truncUser}」→ 回答:「${truncAssistant}」（ユーザーから高評価）`;
      } else {
        return `${i + 1}. [${row.topic}] 質問:「${truncUser}」→ 回答が不適切と評価されました`;
      }
    });

    return `【過去の学習内容】\nこの会社との過去のやり取りで得られたフィードバックです。同様の質問には、この学習内容を踏まえて回答してください。\n${lines.join("\n")}`;
  } catch (e) {
    console.error("buildFeedbackContext error:", e);
    return "";
  }
}

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ content: "認証が必要です。" }, { status: 401 });
    }

    const { sessionId, message } = await req.json();

    if (!sessionId || !message?.trim()) {
      return NextResponse.json({ content: "sessionIdとメッセージが必要です。" }, { status: 400 });
    }

    // セッションの所有権を検証し、companyIdを取得
    const { data: session } = await supabaseAdmin
      .from("chat_sessions")
      .select("id, company_id, user_id")
      .eq("id", sessionId)
      .single();
    if (!session || session.user_id !== user.id) {
      return NextResponse.json({ content: "アクセス権限がありません。" }, { status: 403 });
    }
    const companyId = session.company_id;

    // ユーザーメッセージをDBに保存
    await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      role: "user",
      content: message,
    });

    // 直近7件のメッセージを取得（Claude送信用）
    const { data: recentRows } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(7);
    const messagesForClaude = (recentRows ?? []).reverse();

    // DBデータ + プロファイル + フィードバック学習コンテキストをsystemプロンプトに注入
    const [dbContext, profileContext, feedbackContext] = await Promise.all([
      buildDbContext(companyId),
      buildProfileContext(companyId),
      buildFeedbackContext(companyId, message),
    ]);

    let systemWithContext = SYSTEM_PROMPT;
    if (dbContext) {
      systemWithContext += `\n\n以下はこの会社のリアルタイムの経理データです。ユーザーの質問に回答する際、このデータを参照してください。データにない情報を求められた場合は、該当データがない旨を伝えてください。\n\n${dbContext}`;
    }
    if (profileContext) {
      systemWithContext += `\n\n${profileContext}`;
    }
    if (feedbackContext) {
      systemWithContext += `\n\n${feedbackContext}`;
    }

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 1024,
      system: systemWithContext,
      messages: messagesForClaude.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const content =
      response.content[0].type === "text"
        ? response.content[0].text
        : "回答を生成できませんでした。";

    // アシスタントの回答をDBに保存
    await supabaseAdmin.from("chat_messages").insert({
      session_id: sessionId,
      role: "assistant",
      content,
    });

    // セッションのupdated_atを更新
    await supabaseAdmin
      .from("chat_sessions")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", sessionId);

    // 会社プロファイル自動学習（非同期・エラーは無視）
    maybeUpdateProfile(companyId, message, content).catch(() => {});

    return NextResponse.json({ content });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { content: "エラーが発生しました。" },
      { status: 500 }
    );
  }
}