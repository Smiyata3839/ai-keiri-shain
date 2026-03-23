# Step5 適格請求書発行画面 実装仕様

## 作成するファイル
- src/app/invoices/new/page.tsx（新規作成画面）
- src/app/invoices/page.tsx（一覧画面）

## 技術スタック
- Next.js App Router + TypeScript
- Supabaseクライアント: @/lib/supabase/client
- デザイン: インラインスタイル、CSS変数使用
  - --color-primary: #0071e3
  - --color-background: #f5f5f7
  - --color-card: #ffffff
  - --color-text: #1d1d1f
  - --color-text-secondary: #6e6e73
  - --color-border: #d2d2d7
  - --radius-card: 16px
  - --radius-button: 980px
  - --font-sans: "Helvetica Neue", "Hiragino Sans", "Yu Gothic", sans-serif
- サイドバー: 左240px固定（#1c1c1e）、メインコンテンツ: marginLeft 240px

## サイドバーメニュー構成
メイン: チャット(/chat)
受発注: 請求書発行(/invoices/new)、請求書一覧(/invoices)、売掛管理(/receivables)
会計: 銀行明細取込(/bank)、仕訳一覧(/journals)、残高試算表(/trial-balance)、貸借対照表(/balance-sheet)、損益計算書(/profit-loss)
経費: 領収書アップロード(/receipts)
設定: 顧客管理(/customers)、自社情報(/company)

## 請求書発行画面の仕様

### インボイス必須6項目
1. 適格請求書発行事業者名＋登録番号（companiesテーブルから取得）
2. 取引年月日
3. 取引内容
4. 税率ごとの合計対価の額（8%・10%）
5. 消費税額等
6. 交付先氏名または名称（customersテーブルから選択）

### フォーム項目
- 顧客選択（customersテーブルからセレクトボックス）
- 請求書番号（自動採番: INV-YYYYMMDD-001形式）
- 発行日（デフォルト今日）
- 支払期限
- 明細行（品目・数量・単価・税率8%or10%・金額）
- 明細行の追加・削除ボタン
- 小計・消費税（8%・10%別）・合計の自動計算
- 備考欄

### ステータス
作成中 → 発行済み（「発行する」ボタンで変更）

### Supabaseテーブル
invoices: id, company_id, customer_id, invoice_number, issue_date, due_date, status, subtotal, tax_8, tax_10, total, notes, pdf_url, created_at
invoice_items: id, invoice_id, description, quantity, unit_price, tax_rate, amount, created_at
companies: id, name, invoice_registration_number
customers: id, company_id, name

### 保存処理
1. invoicesテーブルにinsert
2. invoice_itemsテーブルにinsert
3. 保存後 /invoices にリダイレクト

## 請求書一覧画面の仕様
- invoicesテーブルから一覧取得
- ステータスバッジ表示（色分け）
- 顧客名・請求書番号・発行日・金額・ステータス表示
- 新規作成ボタン

## 注意事項
- 認証チェック（未ログインは/loginにリダイレクト）
- company_idは現在のユーザーのcompaniesテーブルから取得
- エラーハンドリングあり
- ローディング状態の表示あり
```

