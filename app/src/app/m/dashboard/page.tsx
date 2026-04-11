"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { ChevronDown } from "lucide-react";
import {
  AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, PieChart, Pie, Cell,
} from "recharts";

const REVENUE_ACCOUNTS = ["売上高", "受取利息"];
const EXPENSE_ACCOUNTS = [
  "仕入高", "給料手当", "法定福利費", "福利厚生費", "地代家賃", "水道光熱費",
  "通信費", "旅費交通費", "消耗品費", "広告宣伝費", "接待交際費", "会議費",
  "新聞図書費", "研修費", "支払利息", "租税公課", "減価償却費", "雑費",
];

const PIE_COLORS = ["#3b6df0", "#0d9488", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1", "#14b8a6", "#e11d48", "#a855f7", "#64748b", "#22c55e", "#eab308", "#dc2626", "#9ca3af"];

function getStartMonth(fm: number) { return (fm % 12) + 1; }
function getCurrentFiscalStartYear(today: Date, sm: number) {
  const y = today.getFullYear(), m = today.getMonth() + 1;
  return m >= sm ? y : y - 1;
}
function getFiscalMonths(sy: number, sm: number) {
  const months: { label: string; start: string; end: string }[] = [];
  for (let i = 0; i < 12; i++) {
    let m = sm + i, y = sy;
    if (m > 12) { m -= 12; y += 1; }
    const mm = String(m).padStart(2, "0");
    const ld = new Date(y, m, 0).getDate();
    months.push({ label: `${m}月`, start: `${y}-${mm}-01`, end: `${y}-${mm}-${String(ld).padStart(2, "0")}` });
  }
  return months;
}

const fmt = (n: number) => "¥" + Math.abs(n).toLocaleString("ja-JP");

type ProfitMonth = { month: string; profit: number };
type ExpenseCategory = { name: string; value: number };

export default function MobileDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [startMonth, setStartMonth] = useState(4);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const companyIdRef = useRef<string | null>(null);
  const startMonthRef = useRef(4);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [totalOverdue, setTotalOverdue] = useState(0);
  const [profitData, setProfitData] = useState<ProfitMonth[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [expenseData, setExpenseData] = useState<ExpenseCategory[]>([]);
  const [totalExpense, setTotalExpense] = useState(0);

  const yearOptions = useMemo(() => {
    if (!selectedYear) return [];
    const opts: number[] = [];
    for (let y = selectedYear - 3; y <= selectedYear + 1; y++) opts.push(y);
    return opts;
  }, [selectedYear]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: company } = await supabase
        .from("companies").select("id, fiscal_month").eq("user_id", user.id).single();
      if (!company) { setLoading(false); return; }
      const sm = getStartMonth(company.fiscal_month || 3);
      const fy = getCurrentFiscalStartYear(new Date(), sm);
      setStartMonth(sm);
      startMonthRef.current = sm;
      setCompanyId(company.id);
      companyIdRef.current = company.id;
      setSelectedYear(fy);
      loadData(company.id, fy, sm);
    };
    init();
  }, []);

  async function loadData(cid: string, year: number, sm: number) {
    setLoading(true);
    const months = getFiscalMonths(year, sm);
    const fyStart = months[0].start, fyEnd = months[11].end;

    const [invRes, jrnRes] = await Promise.all([
      supabase.from("invoices").select("issue_date, total, status")
        .eq("company_id", cid)
        .in("status", ["paid", "overdue", "sent", "delivered", "pending", "partial"])
        .gte("issue_date", fyStart).lte("issue_date", fyEnd),
      supabase.from("journals").select("journal_date, debit_account, credit_account, amount")
        .eq("company_id", cid)
        .gte("journal_date", fyStart).lte("journal_date", fyEnd),
    ]);

    const invoices = invRes.data ?? [];
    const journals = jrnRes.data ?? [];

    // 売上
    const paid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total ?? 0), 0);
    const overdue = invoices.filter(i => i.status !== "paid").reduce((s, i) => s + (i.total ?? 0), 0);
    setTotalPaid(paid);
    setTotalOverdue(overdue);
    setTotalRevenue(paid + overdue);

    // 利益（月別）
    const pData = months.map(m => {
      const mj = journals.filter(j => j.journal_date >= m.start && j.journal_date <= m.end);
      let rev = 0, exp = 0;
      for (const j of mj) {
        if (REVENUE_ACCOUNTS.includes(j.credit_account)) rev += j.amount;
        if (EXPENSE_ACCOUNTS.includes(j.debit_account)) exp += j.amount;
      }
      return { month: m.label, profit: rev - exp };
    });
    setProfitData(pData);
    setTotalProfit(pData.reduce((s, d) => s + d.profit, 0));

    // 経費（科目別）
    const expMap: Record<string, number> = {};
    for (const j of journals) {
      if (EXPENSE_ACCOUNTS.includes(j.debit_account)) {
        expMap[j.debit_account] = (expMap[j.debit_account] || 0) + j.amount;
      }
    }
    const sorted = Object.entries(expMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
    if (sorted.length > 5) {
      const top = sorted.slice(0, 5);
      const otherVal = sorted.slice(5).reduce((s, e) => s + e.value, 0);
      setExpenseData([...top, { name: "その他", value: otherVal }]);
    } else {
      setExpenseData(sorted);
    }
    setTotalExpense(sorted.reduce((s, e) => s + e.value, 0));

    setLoading(false);
  }

  const cardStyle: React.CSSProperties = {
    background: "#ffffff",
    borderRadius: 12,
    marginBottom: 12,
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    border: "1px solid #e5e7eb",
    overflow: "hidden",
  };

  const yearSelector = (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <select
        value={selectedYear ?? ""}
        onChange={e => {
          const y = Number(e.target.value);
          setSelectedYear(y);
          if (companyIdRef.current) loadData(companyIdRef.current, y, startMonthRef.current);
        }}
        style={{
          appearance: "none",
          background: "rgba(255,255,255,0.15)",
          border: "1px solid rgba(255,255,255,0.3)",
          borderRadius: 6,
          color: "#fff",
          fontSize: 12,
          fontWeight: 600,
          padding: "4px 24px 4px 10px",
          cursor: "pointer",
          outline: "none",
        }}
      >
        {yearOptions.map(y => (
          <option key={y} value={y} style={{ color: "#000" }}>{y}年度</option>
        ))}
      </select>
      <ChevronDown size={14} color="#fff" style={{ position: "absolute", right: 6, pointerEvents: "none" }} />
    </div>
  );

  // 売上プログレスバー計算
  const barTotal = Math.max(totalRevenue * 1.15, 1);
  const paidPct = (totalPaid / barTotal) * 100;
  const overduePct = (totalOverdue / barTotal) * 100;

  // 利益グラデーション分割点
  const profitMax = Math.max(...profitData.map(d => d.profit), 0);
  const profitMin = Math.min(...profitData.map(d => d.profit), 0);
  const gradOff = profitMax <= 0 ? 0 : profitMin >= 0 ? 1 : profitMax / (profitMax - profitMin);

  return (
    <>
      <MobileHeader title="ダッシュボード" right={yearSelector} />
      <div style={{ padding: "12px 16px" }}>
        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 60 }}>読み込み中...</div>
        ) : (
          <>
            {/* ── 売上高（1本プログレスバー） ── */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>売上高</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#0d9488", lineHeight: 1 }}>{fmt(totalRevenue)}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>年間売上合計</div>
                </div>
              </div>

              {/* プログレスバー */}
              <div style={{ padding: "12px 16px 0" }}>
                <div style={{ height: 32, borderRadius: 4, background: "#f3f4f6", display: "flex", overflow: "hidden" }}>
                  <div style={{
                    width: `${overduePct}%`,
                    background: "repeating-linear-gradient(45deg, #f87171, #f87171 3px, #fecaca 3px, #fecaca 6px)",
                    transition: "width 0.6s ease",
                  }} />
                  <div style={{
                    width: `${paidPct}%`,
                    background: "#0d9488",
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>

              {/* ラベル */}
              <div style={{ display: "flex", gap: 16, padding: "10px 16px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: 2,
                    background: "repeating-linear-gradient(45deg, #f87171, #f87171 2px, #fecaca 2px, #fecaca 4px)",
                  }} />
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>未回収</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "#dc2626" }}>{fmt(totalOverdue)}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: "#0d9488" }} />
                  <span style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>回収済み</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text)" }}>{fmt(totalPaid)}</span>
                </div>
              </div>
            </div>

            {/* ── 純利益（AreaChart） ── */}
            <div style={{ ...cardStyle, position: "relative" as const }}>
              <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>純利益</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: 24, fontWeight: 700, lineHeight: 1,
                    color: totalProfit >= 0 ? "#0d9488" : "#dc2626",
                  }}>
                    {totalProfit < 0 ? "-" : ""}{fmt(totalProfit)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>年間純利益</div>
                </div>
              </div>
              <div style={{ padding: "8px 0 0" }}>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={profitData} margin={{ left: 0, right: 16, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="mProfitGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" stopOpacity={0.15} />
                        <stop offset={`${gradOff * 100}%`} stopColor="#0d9488" stopOpacity={0.02} />
                        <stop offset={`${gradOff * 100}%`} stopColor="#dc2626" stopOpacity={0.02} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={0.12} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                    <YAxis
                      tickFormatter={v => `¥${(v / 10000).toFixed(0)}万`}
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      axisLine={false} tickLine={false}
                      width={52}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        const val = Number(payload[0].value ?? 0);
                        return (
                          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 6, padding: "6px 10px", fontSize: 12 }}>
                            <div style={{ color: "#6b7280", marginBottom: 2 }}>{label}</div>
                            <div style={{ fontWeight: 600, color: val >= 0 ? "#0d9488" : "#dc2626" }}>
                              純利益 {val < 0 ? "-" : ""}{fmt(val)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    <ReferenceLine y={0} stroke="#0d9488" strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="profit" stroke="#0d9488" fill="url(#mProfitGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── 経費内訳（円グラフ） ── */}
            <div style={cardStyle}>
              <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-secondary)" }}>経費内訳</span>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#e84393", lineHeight: 1 }}>{fmt(totalExpense)}</div>
                  <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>年間経費合計</div>
                </div>
              </div>
              {expenseData.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 32, fontSize: 13 }}>経費データなし</div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", padding: "8px 16px 14px", gap: 0 }}>
                  <div style={{ width: "45%", flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie data={expenseData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={48} outerRadius={65} paddingAngle={2}>
                          {expenseData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => fmt(Number(v ?? 0))} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                    {expenseData.map((e, i) => (
                      <div key={e.name} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PIE_COLORS[i % PIE_COLORS.length], display: "inline-block", flexShrink: 0, marginLeft: 16 }} />
                        <span style={{ fontSize: 11, color: "#6b7280", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap" }}>{fmt(e.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
