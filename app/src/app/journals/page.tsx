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
  source: string;
};

export default function JournalsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [journals, setJournals] = useState<Journal[]>([]);
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2>(1);
  const [selectedTemplate, setSelectedTemplate] = useState<number | null>(null);
  const [formDate, setFormDate] = useState("");
  const [formDebit, setFormDebit] = useState("");
  const [formCredit, setFormCredit] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [filterAccount, setFilterAccount] = useState("");
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterSource, setFilterSource] = useState<"all" | "auto" | "manual">("all");

  const ACCOUNTS = [
    "現金", "普通預金", "当座預金", "売掛金", "未収入金",
    "前払費用", "仮払金", "建物", "車両運搬具", "備品",
    "買掛金", "未払金", "前受金", "仮受金", "借入金",
    "資本金", "売上高", "受取利息", "仕入高", "給料手当",
    "法定福利費", "福利厚生費", "地代家賃", "水道光熱費", "通信費", "旅費交通費",
    "消耗品費", "広告宣伝費", "接待交際費", "会議費", "新聞図書費", "研修費",
    "支払利息", "租税公課", "減価償却費", "雑費",
  ];

  const EXPENSE_ACCOUNTS = [
    "仕入高", "給料手当", "法定福利費", "福利厚生費", "地代家賃", "水道光熱費",
    "通信費", "旅費交通費", "消耗品費", "広告宣伝費", "接待交際費", "会議費",
    "新聞図書費", "研修費", "支払利息", "租税公課", "減価償却費", "雑費",
  ];

  const JOURNAL_TEMPLATES = [
    { label: "減価償却費", debit: "減価償却費", credit: "備品", descPlaceholder: "備品の減価償却" },
    { label: "借入金返済", debit: "借入金", credit: "普通預金", descPlaceholder: "借入金返済" },
    { label: "資本金登録", debit: "普通預金", credit: "資本金", descPlaceholder: "資本金の払込" },
    { label: "現金経費支払い", debit: "", credit: "現金", descPlaceholder: "現金で支払った経費" },
    { label: "その他（自由入力）", debit: "", credit: "", descPlaceholder: "取引の説明" },
  ];

  useEffect(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    setFilterStartDate(start);
    setFilterEndDate(end);
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: company } = await supabase
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) { setLoading(false); return; }
    setCompanyId(company.id);
    const { data } = await supabase
      .from("journals")
      .select("*")
      .eq("company_id", company.id)
      .order("journal_date", { ascending: false });
    setJournals(data ?? []);
    setLoading(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("この仕訳を削除しますか？")) return;
    const { error } = await supabase.from("journals").delete().eq("id", id);
    if (!error) {
      setJournals(prev => prev.filter(j => j.id !== id));
    }
  }

  async function handleAdd() {
    const tmpl = selectedTemplate !== null ? JOURNAL_TEMPLATES[selectedTemplate] : null;
    const debit = tmpl?.debit || formDebit;
    const credit = tmpl?.credit || formCredit;
    if (!companyId || !formDate || !debit || !credit || !formAmount) return;
    const { data, error } = await supabase.from("journals").insert({
      company_id: companyId,
      journal_date: formDate,
      debit_account: debit,
      credit_account: credit,
      amount: parseInt(formAmount.replace(/[^\d]/g, ""), 10),
      description: formDesc,
      source: "manual",
    }).select().single();
    if (!error && data) {
      setJournals([data, ...journals]);
      setShowForm(false);
      setFormStep(1);
      setSelectedTemplate(null);
      setFormDate(""); setFormDebit(""); setFormCredit("");
      setFormAmount(""); setFormDesc("");
    }
  }

  const filtered = journals.filter(j => {
    if (filterStartDate && j.journal_date < filterStartDate) return false;
    if (filterEndDate && j.journal_date > filterEndDate) return false;
    if (filterAccount && j.debit_account !== filterAccount && j.credit_account !== filterAccount) return false;
    if (filterKeyword && !j.description.includes(filterKeyword)) return false;
    if (filterSource !== "all" && j.source !== filterSource) return false;
    return true;
  });

  function resetFilters() {
    setFilterStartDate("");
    setFilterEndDate("");
    setFilterAccount("");
    setFilterKeyword("");
    setFilterSource("all");
  }

  const fmt = (n: number) => "¥" + n.toLocaleString("ja-JP");
  const fmtDate = (s: string) => {
    const d = new Date(s);
    return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;
  };

  const inputStyle = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid #d2d2d7", fontSize: 14, color: "#1d1d1f",
    backgroundColor: "#fff", boxSizing: "border-box" as const,
  };

  const selectStyle = { ...inputStyle, appearance: "auto" as const };

  const activePath = "/journals";

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
      {/* ヘッダー */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #d2d2d7", padding: "24px 32px 20px", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>仕訳一覧</h1>
            <p style={{ fontSize: 13, color: "#6e6e73", margin: "4px 0 0" }}>仕訳の確認・手動入力</p>
          </div>
          <button
            onClick={() => {
              if (showForm) {
                setShowForm(false);
              } else {
                setShowForm(true);
                setFormStep(1);
                setSelectedTemplate(null);
                setFormDate(""); setFormDebit(""); setFormCredit("");
                setFormAmount(""); setFormDesc("");
              }
            }}
            style={{ backgroundColor: "#0071e3", color: "#fff", border: "none", borderRadius: 980, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
          >
            ＋ 仕訳を追加
          </button>
        </div>
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
        {/* 手動入力フォーム */}
        {showForm && (
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: "0 0 20px", color: "#1d1d1f" }}>新規仕訳</h2>

            {/* Step 1: テンプレート選択 */}
            {formStep === 1 && (
              <div>
                <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 14px" }}>テンプレートを選択してください</p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
                  {JOURNAL_TEMPLATES.map((tmpl, idx) => (
                    <div
                      key={tmpl.label}
                      onClick={() => {
                        setSelectedTemplate(idx);
                        setFormDebit(tmpl.debit);
                        setFormCredit(tmpl.credit);
                        setFormStep(2);
                      }}
                      style={{
                        border: selectedTemplate === idx ? "2px solid #0071e3" : "1px solid #d2d2d7",
                        backgroundColor: selectedTemplate === idx ? "#e8f1fb" : "#fff",
                        borderRadius: 12,
                        padding: "14px 16px",
                        fontSize: 14,
                        fontWeight: 500,
                        cursor: "pointer",
                        color: "#1d1d1f",
                        transition: "border-color 0.15s, background-color 0.15s",
                      }}
                      onMouseEnter={e => { if (selectedTemplate !== idx) e.currentTarget.style.borderColor = "#0071e3"; }}
                      onMouseLeave={e => { if (selectedTemplate !== idx) e.currentTarget.style.borderColor = "#d2d2d7"; }}
                    >
                      {tmpl.label}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 20 }}>
                  <button onClick={() => setShowForm(false)} style={{ backgroundColor: "#f5f5f7", color: "#1d1d1f", border: "1px solid #d2d2d7", borderRadius: 980, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}>キャンセル</button>
                </div>
              </div>
            )}

            {/* Step 2: 詳細入力 */}
            {formStep === 2 && selectedTemplate !== null && (() => {
              const tmpl = JOURNAL_TEMPLATES[selectedTemplate];
              const isExpenseTemplate = tmpl.label === "現金経費支払い";
              const isFreeTemplate = tmpl.label === "その他（自由入力）";
              return (
                <div>
                  <button
                    onClick={() => { setFormStep(1); setSelectedTemplate(null); setFormDebit(""); setFormCredit(""); }}
                    style={{ background: "none", border: "none", color: "#0071e3", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: 0, marginBottom: 16 }}
                  >
                    ← テンプレートを変更
                  </button>
                  <p style={{ fontSize: 13, color: "#6e6e73", margin: "0 0 16px" }}>
                    テンプレート: <strong style={{ color: "#1d1d1f" }}>{tmpl.label}</strong>
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 13, color: "#6e6e73", display: "block", marginBottom: 6 }}>日付 *</label>
                      <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#6e6e73", display: "block", marginBottom: 6 }}>借方勘定科目 *</label>
                      {tmpl.debit ? (
                        <input type="text" value={tmpl.debit} readOnly style={{ ...inputStyle, backgroundColor: "#f5f5f7", color: "#6e6e73" }} />
                      ) : (
                        <select value={formDebit} onChange={e => setFormDebit(e.target.value)} style={selectStyle}>
                          <option value="">選択してください</option>
                          {(isExpenseTemplate ? EXPENSE_ACCOUNTS : ACCOUNTS).map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      )}
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#6e6e73", display: "block", marginBottom: 6 }}>貸方勘定科目 *</label>
                      {tmpl.credit ? (
                        <input type="text" value={tmpl.credit} readOnly style={{ ...inputStyle, backgroundColor: "#f5f5f7", color: "#6e6e73" }} />
                      ) : (
                        <select value={formCredit} onChange={e => setFormCredit(e.target.value)} style={selectStyle}>
                          <option value="">選択してください</option>
                          {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 20 }}>
                    <div>
                      <label style={{ fontSize: 13, color: "#6e6e73", display: "block", marginBottom: 6 }}>金額 *</label>
                      <input type="text" value={formAmount} onChange={e => setFormAmount(e.target.value)} placeholder="100000" style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ fontSize: 13, color: "#6e6e73", display: "block", marginBottom: 6 }}>摘要</label>
                      <input type="text" value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder={tmpl.descPlaceholder} style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
                    <button onClick={() => setShowForm(false)} style={{ backgroundColor: "#f5f5f7", color: "#1d1d1f", border: "1px solid #d2d2d7", borderRadius: 980, padding: "10px 20px", fontSize: 14, cursor: "pointer" }}>キャンセル</button>
                    <button onClick={handleAdd} style={{ backgroundColor: "#0071e3", color: "#fff", border: "none", borderRadius: 980, padding: "10px 20px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>保存</button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* フィルターパネル */}
        <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "20px 24px", marginBottom: 20, border: "1px solid #f0f0f0", position: "relative" }}>
          <button
            onClick={resetFilters}
            style={{ position: "absolute", top: 16, right: 20, background: "none", border: "none", color: "#0071e3", fontSize: 13, fontWeight: 500, cursor: "pointer", padding: "4px 8px" }}
          >
            リセット
          </button>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: "#6e6e73", whiteSpace: "nowrap" }}>期間：</label>
            <input type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} style={{ ...inputStyle, width: 160 }} />
            <span style={{ fontSize: 13, color: "#6e6e73" }}>〜</span>
            <input type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} style={{ ...inputStyle, width: 160 }} />
          </div>
          <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 14 }}>
            <label style={{ fontSize: 13, color: "#6e6e73", whiteSpace: "nowrap" }}>科目：</label>
            <select value={filterAccount} onChange={e => setFilterAccount(e.target.value)} style={{ ...selectStyle, width: 180 }}>
              <option value="">すべて</option>
              {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <label style={{ fontSize: 13, color: "#6e6e73", whiteSpace: "nowrap", marginLeft: 8 }}>キーワード：</label>
            <input type="text" value={filterKeyword} onChange={e => setFilterKeyword(e.target.value)} placeholder="摘要で検索" style={{ ...inputStyle, width: 240 }} />
          </div>
          <div style={{ display: "flex", gap: 0, alignItems: "center" }}>
            <label style={{ fontSize: 13, color: "#6e6e73", whiteSpace: "nowrap", marginRight: 16 }}>区分：</label>
            {([["all", "すべて"], ["auto", "自動"], ["manual", "手動"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setFilterSource(val)}
                style={{
                  padding: "6px 16px", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  border: "1px solid #d2d2d7", borderRight: val === "manual" ? "1px solid #d2d2d7" : "none",
                  borderRadius: val === "all" ? "8px 0 0 8px" : val === "manual" ? "0 8px 8px 0" : 0,
                  backgroundColor: filterSource === val ? "#0071e3" : "#fff",
                  color: filterSource === val ? "#fff" : "#1d1d1f",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 240, color: "#6e6e73" }}>読み込み中...</div>
        ) : (
          <div style={{ backgroundColor: "#fff", borderRadius: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0", overflow: "hidden" }}>
            {filtered.length === 0 ? (
              <div style={{ padding: "60px 32px", textAlign: "center", color: "#6e6e73", fontSize: 14 }}>仕訳データがありません</div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f0f0f0", backgroundColor: "#fafafa" }}>
                    {["日付", "借方", "貸方", "金額", "摘要", "区分", "操作"].map(h => (
                      <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6e6e73" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((j, idx) => (
                    <tr key={j.id}
                      style={{ borderBottom: idx < filtered.length - 1 ? "1px solid #f5f5f7" : "none" }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = "#f9f9fb"}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = "transparent"}
                    >
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#6e6e73" }}>{fmtDate(j.journal_date)}</td>
                      <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500, color: "#0071e3" }}>{j.debit_account}</td>
                      <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 500, color: "#1a7f37" }}>{j.credit_account}</td>
                      <td style={{ padding: "14px 16px", fontSize: 14, fontWeight: 600, color: "#1d1d1f", textAlign: "right" }}>{fmt(j.amount)}</td>
                      <td style={{ padding: "14px 16px", fontSize: 13, color: "#6e6e73" }}>{j.description}</td>
                      <td style={{ padding: "14px 16px" }}>
                        <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 980, fontSize: 11, fontWeight: 600, backgroundColor: j.source === "manual" ? "#f5f5f7" : "#e8f1fb", color: j.source === "manual" ? "#6e6e73" : "#0071e3", border: `1px solid ${j.source === "manual" ? "#d2d2d7" : "#0071e3"}` }}>
                          {j.source === "manual" ? "手動" : "自動"}
                        </span>
                      </td>
                      <td style={{ padding: "14px 16px" }}>
                        {j.source === "manual" && (
                          <button
                            onClick={() => handleDelete(j.id)}
                            style={{
                              backgroundColor: "transparent", color: "#d70015", border: "1px solid #d70015",
                              borderRadius: 980, padding: "4px 12px", fontSize: 12, fontWeight: 500, cursor: "pointer",
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#d70015"; e.currentTarget.style.color = "#fff"; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "#d70015"; }}
                          >
                            削除
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {/* フッター件数表示 */}
            <div style={{ padding: "12px 16px", borderTop: "1px solid #f0f0f0", fontSize: 13, color: "#6e6e73", textAlign: "right" }}>
              {filtered.length}件 / 全{journals.length}件
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}