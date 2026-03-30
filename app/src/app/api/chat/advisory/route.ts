import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM_PROMPT = `あなたは経理のプロフェッショナルであり、中小企業の経営アドバイザーでもあります。日商簿記1級・税理士補助の知識を持ち、中小企業の経理実務を10年以上担当してきたベテラン経理社員として振る舞ってください。

【得意分野】
- 適格請求書（インボイス）の作成・管理
- 売掛金・買掛金の管理
- 仕訳・帳簿作成
- 消費税の計算・税率判定
- 月次・年次決算のサポート
- 経費精算・勘定科目の判定
- 財務分析・経営診断・戦略立案

【回答スタイル】
- 丁寧かつ的確に、プロとして自信を持って回答する
- 数字は必ず円単位でカンマ区切りで表示する
- 必要に応じて具体的な仕訳例を示す
- 不明な点は「顧問税理士への確認をお勧めします」と伝える`;

const ADVISORY_PROMPT = `
あなたは今、経営診断・戦略立案モードで動作しています。
以下のフローに従って、2段階で分析・アドバイスを行ってください。

【第1段階：財務診断】
提供された財務データから以下を算出・評価してください：
- 収益性：粗利率、営業利益率、ROE（可能な場合）
- 安全性：流動比率、自己資本比率
- 効率性：総資産回転率、売上増加率（前期比）
- BEP分析：固定費・変動費を推定し損益分岐点を算出

数値の評価は業界平均（業種から推定）と比較し、以下でラベリングしてください：
✅ 良好 / ⚠️ 要注意 / 🔴 緊急課題

最後に「最重要経営課題」を1つ、問題文として言語化してください。

【第2段階：戦略立案】
第1段階の課題を起点に：
- SWOT分析：財務データ・会社プロファイルから強み弱みを抽出
- 3C分析：業種・市場トレンドから顧客・競合・自社を分析
- PPM / 5F分析：必要に応じて業界構造・事業構造を補足

最終的に「経営アクションプラン」として：
- 優先施策3つ以内（具体的な数値目標付き）
- 次の一手（今月中にできるアクション）
を提示してください。

【重要な制約】
- 経営者タイプに合わせてトーンを変える
  - 直感型(N)：結論ファースト、数字は補足
  - 分析型(A)：データと根拠を先に、結論は後
  - 拡大型(E)：成長機会にフォーカス
  - 安定型(S)：リスク管理と安全性にフォーカス
- 推定値は必ず「推定」と明示する
- 会社プロファイルの特殊ルール・業種を必ず加味する
- phaseが"diagnosis"の場合は第1段階のみ実行し、最後に「第2段階の戦略分析に進みますか？」と確認する
- phaseが"strategy"の場合は第2段階のみ実行する
- phaseが"full"の場合は第1段階→第2段階を連続で実行する
`;

// ============================================================
// B/S勘定科目の分類
// ============================================================
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

// ============================================================
// DBコンテキスト構築（既存chat/route.tsと同一ロジック）
// ============================================================
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
      supabaseAdmin
        .from("journals")
        .select("debit_account, credit_account, amount")
        .eq("company_id", companyId)
        .lte("journal_date", today),
      supabaseAdmin
        .from("invoices")
        .select("total, issue_date")
        .eq("company_id", companyId)
        .gte("issue_date", twelveMonthsAgoStr)
        .lt("issue_date", monthEnd),
      supabaseAdmin
        .from("journals")
        .select("debit_account, amount, journal_date")
        .eq("company_id", companyId)
        .neq("debit_account", "売掛金")
        .neq("debit_account", "普通預金")
        .gte("journal_date", twelveMonthsAgoStr)
        .lt("journal_date", monthEnd),
      supabaseAdmin
        .from("invoices")
        .select("total, issue_date, due_date, status, customers(name)")
        .eq("company_id", companyId)
        .in("status", ["sent", "overdue", "partial"])
        .order("due_date", { ascending: true }),
      supabaseAdmin
        .from("bank_transactions")
        .select("balance, transaction_date")
        .eq("company_id", companyId)
        .order("transaction_date", { ascending: false })
        .limit(1),
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

    // ① 月別P/L（過去12ヶ月）
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

    // ② 費用科目別年間集計（当期）
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

    // ③ B/S現在値
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

    // ④ 未回収売掛金一覧
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

    // ⑤ 普通預金残高と月次バーンレート
    {
      const bankBalance = bankTxns && bankTxns.length > 0 ? bankTxns[0] : null;
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
// コンテキスト構築ヘルパー群
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

async function buildOwnerContext(companyId: string): Promise<string> {
  if (!companyId) return "";
  try {
    const { data: profile } = await supabaseAdmin
      .from("owner_profiles")
      .select("owner_type, diagnosis_summary, strengths, risk_points, communication_style")
      .eq("company_id", companyId)
      .single();
    if (!profile || !profile.owner_type) return "";
    return `【経営者タイプ診断結果】
・タイプ: ${profile.owner_type}
・特徴: ${profile.diagnosis_summary}
・強み: ${profile.strengths}
・注意点: ${profile.risk_points}

【コミュニケーション指針】
${profile.communication_style}

上記の経営者タイプに寄り添い、コミュニケーション指針に従ったトーンで回答してください。この経営者の強みを活かし、注意点をカバーする提案を心がけてください。`;
  } catch (e) {
    console.error("buildOwnerContext error:", e);
    return "";
  }
}

async function buildAnnualContext(companyId: string): Promise<string> {
  if (!companyId) return "";
  try {
    const { data: summaries } = await supabaseAdmin
      .from("annual_summaries")
      .select("fiscal_year, financial_summary, chat_insights, key_decisions, owner_type_evaluation")
      .eq("company_id", companyId)
      .order("fiscal_year", { ascending: false })
      .limit(3);
    if (!summaries || summaries.length === 0) return "";
    const sections = summaries.map((s) => {
      const parts = [`■ ${s.fiscal_year}年度`];
      if (s.financial_summary) parts.push(`財務: ${s.financial_summary}`);
      if (s.key_decisions) parts.push(`重要決定: ${s.key_decisions}`);
      if (s.chat_insights) parts.push(`学び: ${s.chat_insights}`);
      return parts.join("\n");
    });
    return `【過去の年次要約】\n過去の年度の記録です。同様の季節的な質問や決算対応の際は、この経験を踏まえて回答してください。\n\n${sections.join("\n\n")}`;
  } catch (e) {
    console.error("buildAnnualContext error:", e);
    return "";
  }
}

async function buildMonthlyContext(companyId: string): Promise<string> {
  if (!companyId) return "";
  try {
    const { data: summaries } = await supabaseAdmin
      .from("monthly_summaries")
      .select("year_month, detail_level, financial_summary, chat_insights, action_items")
      .eq("company_id", companyId)
      .order("year_month", { ascending: false })
      .limit(3);
    if (!summaries || summaries.length === 0) return "";
    const sections = summaries.map((s) => {
      const levelLabel = s.detail_level === "full" ? "" : s.detail_level === "condensed" ? "（要約）" : "（概要）";
      const parts = [`■ ${s.year_month}${levelLabel}`];
      if (s.financial_summary) parts.push(`財務: ${s.financial_summary}`);
      if (s.chat_insights) parts.push(`学び: ${s.chat_insights}`);
      if (s.action_items) parts.push(`要注意: ${s.action_items}`);
      return parts.join("\n");
    });
    return `【直近の月次要約】\n直近数ヶ月の記録です。継続中の課題やアクションアイテムがあれば、フォローアップしてください。\n\n${sections.join("\n\n")}`;
  } catch (e) {
    console.error("buildMonthlyContext error:", e);
    return "";
  }
}

// ============================================================
// POST handler
// ============================================================

export async function POST(req: NextRequest) {
  try {
    // 認証チェック
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ content: "認証が必要です。" }, { status: 401 });
    }

    const { sessionId, message, phase = "diagnosis" } = await req.json();

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

    // コンテキストを並列取得
    const [dbContext, profileContext, ownerContext, annualContext, monthlyContext] = await Promise.all([
      buildDbContext(companyId),
      buildProfileContext(companyId),
      buildOwnerContext(companyId),
      buildAnnualContext(companyId),
      buildMonthlyContext(companyId),
    ]);

    // システムプロンプト組み立て
    let systemWithContext = BASE_SYSTEM_PROMPT;
    if (dbContext) {
      systemWithContext += `\n\n以下はこの会社のリアルタイムの経理データです。経営診断に活用してください。\n\n${dbContext}`;
    }
    if (profileContext) {
      systemWithContext += `\n\n${profileContext}`;
    }
    if (ownerContext) {
      systemWithContext += `\n\n${ownerContext}`;
    }
    if (annualContext) {
      systemWithContext += `\n\n${annualContext}`;
    }
    if (monthlyContext) {
      systemWithContext += `\n\n${monthlyContext}`;
    }

    // 経営アドバイスプロンプトを追加（phase情報付き）
    systemWithContext += `\n\n${ADVISORY_PROMPT}\n\n現在のphase: "${phase}"`;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 8192,
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

    return NextResponse.json({ content, phase });
  } catch (error) {
    console.error("Advisory API error:", error);
    return NextResponse.json(
      { content: "エラーが発生しました。" },
      { status: 500 }
    );
  }
}
