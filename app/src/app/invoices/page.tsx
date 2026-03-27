"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { validateInvoiceCsvRows, type InvoiceCsvRowError } from "@/lib/validation";

type Invoice = {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total: number;
  customers: { name: string }[] | { name: string } | null;
};

const statusConfig: Record<string, { label: string; bg: string; color: string }> = {
  draft: { label: "作成中", bg: "#fef3c7", color: "#92400e" },
  sent: { label: "発行済み", bg: "#d1fae5", color: "#065f46" },
  paid: { label: "入金済み", bg: "#e6f4ea", color: "#1a7f37" },
  overdue: { label: "期日超過", bg: "#ffeef0", color: "#d70015" },
  partial: { label: "一部入金", bg: "#fff3e0", color: "#bf5700" },
};

export default function InvoiceListPage() {
  const router = useRouter();
  const supabase = createClient();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchNumber, setSearchNumber] = useState("");
  const [searchCustomer, setSearchCustomer] = useState("");
  const [searchMonth, setSearchMonth] = useState("");
  const [csvPreview, setCsvPreview] = useState<{ file: File; rows: Record<string, string>[]; errors: InvoiceCsvRowError[] } | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // get company
      const { data: comp } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!comp) { setLoading(false); return; }
      setCompanyId(comp.id);

      // 売上仕訳の一括生成（未生成分のみ、重複チェック付き）
      try {
        const bfRes = await fetch("/api/invoices/backfill-journals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        if (bfRes.ok) {
          const bfData = await bfRes.json();
          if (bfData.created > 0) {
            console.log(`売上仕訳を${bfData.created}件生成しました（スキップ: ${bfData.skipped}件）`);
          }
        }
      } catch (e) {
        console.error("売上仕訳一括生成エラー:", e);
      }

      const { data, error: fetchErr } = await supabase
        .from("invoices")
        .select("id, invoice_number, issue_date, due_date, status, total, customers(name)")
        .eq("company_id", comp.id)
        .order("created_at", { ascending: false });

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setInvoices(data ?? []);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleIssue = async (id: string) => {
    if (!companyId) return;
    const res = await fetch("/api/invoices/issue", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invoiceId: id, companyId }),
    });
    if (res.ok) {
      setInvoices((prev) => prev.map((inv) => inv.id === id ? { ...inv, status: "sent" } : inv));
    }
  };

  const handleDownloadTemplate = () => {
    const header = "発行日,顧客名,品目,数量,単価,税率";
    const sample1 = "2025/04/30,株式会社フジタ商事,Webサイト制作,1,400000,10";
    const sample2 = "2025/04/30,株式会社フジタ商事,保守費用,1,50000,10";
    const csv = [header, sample1, sample2].join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoice_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setError("");
    setImportMsg("");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows = results.data.filter((row) => Object.values(row).some((v) => v?.trim()));
        if (rows.length === 0) {
          setError("CSVにデータ行がありません");
          return;
        }
        const errors = validateInvoiceCsvRows(rows);
        setCsvPreview({ file, rows, errors });
      },
    });
  };

  const handleCsvImport = async () => {
    if (!csvPreview || csvPreview.errors.length > 0) return;

    setImporting(true);
    setError("");
    setCsvPreview(null);

    try {
      const formData = new FormData();
      formData.append("file", csvPreview.file);

      const res = await fetch("/api/invoices/import-csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "インポートに失敗しました");
        return;
      }

      let msg = `${data.created}件の請求書をインポートしました`;
      if (data.skipped > 0) msg += `（${data.skipped}件スキップ）`;
      if (data.errors?.length > 0) msg += `\nエラー: ${data.errors.join(", ")}`;
      setImportMsg(msg);

      // リロード
      if (companyId) {
        const { data: refreshed } = await supabase
          .from("invoices")
          .select("id, invoice_number, issue_date, due_date, status, total, customers(name)")
          .eq("company_id", companyId)
          .order("created_at", { ascending: false });
        setInvoices(refreshed ?? []);
      }
    } catch {
      setError("インポート中にエラーが発生しました");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Sidebar />

      {/* メインコンテンツ */}
      <div style={{ marginLeft: "360px", flex: 1, background: "var(--color-background)", minHeight: "100vh" }}>
        {/* ヘッダー */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid var(--color-border)",
          background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>請求書一覧</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>発行済み・作成中の請求書</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button onClick={handleDownloadTemplate}
              style={{
                padding: "8px 16px", borderRadius: "var(--radius-button)",
                border: "1px solid var(--color-border)", background: "white",
                color: "var(--color-text)", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
              CSVテンプレート
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              style={{
                padding: "8px 16px", borderRadius: "var(--radius-button)",
                border: "1px solid var(--color-primary)", background: "white",
                color: "var(--color-primary)", fontSize: "13px", fontWeight: "600",
                cursor: importing ? "not-allowed" : "pointer", fontFamily: "var(--font-sans)",
                opacity: importing ? 0.6 : 1,
              }}>
              {importing ? "インポート中..." : "CSVインポート"}
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvSelect} style={{ display: "none" }} />
            <button onClick={() => router.push("/invoices/new")}
              style={{
                padding: "8px 20px", borderRadius: "var(--radius-button)",
                border: "none", background: "var(--color-primary)",
                color: "white", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
              ＋ 新規作成
            </button>
          </div>
        </div>

        <div style={{ padding: "24px" }}>
          {error && (
            <div style={{
              padding: "12px 16px", marginBottom: "16px",
              background: "#fef2f2", border: "1px solid #fca5a5",
              borderRadius: "var(--radius-card)", color: "#dc2626", fontSize: "14px",
            }}>{error}</div>
          )}
          {importMsg && (
            <div style={{
              padding: "12px 16px", marginBottom: "16px",
              background: "#f0fdf4", border: "1px solid #86efac",
              borderRadius: "var(--radius-card)", color: "#166534", fontSize: "14px",
            }}>{importMsg}</div>
          )}

          {/* CSVプレビュー・バリデーションモーダル */}
          {csvPreview && (
            <div style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              padding: "24px", marginBottom: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
              border: csvPreview.errors.length > 0 ? "1px solid #fca5a5" : "1px solid #86efac",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)" }}>
                  CSVインポート確認（{csvPreview.rows.length}行）
                </div>
                <button onClick={() => setCsvPreview(null)}
                  style={{
                    padding: "4px 12px", borderRadius: "var(--radius-button)",
                    border: "1px solid var(--color-border)", background: "white",
                    color: "var(--color-text)", fontSize: "12px", fontWeight: "600",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                  }}>
                  キャンセル
                </button>
              </div>

              {csvPreview.errors.length > 0 && (
                <div style={{
                  padding: "12px 16px", marginBottom: "16px",
                  background: "#fef2f2", border: "1px solid #fca5a5",
                  borderRadius: "8px", maxHeight: "200px", overflowY: "auto",
                }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#dc2626", marginBottom: "8px" }}>
                    {csvPreview.errors.length}件のエラーがあります。修正してから再度アップロードしてください。
                  </div>
                  {csvPreview.errors.map((err, i) => (
                    <div key={i} style={{ fontSize: "13px", color: "#dc2626", padding: "2px 0" }}>
                      {err.row}行目：{err.message}
                    </div>
                  ))}
                </div>
              )}

              {csvPreview.errors.length === 0 && (
                <div style={{
                  padding: "12px 16px", marginBottom: "16px",
                  background: "#f0fdf4", border: "1px solid #86efac",
                  borderRadius: "8px", fontSize: "13px", color: "#166534",
                }}>
                  エラーはありません。インポートを実行できます。
                </div>
              )}

              {/* データプレビューテーブル */}
              <div style={{ overflowX: "auto", marginBottom: "16px", maxHeight: "300px", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                      <th style={{ ...thStyle, fontSize: "11px" }}>行</th>
                      <th style={{ ...thStyle, fontSize: "11px" }}>発行日</th>
                      <th style={{ ...thStyle, fontSize: "11px" }}>顧客名</th>
                      <th style={{ ...thStyle, fontSize: "11px" }}>品目</th>
                      <th style={{ ...thStyle, fontSize: "11px", textAlign: "right" }}>数量</th>
                      <th style={{ ...thStyle, fontSize: "11px", textAlign: "right" }}>単価</th>
                      <th style={{ ...thStyle, fontSize: "11px", textAlign: "right" }}>税率</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvPreview.rows.slice(0, 20).map((row, i) => {
                      const rowNum = i + 2;
                      const hasError = csvPreview.errors.some((e) => e.row === rowNum);
                      return (
                        <tr key={i} style={{
                          borderBottom: "1px solid var(--color-border)",
                          background: hasError ? "#fef2f2" : "transparent",
                        }}>
                          <td style={{ ...tdStyle, fontSize: "12px", color: hasError ? "#dc2626" : "var(--color-text-secondary)" }}>{rowNum}</td>
                          <td style={{ ...tdStyle, fontSize: "12px" }}>{row["発行日"] ?? ""}</td>
                          <td style={{ ...tdStyle, fontSize: "12px" }}>{row["顧客名"] ?? ""}</td>
                          <td style={{ ...tdStyle, fontSize: "12px" }}>{row["品目"] ?? ""}</td>
                          <td style={{ ...tdStyle, fontSize: "12px", textAlign: "right" }}>{row["数量"] ?? ""}</td>
                          <td style={{ ...tdStyle, fontSize: "12px", textAlign: "right" }}>{row["単価"] ?? ""}</td>
                          <td style={{ ...tdStyle, fontSize: "12px", textAlign: "right" }}>{row["税率"] ?? ""}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {csvPreview.rows.length > 20 && (
                  <div style={{ fontSize: "12px", color: "var(--color-text-secondary)", padding: "8px 16px" }}>
                    ...他 {csvPreview.rows.length - 20}行
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                  onClick={handleCsvImport}
                  disabled={csvPreview.errors.length > 0 || importing}
                  style={{
                    padding: "8px 20px", borderRadius: "var(--radius-button)",
                    border: "none",
                    background: csvPreview.errors.length > 0 ? "#d1d5db" : "var(--color-primary)",
                    color: "white", fontSize: "13px", fontWeight: "600",
                    cursor: csvPreview.errors.length > 0 || importing ? "not-allowed" : "pointer",
                    opacity: csvPreview.errors.length > 0 ? 0.6 : 1,
                    fontFamily: "var(--font-sans)",
                  }}>
                  {importing ? "インポート中..." : "インポート実行"}
                </button>
              </div>
            </div>
          )}

          {/* 検索フィルター */}
          {!loading && invoices.length > 0 && (
            <div style={{
              display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap",
            }}>
              <input
                type="text"
                placeholder="請求書番号で検索"
                value={searchNumber}
                onChange={(e) => setSearchNumber(e.target.value)}
                style={{
                  padding: "8px 14px", borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)", background: "var(--color-card)",
                  color: "var(--color-text)", fontSize: "13px", fontFamily: "var(--font-sans)",
                  width: "180px", outline: "none",
                }}
              />
              <input
                type="text"
                placeholder="顧客名で検索"
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                style={{
                  padding: "8px 14px", borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)", background: "var(--color-card)",
                  color: "var(--color-text)", fontSize: "13px", fontFamily: "var(--font-sans)",
                  width: "180px", outline: "none",
                }}
              />
              <input
                type="month"
                value={searchMonth}
                onChange={(e) => setSearchMonth(e.target.value)}
                style={{
                  padding: "8px 14px", borderRadius: "var(--radius-button)",
                  border: "1px solid var(--color-border)", background: "var(--color-card)",
                  color: "var(--color-text)", fontSize: "13px", fontFamily: "var(--font-sans)",
                  outline: "none",
                }}
              />
              {(searchNumber || searchCustomer || searchMonth) && (
                <button
                  onClick={() => { setSearchNumber(""); setSearchCustomer(""); setSearchMonth(""); }}
                  style={{
                    padding: "8px 14px", borderRadius: "var(--radius-button)",
                    border: "1px solid var(--color-border)", background: "var(--color-card)",
                    color: "var(--color-text-secondary)", fontSize: "13px", fontWeight: "600",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                  }}
                >
                  クリア
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "60px" }}>読み込み中...</div>
          ) : invoices.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "60px",
              color: "var(--color-text-secondary)",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>📄</div>
              <p style={{ fontSize: "15px", margin: "0 0 16px" }}>請求書がまだありません</p>
              <button onClick={() => router.push("/invoices/new")}
                style={{
                  padding: "10px 24px", borderRadius: "var(--radius-button)",
                  border: "none", background: "var(--color-primary)",
                  color: "white", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>
                最初の請求書を作成
              </button>
            </div>
          ) : (
            <div style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)", overflow: "hidden",
            }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                    <th style={thStyle}>請求書番号</th>
                    <th style={thStyle}>顧客名</th>
                    <th style={thStyle}>発行日</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>合計金額</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>ステータス</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.filter((inv) => {
                    const custName = Array.isArray(inv.customers) ? inv.customers[0]?.name ?? "" : inv.customers?.name ?? "";
                    if (searchNumber && !inv.invoice_number.toLowerCase().includes(searchNumber.toLowerCase())) return false;
                    if (searchCustomer && !custName.toLowerCase().includes(searchCustomer.toLowerCase())) return false;
                    if (searchMonth && !inv.issue_date.startsWith(searchMonth)) return false;
                    return true;
                  }).map((inv) => {
                    const st = statusConfig[inv.status] ?? { label: inv.status, bg: "#f3f4f6", color: "#374151" };
                    return (
                      <tr key={inv.id}
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        style={{ borderBottom: "1px solid var(--color-border)", cursor: "pointer", transition: "background 0.15s" }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#f5f5f7")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      >
                        <td style={tdStyle}>
                          <span style={{ fontWeight: "600" }}>{inv.invoice_number}</span>
                        </td>
                        <td style={tdStyle}>{Array.isArray(inv.customers) ? inv.customers[0]?.name ?? "-" : inv.customers?.name ?? "-"}</td>
                        <td style={tdStyle}>{inv.issue_date}</td>
                        <td style={{ ...tdStyle, textAlign: "right", fontWeight: "600" }}>
                          {inv.total.toLocaleString()}円
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <span style={{
                            display: "inline-block", padding: "3px 10px",
                            borderRadius: "980px", fontSize: "12px", fontWeight: "600",
                            background: st.bg, color: st.color,
                          }}>{st.label}</span>
                        </td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          {inv.status === "draft" && (
                            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                              <button onClick={(e) => { e.stopPropagation(); router.push(`/invoices/${inv.id}/edit`); }}
                                style={{
                                  padding: "4px 12px", borderRadius: "var(--radius-button)",
                                  border: "1px solid #6b7280", background: "transparent",
                                  color: "#6b7280", fontSize: "12px", fontWeight: "600",
                                  cursor: "pointer", fontFamily: "var(--font-sans)",
                                }}>
                                編集
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleIssue(inv.id); }}
                                style={{
                                  padding: "4px 12px", borderRadius: "var(--radius-button)",
                                  border: "1px solid var(--color-primary)", background: "transparent",
                                  color: "var(--color-primary)", fontSize: "12px", fontWeight: "600",
                                  cursor: "pointer", fontFamily: "var(--font-sans)",
                                }}>
                                発行する
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "12px 16px", textAlign: "left",
  fontSize: "12px", fontWeight: "600",
  color: "var(--color-text-secondary)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", color: "var(--color-text)",
};
