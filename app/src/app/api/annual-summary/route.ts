import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

// 指定年度の財務データを収集
async function collectFinancialData(companyId: string, fiscalYear: number, fiscalStartMonth: number) {
  const startYear = fiscalStartMonth === 1 ? fiscalYear : fiscalYear - 1;
  const endYear = fiscalStartMonth === 1 ? fiscalYear : fiscalYear;
  const fiscalStart = `${startYear}-${String(fiscalStartMonth).padStart(2, "0")}-01`;
  const fiscalEnd = `${endYear + (fiscalStartMonth === 1 ? 1 : 0)}-${String(fiscalStartMonth).padStart(2, "0")}-01`;

  const [
    { data: invoices },
    { data: expenses },
    { data: allJournals },
  ] = await Promise.all([
    supabaseAdmin.from("invoices").select("total, issue_date").eq("company_id", companyId)
      .gte("issue_date", fiscalStart).lt("issue_date", fiscalEnd),
    supabaseAdmin.from("journals").select("debit_account, amount, journal_date").eq("company_id", companyId)
      .neq("debit_account", "売掛金").neq("debit_account", "普通預金")
      .gte("journal_date", fiscalStart).lt("journal_date", fiscalEnd),
    supabaseAdmin.from("journals").select("debit_account, credit_account, amount").eq("company_id", companyId)
      .gte("journal_date", fiscalStart).lt("journal_date", fiscalEnd),
  ]);

  // 月別売上・費用
  const salesByMonth: Record<string, number> = {};
  const expensesByMonth: Record<string, number> = {};
  for (const inv of invoices ?? []) {
    const ym = (inv.issue_date as string).slice(0, 7);
    salesByMonth[ym] = (salesByMonth[ym] ?? 0) + (inv.total ?? 0);
  }
  for (const j of expenses ?? []) {
    const ym = (j.journal_date as string).slice(0, 7);
    expensesByMonth[ym] = (expensesByMonth[ym] ?? 0) + (j.amount ?? 0);
  }

  // 費用科目別
  const expenseByAccount: Record<string, number> = {};
  for (const j of expenses ?? []) {
    const acct = j.debit_account ?? "その他";
    expenseByAccount[acct] = (expenseByAccount[acct] ?? 0) + (j.amount ?? 0);
  }

  const totalSales = Object.values(salesByMonth).reduce((s, v) => s + v, 0);
  const totalExpenses = Object.values(expensesByMonth).reduce((s, v) => s + v, 0);

  // 月別推移テキスト
  const monthlyLines = Object.keys({ ...salesByMonth, ...expensesByMonth }).sort().map(ym => {
    const s = salesByMonth[ym] ?? 0;
    const e = expensesByMonth[ym] ?? 0;
    return `${ym}: 売上${yen(s)} / 費用${yen(e)} / 損益${yen(s - e)}`;
  });

  const expenseLines = Object.entries(expenseByAccount)
    .sort((a, b) => b[1] - a[1])
    .map(([acct, amt]) => `${acct}: ${yen(amt)}`);

  return {
    totalSales,
    totalExpenses,
    profit: totalSales - totalExpenses,
    profitRate: totalSales > 0 ? ((totalSales - totalExpenses) / totalSales * 100).toFixed(1) : "0",
    monthlyLines,
    expenseLines,
  };
}

// 指定年度のチャット履歴を収集
async function collectChatHistory(companyId: string, fiscalYear: number, fiscalStartMonth: number) {
  const startYear = fiscalStartMonth === 1 ? fiscalYear : fiscalYear - 1;
  const endYear = fiscalStartMonth === 1 ? fiscalYear : fiscalYear;
  const fiscalStart = `${startYear}-${String(fiscalStartMonth).padStart(2, "0")}-01`;
  const fiscalEnd = `${endYear + (fiscalStartMonth === 1 ? 1 : 0)}-${String(fiscalStartMonth).padStart(2, "0")}-01`;

  // この年度のセッションを取得
  const { data: sessions } = await supabaseAdmin
    .from("chat_sessions")
    .select("id")
    .eq("company_id", companyId)
    .gte("created_at", fiscalStart)
    .lt("created_at", fiscalEnd);

  if (!sessions || sessions.length === 0) return "この年度のチャット履歴はありません。";

  const sessionIds = sessions.map(s => s.id);

  // 各セッションから代表的なメッセージを取得（最大100件）
  const { data: messages } = await supabaseAdmin
    .from("chat_messages")
    .select("role, content, created_at")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true })
    .limit(100);

  if (!messages || messages.length === 0) return "この年度のチャット履歴はありません。";

  return messages.map(m => `[${m.role}] ${m.content.slice(0, 200)}`).join("\n");
}

// 年次要約を生成
async function generateAnnualSummary(
  companyId: string,
  fiscalYear: number,
  fiscalStartMonth: number,
  companyName: string,
) {
  const [financial, chatHistory] = await Promise.all([
    collectFinancialData(companyId, fiscalYear, fiscalStartMonth),
    collectChatHistory(companyId, fiscalYear, fiscalStartMonth),
  ]);

  // 経営者タイプを取得
  const { data: ownerProfile } = await supabaseAdmin
    .from("owner_profiles")
    .select("owner_type, diagnosis_summary, communication_style")
    .eq("company_id", companyId)
    .single();

  const ownerInfo = ownerProfile
    ? `経営者タイプ: ${ownerProfile.owner_type}\n特徴: ${ownerProfile.diagnosis_summary}`
    : "経営者タイプ: 未診断";

  const aiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const result = await aiClient.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    system: `あなたは経理コンサルタントです。1年間の財務データとチャット履歴から、年次要約を作成してください。

以下のJSON形式で返してください:
{
  "financial_summary": "年間の財務実績の要約（売上・費用・利益の推移、特徴的な傾向、前年比較が可能なら比較）。5-8文程度。",
  "chat_insights": "チャット履歴から読み取れた重要な対応・判断・問題解決の記録。経理として来年度に活かすべきポイント。箇条書き3-5点。",
  "key_decisions": "この年度で行われた重要な経営・経理上の決定事項。例外的な処理や特殊な仕訳があれば記録。箇条書き3-5点。",
  "owner_type_evaluation": "経営者タイプに照らした1年間の評価。タイプの強みが活きた場面、注意点が顕在化した場面を具体的に。3-5文。"
}`,
    messages: [
      {
        role: "user",
        content: `【会社名】${companyName}
【年度】${fiscalYear}年度
【${ownerInfo}】

【年間財務データ】
年間合計: 売上${yen(financial.totalSales)} / 費用${yen(financial.totalExpenses)} / 利益${yen(financial.profit)}（利益率${financial.profitRate}%）

月別推移:
${financial.monthlyLines.join("\n")}

費用科目別:
${financial.expenseLines.join("\n")}

【チャット履歴（抜粋）】
${chatHistory}`,
      },
    ],
  });

  const text = result.content[0].type === "text" ? result.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  return JSON.parse(jsonMatch[0]);
}

// GET: 年次要約一覧を取得
export async function GET() {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const { data: company } = await supabaseAdmin
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) {
      return NextResponse.json({ error: "会社が見つかりません。" }, { status: 404 });
    }

    const { data: summaries } = await supabaseAdmin
      .from("annual_summaries")
      .select("*")
      .eq("company_id", company.id)
      .order("fiscal_year", { ascending: false });

    return NextResponse.json({ summaries: summaries ?? [] });
  } catch (error) {
    console.error("GET annual-summary error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}

// POST: 指定年度の年次要約を生成
export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const { data: company } = await supabaseAdmin
      .from("companies").select("id, name, fiscal_month").eq("user_id", user.id).single();
    if (!company) {
      return NextResponse.json({ error: "会社が見つかりません。" }, { status: 404 });
    }

    const body = await req.json();
    const fiscalYear = body.fiscal_year;
    if (!fiscalYear) {
      return NextResponse.json({ error: "fiscal_yearが必要です。" }, { status: 400 });
    }

    const fiscalMonth = company.fiscal_month ?? 4;
    const fiscalStartMonth = fiscalMonth === 12 ? 1 : fiscalMonth + 1;

    const summary = await generateAnnualSummary(
      company.id,
      fiscalYear,
      fiscalStartMonth,
      company.name ?? "不明",
    );

    if (!summary) {
      return NextResponse.json({ error: "要約の生成に失敗しました。" }, { status: 500 });
    }

    const { data: saved, error } = await supabaseAdmin
      .from("annual_summaries")
      .upsert(
        {
          company_id: company.id,
          fiscal_year: fiscalYear,
          financial_summary: summary.financial_summary,
          chat_insights: summary.chat_insights,
          key_decisions: summary.key_decisions,
          owner_type_evaluation: summary.owner_type_evaluation,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,fiscal_year" }
      )
      .select()
      .single();

    if (error) {
      console.error("Upsert error:", error);
      return NextResponse.json({ error: "保存に失敗しました。" }, { status: 500 });
    }

    return NextResponse.json({ summary: saved });
  } catch (error) {
    console.error("POST annual-summary error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}
