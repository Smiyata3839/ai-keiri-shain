# 総勘定元帳・残高試算表 期間自由指定＋CSV出力追加仕様

## 対象ファイル
- src/app/general-ledger/page.tsx
- src/app/trial-balance/page.tsx

---

## 共通変更内容

### 期間指定をinput[type=month]から開始日〜終了日に変更

#### 追加state
const [startDate, setStartDate] = useState(() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
});
const [endDate, setEndDate] = useState(() => {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
});

#### ヘッダーのUI変更
input[type=month] を以下に変更：
[開始日 input[type=date]] 〜 [終了日 input[type=date]]

#### DBクエリの変更
.gte("journal_date", startDate)
.lte("journal_date", endDate)

---

## 総勘定元帳（general-ledger/page.tsx）の追加

### CSV出力ボタン
ヘッダーに「CSVダウンロード」ボタンを追加

### CSV出力関数
```typescript
const handleDownloadCSV = () => {
  const headers = ["日付", "摘要", "借方", "貸方", "残高"];
  const rows = ledgerRows.map(r => [
    r.date,
    r.description,
    r.debit > 0 ? r.debit : "",
    r.credit > 0 ? r.credit : "",
    r.balance,
  ]);
  
  const bom = "\uFEFF";
  const csv = bom + [headers, ...rows]
    .map(row => row.map(v => `"${v}"`).join(","))
    .join("\n");
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `総勘定元帳_${selectedAccount}_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

---

## 残高試算表（trial-balance/page.tsx）の追加

### CSV出力ボタン
ヘッダーに「CSVダウンロード」ボタンを追加

### CSV出力関数
```typescript
const handleDownloadCSV = () => {
  const headers = ["区分", "勘定科目", "借方合計", "貸方合計", "残高"];
  const dataRows = rows.map(r => [
    TYPE_LABELS[r.type],
    r.account,
    r.debit,
    r.credit,
    r.balance,
  ]);
  const totalRow = ["合計", "", totalDebit, totalCredit, totalDebit - totalCredit];
  
  const bom = "\uFEFF";
  const csv = bom + [headers, ...dataRows, totalRow]
    .map(row => row.map(v => `"${v}"`).join(","))
    .join("\n");
  
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `残高試算表_${startDate}_${endDate}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
```

## ボタンスタイル
backgroundColor: "#f5f5f7"
color: "#1d1d1f"
border: "1px solid #d2d2d7"
borderRadius: 980
padding: "10px 20px"
fontSize: 14
fontWeight: 500
cursor: "pointer"
