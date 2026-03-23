"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/Sidebar";

const PAYMENT_TERMS_OPTIONS = [
  "即時",
  "Net15",
  "Net30",
  "Net45",
  "Net60",
  "月末締め翌月末払い",
  "月末締め翌々月末払い",
] as const;

type PaymentTerms = (typeof PAYMENT_TERMS_OPTIONS)[number];

type Customer = {
  id: string;
  name: string;
  kana: string | null;
  transfer_kana: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  payment_terms: PaymentTerms | null;
};

export default function CustomersPage() {
  const router = useRouter();
  const supabase = createClient();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [companyId, setCompanyId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 新規追加フォーム
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formKana, setFormKana] = useState("");
  const [formTransferKana, setFormTransferKana] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formPaymentTerms, setFormPaymentTerms] = useState<PaymentTerms>("月末締め翌月末払い");
  const [saving, setSaving] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: comp } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!comp) { setLoading(false); return; }
      setCompanyId(comp.id);

      const { data, error: fetchErr } = await supabase
        .from("customers")
        .select("id, name, kana, transfer_kana, email, phone, address, payment_terms")
        .eq("company_id", comp.id)
        .order("name");

      if (fetchErr) {
        setError(fetchErr.message);
      } else {
        setCustomers(data ?? []);
      }
      setLoading(false);
    };
    init();
  }, []);

  const resetForm = () => {
    setFormName("");
    setFormKana("");
    setFormTransferKana("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setFormPaymentTerms("月末締め翌月末払い");
    setShowForm(false);
  };

  const handleAdd = async () => {
    setError("");
    if (!formName.trim()) { setError("顧客名を入力してください"); return; }
    if (!companyId) { setError("自社情報を先に登録してください"); return; }

    setSaving(true);
    try {
      const { data, error: insertErr } = await supabase
        .from("customers")
        .insert({
          company_id: companyId,
          name: formName.trim(),
          kana: formKana || null,
          transfer_kana: formTransferKana || null,
          email: formEmail || null,
          phone: formPhone || null,
          address: formAddress || null,
          payment_terms: formPaymentTerms,
        })
        .select("id, name, kana, transfer_kana, email, phone, address, payment_terms")
        .single();

      if (insertErr) throw insertErr;
      setCustomers((prev) => [...prev, data]);
      resetForm();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "追加に失敗しました");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`「${name}」を削除しますか？`)) return;
    const { error: delErr } = await supabase
      .from("customers")
      .delete()
      .eq("id", id);

    if (delErr) {
      setError(delErr.message);
    } else {
      setCustomers((prev) => prev.filter((c) => c.id !== id));
    }
  };

  const handleDownloadTemplate = () => {
    const bom = "\uFEFF";
    const csv = bom + "顧客名,カナ,銀行振込名,メール,電話番号,住所,支払条件\n株式会社サンプル,カブシキガイシャサンプル,カブシキガイシャサンプル,info@sample.com,03-1234-5678,東京都千代田区,月末締め翌月末払い\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "顧客テンプレート.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    setImportMsg("");
    setError("");

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        // CSVヘッダーの表記揺れに対応するヘルパー
        const getCol = (row: Record<string, string>, ...candidates: string[]): string | undefined => {
          for (const key of candidates) {
            if (row[key] !== undefined) return row[key];
          }
          // 部分一致フォールバック
          const rowKeys = Object.keys(row);
          for (const key of candidates) {
            const found = rowKeys.find(k => k.includes(key) || key.includes(k));
            if (found && row[found] !== undefined) return row[found];
          }
          return undefined;
        };

        const rows = results.data
          .filter((row) => getCol(row, "顧客名")?.trim())
          .map((row) => ({
            company_id: companyId,
            name: getCol(row, "顧客名")!.trim(),
            kana: getCol(row, "カナ", "顧客名カナ", "フリガナ")?.trim() || null,
            transfer_kana: getCol(row, "銀行振込名", "銀行振込名（カナ）", "銀行振込名(カナ)", "振込名", "振込名義", "transfer_kana")?.trim() || null,
            email: getCol(row, "メール", "メールアドレス", "email")?.trim() || null,
            phone: getCol(row, "電話番号", "電話", "TEL")?.trim() || null,
            address: getCol(row, "住所")?.trim() || null,
            payment_terms: (PAYMENT_TERMS_OPTIONS as readonly string[]).includes(getCol(row, "支払条件")?.trim() ?? "")
              ? getCol(row, "支払条件")!.trim()
              : "月末締め翌月末払い",
          }));

        if (rows.length === 0) {
          setError("インポートできる行がありませんでした");
          if (fileInputRef.current) fileInputRef.current.value = "";
          return;
        }

        const { data, error: insertErr } = await supabase
          .from("customers")
          .insert(rows)
          .select("id, name, kana, transfer_kana, email, phone, address, payment_terms");

        if (insertErr) {
          setError(insertErr.message);
        } else if (data) {
          setCustomers((prev) => [...prev, ...data]);
          setImportMsg(`${data.length}件インポートしました`);
        }
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
    });
  };

  const activePath = "/customers";

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
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>顧客管理</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>取引先の一覧・追加・削除</p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleDownloadTemplate}
              style={{
                padding: "8px 20px", borderRadius: "var(--radius-button)",
                border: "1px solid var(--color-border)", background: "white",
                color: "var(--color-text)", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
              CSVテンプレート
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "8px 20px", borderRadius: "var(--radius-button)",
                border: "1px solid var(--color-border)", background: "white",
                color: "var(--color-text)", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
              CSVインポート
            </button>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleCsvImport} style={{ display: "none" }} />
            <button onClick={() => setShowForm(true)}
              style={{
                padding: "8px 20px", borderRadius: "var(--radius-button)",
                border: "none", background: "var(--color-primary)",
                color: "white", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
              ＋ 新規追加
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
              borderRadius: "var(--radius-card)", color: "#16a34a", fontSize: "14px",
            }}>{importMsg}</div>
          )}

          {/* 新規追加フォーム */}
          {showForm && (
            <div style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              padding: "24px", marginBottom: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)", marginBottom: "16px" }}>新規顧客</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>顧客名 *</label>
                  <input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="株式会社サンプル" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>カナ</label>
                  <input value={formKana} onChange={(e) => setFormKana(e.target.value)} placeholder="カブシキガイシャサンプル" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>銀行振込名（カナ）</label>
                  <input value={formTransferKana} onChange={(e) => setFormTransferKana(e.target.value)} placeholder="カブシキガイシャサンプル（振込時の名義カナ）" style={inputStyle} />
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>銀行明細の自動消込に使用します</p>
                </div>
                <div>
                  <label style={labelStyle}>メールアドレス</label>
                  <input type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="info@example.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>電話番号</label>
                  <input value={formPhone} onChange={(e) => setFormPhone(e.target.value)} placeholder="03-1234-5678" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>住所</label>
                  <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="東京都千代田区..." style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>支払条件</label>
                  <select value={formPaymentTerms} onChange={(e) => setFormPaymentTerms(e.target.value as PaymentTerms)} style={inputStyle}>
                    {PAYMENT_TERMS_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end", marginTop: "16px" }}>
                <button onClick={resetForm}
                  style={{
                    padding: "8px 20px", borderRadius: "var(--radius-button)",
                    border: "1px solid var(--color-border)", background: "white",
                    color: "var(--color-text)", fontSize: "13px", fontWeight: "600",
                    cursor: "pointer", fontFamily: "var(--font-sans)",
                  }}>
                  キャンセル
                </button>
                <button onClick={handleAdd} disabled={saving}
                  style={{
                    padding: "8px 20px", borderRadius: "var(--radius-button)",
                    border: "none", background: "var(--color-primary)",
                    color: "white", fontSize: "13px", fontWeight: "600",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    fontFamily: "var(--font-sans)",
                  }}>
                  {saving ? "追加中..." : "追加する"}
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: "center", color: "var(--color-text-secondary)", padding: "60px" }}>読み込み中...</div>
          ) : !companyId ? (
            <div style={{
              textAlign: "center", padding: "60px",
              color: "var(--color-text-secondary)",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>🏢</div>
              <p style={{ fontSize: "15px", margin: "0 0 16px" }}>先に自社情報を登録してください</p>
              <button onClick={() => router.push("/company")}
                style={{
                  padding: "10px 24px", borderRadius: "var(--radius-button)",
                  border: "none", background: "var(--color-primary)",
                  color: "white", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>
                自社情報を登録
              </button>
            </div>
          ) : customers.length === 0 && !showForm ? (
            <div style={{
              textAlign: "center", padding: "60px",
              color: "var(--color-text-secondary)",
            }}>
              <div style={{ fontSize: "40px", marginBottom: "12px" }}>👥</div>
              <p style={{ fontSize: "15px", margin: "0 0 16px" }}>顧客がまだ登録されていません</p>
              <button onClick={() => setShowForm(true)}
                style={{
                  padding: "10px 24px", borderRadius: "var(--radius-button)",
                  border: "none", background: "var(--color-primary)",
                  color: "white", fontSize: "14px", fontWeight: "600",
                  cursor: "pointer", fontFamily: "var(--font-sans)",
                }}>
                最初の顧客を追加
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
                    <th style={thStyle}>顧客名</th>
                    <th style={thStyle}>カナ</th>
                    <th style={thStyle}>振込名（カナ）</th>
                    <th style={thStyle}>メール</th>
                    <th style={thStyle}>電話番号</th>
                    <th style={thStyle}>住所</th>
                    <th style={thStyle}>支払条件</th>
                    <th style={{ ...thStyle, textAlign: "center", width: "80px" }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={tdStyle}><span style={{ fontWeight: "600" }}>{c.name}</span></td>
                      <td style={tdStyle}>{c.kana ?? "-"}</td>
                      <td style={tdStyle}>{c.transfer_kana ?? "-"}</td>
                      <td style={tdStyle}>{c.email ?? "-"}</td>
                      <td style={tdStyle}>{c.phone ?? "-"}</td>
                      <td style={tdStyle}>{c.address ?? "-"}</td>
                      <td style={tdStyle}>{c.payment_terms ?? "月末締め翌月末払い"}</td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <button onClick={() => handleDelete(c.id, c.name)}
                          style={{
                            padding: "4px 12px", borderRadius: "var(--radius-button)",
                            border: "1px solid #fca5a5", background: "transparent",
                            color: "#dc2626", fontSize: "12px", fontWeight: "600",
                            cursor: "pointer", fontFamily: "var(--font-sans)",
                          }}>
                          削除
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "12px", fontWeight: "600",
  color: "var(--color-text-secondary)", marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "8px 12px",
  border: "1px solid var(--color-border)", borderRadius: "8px",
  fontSize: "14px", outline: "none", fontFamily: "var(--font-sans)",
  background: "white", boxSizing: "border-box",
};

const thStyle: React.CSSProperties = {
  padding: "12px 16px", textAlign: "left",
  fontSize: "12px", fontWeight: "600",
  color: "var(--color-text-secondary)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 16px", color: "var(--color-text)",
};
