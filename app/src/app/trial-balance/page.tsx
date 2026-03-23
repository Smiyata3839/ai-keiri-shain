"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type TrialBalanceRow = {
  account: string;
  debit: number;
  credit: number;
  balance: number;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
};

const ACCOUNT_TYPES: Record<string, TrialBalanceRow["type"]> = {
  現金: "asset", 普通預金: "asset", 当座預金: "asset", 売掛金: "asset",
  未収入金: "asset", 前払費用: "asset", 仮払金: "asset", 建物: "asset",
  車両運搬具: "asset", 備品: "asset",
  買掛金: "liability", 未払金: "liability", 前受金: "liability",
  仮受金: "liability", 借入金: "liability",
  資本金: "equity",
  売上高: "revenue", 受取利息: "revenue",
  仕入高: "expense", 給料手当: "expense", 法定福利費: "expense",
  地代家賃: "expense", 水道光熱費: "expense", 通信費: "expense",
  旅費交通費: "expense", 消耗品費: "expense", 広告宣伝費: "expense",
  接待交際費: "expense", 会議費: "expense", 新聞図書費: "expense",
  研修費: "expense", 福利厚生費: "expense",
  支払利息: "expense", 租税公課: "expense",
  減価償却費: "expense", 雑費: "expense",
};

const TYPE_LABELS: Record<TrialBalanceRow["type"], string> = {
  asset: "資産", liability: "負債", equity: "純資産",
  revenue: "収益", expense: "費用",
};

const TYPE_COLORS: Record<TrialBalanceRow["type"], string> = {
  asset: "#0071e3", liability: "#d70015", equity: "#6e36c8",
  revenue: "#1a7f37", expense: "#bf5700",
};

type Tab = "balance" | "monthly";

const getFiscalMonths = (year: number, fiscalMonth: number): string[] => {
  const startMonth = fiscalMonth === 12 ? 1 : fiscalMonth + 1;
  const months: string[] = [];
  for (let i = 0; i < 12; i++) {
    const m = ((startMonth - 1 + i) % 12) + 1;
    const y = year + Math.floor((startMonth - 1 + i) / 12);
    months.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return months;
};

const getFiscalDateRange = (year: number, fiscalMonth: number): { start: string; end: string } => {
  const months = getFiscalMonths(year, fiscalMonth);
  const firstMonth = months[0];
  const lastMonth = months[11];
  const [ly, lm] = lastMonth.split("-").map(Number);
  const lastDay = new Date(ly, lm, 0).getDate();
  return { start: `${firstMonth}-01`, end: `${lastMonth}-${lastDay}` };
};

export default function TrialBalancePage() {
  const router = useRouter();
  const supabase = createClient();
  const [rows, setRows] = useState<TrialBalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("balance");
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  });

  // 月次推移表用state
  const [fiscalMonth, setFiscalMonth] = useState<number>(3);
  const [fiscalYear, setFiscalYear] = useState<number>(() => {
    const now = new Date();
    return now.getMonth() + 1 <= 3 ? now.getFullYear() - 1 : now.getFullYear();
  });
  const [monthlyData, setMonthlyData] = useState<Record<string, Record<string, number>>>({});
  const [monthlyAccounts, setMonthlyAccounts] = useState<string[]>([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [fiscalMonths, setFiscalMonths] = useState<string[]>([]);

  useEffect(() => { load(); }, [startDate, endDate]);

  useEffect(() => {
    if (tab === "monthly") loadMonthly();
  }, [tab, fiscalYear, fiscalMonth]);

  // 初期ロード時にfiscal_monthを取得
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: company } = await supabase
        .from("companies").select("fiscal_month").eq("user_id", user.id).single();
      if (company?.fiscal_month) {
        setFiscalMonth(company.fiscal_month);
        // fiscal_monthに基づいて現在の年度を再計算
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const fm = company.fiscal_month;
        const startMonth = fm === 12 ? 1 : fm + 1;
        if (currentMonth >= startMonth) {
          setFiscalYear(now.getFullYear());
        } else {
          setFiscalYear(now.getFullYear() - 1);
        }
      }
    })();
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: company } = await supabase
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) { setLoading(false); return; }

    const { data: journals } = await supabase
      .from("journals")
      .select("debit_account, credit_account, amount")
      .eq("company_id", company.id)
      .gte("journal_date", startDate)
      .lte("journal_date", endDate);

    const map: Record<string, { debit: number; credit: number }> = {};
    for (const j of journals ?? []) {
      if (!map[j.debit_account]) map[j.debit_account] = { debit: 0, credit: 0 };
      if (!map[j.credit_account]) map[j.credit_account] = { debit: 0, credit: 0 };
      map[j.debit_account].debit += j.amount;
      map[j.credit_account].credit += j.amount;
    }

    const result: TrialBalanceRow[] = Object.entries(map).map(([account, v]) => ({
      account,
      debit: v.debit,
      credit: v.credit,
      balance: v.debit - v.credit,
      type: ACCOUNT_TYPES[account] ?? "asset",
    }));

    const order: TrialBalanceRow["type"][] = ["asset", "liability", "equity", "revenue", "expense"];
    result.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));

    setRows(result);
    setLoading(false);
  }

  async function loadMonthly() {
    setMonthlyLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setMonthlyLoading(false); return; }
    const { data: company } = await supabase
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) { setMonthlyLoading(false); return; }

    const months = getFiscalMonths(fiscalYear, fiscalMonth);
    setFiscalMonths(months);
    const { start, end } = getFiscalDateRange(fiscalYear, fiscalMonth);

    const { data: journals } = await supabase
      .from("journals")
      .select("debit_account, credit_account, amount, journal_date")
      .eq("company_id", company.id)
      .gte("journal_date", start)
      .lte("journal_date", end);

    const data: Record<string, Record<string, number>> = {};
    const accountSet = new Set<string>();
    for (const j of journals ?? []) {
      const month = j.journal_date.substring(0, 7);
      if (!data[month]) data[month] = {};
      accountSet.add(j.debit_account);
      accountSet.add(j.credit_account);
      data[month][j.debit_account] = (data[month][j.debit_account] ?? 0) + j.amount;
      data[month][j.credit_account] = (data[month][j.credit_account] ?? 0) - j.amount;
    }

    // タイプ別ソート
    const order: TrialBalanceRow["type"][] = ["asset", "liability", "equity", "revenue", "expense"];
    const accounts = Array.from(accountSet).sort((a, b) => {
      const ta = ACCOUNT_TYPES[a] ?? "asset";
      const tb = ACCOUNT_TYPES[b] ?? "asset";
      return order.indexOf(ta) - order.indexOf(tb);
    });

    setMonthlyData(data);
    setMonthlyAccounts(accounts);
    setMonthlyLoading(false);
  }

  const fmt = (n: number) => (n < 0 ? "-" : "") + "¥" + Math.abs(n).toLocaleString("ja-JP");
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);

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

  const handleDownloadMonthlyCSV = () => {
    const monthLabels = fiscalMonths.map(m => {
      const mon = parseInt(m.split("-")[1]);
      return `${mon}月`;
    });
    const headers = ["勘定科目", ...monthLabels, "合計"];
    const dataRows = monthlyAccounts.map(account => {
      const values = fiscalMonths.map(m => monthlyData[m]?.[account] ?? 0);
      const total = values.reduce((s, v) => s + v, 0);
      return [account, ...values, total];
    });

    const bom = "\uFEFF";
    const csv = bom + [headers, ...dataRows]
      .map(row => row.map(v => `"${v}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `月次推移表_${fiscalYear}年度.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 年度選択肢を生成（直近5年）
  const yearOptions: number[] = [];
  const currentYear = new Date().getFullYear();
  for (let y = currentYear; y >= currentYear - 4; y--) {
    yearOptions.push(y);
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    backgroundColor: active ? "#1d1d1f" : "#fff",
    color: active ? "#fff" : "#1d1d1f",
    borderRadius: 980,
    fontSize: 13,
    padding: "7px 18px",
    border: active ? "none" : "1px solid #d2d2d7",
    cursor: "pointer",
    fontWeight: 500,
  });

  const activePath = "/trial-balance";

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      {/* サイドバー */}
      <div style={{
        width: "240px", minWidth: "240px",
        background: "#1c1c1e", color: "white",
        display: "flex", flexDirection: "column",
        height: "100vh", position: "fixed", left: 0, top: 0,
        overflowY: "auto",
      }}>
        <div style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <div style={{
            width: "32px", height: "32px", background: "var(--color-primary)",
            borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
          }}>💼</div>
          <span style={{ fontSize: "15px", fontWeight: "700" }}>AI経理社員</span>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {[
            { label: "メイン", items: [{ icon: "💬", label: "チャット", path: "/chat" }] },
            { label: "受発注", items: [
              { icon: "📄", label: "請求書発行", path: "/invoices/new" },
              { icon: "📋", label: "請求書一覧", path: "/invoices" },
              { icon: "💰", label: "売掛管理", path: "/receivables" },
            ]},
            { label: "会計", items: [
              { icon: "🏦", label: "銀行明細取込", path: "/bank" },
              { icon: "📒", label: "仕訳一覧", path: "/journals" },
              { icon: "📒", label: "総勘定元帳", path: "/general-ledger" },
              { icon: "📊", label: "残高試算表", path: "/trial-balance" },
              { icon: "📈", label: "貸借対照表", path: "/balance-sheet" },
              { icon: "📉", label: "損益計算書", path: "/profit-loss" },
            ]},
            { label: "経費", items: [{ icon: "🧾", label: "領収書アップロード", path: "/receipts" }] },
            { label: "設定", items: [
              { icon: "👥", label: "顧客管理", path: "/customers" },
              { icon: "🏢", label: "自社情報", path: "/company" },
            ]},
          ].map((group) => (
            <div key={group.label} style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "rgba(255,255,255,0.35)", padding: "0 8px 6px", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                {group.label}
              </div>
              {group.items.map((item) => (
                <div key={item.path} onClick={() => router.push(item.path)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 10px", borderRadius: "7px", cursor: "pointer", marginBottom: "2px",
                    background: item.path === activePath ? "rgba(0,113,227,0.3)" : "transparent",
                    color: item.path === activePath ? "white" : "rgba(255,255,255,0.7)",
                    fontSize: "13.5px",
                  }}
                  onMouseEnter={(e) => { if (item.path !== activePath) e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { if (item.path !== activePath) e.currentTarget.style.background = "transparent"; }}
                >
                  <span>{item.icon}</span><span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 8px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div onClick={() => { supabase.auth.signOut(); router.push("/login"); }}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "7px", cursor: "pointer", fontSize: "13.5px", color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span>🚪</span><span>ログアウト</span>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div style={{ marginLeft: "240px", flex: 1, minHeight: "100vh", backgroundColor: "#f5f5f7", fontFamily: '"Helvetica Neue", "Hiragino Sans", "Yu Gothic", sans-serif' }}>
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #d2d2d7", padding: "24px 32px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>残高試算表</h1>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: "4px 0 0" }}>勘定科目別の借方・貸方残高</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {tab === "balance" ? (
              <>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 14, color: "#1d1d1f" }}
                />
                <span style={{ color: "#6e6e73", fontSize: 14 }}>〜</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 14, color: "#1d1d1f" }}
                />
                <button
                  onClick={handleDownloadCSV}
                  style={{ backgroundColor: "#f5f5f7", color: "#1d1d1f", border: "1px solid #d2d2d7", borderRadius: 980, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  CSVダウンロード
                </button>
              </>
            ) : (
              <>
                <select
                  value={fiscalYear}
                  onChange={e => setFiscalYear(Number(e.target.value))}
                  style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #d2d2d7", fontSize: 14, color: "#1d1d1f", backgroundColor: "#fff" }}
                >
                  {yearOptions.map(y => (
                    <option key={y} value={y}>{y}年度</option>
                  ))}
                </select>
                <button
                  onClick={handleDownloadMonthlyCSV}
                  style={{ backgroundColor: "#f5f5f7", color: "#1d1d1f", border: "1px solid #d2d2d7", borderRadius: 980, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                >
                  CSVダウンロード
                </button>
              </>
            )}
          </div>
        </div>
        {/* タブ */}
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setTab("balance")} style={tabStyle(tab === "balance")}>
            残高試算表
          </button>
          <button onClick={() => setTab("monthly")} style={tabStyle(tab === "monthly")}>
            月次推移表
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: tab === "monthly" ? "100%" : 1000, margin: "0 auto" }}>
        {tab === "balance" ? (
          // 残高試算表
          loading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, color: "#6e6e73" }}>読み込み中...</div>
          ) : rows.length === 0 ? (
            <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "60px 32px", textAlign: "center", color: "#6e6e73", fontSize: 14 }}>
              該当期間の仕訳データがありません
            </div>
          ) : (
            <div style={{ backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                    {["区分", "勘定科目", "借方合計", "貸方合計", "残高"].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: h === "区分" || h === "勘定科目" ? "left" : "right", fontSize: 12, fontWeight: 600, color: "#6e6e73" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={r.account}
                      style={{ borderBottom: idx < rows.length - 1 ? "1px solid #f5f5f7" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9f9fb"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <td style={{ padding: "14px 20px" }}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 980, fontSize: 11, fontWeight: 600, color: TYPE_COLORS[r.type], backgroundColor: TYPE_COLORS[r.type] + "18", border: `1px solid ${TYPE_COLORS[r.type]}` }}>
                          {TYPE_LABELS[r.type]}
                        </span>
                      </td>
                      <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 500, color: "#1d1d1f" }}>{r.account}</td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: "#0071e3", textAlign: "right" }}>{fmt(r.debit)}</td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: "#1a7f37", textAlign: "right" }}>{fmt(r.credit)}</td>
                      <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: r.balance >= 0 ? "#1d1d1f" : "#d70015", textAlign: "right" }}>{fmt(r.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #1d1d1f", backgroundColor: "#fafafa" }}>
                    <td colSpan={2} style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>合計</td>
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: "#0071e3", textAlign: "right" }}>{fmt(totalDebit)}</td>
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: "#1a7f37", textAlign: "right" }}>{fmt(totalCredit)}</td>
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: "#1d1d1f", textAlign: "right" }}>{fmt(totalDebit - totalCredit)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )
        ) : (
          // 月次推移表
          monthlyLoading ? (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, color: "#6e6e73" }}>読み込み中...</div>
          ) : monthlyAccounts.length === 0 ? (
            <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "60px 32px", textAlign: "center", color: "#6e6e73", fontSize: 14 }}>
              該当年度の仕訳データがありません
            </div>
          ) : (
            <div style={{ backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1200 }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                      <th style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6e6e73", position: "sticky", left: 0, backgroundColor: "#fafafa", zIndex: 1, minWidth: 120 }}>勘定科目</th>
                      {fiscalMonths.map(m => {
                        const mon = parseInt(m.split("-")[1]);
                        return (
                          <th key={m} style={{ padding: "12px 12px", textAlign: "right", fontSize: 12, fontWeight: 600, color: "#6e6e73", whiteSpace: "nowrap", minWidth: 90 }}>
                            {mon}月
                          </th>
                        );
                      })}
                      <th style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, fontWeight: 700, color: "#1d1d1f", whiteSpace: "nowrap", minWidth: 100 }}>合計</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyAccounts.map((account, idx) => {
                      const accountType = ACCOUNT_TYPES[account] ?? "asset";
                      const isRevenue = accountType === "revenue";
                      const isExpense = accountType === "expense";
                      const values = fiscalMonths.map(m => monthlyData[m]?.[account] ?? 0);
                      const total = values.reduce((s, v) => s + v, 0);

                      const getColor = (val: number) => {
                        if (val === 0) return "#6e6e73";
                        if (isRevenue && val > 0) return "#1a7f37";
                        if (isExpense && val > 0) return "#bf5700";
                        return "#1d1d1f";
                      };

                      return (
                        <tr key={account}
                          style={{ borderBottom: idx < monthlyAccounts.length - 1 ? "1px solid #f5f5f7" : "none" }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9f9fb"}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                        >
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 500, color: "#1d1d1f", position: "sticky", left: 0, backgroundColor: "inherit", zIndex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: TYPE_COLORS[accountType], flexShrink: 0 }} />
                              {account}
                            </div>
                          </td>
                          {values.map((val, i) => (
                            <td key={fiscalMonths[i]} style={{ padding: "12px 12px", fontSize: 13, textAlign: "right", color: getColor(val), whiteSpace: "nowrap" }}>
                              {val === 0 ? "—" : fmt(val)}
                            </td>
                          ))}
                          <td style={{ padding: "12px 16px", fontSize: 13, fontWeight: 600, textAlign: "right", color: getColor(total), whiteSpace: "nowrap" }}>
                            {total === 0 ? "—" : fmt(total)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>
      </div>
    </div>
  );
}
