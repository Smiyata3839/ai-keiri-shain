"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const bankOptions = [
  "みずほ銀行", "三菱UFJ銀行", "三井住友銀行", "りそな銀行",
  "埼玉りそな銀行", "ゆうちょ銀行", "楽天銀行", "住信SBIネット銀行",
  "PayPay銀行", "auじぶん銀行", "イオン銀行", "セブン銀行",
  "横浜銀行", "千葉銀行", "静岡銀行", "福岡銀行",
  "八十二銀行", "阿波銀行", "百十四銀行", "その他",
];

export default function CompanyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [invoiceRegNumber, setInvoiceRegNumber] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankNameCustom, setBankNameCustom] = useState("");
  const [bankBranch, setBankBranch] = useState("");
  const [bankAccountType, setBankAccountType] = useState("普通");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountHolder, setBankAccountHolder] = useState("");
  const [formFiscalMonth, setFormFiscalMonth] = useState<number>(3);

  const [userId, setUserId] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [backup, setBackup] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: comp } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (comp) {
        setCompanyId(comp.id);
        setName(comp.name ?? "");
        setInvoiceRegNumber(comp.invoice_registration_number ?? "");
        setPostalCode(comp.postal_code ?? "");
        setAddress(comp.address ?? "");
        setPhone(comp.phone ?? "");
        setEmail(comp.email ?? "");
        const loadedBank = comp.bank_name ?? "";
        if (loadedBank && !bankOptions.includes(loadedBank)) {
          setBankName("その他");
          setBankNameCustom(loadedBank);
        } else {
          setBankName(loadedBank);
          setBankNameCustom("");
        }
        setBankBranch(comp.bank_branch ?? "");
        setBankAccountType(comp.bank_account_type ?? "普通");
        setBankAccountNumber(comp.bank_account_number ?? "");
        setBankAccountHolder(comp.bank_account_holder ?? "");
        setFormFiscalMonth(comp.fiscal_month ?? 3);
        setIsEditing(false);
      } else {
        setIsEditing(true);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!name.trim()) { setError("会社名を入力してください"); return; }
    if (invoiceRegNumber && !/^T\d{13}$/.test(invoiceRegNumber)) {
      setError("登録番号はT+13桁の数字で入力してください（例: T1234567890123）");
      return;
    }

    setSaving(true);
    try {
      const fields = {
        name: name.trim(),
        invoice_registration_number: invoiceRegNumber || null,
        postal_code: postalCode || null,
        address: address || null,
        phone: phone || null,
        email: email || null,
        bank_name: (bankName === "その他" ? bankNameCustom : bankName) || null,
        bank_branch: bankBranch || null,
        bank_account_type: bankAccountType || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_holder: bankAccountHolder || null,
        fiscal_month: formFiscalMonth,
      };

      if (companyId) {
        // 既存レコードを更新
        const { error: updateErr } = await supabase
          .from("companies")
          .update(fields)
          .eq("id", companyId);
        if (updateErr) throw updateErr;
      } else {
        // 新規作成
        const { data: inserted, error: insertErr } = await supabase
          .from("companies")
          .insert({ ...fields, user_id: userId })
          .select("id")
          .single();
        if (insertErr) throw insertErr;
        setCompanyId(inserted.id);
      }
      setSuccess("保存しました");
      setIsEditing(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    }
    setSaving(false);
  };

  const handleEdit = () => {
    setBackup({ name, invoiceRegNumber, postalCode, address, phone, email, bankName, bankNameCustom, bankBranch, bankAccountType, bankAccountNumber, bankAccountHolder, formFiscalMonth: String(formFiscalMonth) });
    setIsEditing(true);
    setSuccess("");
    setError("");
  };

  const handleCancel = () => {
    if (backup) {
      setName(backup.name);
      setInvoiceRegNumber(backup.invoiceRegNumber);
      setPostalCode(backup.postalCode);
      setAddress(backup.address);
      setPhone(backup.phone);
      setEmail(backup.email);
      setBankName(backup.bankName);
      setBankNameCustom(backup.bankNameCustom);
      setBankBranch(backup.bankBranch);
      setBankAccountType(backup.bankAccountType);
      setBankAccountNumber(backup.bankAccountNumber);
      setBankAccountHolder(backup.bankAccountHolder);
      setFormFiscalMonth(Number(backup.formFiscalMonth));
    }
    setIsEditing(false);
    setError("");
    setSuccess("");
  };

  const disabled = !isEditing;
  const currentInputStyle: React.CSSProperties = {
    ...inputStyle,
    ...(disabled ? { background: "#f5f5f7", cursor: "default" } : {}),
  };

  const activePath = "/company";

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
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>自社情報</h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>会社情報・振込先口座を登録します</p>
          </div>
          {!loading && companyId && !isEditing && (
            <button onClick={handleEdit}
              style={{
                padding: "8px 20px", borderRadius: "var(--radius-button)",
                border: "1px solid var(--color-border)", background: "white",
                color: "var(--color-text)", fontSize: "13px", fontWeight: "600",
                cursor: "pointer", fontFamily: "var(--font-sans)",
              }}>
              編集
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: "60px", textAlign: "center", color: "var(--color-text-secondary)" }}>読み込み中...</div>
        ) : (
          <div style={{ padding: "24px", maxWidth: "720px" }}>
            {error && (
              <div style={{
                padding: "12px 16px", marginBottom: "16px",
                background: "#fef2f2", border: "1px solid #fca5a5",
                borderRadius: "var(--radius-card)", color: "#dc2626", fontSize: "14px",
              }}>{error}</div>
            )}
            {success && (
              <div style={{
                padding: "12px 16px", marginBottom: "16px",
                background: "#f0fdf4", border: "1px solid #86efac",
                borderRadius: "var(--radius-card)", color: "#16a34a", fontSize: "14px",
              }}>{success}</div>
            )}

            {/* 基本情報 */}
            <div style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              padding: "24px", marginBottom: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)", marginBottom: "16px" }}>基本情報</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>会社名 *</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="株式会社サンプル" disabled={disabled} style={currentInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>適格請求書発行事業者登録番号</label>
                  <input value={invoiceRegNumber} onChange={(e) => setInvoiceRegNumber(e.target.value)} placeholder="T1234567890123" disabled={disabled} style={currentInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>郵便番号</label>
                  <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="100-0001" disabled={disabled} style={currentInputStyle} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>住所</label>
                  <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="東京都千代田区..." disabled={disabled} style={currentInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>電話番号</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="03-1234-5678" disabled={disabled} style={currentInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>メールアドレス</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="info@example.com" disabled={disabled} style={currentInputStyle} />
                </div>
              </div>
            </div>

            {/* 会計設定 */}
            <div style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              padding: "24px", marginBottom: "16px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)", marginBottom: "16px" }}>会計設定</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>決算月</label>
                  {isEditing ? (
                    <select
                      value={formFiscalMonth}
                      onChange={(e) => setFormFiscalMonth(Number(e.target.value))}
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: "1px solid #d2d2d7",
                        fontSize: 15,
                        color: "#1d1d1f",
                        backgroundColor: "#fff",
                        appearance: "auto",
                        fontFamily: "var(--font-sans)",
                        boxSizing: "border-box" as const,
                      }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m}月</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={`${formFiscalMonth}月`}
                      disabled
                      style={currentInputStyle}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 振込先口座 */}
            <div style={{
              background: "var(--color-card)", borderRadius: "var(--radius-card)",
              padding: "24px", marginBottom: "24px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)", marginBottom: "16px" }}>振込先口座</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={labelStyle}>銀行名</label>
                  {isEditing ? (
                    <>
                      <select
                        value={bankName}
                        onChange={(e) => {
                          setBankName(e.target.value);
                          if (e.target.value !== "その他") setBankNameCustom("");
                        }}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          borderRadius: 10,
                          border: "1px solid #d2d2d7",
                          fontSize: 15,
                          color: "#1d1d1f",
                          backgroundColor: "#fff",
                          appearance: "auto",
                          fontFamily: "var(--font-sans)",
                          boxSizing: "border-box" as const,
                        }}
                      >
                        <option value="">選択してください</option>
                        {bankOptions.map((b) => (
                          <option key={b} value={b}>{b}</option>
                        ))}
                      </select>
                      {bankName === "その他" && (
                        <input
                          value={bankNameCustom}
                          onChange={(e) => setBankNameCustom(e.target.value)}
                          placeholder="銀行名を入力"
                          style={{ ...currentInputStyle, marginTop: "8px" }}
                        />
                      )}
                    </>
                  ) : (
                    <input
                      value={bankName === "その他" ? bankNameCustom : bankName}
                      disabled
                      style={currentInputStyle}
                    />
                  )}
                </div>
                <div>
                  <label style={labelStyle}>支店名</label>
                  <input value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} placeholder="丸の内支店" disabled={disabled} style={currentInputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>口座種別</label>
                  <select value={bankAccountType} onChange={(e) => setBankAccountType(e.target.value)} disabled={disabled} style={currentInputStyle}>
                    <option value="普通">普通</option>
                    <option value="当座">当座</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>口座番号</label>
                  <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} placeholder="1234567" disabled={disabled} style={currentInputStyle} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>口座名義</label>
                  <input value={bankAccountHolder} onChange={(e) => setBankAccountHolder(e.target.value)} placeholder="カ）サンプル" disabled={disabled} style={currentInputStyle} />
                </div>
              </div>
            </div>

            {/* ボタン */}
            {isEditing && (
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                {companyId && (
                  <button onClick={handleCancel}
                    style={{
                      padding: "10px 24px", borderRadius: "var(--radius-button)",
                      border: "1px solid var(--color-border)", background: "white",
                      color: "var(--color-text)", fontSize: "14px", fontWeight: "600",
                      cursor: "pointer", fontFamily: "var(--font-sans)",
                    }}>
                    キャンセル
                  </button>
                )}
                <button onClick={handleSave} disabled={saving}
                  style={{
                    padding: "10px 24px", borderRadius: "var(--radius-button)",
                    border: "none", background: "var(--color-primary)",
                    color: "white", fontSize: "14px", fontWeight: "600",
                    cursor: saving ? "not-allowed" : "pointer",
                    opacity: saving ? 0.6 : 1,
                    fontFamily: "var(--font-sans)",
                  }}>
                  {saving ? "保存中..." : "保存する"}
                </button>
              </div>
            )}
          </div>
        )}
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
