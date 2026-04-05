import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });
  try {
    // 認証チェック
    const serverSupabase = await createServerClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ receipts: [], error: "認証が必要です。" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ receipts: [] }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const isPdf = file.type === "application/pdf";

    const contentBlock = isPdf
      ? {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64,
          },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: file.type as "image/jpeg" | "image/png" | "image/webp",
            data: base64,
          },
        };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            {
              type: "text",
              text: "この領収書から情報を抽出してください。複数の領収書がある場合は全て抽出してください。",
            },
          ],
        },
      ],
      system: `あなたは領収書の認識・分析の専門家です。
アップロードされた画像/PDFから領収書の情報を抽出してください。
複数の領収書が含まれる場合は、それぞれを個別に認識してください。

以下のJSON形式のみで返答してください（前後の説明文やマークダウンは不要）：
[{"date":"YYYY-MM-DD","vendor":"店名","amount":0,"tax_rate":10,"category":"勘定科目","description":"摘要","is_food":false,"notes":""}]

勘定科目の選択肢：接待交際費/会議費/旅費交通費/消耗品費/新聞図書費/研修費/広告宣伝費/福利厚生費/雑費`,
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "[]";

    try {
      const clean = text.replace(/```json|```/g, "").trim();
      const data = JSON.parse(clean);
      return NextResponse.json({ receipts: data });
    } catch {
      return NextResponse.json({ receipts: [] }, { status: 400 });
    }
  } catch (error) {
    console.error("Receipt API error:", error);
    return NextResponse.json(
      { receipts: [], error: "領収書の認識に失敗しました" },
      { status: 500 }
    );
  }
}
