"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Journal = {
  id: string;
  journal_date: string;
  debit_account: string;
  credit_account: string;
  amount: number;
  description: string;
};

type LedgerRow = {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

const ACCOUNTS = [
  "現金", "普通預金", "当座預金", "売掛金", "未収入金",
  "前払費用", "仮払金", "建物", "車両運搬具", "備品",
  "買掛金", "未払金", "前受金", "仮受金", "借入金",
  "資本金", "売上高", "受取利息", "仕入高", "給料手当",
  "法定福利費", "福利厚生費", "地代家賃", "水道光熱費", "通信費", "旅費交通費",
  "消耗品費", "広告宣伝費", "接待交際費", "会議費", "新聞図書費", "研修費",
  "支払利息", "租税公課", "減価償却費", "雑費",
];

export default function GeneralLedgerPage() {
  const router = useRouter();
  const supabase = createClient();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState(ACCOUNTS[0]);
  const [startDate, setStartDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  });
  const [endDate, setEndDate] = useState(() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${lastDay}`;
  });

  useEffect(() => { load(); }, [startDate, endDate]);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: company } = await supabase
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) { setLoading(false); return; }

    const { data } = await supabase
      .from("journals")
      .select("*")
      .eq("company_id", company.id)
      .gte("journal_date", startDate)
      .lte("journal_date", endDate)
      .order("journal_date", { ascending: true });

    setJournals(data ?? []);
    setLoading(false);
  }

  // 選択勘定科目に関連する仕訳を抽出してレジャー形式に変換
  const ledgerRows: LedgerRow[] = (() => {
    let balance = 0;
    return journals
      .filter(j => j.debit_account === selectedAccount || j.credit_account === selectedAccount)
      .map(j => {
        const isDebit = j.debit_account === selectedAccount;
        const debit = isDebit ? j.amount : 0;
        const credit = isDebit ? 0 : j.amount;
        balance += debit - credit;
        return {
          date: j.journal_date,
          description: j.description,
          debit,
          credit,
          balance,
        };
      });
  })();

  // 選択勘定科目が存在する科目のみサイドバーに表示
  const usedAccounts = ACCOUNTS.filter(a =>
    journals.some(j => j.debit_account === a || j.credit_account === a)
  );

  const fmt = (n: number) => n === 0 ? "—" : "¥" + Math.abs(n).toLocaleString("ja-JP");
  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const totalDebit = ledgerRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = ledgerRows.reduce((s, r) => s + r.credit, 0);
  const finalBalance = ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].balance : 0;

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

  const activePath = "/general-ledger";

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
      <div style={{ marginLeft: "240px", flex: 1, background: "var(--color-background)", minHeight: "100vh" }}>
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f7", fontFamily: '"Helvetica Neue", "Hiragino Sans", "Yu Gothic", sans-serif' }}>
      {/* ヘッダー */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #d2d2d7", padding: "24px 32px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>総勘定元帳</h1>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: "4px 0 0" }}>勘定科目別の取引明細</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto", display: "flex", gap: 24 }}>
        {/* 勘定科目サイドバー */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
            {loading ? (
              <div style={{ padding: 20, color: "#6e6e73", fontSize: 13 }}>読み込み中...</div>
            ) : usedAccounts.length === 0 ? (
              <div style={{ padding: 20, color: "#6e6e73", fontSize: 13 }}>データなし</div>
            ) : usedAccounts.map(account => (
              <button
                key={account}
                onClick={() => setSelectedAccount(account)}
                style={{
                  width: "100%", padding: "12px 16px", textAlign: "left",
                  border: "none", borderBottom: "1px solid #f5f5f7",
                  fontSize: 14, fontWeight: selectedAccount === account ? 600 : 400,
                  color: selectedAccount === account ? "#fff" : "#1d1d1f",
                  backgroundColor: selectedAccount === account ? "#0071e3" : "transparent",
                  cursor: "pointer",
                }}
              >
                {account}
              </button>
            ))}
          </div>
        </div>

        {/* 元帳本体 */}
        <div style={{ flex: 1 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
            {/* 科目タイトル */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1d1d1f", margin: 0 }}>{selectedAccount}</h2>
            </div>

            {ledgerRows.length === 0 ? (
              <div style={{ padding: "60px 32px", textAlign: "center", color: "#6e6e73", fontSize: 14 }}>
                該当期間の取引データがありません
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                    {["日付", "摘要", "借方", "貸方", "残高"].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: h === "日付" || h === "摘要" ? "left" : "right", fontSize: 12, fontWeight: 600, color: "#6e6e73" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.map((row, idx) => (
                    <tr key={idx}
                      style={{ borderBottom: idx < ledgerRows.length - 1 ? "1px solid #f5f5f7" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9f9fb"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <td style={{ padding: "14px 20px", fontSize: 13, color: "#6e6e73", whiteSpace: "nowrap" }}>{fmtDate(row.date)}</td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: "#1d1d1f" }}>{row.description}</td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: "#0071e3", textAlign: "right", fontWeight: row.debit > 0 ? 600 : 400 }}>{fmt(row.debit)}</td>
                      <td style={{ padding: "14px 20px", fontSize: 14, color: "#1a7f37", textAlign: "right", fontWeight: row.credit > 0 ? 600 : 400 }}>{fmt(row.credit)}</td>
                      <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, color: row.balance >= 0 ? "#1d1d1f" : "#d70015", textAlign: "right" }}>
                        ¥{Math.abs(row.balance).toLocaleString("ja-JP")}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: "2px solid #1d1d1f", backgroundColor: "#fafafa" }}>
                    <td colSpan={2} style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: "#1d1d1f" }}>当期合計</td>
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: "#0071e3", textAlign: "right" }}>¥{totalDebit.toLocaleString("ja-JP")}</td>
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: "#1a7f37", textAlign: "right" }}>¥{totalCredit.toLocaleString("ja-JP")}</td>
                    <td style={{ padding: "14px 20px", fontSize: 14, fontWeight: 700, color: finalBalance >= 0 ? "#1d1d1f" : "#d70015", textAlign: "right" }}>
                      ¥{Math.abs(finalBalance).toLocaleString("ja-JP")}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
    </div>
    </div>
  );
}