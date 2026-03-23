# チャットAPI DB連携実装仕様

## 対象ファイル
src/app/api/chat/route.ts

## 概要
チャットのキーワード定型文をSupabaseのDBデータと連携する。
現在「データ未登録」と表示されている箇所を実際のDBデータに置き換える。

## 実装する関数

### 1. getRecentJournals(companyId)
journalsテーブルから直近10件を取得
```typescript
const { data } = await supabase
  .from("journals")
  .select("*")
  .eq("company_id", companyId)
  .order("journal_date", { ascending: false })
  .limit(10);
```

返答フォーマット：
「直近の仕訳データです。
{日付} {借方} / {貸方} ¥{金額} {摘要}
...（最大10件）
合計{件数}件の仕訳があります。」

### 2. getReceivablesSummary(companyId)
invoicesテーブルからステータス別の売掛残高を取得
```typescript
const { data } = await supabase
  .from("invoices")
  .select("status, total, customers(name)")
  .eq("company_id", companyId)
  .in("status", ["sent", "overdue", "partial"]);
```

返答フォーマット：
「売掛残高の状況です。
未回収合計：¥{合計}
・送付済み：{件数}件 ¥{金額}
・期日超過：{件数}件 ¥{金額}
・一部入金：{件数}件 ¥{金額}」

### 3. getMonthlySummary(companyId)
当月のinvoicesとjournalsから月次サマリーを取得
```typescript
// 当月の売上
const { data: invoices } = await supabase
  .from("invoices")
  .select("total, status")
  .eq("company_id", companyId)
  .gte("issue_date", monthStart)
  .lte("issue_date", monthEnd);

// 当月の費用
const { data: journals } = await supabase
  .from("journals")
  .select("debit_account, amount")
  .eq("company_id", companyId)
  .eq("source", "auto")
  .gte("journal_date", monthStart)
  .lte("journal_date", monthEnd);
```

返答フォーマット：
「今月のサマリーです。
売上：¥{金額}（{件数}件）
費用：¥{金額}
利益：¥{金額}」

### 4. getBankSummary(companyId)
bank_transactionsテーブルから消込状況を取得
```typescript
const { data } = await supabase
  .from("bank_transactions")
  .select("*")
  .eq("company_id", companyId)
  .order("transaction_date", { ascending: false })
  .limit(30);
```

返答フォーマット：
「銀行明細の取込・消込状況です。
普通預金残高：¥{最新残高}
先月消込完了：{件数}件
未消込：{件数}件
期日超過：{件数}件」

### 5. getCompanyInfo(companyId)
companiesテーブルから自社情報を取得して経費登録の案内

返答フォーマット：
「経費を登録するには領収書アップロード画面をご利用ください。
自動で勘定科目を判定して仕訳を生成します。」

## 実装上の注意
- 各関数はsupabaseのservice role keyを使用（RLSをバイパス）
- companyIdはリクエストボディから受け取る
- エラー時は「データの取得に失敗しました」と返す
- supabaseクライアントはserver.tsを使用