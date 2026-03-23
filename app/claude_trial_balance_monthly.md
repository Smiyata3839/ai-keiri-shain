# 残高試算表 月次推移表追加仕様

## 対象ファイル
src/app/trial-balance/page.tsx

## 概要
現在の残高試算表に「推移表」タブを追加する。
タブ切替で「残高試算表」と「月次推移表」を切り替えられるようにする。

## タブ構成
- 残高試算表（現状のまま）
- 月次推移表（新規追加）

## 月次推移表の仕様

### 表示期間
companiesテーブルのfiscal_monthを使って事業年度を自動計算。
年度選択（select）で年度を切り替え可能。
例：決算月3月の場合、2025年度 = 2025年4月〜2026年3月

### 表の構造
列：勘定科目 | 4月 | 5月 | 6月 | ... | 3月 | 合計
行：各勘定科目

### データ取得
事業年度の全月分のjournalsデータを一括取得し、
月ごと・科目ごとに集計する。

### 実装コード例
```typescript
// 事業年度の月リストを生成
const getFiscalMonths = (year: number, fiscalMonth: number): string[] => {
  const startMonth = fiscalMonth === 12 ? 1 : fiscalMonth + 1;
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = year + Math.floor((startMonth - 1 + i) / 12);
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return months;
};

// 月ごと・科目ごとの集計
const monthlyData: Record<string, Record<string, number>> = {};
for (const j of journals) {
  const month = j.journal_date.substring(0, 7); // "2026-02"
  if (!monthlyData[month]) monthlyData[month] = {};
  monthlyData[j.debit_account] = monthlyData[j.debit_account] ?? {};
  monthlyData[month][j.debit_account] = (monthlyData[month][j.debit_account] ?? 0) + j.amount;
  monthlyData[month][j.credit_account] = (monthlyData[month][j.credit_account] ?? 0) - j.amount;
}
```

### UI仕様
- 横スクロール対応（overflow-x: auto）
- 月の列ヘッダー：「4月」「5月」...「3月」
- 合計列を最右に表示
- 金額がゼロの場合は「—」で表示
- 収益科目はプラスを緑、費用科目はプラスをオレンジで表示
- CSVダウンロードボタンも追加

### CSV出力ファイル名
月次推移表_{year}年度.csv

### タブスタイル
既存のAppleライクなデザインに統一
選択中：backgroundColor #1d1d1f, color #fff
未選択：backgroundColor #fff, color #1d1d1f
borderRadius: 980px, fontSize: 13