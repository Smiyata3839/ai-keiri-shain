Set-Content -Path "claude_bank_bug.md" -Encoding UTF8 -Value @"
# 銀行明細 自動消込バグ調査・修正指示

## 対象ファイル
src/app/bank/page.tsx

## コンソールログで判明している事実
- 正規化desc: カ)テスト（銀行摘要は正しく正規化されている）
- 正規化kana: カブシキカイシャテスト（← 間違い。transfer_kanaのカ）テストと比較すべき）
- カナ一致: false（上記原因で不一致）
- 金額一致: false（amountが9900ではなく別の値になっている）

## 確認①：消込ロジックのカナ比較
customers.transfer_kana と銀行摘要を比較している箇所を探す。
kana（顧客名カナ）ではなく transfer_kana を使っているか確認。

// ❌ 間違い
const normalizedKana = normalizeKana(customer.kana);

// ✅ 正しい
const normalizedKana = normalizeKana(customer.transfer_kana);

## 確認②：megabank形式の金額パース
megabank形式の列：取引日, 摘要, 出金金額, 入金金額, 残高

const debit  = parseAmount(cols[2]);  // 出金
const credit = parseAmount(cols[3]);  // 入金
const amount = credit > 0 ? credit : -debit;

cols[2]とcols[3]のindexがズレていないか確認。

## 修正後の確認
同じCSVを再アップロードして以下のログが出ればOK：
正規化desc: カ)テスト　正規化kana: カ)テスト
カナ一致: true
金額一致: true
"@