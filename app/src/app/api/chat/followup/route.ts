import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const yen = (n: number) => `¥${n.toLocaleString("ja-JP")}`;

export async function GET() {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: null }, { status: 401 });
    }

    const { data: company } = await supabaseAdmin
      .from("companies").select("id, name, fiscal_month").eq("user_id", user.id).single();
    if (!company) {
      return NextResponse.json({ message: null });
    }

    // 並行でデータ収集
    const [
      ownerResult,
      monthlyResult,
      recentChatResult,
      receivablesResult,
      bankResult,
    ] = await Promise.all([
      // 経営者タイプ
      supabaseAdmin.from("owner_profiles")
        .select("owner_type, communication_style")
        .eq("company_id", company.id).single(),
      // 直近の月次要約
      supabaseAdmin.from("monthly_summaries")
        .select("year_month, action_items")
        .eq("company_id", company.id)
        .order("year_month", { ascending: false }).limit(1),
      // 直近のチャット（最後のやり取り）
      supabaseAdmin.from("chat_sessions")
        .select("id, updated_at")
        .eq("company_id", company.id)
        .order("updated_at", { ascending: false }).limit(1),
      // 期日超過の売掛金
      supabaseAdmin.from("invoices")
        .select("total, due_date, customers(name)")
        .eq("company_id", company.id)
        .eq("status", "overdue"),
      // 銀行残高
      supabaseAdmin.from("bank_transactions")
        .select("balance, transaction_date")
        .eq("company_id", company.id)
        .order("transaction_date", { ascending: false }).limit(1),
    ]);

    // フォローアップのネタを集める
    const hints: string[] = [];

    // 月次要約のアクションアイテム
    if (monthlyResult.data && monthlyResult.data.length > 0) {
      const ms = monthlyResult.data[0];
      if (ms.action_items) {
        hints.push(`先月（${ms.year_month}）のアクションアイテム: ${ms.action_items}`);
      }
    }

    // 期日超過の売掛金
    if (receivablesResult.data && receivablesResult.data.length > 0) {
      const total = receivablesResult.data.reduce((s, r) => s + (r.total ?? 0), 0);
      const count = receivablesResult.data.length;
      hints.push(`期日超過の売掛金が${count}件（合計${yen(total)}）あります。`);
    }

    // 最後のチャットからの日数
    if (recentChatResult.data && recentChatResult.data.length > 0) {
      const lastChat = recentChatResult.data[0];
      if (lastChat.updated_at) {
        const daysSince = Math.floor((Date.now() - new Date(lastChat.updated_at).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSince >= 3) {
          hints.push(`前回のチャットから${daysSince}日経過しています。`);
        }
      }
    }

    // 銀行残高
    if (bankResult.data && bankResult.data.length > 0) {
      const bank = bankResult.data[0];
      hints.push(`直近の普通預金残高: ${yen(bank.balance ?? 0)}（${bank.transaction_date}時点）`);
    }

    // ネタがなければデフォルトメッセージ
    if (hints.length === 0) {
      return NextResponse.json({
        message: "おはようございます！KANBEIです。今日もサポートします。何かお手伝いできることはありますか？",
      });
    }

    // 経営者タイプに合わせたトーンで生成
    const ownerType = ownerResult.data?.owner_type ?? null;
    const commStyle = ownerResult.data?.communication_style ?? "丁寧に、プロとして回答する";

    try {
      const aiClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const result = await aiClient.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 256,
        system: `あなたはKANBEIという経理AIアシスタントです。ユーザーがチャットを開いた時の最初の挨拶メッセージを生成してください。

以下のルール:
- 2-3文で簡潔に
- 経営者タイプ${ownerType ? `「${ownerType}」` : ""}に合わせたトーン: ${commStyle}
- 以下の情報から最も重要な1-2点に触れて、フォローアップする
- 押し付けがましくなく、自然な挨拶として
- 「〜はいかがですか？」「〜ご確認されましたか？」のように問いかける形で
- 挨拶メッセージのテキストのみ返してください（JSON不要）`,
        messages: [
          { role: "user", content: hints.join("\n") },
        ],
      });

      const text = result.content[0].type === "text" ? result.content[0].text : null;
      return NextResponse.json({ message: text });
    } catch (e) {
      console.error("Followup AI error:", e);
      return NextResponse.json({
        message: "おはようございます！KANBEIです。今日もサポートします。何かお手伝いできることはありますか？",
      });
    }
  } catch (error) {
    console.error("GET followup error:", error);
    return NextResponse.json({
      message: "おはようございます！KANBEIです。今日もサポートします。何かお手伝いできることはありますか？",
    });
  }
}
