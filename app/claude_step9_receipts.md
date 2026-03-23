# Step 9：領収書アップロード・経費精算 実装仕様

## 対象ファイル
src/app/receipts/page.tsx

## 概要
領収書（画像/PDF）をアップロードし、Claude APIで自動認識・仕訳生成する。

## 技術仕様

### 対応ファイル形式
- JPEG / PNG / WebP（画像）
- PDF（単一・複数領収書シート）

### APIエンドポイント
src/app/api/receipts/route.ts を新規作成してClaude APIを呼び出す。

## UI構成

### 1. アップロードエリア
ドラッグ&ドロップ または クリックでファイル選択

注意事項を以下のように表示：
```
📸 撮影・アップロードの注意事項
・横向きの画像は認識精度が大きく下がります。必ず正立させてアップロードしてください
・領収書全体が画面に収まるように撮影してください
・暗い場所での撮影は文字が読み取れない場合があります
・複数の領収書は重ならないように並べてください
・読み取り結果は必ず確認・修正してから仕訳を登録してください
⚠️ 認識エラーがあると財務諸表の数値に影響します。必ず内容を確認してください。
```

### 2. 認識結果一覧
Claude APIの認識結果を1件ずつカード形式で表示。
各カードで以下を編集可能：
- 日付（input[type=date]）
- 店名・発行元（input[type=text]）
- 金額（input[type=text]）
- 税率（select: 10% / 8% / 対象外）
- 勘定科目（select: 全勘定科目リスト）
- 参加人数（飲食系の場合のみ表示、input[type=number]）
- 摘要（input[type=text]）

### 3. 勘定科目自動判定ロジック
飲食系（店名に「レストラン」「食堂」「飲食」「居酒屋」「焼肉」「寿司」等を含む）：
  参加人数入力欄を表示
  1人あたり金額 = 合計 ÷ 参加人数
  1人あたり10,000円以下 → 会議費
  1人あたり10,000円超  → 接待交際費
  参加人数未入力       → 接待交際費

但し書きベースの判定：
  「お食事として」「飲食」→ 接待交際費
  「会議費として」→ 会議費
  「交通費として」「電車」「タクシー」「新幹線」「ホテル」「宿泊」→ 旅費交通費
  「消耗品」「文具」→ 消耗品費
  「書籍」「図書」「新聞」→ 新聞図書費
  「研修」「セミナー」→ 研修費
  「広告」「印刷」→ 広告宣伝費
  上記以外 → 雑費

### 4. 仕訳生成ルール
借方：認識した勘定科目
貸方：現金（デフォルト） または 普通預金（選択可能）
金額：認識した金額
日付：認識した日付
摘要：{店名} {但し書き}
source：auto

## Claude APIプロンプト

以下のシステムプロンプトでClaude APIを呼び出す：
```
あなたは領収書の認識・分析の専門家です。
アップロードされた画像/PDFから領収書の情報を抽出してください。
複数の領収書が含まれる場合は、それぞれを個別に認識してください。

以下のJSON形式で返答してください（JSON以外は出力しないこと）：
[
  {
    "date": "YYYY-MM-DD",
    "vendor": "店名・発行元",
    "amount": 金額（数値）,
    "tax_rate": 10 または 8 または 0,
    "category": "推奨勘定科目",
    "description": "摘要",
    "is_food": true または false,
    "notes": "特記事項"
  }
]

勘定科目の判定基準：
- 飲食店での食事 → 接待交際費（is_food: true）
- 交通機関・宿泊 → 旅費交通費
- 消耗品・文具 → 消耗品費
- 書籍・雑誌 → 新聞図書費
- 研修・セミナー → 研修費
- 広告・印刷 → 広告宣伝費
- その他 → 雑費
```

## APIルート（src/app/api/receipts/route.ts）
```typescript
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");
  const mediaType = file.type as "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  
  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: mediaType === "application/pdf" ? "document" : "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64,
            },
          },
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
}
```

## 支払方法選択
各カードに支払方法の選択を追加：
- 現金
- 普通預金（銀行振込・デビット）
- クレジットカード（未払金）

支払方法による貸方勘定科目：
- 現金 → 現金
- 普通預金 → 普通預金
- クレジットカード → 未払金

## 仕訳登録ボタン
全カードの確認後「仕訳を一括登録」ボタンで
journalsテーブルに一括INSERT

## スタイル
既存のAppleライクなデザインに統一
サイドバーはinvoices/page.tsxと同じ方式で追加