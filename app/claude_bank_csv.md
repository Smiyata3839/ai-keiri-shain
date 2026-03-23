# 銀行明細CSV自動判定・取込仕様

## 対象ファイル
src/app/bank/page.tsx

## やること
companiesテーブルのbank_nameを取得し、銀行名からCSVフォーマットを
自動判定してパース処理を切り替える。

## 追加するstate
const [bankInfo, setBankInfo] = useState<{name: string, branch: string} | null>(null);

## loadData()内に追加
companiesテーブル取得時にbank_nameとbank_branchも取得する。
取得後：
setBankInfo({ name: company.bank_name ?? "", branch: company.bank_branch ?? "" });

## フォーマット自動判定関数

const detectFormat = (bankName: string): "megabank" | "chigin" | "standard" => {
  if (bankName.includes("三菱UFJ") || bankName.includes("みずほ") || bankName.includes("三井住友")) return "megabank";
  if (bankName.includes("八十二") || bankName.includes("阿波") || bankName.includes("百十四")) return "chigin";
  return "megabank"; // デフォルトはメガバンク形式
};

## フォーマット別パース処理（handleCSV内）

const format = detectFormat(bankInfo?.name ?? "");

### megabank形式（みずほ・三菱UFJ・三井住友など）
列順: 取引日, 摘要, 出金金額, 入金金額, 残高
  transaction_date = cols[0]
  description = cols[1]
  const outgoing = parseInt(cols[2].replace(/[^\d]/g, ""), 10) || 0;
  const incoming = parseInt(cols[3].replace(/[^\d]/g, ""), 10) || 0;
  amount = incoming > 0 ? incoming : -outgoing;
  balance = parseInt(cols[4]?.replace(/[^\d]/g, "") ?? "0", 10) || 0;

### chigin形式（八十二・阿波・百十四など通番あり）
列順: 取引通番, 取引日, 出金金額, 入金金額, 摘要, 残高
  transaction_date = cols[1]
  description = cols[4]
  const outgoing = parseInt(cols[2].replace(/[^\d]/g, ""), 10) || 0;
  const incoming = parseInt(cols[3].replace(/[^\d]/g, ""), 10) || 0;
  amount = incoming > 0 ? incoming : -outgoing;
  balance = parseInt(cols[5]?.replace(/[^\d]/g, "") ?? "0", 10) || 0;

### standard形式
列順: 日付, 摘要, 金額, 残高
  transaction_date = cols[0]
  description = cols[1]
  amount = parseInt(cols[2].replace(/[^\d-]/g, ""), 10);
  balance = parseInt(cols[3]?.replace(/[^\d-]/g, "") ?? "0", 10) || 0;

## ヘッダーUI追加
CSVボタンの左側に以下を表示（編集不可）：
bankInfoがある場合のみ表示：
「🏦 対象口座：{bankInfo.name} {bankInfo.branch}　フォーマット：自動判定済み」
style: fontSize 13, color "#6e6e73"