import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

// 指定月の財務データを収集
async function collectMonthlyFinancial(companyId: string, yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const nextMonth = new Date(y, m, 1);
  const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const [
    { data: invoices },
    { data: expenses },
  ] = await Promise.all([
    supabaseAdmin.from("invoices").select("total, issue_date").eq("company_id", companyId)
      .gte("issue_date", start).lt("issue_date", end),
    supabaseAdmin.from("journals").select("debit_account, amount").eq("company_id", companyId)
      .neq("debit_account", "売掛金").neq("debit_account", "普通預金")
      .gte("journal_date", start).lt("journal_date", end),
  ]);

  const totalSales = (invoices ?? []).reduce((s, inv) => s + (inv.total ?? 0), 0);

  const expenseByAccount: Record<string, number> = {};
  let totalExpenses = 0;
  for (const j of expenses ?? []) {
    const acct = j.debit_account ?? "その他";
    expenseByAccount[acct] = (expenseByAccount[acct] ?? 0) + (j.amount ?? 0);
    totalExpenses += j.amount ?? 0;
  }

  const expenseLines = Object.entries(expenseByAccount)
    .sort((a, b) => b[1] - a[1])
    .map(([acct, amt]) => `${acct}: ${yen(amt)}`);

  return { totalSales, totalExpenses, profit: totalSales - totalExpenses, expenseLines };
}

// 指定月のチャット履歴を収集
async function collectMonthlyChatHistory(companyId: string, yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const nextMonth = new Date(y, m, 1);
  const end = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;

  const { data: sessions } = await supabaseAdmin
    .from("chat_sessions").select("id").eq("company_id", companyId)
    .gte("created_at", start).lt("created_at", end);

  if (!sessions || sessions.length === 0) return "この月のチャット履歴はありません。";

  const { data: messages } = await supabaseAdmin
    .from("chat_messages").select("role, content, created_at")
    .in("session_id", sessions.map(s => s.id))
    .order("created_at", { ascending: true })
    .limit(50);

  if (!messages || messages.length === 0) return "この月のチャット履歴はありません。";

  return messages.map(m => `[${m.role}] ${m.content.slice(0, 150)}`).join("\n");
}

// 月次要約を生成
async function generateMonthlySummary(companyId: string, yearMonth: string, detailLevel: string) {
  const [financial, chatHistory] = await Promise.all([
    collectMonthlyFinancial(companyId, yearMonth),
    collectMonthlyChatHistory(companyId, yearMonth),
  ]);

  // データが全くない月はAI呼び出しせず直接返す
  if (financial.totalSales === 0 && financial.totalExpenses === 0 && chatHistory.includes("履歴はありません")) {
    return {
      financial_summary: `${yearMonth}の財務データはありません。`,
      chat_insights: "この月のチャット履歴はありません。",
      action_items: "データが蓄積され次第、要約が生成されます。",
    };
  }

  const detailInstructions: Record<string, string> = {
    full: "詳細に記述してください。各項目3-5文で具体的に。",
    condensed: "要約して記述してください。各項目1-2文で簡潔に。",
    minimal: "最小限に記述してください。各項目1文以内で核心のみ。",
  };

  try {
    const aiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const result = await aiClient.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: `あなたは経理コンサルタントです。月次の財務データとチャット履歴から月次要約を作成してください。

詳細度: ${detailLevel} — ${detailInstructions[detailLevel] ?? detailInstructions.full}

以下のJSON形式のみで返してください（JSON以外のテキストは不要です）:
{
  "financial_summary": "月次の財務実績の要約",
  "chat_insights": "チャット履歴から得た重要なポイント・対応記録",
  "action_items": "来月以降に注意すべき事項・アクションアイテム"
}`,
      messages: [
        {
          role: "user",
          content: `【対象月】${yearMonth}

【財務データ】
売上: ${yen(financial.totalSales)} / 費用: ${yen(financial.totalExpenses)} / 損益: ${yen(financial.profit)}

費用内訳:
${financial.expenseLines.join("\n") || "データなし"}

【チャット履歴】
${chatHistory}`,
        },
      ],
    });

    const text = result.content[0].type === "text" ? result.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("generateMonthlySummary: JSON not found in response:", text.slice(0, 200));
      return null;
    }

    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error("generateMonthlySummary AI error:", e);
    return null;
  }
}

// 古い月次要約の詳細度を下げる（ローリング圧縮）
async function compressOldSummaries(companyId: string) {
  const now = new Date();

  // 2ヶ月前 → condensed
  const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const twoMonthsAgoYM = `${twoMonthsAgo.getFullYear()}-${String(twoMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

  // 3ヶ月以上前 → minimal
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
  const threeMonthsAgoYM = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, "0")}`;

  // 2ヶ月前をcondensedに
  const { data: condensedTargets } = await supabaseAdmin
    .from("monthly_summaries")
    .select("id, year_month, financial_summary, chat_insights, action_items")
    .eq("company_id", companyId)
    .eq("year_month", twoMonthsAgoYM)
    .eq("detail_level", "full");

  for (const target of condensedTargets ?? []) {
    const summary = await recompressSummary(target, "condensed");
    if (summary) {
      await supabaseAdmin.from("monthly_summaries").update({
        detail_level: "condensed",
        financial_summary: summary.financial_summary,
        chat_insights: summary.chat_insights,
        action_items: summary.action_items,
        updated_at: new Date().toISOString(),
      }).eq("id", target.id);
    }
  }

  // 3ヶ月以上前をminimalに
  const { data: minimalTargets } = await supabaseAdmin
    .from("monthly_summaries")
    .select("id, year_month, financial_summary, chat_insights, action_items")
    .eq("company_id", companyId)
    .lt("year_month", threeMonthsAgoYM)
    .neq("detail_level", "minimal");

  for (const target of minimalTargets ?? []) {
    const summary = await recompressSummary(target, "minimal");
    if (summary) {
      await supabaseAdmin.from("monthly_summaries").update({
        detail_level: "minimal",
        financial_summary: summary.financial_summary,
        chat_insights: summary.chat_insights,
        action_items: summary.action_items,
        updated_at: new Date().toISOString(),
      }).eq("id", target.id);
    }
  }
}

// 既存の要約を圧縮
async function recompressSummary(
  existing: { financial_summary: string | null; chat_insights: string | null; action_items: string | null },
  targetLevel: string,
) {
  const instructions: Record<string, string> = {
    condensed: "以下の月次要約を1-2文ずつに要約してください。",
    minimal: "以下の月次要約を各項目1文以内に圧縮してください。核心のみ残してください。",
  };

  const aiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const result = await aiClient.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 512,
    system: `${instructions[targetLevel]}

JSON形式で返してください:
{"financial_summary": "...", "chat_insights": "...", "action_items": "..."}`,
    messages: [
      {
        role: "user",
        content: `財務: ${existing.financial_summary ?? "なし"}\n学び: ${existing.chat_insights ?? "なし"}\nアクション: ${existing.action_items ?? "なし"}`,
      },
    ],
  });

  const text = result.content[0].type === "text" ? result.content[0].text : "";
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  return JSON.parse(jsonMatch[0]);
}

// GET: 月次要約一覧を取得
export async function GET() {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

    const { data: company } = await supabaseAdmin
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) return NextResponse.json({ error: "会社が見つかりません。" }, { status: 404 });

    const { data: summaries } = await supabaseAdmin
      .from("monthly_summaries").select("*").eq("company_id", company.id)
      .order("year_month", { ascending: false }).limit(12);

    return NextResponse.json({ summaries: summaries ?? [] });
  } catch (error) {
    console.error("GET monthly-summary error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}

// POST: 指定月の月次要約を生成
export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });

    const { data: company } = await supabaseAdmin
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) return NextResponse.json({ error: "会社が見つかりません。" }, { status: 404 });

    const body = await req.json();
    const yearMonth = body.year_month;
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return NextResponse.json({ error: "year_month（YYYY-MM形式）が必要です。" }, { status: 400 });
    }

    const summary = await generateMonthlySummary(company.id, yearMonth, "full");
    if (!summary) {
      return NextResponse.json({ error: "要約の生成に失敗しました。" }, { status: 500 });
    }

    const { data: saved, error } = await supabaseAdmin
      .from("monthly_summaries")
      .upsert(
        {
          company_id: company.id,
          year_month: yearMonth,
          detail_level: "full",
          financial_summary: summary.financial_summary,
          chat_insights: summary.chat_insights,
          action_items: summary.action_items,
          generated_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "company_id,year_month" }
      )
      .select()
      .single();

    if (error) {
      console.error("Upsert error:", error);
      return NextResponse.json({ error: "保存に失敗しました。" }, { status: 500 });
    }

    // 古い要約を圧縮（非同期）
    compressOldSummaries(company.id).catch(e => console.error("Compress error:", e));

    return NextResponse.json({ summary: saved });
  } catch (error) {
    console.error("POST monthly-summary error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}
