"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type PLRow = { account: string; amount: number };

const REVENUE_ACCOUNTS = ["売上高", "受取利息"];
const EXPENSE_ACCOUNTS = [
  "仕入高", "給料手当", "法定福利費", "福利厚生費", "地代家賃", "水道光熱費",
  "通信費", "旅費交通費", "消耗品費", "広告宣伝費", "接待交際費", "会議費",
  "新聞図書費", "研修費", "支払利息", "租税公課", "減価償却費", "雑費",
];

type PeriodType = "monthly" | "q1" | "q2" | "q3" | "q4" | "h1" | "h2" | "annual";

const getPeriodRange = (
  type: string,
  year: number,
  fiscalMonth: number,
  period: string
): { startDate: string; endDate: string } => {
  const fiscalStartMonth = fiscalMonth === 12 ? 1 : fiscalMonth + 1;

  if (type === "annual") {
    const startYear = fiscalStartMonth <= fiscalMonth ? year : year;
    const endYear = fiscalMonth < fiscalStartMonth ? startYear + 1 : startYear;
    return {
      startDate: `${startYear}-${String(fiscalStartMonth).padStart(2, "0")}-01`,
      endDate: `${endYear}-${String(fiscalMonth).padStart(2, "0")}-${new Date(endYear, fiscalMonth, 0).getDate()}`,
    };
  }

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

  // monthly
  const y = parseInt(period.split("-")[0]);
  const m = parseInt(period.split("-")[1]);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    startDate: `${period.split("-")[0]}-${period.split("-")[1]}-01`,
    endDate: `${period.split("-")[0]}-${period.split("-")[1]}-${String(lastDay).padStart(2, "0")}`,
  };
};

export default function ProfitLossPage() {
  const router = useRouter();
  const supabase = createClient();
  const [revenues, setRevenues] = useState<PLRow[]>([]);
  const [expenses, setExpenses] = useState<PLRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [fiscalMonth, setFiscalMonth] = useState<number>(3);
  const [periodType, setPeriodType] = useState<PeriodType>("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  useEffect(() => { load(); }, [period, periodType, selectedYear]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: company } = await supabase
      .from("companies").select("id, fiscal_month").eq("user_id", user.id).single();
    if (!company) { setLoading(false); return; }

    if (company.fiscal_month) setFiscalMonth(company.fiscal_month);
    const fm = company.fiscal_month || 3;

    const { startDate, endDate } = getPeriodRange(periodType, selectedYear, fm, period);

    const { data: journals } = await supabase
      .from("journals")
      .select("debit_account, credit_account, amount")
      .eq("company_id", company.id)
      .gte("journal_date", startDate)
      .lte("journal_date", endDate);

    // 収益は貸方発生額、費用は借方発生額で別々に集計
    const creditMap: Record<string, number> = {};
    const debitMap: Record<string, number> = {};
    for (const j of journals ?? []) {
      debitMap[j.debit_account] = (debitMap[j.debit_account] ?? 0) + j.amount;
      creditMap[j.credit_account] = (creditMap[j.credit_account] ?? 0) + j.amount;
    }

    const toRows = (accounts: string[], map: Record<string, number>): PLRow[] =>
      accounts.filter(a => map[a]).map(a => ({ account: a, amount: map[a] ?? 0 }));

    setRevenues(toRows(REVENUE_ACCOUNTS, creditMap));
    setExpenses(toRows(EXPENSE_ACCOUNTS, debitMap));
    setLoading(false);
  }

  const fmt = (n: number) => "¥" + n.toLocaleString("ja-JP");
  const sum = (rows: PLRow[]) => rows.reduce((s, r) => s + r.amount, 0);
  const totalRevenue = sum(revenues);
  const totalExpense = sum(expenses);
  const netIncome = totalRevenue - totalExpense;

  const Section = ({ title, rows, color }: { title: string; rows: PLRow[]; color: string }) => (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: "0.5px", marginBottom: 8, paddingBottom: 6, borderBottom: `2px solid ${color}` }}>
        {title}
      </div>
      {rows.length === 0 ? (
        <div style={{ fontSize: 13, color: "#6e6e73", padding: "8px 0" }}>データなし</div>
      ) : rows.map(r => (
        <div key={r.account} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #f5f5f7" }}>
          <span style={{ fontSize: 14, color: "#1d1d1f" }}>{r.account}</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: "#1d1d1f" }}>{fmt(r.amount)}</span>
        </div>
      ))}
    </div>
  );

  const activePath = "/profit-loss";

  return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f7", fontFamily: '"Helvetica Neue", "Hiragino Sans", "Yu Gothic", sans-serif' }}>
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #d2d2d7", padding: "24px 32px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>損益計算書</h1>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: "4px 0 0" }}>Profit & Loss Statement（P/L）</p>
          </div>
          {periodType === "monthly" ? (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <select value={period.split("-")[0]} onChange={e => setPeriod(`${e.target.value}-${period.split("-")[1]}`)}
                style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 14, color: "#1d1d1f", backgroundColor: "#fff" }}>
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                  <option key={y} value={y}>{y}年</option>
                ))}
              </select>
              <select value={parseInt(period.split("-")[1])} onChange={e => setPeriod(`${period.split("-")[0]}-${String(e.target.value).padStart(2, "0")}`)}
                style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 14, color: "#1d1d1f", backgroundColor: "#fff" }}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>
          ) : (
            <select value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 14, color: "#1d1d1f", backgroundColor: "#fff" }}>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                <option key={y} value={y}>{y}年度</option>
              ))}
            </select>
          )}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {([
            { key: "monthly", label: "月次" },
            { key: "q1", label: "Q1" },
            { key: "q2", label: "Q2" },
            { key: "q3", label: "Q3" },
            { key: "q4", label: "Q4" },
            { key: "h1", label: "上半期" },
            { key: "h2", label: "下半期" },
            { key: "annual", label: "通年" },
          ] as { key: PeriodType; label: string }[]).map(tab => (
            <button key={tab.key} onClick={() => setPeriodType(tab.key)}
              style={{
                backgroundColor: periodType === tab.key ? "#0D1B2A" : "#fff",
                color: periodType === tab.key ? "#fff" : "#1d1d1f",
                border: periodType === tab.key ? "1px solid #0D1B2A" : "1px solid #d2d2d7",
                borderRadius: 980, fontSize: 13, padding: "7px 14px", cursor: "pointer",
                fontWeight: periodType === tab.key ? 600 : 400,
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 800, margin: "0 auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, color: "#6e6e73" }}>読み込み中...</div>
        ) : (
          <>
            {/* サマリーカード */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "売上合計", value: fmt(totalRevenue), color: "#1a7f37" },
                { label: "費用合計", value: fmt(totalExpense), color: "#d70015" },
                { label: netIncome >= 0 ? "当期純利益" : "当期純損失", value: fmt(Math.abs(netIncome)), color: netIncome >= 0 ? "#00D4FF" : "#d70015" },
              ].map(card => (
                <div key={card.label} style={{ backgroundColor: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 13, color: "#6e6e73", marginBottom: 8 }}>{card.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* P/L本体 */}
            <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
              <Section title="収益" rows={revenues} color="#1a7f37" />
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #d2d2d7", marginBottom: 24 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>売上合計</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1a7f37" }}>{fmt(totalRevenue)}</span>
              </div>

              <Section title="費用" rows={expenses} color="#d70015" />
              <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #d2d2d7", marginBottom: 24 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>費用合計</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#d70015" }}>{fmt(totalExpense)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderRadius: 12, backgroundColor: netIncome >= 0 ? "#e6f4ea" : "#ffeef0", border: `2px solid ${netIncome >= 0 ? "#1a7f37" : "#d70015"}` }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1d1d1f" }}>
                  {netIncome >= 0 ? "当期純利益" : "当期純損失"}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: netIncome >= 0 ? "#1a7f37" : "#d70015" }}>
                  {fmt(Math.abs(netIncome))}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
  );
}