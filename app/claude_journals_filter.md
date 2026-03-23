# 仕訳一覧 フィルター機能追加仕様

## 対象ファイル
src/app/journals/page.tsx

## 追加するフィルター

### 1. 期間フィルター
- 開始日・終了日のinput[type=date]を2つ並べて表示
- デフォルト：当月の1日〜末日
- 両方空の場合は全件表示

### 2. 勘定科目フィルター
- selectドロップダウン
- 選択肢：「すべて」+ ACCOUNTSリストの全科目
- 借方または貸方に選択した科目が含まれる仕訳を表示

### 3. キーワード検索（摘要）
- input[type=text]
- 摘要フィールドに対して部分一致検索
- リアルタイムフィルタリング（onChange）

### 4. 区分フィルター
- タブボタン形式
- 選択肢：すべて / 自動 / 手動
- デフォルト：すべて

## 追加するstate
const [filterStartDate, setFilterStartDate] = useState("");
const [filterEndDate, setFilterEndDate] = useState("");
const [filterAccount, setFilterAccount] = useState("");
const [filterKeyword, setFilterKeyword] = useState("");
const [filterSource, setFilterSource] = useState<"all" | "auto" | "manual">("all");

## フィルタリングロジック
全フィルターはクライアントサイドで処理（DBクエリではなくstateで絞り込み）

const filtered = journals.filter(j => {
  if (filterStartDate && j.journal_date < filterStartDate) return false;
  if (filterEndDate && j.journal_date > filterEndDate) return false;
  if (filterAccount && j.debit_account !== filterAccount && j.credit_account !== filterAccount) return false;
  if (filterKeyword && !j.description.includes(filterKeyword)) return false;
  if (filterSource !== "all" && j.source !== filterSource) return false;
  return true;
});

## UIレイアウト
テーブルの上にフィルターパネルを追加：
```
┌─────────────────────────────────────────────────┐
│ 期間：[開始日____] 〜 [終了日____]               │
│ 科目：[すべて▼]  キーワード：[__________]       │
│ 区分：[すべて] [自動] [手動]                     │
└─────────────────────────────────────────────────┘
```

フィルターパネルのスタイル：
- backgroundColor: #fff
- borderRadius: 16px
- padding: 20px 24px
- marginBottom: 20px
- border: 1px solid #f0f0f0

## フッターに件数表示
「{filtered.length}件 / 全{journals.length}件」を表示

## リセットボタン
フィルターパネル右上に「リセット」ボタンを追加
クリックで全フィルターを初期値に戻す