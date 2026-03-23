"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BankTransaction = {
  id: string;
  transaction_date: string;
  description: string;
  amount: number;
  balance: number;
  matched: boolean;
  invoice_id: string | null;
};

type MatchSummary = {
  total: number;
  matched: number;
  unmatched: number;
  matchedAmount: number;
};

export default function BankPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [summary, setSummary] = useState<MatchSummary>({
    total: 0,
    matched: 0,
    unmatched: 0,
    matchedAmount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [bankInfo, setBankInfo] = useState<{name: string, branch: string} | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "matched" | "unmatched">("all");
  const [importResult, setImportResult] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: company } = await supabase
      .from("companies")
      .select("id, bank_name, bank_branch")
      .eq("user_id", user.id)
      .single();

    if (!company) { setLoading(false); return; }
    setCompanyId(company.id);
    setBankInfo({ name: company.bank_name ?? "", branch: company.bank_branch ?? "" });

    const { data: rows } = await supabase
      .from("bank_transactions")
      .select("*")
      .eq("company_id", company.id)
      .order("transaction_date", { ascending: false });

    const list: BankTransaction[] = rows ?? [];
    setTransactions(list);

    const matched = list.filter(t => t.matched).length;
    const matchedAmount = list.filter(t => t.matched).reduce((s, t) => s + t.amount, 0);
    setSummary({
      total: list.length,
      matched,
      unmatched: list.length - matched,
      matchedAmount,
    });

    setLoading(false);
  }

  const detectFormat = (bankName: string): "megabank" | "chigin" | "standard" => {
    if (bankName.includes("三菱UFJ") || bankName.includes("みずほ") || bankName.includes("三井住友")) return "megabank";
    if (bankName.includes("八十二") || bankName.includes("阿波") || bankName.includes("百十四")) return "chigin";
    return "megabank";
  };

  async function handleCSV(e: React.ChangeEvent<HTMLInputElement>) {
    console.log("handleCSV called");
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setImporting(true);
    setImportResult(null);

    const buffer = await file.arrayBuffer();
    const decoder = new TextDecoder("utf-8");
    let text = decoder.decode(buffer);
    // UTF-8で文字化けした場合はShift-JISで再試行
    if (text.includes("\ufffd")) {
      const decoder2 = new TextDecoder("shift-jis");
      text = decoder2.decode(buffer);
    }
    const lines = text.split("\n").filter(l => l.trim());
    const dataLines = lines.slice(1); // ヘッダー行スキップ

    const format = detectFormat(bankInfo?.name ?? "");

    // CSV行をパース（引用符内のカンマを正しく処理）
    const parseCSVLine = (line: string): string[] => {
      const cols: string[] = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          cols.push(current.trim());
          current = "";
        } else {
          current += ch;
        }
      }
      cols.push(current.trim());
      return cols;
    };

    // CSVをパースしてトランザクション配列を構築
    const transactions: { transaction_date: string; description: string; amount: number; balance: number }[] = [];

    for (const line of dataLines) {
      const cols = parseCSVLine(line);
      if (cols.length < 3) continue;

      let transaction_date: string;
      let description: string;
      let amount: number;
      let balance: number;

      if (format === "megabank") {
        transaction_date = cols[0];
        description = cols[1];
        const outgoing = parseInt(cols[2].replace(/[^\d]/g, ""), 10) || 0;
        const incoming = parseInt(cols[3].replace(/[^\d]/g, ""), 10) || 0;
        amount = incoming > 0 ? incoming : -outgoing;
        balance = parseInt(cols[4]?.replace(/[^\d]/g, "") ?? "0", 10) || 0;
      } else if (format === "chigin") {
        transaction_date = cols[1];
        description = cols[4];
        const outgoing = parseInt(cols[2].replace(/[^\d]/g, ""), 10) || 0;
        const incoming = parseInt(cols[3].replace(/[^\d]/g, ""), 10) || 0;
        amount = incoming > 0 ? incoming : -outgoing;
        balance = parseInt(cols[5]?.replace(/[^\d]/g, "") ?? "0", 10) || 0;
      } else {
        transaction_date = cols[0];
        description = cols[1];
        amount = parseInt(cols[2].replace(/[^\d-]/g, ""), 10);
        balance = parseInt(cols[3]?.replace(/[^\d-]/g, "") ?? "0", 10) || 0;
      }

      if (!transaction_date || isNaN(amount)) continue;
      transactions.push({ transaction_date, description, amount, balance });
    }

    // APIルートに送信（supabaseAdminでDB操作）
    const res = await fetch("/api/bank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, transactions, format }),
    });

    if (res.ok) {
      const { inserted, autoMatched } = await res.json();
      setImportResult(`${inserted}件取込完了 / 自動消込 ${autoMatched}件`);
    } else {
      setImportResult("取込エラーが発生しました");
    }
    setImporting(false);
    await loadData();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const filtered = transactions.filter(t => {
    if (activeFilter === "matched") return t.matched;
    if (activeFilter === "unmatched") return !t.matched;
    return true;
  });

  const fmt = (n: number) => (n < 0 ? "-" : "") + "¥" + Math.abs(n).toLocaleString("ja-JP");
  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
  };

  const activePath = "/bank";

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
        {/* ヘッダー */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid var(--color-border)",
          background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>銀行明細取込</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>CSVインポート・自動消込</p>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {bankInfo && (bankInfo.name || bankInfo.branch) && (
              <span style={{ fontSize: 13, color: "#6e6e73" }}>
                🏦 対象口座：{bankInfo.name} {bankInfo.branch}　フォーマット：自動判定済み
              </span>
            )}
            {importResult && (
              <span style={{ fontSize: 13, color: "#1a7f37", fontWeight: 500, backgroundColor: "#e6f4ea", padding: "8px 14px", borderRadius: 980, border: "1px solid #1a7f37" }}>
                ✅ {importResult}
              </span>
            )}
            <input ref={fileInputRef} type="file" accept=".csv" style={{ display: "none" }} onChange={handleCSV} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              style={{ backgroundColor: importing ? "#6e6e73" : "#0071e3", color: "#fff", border: "none", borderRadius: 980, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: importing ? "not-allowed" : "pointer" }}
            >
              {importing ? "取込中..." : "📂 CSVを取込む"}
            </button>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, color: "#6e6e73" }}>読み込み中...</div>
        ) : (
          <>
            {/* サマリーカード */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "総件数", value: `${summary.total}件`, icon: "📋", accent: "#1d1d1f" },
                { label: "消込済み", value: `${summary.matched}件`, icon: "✅", accent: "#1a7f37" },
                { label: "未消込", value: `${summary.unmatched}件`, icon: "⏳", accent: "#bf5700" },
                { label: "消込済み金額", value: fmt(summary.matchedAmount), icon: "💴", accent: "#0071e3" },
              ].map(card => (
                <div key={card.label} style={{ backgroundColor: "#fff", borderRadius: 16, padding: "20px 24px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
                  <div style={{ fontSize: 13, color: "#6e6e73", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <span>{card.icon}</span>{card.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: card.accent, letterSpacing: "-0.5px" }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* CSV形式の説明 */}
            <div style={{ backgroundColor: "#f0f7ff", border: "1px solid #0071e3", borderRadius: 12, padding: "14px 20px", marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: "#0071e3", fontWeight: 600, margin: "0 0 4px" }}>📌 対応CSVフォーマット（銀行名から自動判定）</p>
              <p style={{ fontSize: 12, color: "#1d1d1f", margin: 0 }}>1行目はヘッダー行（スキップされます）<br />
                <strong>メガバンク形式</strong>（三菱UFJ・みずほ・三井住友）：取引日, 摘要, 出金金額, 入金金額, 残高<br />
                <strong>地銀形式</strong>（八十二・阿波・百十四）：取引通番, 取引日, 出金金額, 入金金額, 摘要, 残高<br />
                <strong>標準形式</strong>：日付, 摘要, 金額, 残高</p>
            </div>

            {/* フィルタータブ */}
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {([["all", "すべて"], ["matched", "消込済み"], ["unmatched", "未消込"]] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setActiveFilter(key)}
                  style={{ padding: "7px 16px", borderRadius: 980, border: "1px solid", fontSize: 13, fontWeight: 500, cursor: "pointer", backgroundColor: activeFilter === key ? "#1d1d1f" : "#fff", color: activeFilter === key ? "#fff" : "#1d1d1f", borderColor: activeFilter === key ? "#1d1d1f" : "#d2d2d7" }}
                >
                  {label} ({key === "all" ? transactions.length : key === "matched" ? summary.matched : summary.unmatched})
                </button>
              ))}
            </div>

            {/* トランザクションテーブル */}
            <div style={{ backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
              {filtered.length === 0 ? (
                <div style={{ padding: "60px 32px", textAlign: "center", color: "#6e6e73", fontSize: 14 }}>
                  {transactions.length === 0 ? "CSVをインポートして銀行明細を取込んでください" : "該当する明細がありません"}
                </div>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                      {["日付", "摘要", "金額", "残高", "消込状況"].map(h => (
                        <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6e6e73", letterSpacing: "0.3px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((t, idx) => (
                      <tr
                        key={t.id}
                        style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #f5f5f7" : "none", backgroundColor: t.matched ? "#f6fff8" : "transparent" }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = t.matched ? "#edfaf1" : "#f9f9fb"}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = t.matched ? "#f6fff8" : "transparent"}
                      >
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#6e6e73" }}>{fmtDate(t.transaction_date)}</td>
                        <td style={{ padding: "14px 16px", fontSize: 14, color: "#1d1d1f", fontWeight: 500 }}>{t.description}</td>
                        <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: t.amount >= 0 ? "#1a7f37" : "#d70015", textAlign: "right" }}>{fmt(t.amount)}</td>
                        <td style={{ padding: "14px 16px", fontSize: 13, color: "#6e6e73", textAlign: "right" }}>{fmt(t.balance)}</td>
                        <td style={{ padding: "14px 16px" }}>
                          <span style={{ display: "inline-block", padding: "4px 10px", borderRadius: 980, fontSize: 12, fontWeight: 600, color: t.matched ? "#1a7f37" : "#bf5700", backgroundColor: t.matched ? "#e6f4ea" : "#fff3e0", border: `1px solid ${t.matched ? "#1a7f37" : "#bf5700"}` }}>
                            {t.matched ? "✅ 消込済み" : "⏳ 未消込"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {filtered.length > 0 && (
              <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 24, fontSize: 13, color: "#6e6e73" }}>
                <span>{filtered.length}件表示</span>
                <span>入金合計：<strong style={{ color: "#1a7f37", marginLeft: 6 }}>{fmt(filtered.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0))}</strong></span>
              </div>
            )}
          </>
        )}
        </div>
      </div>
    </div>
  );
}
