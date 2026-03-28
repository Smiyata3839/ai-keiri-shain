import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient as createServerClient } from "@/lib/supabase/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const TOPICS = [
  "仕訳", "消費税", "経費精算", "売掛金", "買掛金", "給与",
  "決算", "資金繰り", "インボイス", "勘定科目", "減価償却",
  "税務", "銀行取引", "その他",
];

export async function POST(req: NextRequest) {
  try {
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "認証が必要です。" }, { status: 401 });
    }

    const { companyId, userMessage, assistantMessage, feedbackType, correction } = await req.json();

    if (!companyId || !userMessage || !assistantMessage || !feedbackType) {
      return NextResponse.json({ error: "必須パラメータが不足しています。" }, { status: 400 });
    }
    if (feedbackType !== "good" && feedbackType !== "bad") {
      return NextResponse.json({ error: "feedbackTypeはgoodまたはbadである必要があります。" }, { status: 400 });
    }

    // 会社所有権チェック
    const { data: company } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("user_id", user.id)
      .single();
    if (!company) {
      return NextResponse.json({ error: "アクセス権限がありません。" }, { status: 403 });
    }

    // トピック分類（Claude軽量コール）
    const topicResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 20,
      system: "以下の経理Q&Aを1つのトピックに分類してください。トピック名のみ回答してください。",
      messages: [{
        role: "user",
        content: `Q: ${userMessage.slice(0, 300)}\nA: ${assistantMessage.slice(0, 300)}\n\nトピック候補: ${TOPICS.join(", ")}`,
      }],
    });

    let topic = "その他";
    if (topicResponse.content[0].type === "text") {
      const classified = topicResponse.content[0].text.trim();
      if (TOPICS.includes(classified)) {
        topic = classified;
      }
    }

    // DB保存
    const { error: insertError } = await supabaseAdmin
      .from("chat_feedback")
      .insert({
        company_id: companyId,
        user_message: userMessage.slice(0, 2000),
        assistant_message: assistantMessage.slice(0, 2000),
        topic,
        feedback_type: feedbackType,
        correction: correction?.slice(0, 2000) || null,
      });

    if (insertError) {
      console.error("Feedback insert error:", insertError);
      return NextResponse.json({ error: "保存に失敗しました。" }, { status: 500 });
    }

    return NextResponse.json({ success: true, topic });
  } catch (error) {
    console.error("Feedback API error:", error);
    return NextResponse.json({ error: "エラーが発生しました。" }, { status: 500 });
  }
}
