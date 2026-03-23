"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BSRow = { account: string; amount: number };
type BSData = {
  currentAssets: BSRow[];
  fixedAssets: BSRow[];
  currentLiabilities: BSRow[];
  fixedLiabilities: BSRow[];
  equity: BSRow[];
};

const CURRENT_ASSETS = ["現金", "普通預金", "当座預金", "売掛金", "未収入金", "前払費用", "仮払金"];
const FIXED_ASSETS = ["建物", "車両運搬具", "備品"];
const CURRENT_LIABILITIES = ["買掛金", "未払金", "前受金", "仮受金"];
const FIXED_LIABILITIES = ["借入金"];
const EQUITY_ACCOUNTS = ["資本金"];
const REVENUE_ACCOUNTS = ["売上高", "受取利息"];
const PL_EXPENSE_ACCOUNTS = [
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

export default function BalanceSheetPage() {
  const router = useRouter();
  const supabase = createClient();
  const [data, setData] = useState<BSData>({ currentAssets: [], fixedAssets: [], currentLiabilities: [], fixedLiabilities: [], equity: [] });
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [fiscalMonth, setFiscalMonth] = useState<number>(3);
  const [periodType, setPeriodType] = useState<PeriodType>("annual");
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    const now = new Date();
    // デフォルト決算月=3月。現在月が決算月以前なら前年度
    return now.getMonth() + 1 <= 3 ? now.getFullYear() - 1 : now.getFullYear();
  });

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

    const { endDate } = getPeriodRange(periodType, selectedYear, fm, period);

    const { data: journals } = await supabase
      .from("journals")
      .select("debit_account, credit_account, amount")
      .eq("company_id", company.id)
      .lte("journal_date", endDate);

    // 借方・貸方を別々に集計し、残高 = 借方合計 - 貸方合計 で算出
    const debitTotal: Record<string, number> = {};
    const creditTotal: Record<string, number> = {};
    for (const j of journals ?? []) {
      debitTotal[j.debit_account] = (debitTotal[j.debit_account] ?? 0) + j.amount;
      creditTotal[j.credit_account] = (creditTotal[j.credit_account] ?? 0) + j.amount;
    }

    const balance = (account: string) => (debitTotal[account] ?? 0) - (creditTotal[account] ?? 0);

    // デバッグ: 売掛金の集計確認
    console.log("=== B/S 売掛金デバッグ ===");
    console.log("journals取得件数:", journals?.length ?? 0);
    console.log("debitTotal['売掛金']:", debitTotal["売掛金"] ?? 0);
    console.log("creditTotal['売掛金']:", creditTotal["売掛金"] ?? 0);
    console.log("balance('売掛金'):", balance("売掛金"));
    // credit_accountの全ユニーク値を表示
    const uniqueCredits = [...new Set((journals ?? []).map(j => j.credit_account))];
    console.log("credit_account ユニーク値:", uniqueCredits);
    // 売掛金を含むcredit_accountを検索（部分一致・空白違い検出）
    const creditWithAR = uniqueCredits.filter(c => c && c.includes("売掛"));
    console.log("売掛を含むcredit_account:", creditWithAR, creditWithAR.map(c => JSON.stringify(c)));
    // 売掛金関連仕訳の全件表示
    const arJournals = (journals ?? []).filter(j => j.debit_account?.includes("売掛") || j.credit_account?.includes("売掛"));
    console.log("売掛金関連仕訳件数:", arJournals.length);
    arJournals.forEach((j, i) => console.log(`  [${i}] debit=${JSON.stringify(j.debit_account)} credit=${JSON.stringify(j.credit_account)} amount=${j.amount}`));

    const toAssetRows = (accounts: string[]): BSRow[] =>
      accounts.map(a => ({ account: a, amount: balance(a) })).filter(r => r.amount !== 0);

    const toLiabilityRows = (accounts: string[]): BSRow[] =>
      accounts.map(a => ({ account: a, amount: Math.abs(balance(a)) })).filter(r => r.amount !== 0);

    // 利益剰余金を計算（収益の貸方合計 - 費用の借方合計）
    const totalRevenue = REVENUE_ACCOUNTS.reduce((s, a) => s + (creditTotal[a] ?? 0), 0);
    const totalExpense = PL_EXPENSE_ACCOUNTS.reduce((s, a) => s + (debitTotal[a] ?? 0), 0);
    const retainedEarnings = totalRevenue - totalExpense;

    const cl = toLiabilityRows(CURRENT_LIABILITIES);
    const fl = toLiabilityRows(FIXED_LIABILITIES);
    const eq = toLiabilityRows(EQUITY_ACCOUNTS);

    // 利益剰余金が0でなければ純資産に追加
    if (retainedEarnings !== 0) {
      eq.push({ account: "利益剰余金", amount: retainedEarnings });
    }

    setData({
      currentAssets: toAssetRows(CURRENT_ASSETS),
      fixedAssets: toAssetRows(FIXED_ASSETS),
      currentLiabilities: cl,
      fixedLiabilities: fl,
      equity: eq,
    });
    setLoading(false);
  }

  const fmt = (n: number) => "¥" + Math.abs(n).toLocaleString("ja-JP");
  const sum = (rows: BSRow[]) => rows.reduce((s, r) => s + r.amount, 0);

  const totalAssets = sum(data.currentAssets) + sum(data.fixedAssets);
  const totalCurrentLiabilities = sum(data.currentLiabilities);
  const totalFixedLiabilities = sum(data.fixedLiabilities);
  const totalLiabilities = totalCurrentLiabilities + totalFixedLiabilities;
  const totalEquity = sum(data.equity);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  const Section = ({ title, rows, color }: { title: string; rows: BSRow[]; color: string }) => (
    <div style={{ marginBottom: 20 }}>
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

  const activePath = "/balance-sheet";

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
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>貸借対照表</h1>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: "4px 0 0" }}>Balance Sheet（B/S）</p>
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
                backgroundColor: periodType === tab.key ? "#1d1d1f" : "#fff",
                color: periodType === tab.key ? "#fff" : "#1d1d1f",
                border: periodType === tab.key ? "1px solid #1d1d1f" : "1px solid #d2d2d7",
                borderRadius: 980, fontSize: 13, padding: "7px 14px", cursor: "pointer",
                fontWeight: periodType === tab.key ? 600 : 400,
              }}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, color: "#6e6e73" }}>読み込み中...</div>
        ) : (
          <>
            {/* 合計バナー */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "資産合計", value: fmt(totalAssets), color: "#0071e3" },
                { label: "負債合計", value: fmt(totalLiabilities), color: "#d70015" },
                { label: "純資産合計", value: fmt(totalEquity), color: "#6e36c8" },
                { label: "負債・純資産合計", value: fmt(totalLiabilitiesAndEquity), color: "#1d1d1f" },
              ].map(card => (
                <div key={card.label} style={{ backgroundColor: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 13, color: "#6e6e73", marginBottom: 8 }}>{card.label}</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* B/S本体 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* 左：資産 */}
              <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0071e3", margin: "0 0 20px" }}>資産の部</h2>
                <Section title="流動資産" rows={data.currentAssets} color="#0071e3" />
                <Section title="固定資産" rows={data.fixedAssets} color="#0071e3" />
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #1d1d1f", marginTop: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f" }}>資産合計</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#0071e3" }}>{fmt(totalAssets)}</span>
                </div>
              </div>

              {/* 右：負債・純資産 */}
              <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "#d70015", margin: "0 0 20px" }}>負債・純資産の部</h2>
                <Section title="流動負債" rows={data.currentLiabilities} color="#d70015" />
                <Section title="固定負債" rows={data.fixedLiabilities} color="#d70015" />
                <Section title="純資産" rows={data.equity} color="#6e36c8" />
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #d2d2d7", marginTop: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#d70015" }}>負債合計</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#d70015" }}>{fmt(totalLiabilities)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid #d2d2d7" }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#6e36c8" }}>純資産合計</span>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#6e36c8" }}>{fmt(totalEquity)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: "2px solid #1d1d1f" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f" }}>負債・純資産合計</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: "#1d1d1f" }}>{fmt(totalLiabilitiesAndEquity)}</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
}