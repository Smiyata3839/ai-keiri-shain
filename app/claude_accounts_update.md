# 勘定科目更新仕様

## 概要
「交通費」を「旅費交通費」に置き換え、経費精算に必要な科目を追加する。

## 変更対象ファイル
- src/app/journals/page.tsx
- src/app/trial-balance/page.tsx
- src/app/balance-sheet/page.tsx
- src/app/profit-loss/page.tsx
- src/app/general-ledger/page.tsx
- src/app/bank/page.tsx（getExpenseAccount関数）

## 変更内容

### 1. 「交通費」→「旅費交通費」に置き換え
全ファイルで「交通費」を「旅費交通費」に変更する。

### 2. 以下の科目を費用科目に追加
- 会議費
- 新聞図書費
- 研修費
- 福利厚生費

## 各ファイルの修正内容

### journals/page.tsx
ACCOUNTSリストの「交通費」を「旅費交通費」に変更し、
以下を費用科目として追加：
「会議費」「新聞図書費」「研修費」「福利厚生費」

### trial-balance/page.tsx
ACCOUNT_TYPESの「交通費」を「旅費交通費」に変更し、
以下をexpenseとして追加：
旅費交通費: "expense"
会議費: "expense"
新聞図書費: "expense"
研修費: "expense"
福利厚生費: "expense"

### balance-sheet/page.tsx
変更なし（費用科目はB/Sに影響しない）

### profit-loss/page.tsx
EXPENSE_ACCOUNTSの「交通費」を「旅費交通費」に変更し、
以下を追加：
「会議費」「新聞図書費」「研修費」「福利厚生費」

### general-ledger/page.tsx
ACCOUNTSリストの「交通費」を「旅費交通費」に変更し、
以下を追加：
「会議費」「新聞図書費」「研修費」「福利厚生費」

### bank/page.tsx
getExpenseAccount関数を更新：
- 「交通費」→「旅費交通費」に変更
- 以下のキーワード判定を追加：

if (/会議|ミーティング|弁当|会食/.test(desc)) return "会議費";
if (/書籍|図書|新聞|雑誌/.test(desc)) return "新聞図書費";
if (/研修|セミナー|講習/.test(desc)) return "研修費";
if (/福利|慶弔|健康診断/.test(desc)) return "福利厚生費";
if (/交通|電車|バス|タクシー|新幹線|出張|宿泊|ホテル/.test(desc)) return "旅費交通費";

## 注意
既存の仕訳データの「交通費」は変更しない（過去データはそのまま）。
今後新規に作成される仕訳のみ「旅費交通費」を使用する。