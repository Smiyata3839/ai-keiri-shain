# 銀行明細 重複チェック・自動消込ロジック修正仕様

## 対象ファイル
src/app/bank/page.tsx

## 修正1：重複チェック

INSERT前に同一レコードが既に存在するか確認し、存在する場合はスキップする。
チェック条件：company_id + transaction_date + description + amount が全て一致
```typescript
const { data: existing } = await supabase
  .from("bank_transactions")
  .select("id")
  .eq("company_id", companyId)
  .eq("transaction_date", transaction_date)
  .eq("description", description)
  .eq("amount", amount)
  .single();

if (existing) continue; // 重複はスキップ
```

## 修正2：自動消込ロジック

customersテーブルのSELECTにtransfer_kanaを追加：
.select("id, kana, name, transfer_kana")

消込判定を以下に変更：
```typescript
const transferKana = cust.transfer_kana ?? cust.kana ?? "";
const normalizedDesc = description.replace(/\s/g, "").replace(/）/g, ")");
const normalizedKana = transferKana.replace(/\s/g, "").replace(/）/g, ")");
if (normalizedKana && normalizedDesc.includes(normalizedKana)) {
  matched = true;
  invoice_id = inv.id;
  break;
}
```

## 注意
修正後ファイルを保存してください。