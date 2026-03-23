# 銀行明細取込時の自動仕訳実装仕様

## 対象ファイル
src/app/bank/page.tsx

## 実装内容
bank_transactionsにINSERTした直後に、journalsテーブルへ自動仕訳をINSERTする。

## 仕訳ルール

### 入金（amount > 0）の場合

消込済み（matched = true）：
  借方：普通預金
  貸方：売掛金
  摘要：{description} 入金消込

未消込（matched = false）：
  借方：普通預金
  貸方：売上高
  摘要：{description} 入金

### 出金（amount < 0）の場合
descriptionのキーワードで借方勘定科目を判定：

| キーワード | 勘定科目 |
|-----------|---------|
| 家賃・賃料・テナント | 地代家賃 |
| 給与・給料・賞与・サラリー | 給料手当 |
| 保険・社保・健保・厚生 | 法定福利費 |
| 電気・ガス・水道・光熱 | 水道光熱費 |
| 通信・回線・電話・インターネット | 通信費 |
| 交通・電車・バス・タクシー | 交通費 |
| 広告・宣伝・PR | 広告宣伝費 |
| 上記以外 | 雑費 |

借方：上記勘定科目
貸方：普通預金
金額：Math.abs(amount)
摘要：{description} 支払

## 実装コード例
```typescript
const getExpenseAccount = (desc: string): string => {
  if (/家賃|賃料|テナント/.test(desc)) return "地代家賃";
  if (/給与|給料|賞与|サラリー/.test(desc)) return "給料手当";
  if (/保険|社保|健保|厚生/.test(desc)) return "法定福利費";
  if (/電気|ガス|水道|光熱/.test(desc)) return "水道光熱費";
  if (/通信|回線|電話|インターネット/.test(desc)) return "通信費";
  if (/交通|電車|バス|タクシー/.test(desc)) return "交通費";
  if (/広告|宣伝|PR/.test(desc)) return "広告宣伝費";
  return "雑費";
};

// bank_transactions INSERT後に実行
if (amount > 0) {
  await supabase.from("journals").insert({
    company_id: companyId,
    journal_date: transaction_date,
    debit_account: "普通預金",
    credit_account: matched ? "売掛金" : "売上高",
    amount: amount,
    description: `${description} ${matched ? "入金消込" : "入金"}`,
    source: "auto",
  });
} else if (amount < 0) {
  await supabase.from("journals").insert({
    company_id: companyId,
    journal_date: transaction_date,
    debit_account: getExpenseAccount(description),
    credit_account: "普通預金",
    amount: Math.abs(amount),
    description: `${description} 支払`,
    source: "auto",
  });
}
```

## 注意
重複チェック後、INSERTが成功した場合のみ仕訳をINSERTすること。