"use client";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, ReferenceLine,
} from "recharts";

const REVENUE_ACCOUNTS = ["売上高", "受取利息"];
const EXPENSE_ACCOUNTS = [
  "仕入高", "給料手当", "法定福利費", "福利厚生費", "地代家賃", "水道光熱費",
  "通信費", "旅費交通費", "消耗品費", "広告宣伝費", "接待交際費", "会議費",
  "新聞図書費", "研修費", "支払利息", "租税公課", "減価償却費", "雑費",
];

type RevenueMonth = { month: string; paid: number; overdue: number };
type ProfitMonth = { month: string; profit: number };

/** 決算月(fiscal_month=3なら3月決算)から開始月を返す */
function getStartMonth(fiscalMonth: number) {
  return (fiscalMonth % 12) + 1; // 3→4, 12→1, 9→10
}

/** 今日の日付から現在の年度の開始年を返す */
function getCurrentFiscalStartYear(today: Date, startMonth: number) {
  const y = today.getFullYear();
  const m = today.getMonth() + 1;
  return m >= startMonth ? y : y - 1;
}

function getFiscalMonths(startYear: number, startMonth: number): { label: string; start: string; end: string }[] {
  const months: { label: string; start: string; end: string }[] = [];
  for (let i = 0; i < 12; i++) {
    let m = startMonth + i;
    let y = startYear;
    if (m > 12) { m -= 12; y += 1; }
    const mm = String(m).padStart(2, "0");
    const lastDay = new Date(y, m, 0).getDate();
    months.push({
      label: `${m}月`,
      start: `${y}-${mm}-01`,
      end: `${y}-${mm}-${String(lastDay).padStart(2, "0")}`,
    });
  }
  return months;
}

const fmt = (n: number) => "¥" + Math.abs(n).toLocaleString("ja-JP");

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [startMonth, setStartMonth] = useState(4);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueMonth[]>([]);
  const [profitData, setProfitData] = useState<ProfitMonth[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // 年度選択肢（現在年度を中心に前後3年）
  const yearOptions = useMemo(() => {
    if (!selectedYear) return [];
    const opts: number[] = [];
    for (let y = selectedYear - 3; y <= selectedYear + 1; y++) opts.push(y);
    return opts;
  }, [selectedYear]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUser(user);

      const { data: company } = await supabase
        .from("companies").select("id, fiscal_month").eq("user_id", user.id).single();
      if (!company) { setLoading(false); return; }

      const sm = getStartMonth(company.fiscal_month || 3);
      setStartMonth(sm);
      setCompanyId(company.id);

      const currentFY = getCurrentFiscalStartYear(new Date(), sm);
      setSelectedYear(currentFY);
    };
    init();
  }, []);

  useEffect(() => {
    if (!companyId || !selectedYear) return;
    loadData(companyId, selectedYear, startMonth);
  }, [companyId, selectedYear, startMonth]);

  async function loadData(cid: string, year: number, sm: number) {
    setLoading(true);
    const months = getFiscalMonths(year, sm);
    const fyStart = months[0].start;
    const fyEnd = months[11].end;

    const [invoiceResult, journalResult] = await Promise.all([
      supabase
        .from("invoices")
        .select("issue_date, total, status")
        .eq("company_id", cid)
        .in("status", ["paid", "overdue", "sent", "partial"])
        .gte("issue_date", fyStart)
        .lte("issue_date", fyEnd),
      supabase
        .from("journals")
        .select("journal_date, debit_account, credit_account, amount")
        .eq("company_id", cid)
        .gte("journal_date", fyStart)
        .lte("journal_date", fyEnd),
    ]);

    const invoices = invoiceResult.data ?? [];
    const journals = journalResult.data ?? [];

    setRevenueData(months.map((m) => {
      const mi = invoices.filter((inv) => inv.issue_date >= m.start && inv.issue_date <= m.end);
      const paid = mi.filter((inv) => inv.status === "paid").reduce((s, inv) => s + (inv.total ?? 0), 0);
      const overdue = mi.filter((inv) => inv.status !== "paid").reduce((s, inv) => s + (inv.total ?? 0), 0);
      return { month: m.label, paid, overdue };
    }));

    setProfitData(months.map((m) => {
      const mj = journals.filter((j) => j.journal_date >= m.start && j.journal_date <= m.end);
      let revenue = 0;
      let expense = 0;
      for (const j of mj) {
        if (REVENUE_ACCOUNTS.includes(j.credit_account)) revenue += j.amount;
        if (EXPENSE_ACCOUNTS.includes(j.debit_account)) expense += j.amount;
      }
      return { month: m.label, profit: revenue - expense };
    }));

    setLoading(false);
  }

  const totalRevenue = useMemo(
    () => revenueData.reduce((s, d) => s + d.paid + d.overdue, 0), [revenueData]
  );
  const totalProfit = useMemo(
    () => profitData.reduce((s, d) => s + d.profit, 0), [profitData]
  );

  if (!user) return null;

  const cardStyle: React.CSSProperties = {
    background: "var(--color-card)",
    borderRadius: "var(--radius-card)",
    padding: "28px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    border: "1px solid var(--color-border)",
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Sidebar />
      <div style={{ marginLeft: "360px", flex: 1, background: "var(--color-background)", padding: "40px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
            ダッシュボード
          </h2>
          {selectedYear && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              style={{
                fontSize: "15px",
                fontWeight: "600",
                color: "var(--color-text)",
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                padding: "8px 14px",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}年度</option>
              ))}
            </select>
          )}
        </div>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "36px", fontSize: "15px" }}>
          {user.email} でログイン中
          {selectedYear && !loading && (
            <span style={{ marginLeft: "16px", color: "var(--color-text-secondary)" }}>
              ｜ 起算日: {selectedYear}/{String(startMonth).padStart(2, "0")}/01 ～ 決算日: {getFiscalMonths(selectedYear, startMonth)[11].end}
            </span>
          )}
        </p>

        {loading ? (
          <p style={{ color: "var(--color-text-secondary)" }}>読み込み中...</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            {/* 売上高グラフ */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
                  売上高
                </h3>
                <span style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-text)" }}>
                  {fmt(totalRevenue)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} stroke="var(--color-text-secondary)" fontSize={12} />
                  <YAxis type="category" dataKey="month" width={40} stroke="var(--color-text-secondary)" fontSize={12} />
                  <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                  <Legend />
                  <Bar dataKey="paid" name="回収済み" stackId="a" fill="#4ade80" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="overdue" name="未回収" stackId="a" fill="#f87171" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* 純利益グラフ */}
            <div style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "20px" }}>
                <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
                  純利益
                </h3>
                <span style={{
                  fontSize: "28px", fontWeight: "700",
                  color: totalProfit >= 0 ? "#16a34a" : "#dc2626",
                }}>
                  {totalProfit < 0 ? "-" : ""}{fmt(totalProfit)}
                </span>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={profitData} margin={{ left: 10, right: 20 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4ade80" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#4ade80" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" stroke="var(--color-text-secondary)" fontSize={12} />
                  <YAxis tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} stroke="var(--color-text-secondary)" fontSize={12} />
                  <Tooltip formatter={(v) => fmt(Number(v ?? 0))} />
                  <ReferenceLine y={0} stroke="var(--color-text-secondary)" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="純利益"
                    stroke="#4ade80"
                    fill="url(#profitGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
