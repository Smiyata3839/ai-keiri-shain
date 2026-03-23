# P/L・B/S 期間選択タブ追加仕様

## 対象ファイル
- src/app/profit-loss/page.tsx
- src/app/balance-sheet/page.tsx

## 概要
現在の月次選択に加えて、月次・四半期・半期・通年のタブ切替を追加する。
期間の起算月はcompaniesテーブルのfiscal_monthを使用する。

## 期間定義（fiscal_month=3の場合の例）
- 通年：4月1日〜3月31日
- 上半期：4月〜9月
- 下半期：10月〜3月
- 第1四半期：4月〜6月
- 第2四半期：7月〜9月
- 第3四半期：10月〜12月
- 第4四半期：1月〜3月

## 実装仕様

### 追加state
const [fiscalMonth, setFiscalMonth] = useState<number>(3);
const [periodType, setPeriodType] = useState<"monthly" | "q1" | "q2" | "q3" | "q4" | "h1" | "h2" | "annual">("monthly");
const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

### fiscal_month取得
loadData()内でcompaniesテーブルからfiscal_monthも取得してsetFiscalMonth()にセット

### 期間計算関数
```typescript
const getPeriodRange = (
  type: string,
  year: number,
  fiscalMonth: number
): { startDate: string; endDate: string } => {
  // 事業年度開始月を計算
  const fiscalStartMonth = fiscalMonth === 12 ? 1 : fiscalMonth + 1;
  
  // 通年
  if (type === "annual") {
    const startYear = fiscalStartMonth <= new Date().getMonth() + 1 ? year : year - 1;
    const endYear = fiscalMonth < fiscalStartMonth ? startYear + 1 : startYear;
    return {
      startDate: `${startYear}-${String(fiscalStartMonth).padStart(2, "0")}-01`,
      endDate: `${endYear}-${String(fiscalMonth).padStart(2, "0")}-${new Date(endYear, fiscalMonth, 0).getDate()}`,
    };
  }
  
  // 四半期・半期の計算
  const quarters = [0, 1, 2, 3].map(i => {
    const m = ((fiscalStartMonth - 1 + i * 3) % 12) + 1;
    const y = year + Math.floor((fiscalStartMonth - 1 + i * 3) / 12);
    return m;
  });
  
  const getQuarterRange = (qIndex: number) => {
    const startM = ((fiscalStartMonth - 1 + qIndex * 3) % 12) + 1;
    const startY = year + Math.floor((fiscalStartMonth - 1 + qIndex * 3) / 12);
    const endM = ((fiscalStartMonth - 1 + qIndex * 3 + 2) % 12) + 1;
    const endY = year + Math.floor((fiscalStartMonth - 1 + qIndex * 3 + 2) / 12);
    return {
      startDate: `${startY}-${String(startM).padStart(2, "0")}-01`,
      endDate: `${endY}-${String(endM).padStart(2, "0")}-${new Date(endY, endM, 0).getDate()}`,
    };
  };
  
  if (type === "q1") return getQuarterRange(0);
  if (type === "q2") return getQuarterRange(1);
  if (type === "q3") return getQuarterRange(2);
  if (type === "q4") return getQuarterRange(3);
  if (type === "h1") {
    const q1 = getQuarterRange(0);
    const q2 = getQuarterRange(1);
    return { startDate: q1.startDate, endDate: q2.endDate };
  }
  if (type === "h2") {
    const q3 = getQuarterRange(2);
    const q4 = getQuarterRange(3);
    return { startDate: q3.startDate, endDate: q4.endDate };
  }
  
  // monthly（既存の月次）
  return {
    startDate: `${year}-${period.split("-")[1]}-01`,
    endDate: new Date(year, parseInt(period.split("-")[1]), 0).toISOString().split("T")[0],
  };
};
```

### UIタブ
ヘッダー右側に期間タブを追加：
タブ：月次 / Q1 / Q2 / Q3 / Q4 / 上半期 / 下半期 / 通年
月次選択時のみ既存のinput[type=month]を表示
それ以外は年度選択（select）を表示

### タブのスタイル
既存のフィルタータブと同じAppleライクなデザイン
選択中：backgroundColor #1d1d1f, color #fff
未選択：backgroundColor #fff, color #1d1d1f, border #d2d2d7
borderRadius: 980px, fontSize: 13, padding: 7px 14px