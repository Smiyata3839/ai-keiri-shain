# 請求書編集機能実装仕様

## 概要
draft（作成中）ステータスの請求書を編集できるようにする。

## 対象ファイル
- src/app/invoices/page.tsx（一覧画面）
- src/app/invoices/[id]/page.tsx（詳細画面）
- src/app/invoices/[id]/edit/page.tsx（編集画面・新規作成）

## 実装内容

### 1. 請求書一覧（invoices/page.tsx）
draftステータスの行に「編集」ボタンを追加。
クリックで /invoices/{id}/edit に遷移。

### 2. 請求書詳細（invoices/[id]/page.tsx）
draftステータスの場合、「編集」ボタンを追加。
クリックで /invoices/{id}/edit に遷移。

### 3. 編集画面（invoices/[id]/edit/page.tsx）新規作成
src/app/invoices/new/page.tsx をベースに編集画面を作成。

#### 変更点
- ページタイトル：「請求書編集」
- 初期表示時にinvoicesテーブルとinvoice_itemsテーブルから既存データを取得してフォームに反映
- 保存時はINSERTではなくUPDATEを実行
- 請求書番号は変更不可（readonlyで表示）
- 「保存する」ボタンでdraftのまま保存
- 「発行する」ボタンでstatusをsentに変更して保存

#### データ取得
```typescript
const { data: invoice } = await supabase
  .from("invoices")
  .select("*, invoice_items(*), customers(*)")
  .eq("id", params.id)
  .single();
```

#### UPDATE処理
```typescript
// invoicesテーブルをUPDATE
await supabase.from("invoices").update({
  customer_id: selectedCustomerId,
  issue_date: issueDate,
  due_date: dueDate,
  subtotal,
  tax_8: totalTax8,
  tax_10: totalTax10,
  total,
  notes,
  status: isPublish ? "sent" : "draft",
}).eq("id", invoiceId);

// 既存のinvoice_itemsを削除して再INSERT
await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);
await supabase.from("invoice_items").insert(items.map(item => ({
  invoice_id: invoiceId,
  ...item
})));

// 発行時のみ自動仕訳を生成
if (isPublish) {
  await supabase.from("journals").insert({
    company_id: companyId,
    journal_date: issueDate,
    debit_account: "売掛金",
    credit_account: "売上高",
    amount: total,
    description: `${customerName} 売上 ${invoiceNumber}`,
    source: "auto",
  });
}
```

## スタイル
既存のAppleライクなデザインに統一
サイドバーはinvoices/page.tsxと同じ方式で追加