# 請求書発行時の自動仕訳実装仕様

## 対象ファイル
src/app/invoices/new/page.tsx

## 実装内容
請求書をINSERTした直後に、journalsテーブルへ自動仕訳をINSERTする。

## 仕訳ルール
請求書発行時：
  借方：売掛金
  貸方：売上高
  金額：請求書のtotal（税込合計）
  日付：請求書のissue_date
  摘要：{顧客名} 売上 {請求書番号}
  source：auto

## 実装手順

1. invoicesテーブルへのINSERT成功後、以下をjournalsテーブルにINSERT
```typescript
await supabase.from("journals").insert({
  company_id: companyId,
  journal_date: issueDate,
  debit_account: "売掛金",
  credit_account: "売上高",
  amount: total,
  description: `${customerName} 売上 ${invoiceNumber}`,
  source: "auto",
});
```

2. 顧客名はcustomersテーブルから取得済みの値を使用
3. invoiceNumberは請求書番号の生成後の値を使用
4. totalは明細の合計金額（税込）

## 注意
- journalsテーブルのRLSポリシーが未設定の場合は以下をSupabase SQL Editorで実行：

CREATE POLICY "Users can insert own journals"
ON journals FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can select own journals"
ON journals FOR SELECT
USING (
  company_id IN (
    SELECT id FROM companies WHERE user_id = auth.uid()
  )
);