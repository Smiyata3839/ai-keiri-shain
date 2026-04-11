"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { Pencil, Save, XCircle, Upload, Trash2 } from "lucide-react";

const BANKS = [
  "みずほ銀行", "三菱UFJ銀行", "三井住友銀行", "りそな銀行", "埼玉りそな銀行",
  "ゆうちょ銀行", "楽天銀行", "住信SBIネット銀行", "PayPay銀行", "auじぶん銀行",
  "イオン銀行", "セブン銀行", "横浜銀行", "千葉銀行", "静岡銀行",
  "福岡銀行", "八十二銀行", "阿波銀行", "百十四銀行", "その他",
];

export default function MobileCompanyPage() {
  const router = useRouter();
  const supabase = createClient();
  const sealInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [backup, setBackup] = useState<Record<string, any> | null>(null);

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
  const [formFiscalMonth, setFormFiscalMonth] = useState(3);
  const [sealUrl, setSealUrl] = useState("");
  const [sealUploading, setSealUploading] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      const { data: comp } = await supabase.from("companies").select("*").eq("user_id", user.id).single();
      if (comp) {
        setCompanyId(comp.id);
        setName(comp.name || "");
        setInvoiceRegNumber(comp.invoice_registration_number || "");
        setPostalCode(comp.postal_code || "");
        setAddress(comp.address || "");
        setPhone(comp.phone || "");
        setEmail(comp.email || "");
        setFormFiscalMonth(comp.fiscal_month || 3);
        setSealUrl(comp.seal_image_url || "");

        const bn = comp.bank_name || "";
        if (BANKS.includes(bn)) { setBankName(bn); } else if (bn) { setBankName("その他"); setBankNameCustom(bn); }
        setBankBranch(comp.bank_branch || "");
        setBankAccountType(comp.bank_account_type || "普通");
        setBankAccountNumber(comp.bank_account_number || "");
        setBankAccountHolder(comp.bank_account_holder || "");
      }
      setLoading(false);
    };
    load();
  }, []);

  const getFormState = () => ({ name, invoiceRegNumber, postalCode, address, phone, email, bankName, bankNameCustom, bankBranch, bankAccountType, bankAccountNumber, bankAccountHolder, formFiscalMonth, sealUrl });

  const startEdit = () => { setBackup(getFormState()); setIsEditing(true); };
  const cancelEdit = () => {
    if (backup) {
      setName(backup.name); setInvoiceRegNumber(backup.invoiceRegNumber); setPostalCode(backup.postalCode);
      setAddress(backup.address); setPhone(backup.phone); setEmail(backup.email);
      setBankName(backup.bankName); setBankNameCustom(backup.bankNameCustom); setBankBranch(backup.bankBranch);
      setBankAccountType(backup.bankAccountType); setBankAccountNumber(backup.bankAccountNumber);
      setBankAccountHolder(backup.bankAccountHolder); setFormFiscalMonth(backup.formFiscalMonth);
      setSealUrl(backup.sealUrl);
    }
    setIsEditing(false); setError("");
  };

  const handleSave = async () => {
    setError(""); setSuccess("");
    if (!name.trim()) { setError("会社名は必須です"); return; }
    if (invoiceRegNumber && !/^T\d{13}$/.test(invoiceRegNumber)) { setError("登録番号はT+13桁の数字で入力してください"); return; }
    if (postalCode && !/^\d{3}-?\d{4}$/.test(postalCode)) { setError("郵便番号の形式が正しくありません"); return; }
    if (phone) { const p = phone.replace(/[\s-]/g, ""); if (!/^0\d{9,10}$/.test(p)) { setError("電話番号の形式が正しくありません"); return; } }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("メールアドレスの形式が正しくありません"); return; }
    if (bankAccountNumber && !/^\d{7,8}$/.test(bankAccountNumber)) { setError("口座番号は7〜8桁の数字で入力してください"); return; }

    setSaving(true);
    const payload = {
      user_id: userId, name: name.trim(), invoice_registration_number: invoiceRegNumber || null,
      postal_code: postalCode || null, address: address || null, phone: phone || null, email: email || null,
      fiscal_month: formFiscalMonth,
      bank_name: bankName === "その他" ? bankNameCustom : bankName || null,
      bank_branch: bankBranch || null, bank_account_type: bankAccountType,
      bank_account_number: bankAccountNumber || null, bank_account_holder: bankAccountHolder || null,
    };

    const { error: dbError } = companyId
      ? await supabase.from("companies").update(payload).eq("id", companyId)
      : await supabase.from("companies").insert(payload);

    if (dbError) { setError(`保存に失敗しました: ${dbError.message}`); }
    else { setSuccess("保存しました"); setIsEditing(false); }
    setSaving(false);
  };

  const handleSealUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !companyId) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setError("JPG・PNG・WebP形式のみ対応しています"); return; }
    if (file.size > 2 * 1024 * 1024) { setError("画像は2MB以下にしてください"); return; }
    setSealUploading(true);
    const ext = file.name.split(".").pop();
    const path = `seals/${companyId}.${ext}`;
    await supabase.storage.from("company-assets").remove([path]);
    const { error: upErr } = await supabase.storage.from("company-assets").upload(path, file, { upsert: true });
    if (upErr) { setError("アップロードに失敗しました"); setSealUploading(false); return; }
    const { data: pub } = supabase.storage.from("company-assets").getPublicUrl(path);
    const url = `${pub.publicUrl}?t=${Date.now()}`;
    await supabase.from("companies").update({ seal_image_url: url }).eq("id", companyId);
    setSealUrl(url);
    setSealUploading(false);
    e.target.value = "";
  };

  const handleSealDelete = async () => {
    if (!companyId) return;
    await supabase.from("companies").update({ seal_image_url: null }).eq("id", companyId);
    setSealUrl("");
  };

  const disabled = !isEditing;
  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 14,
    border: "1px solid var(--color-border)", boxSizing: "border-box", outline: "none",
    background: disabled ? "#f5f5f7" : "#fff", cursor: disabled ? "default" : "text",
  };
  const labelStyle: React.CSSProperties = { fontSize: 12, color: "var(--color-text-secondary)", display: "block", marginBottom: 4, fontWeight: 500 };
  const sectionStyle: React.CSSProperties = { background: "#fff", borderRadius: 12, padding: 16, marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", border: "1px solid #f0f0f0" };

  const headerRight = !loading && companyId && (
    isEditing ? (
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={cancelEdit} style={{ background: "none", border: "none", color: "#fff", fontSize: 12, cursor: "pointer" }}>キャンセル</button>
        <button onClick={handleSave} disabled={saving} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 12px", cursor: "pointer" }}>
          {saving ? "保存中..." : "保存"}
        </button>
      </div>
    ) : (
      <button onClick={startEdit} style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 6, color: "#fff", fontSize: 12, fontWeight: 600, padding: "4px 12px", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
        <Pencil size={12} /> 編集
      </button>
    )
  );

  return (
    <>
      <MobileHeader title="自社情報" right={headerRight} />
      <div style={{ padding: "12px 16px" }}>
        {error && <div style={{ padding: "10px 14px", marginBottom: 10, borderRadius: 10, fontSize: 13, background: "#fef2f2", color: "#dc2626" }}>{error}</div>}
        {success && <div style={{ padding: "10px 14px", marginBottom: 10, borderRadius: 10, fontSize: 13, background: "#d1fae5", color: "#065f46" }}>{success}</div>}

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 60 }}>読み込み中...</div>
        ) : (
          <>
            {/* 基本情報 */}
            <div style={sectionStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>基本情報</div>
              <div style={{ marginBottom: 10 }}><label style={labelStyle}>会社名 *</label><input value={name} onChange={e => setName(e.target.value)} disabled={disabled} style={inputStyle} /></div>
              <div style={{ marginBottom: 10 }}><label style={labelStyle}>適格請求書発行事業者登録番号</label><input value={invoiceRegNumber} onChange={e => setInvoiceRegNumber(e.target.value)} disabled={disabled} placeholder="T1234567890123" style={inputStyle} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>郵便番号</label><input value={postalCode} onChange={e => setPostalCode(e.target.value)} disabled={disabled} placeholder="123-4567" style={inputStyle} /></div>
                <div><label style={labelStyle}>電話番号</label><input value={phone} onChange={e => setPhone(e.target.value)} disabled={disabled} style={inputStyle} /></div>
              </div>
              <div style={{ marginBottom: 10 }}><label style={labelStyle}>住所</label><input value={address} onChange={e => setAddress(e.target.value)} disabled={disabled} style={inputStyle} /></div>
              <div><label style={labelStyle}>メールアドレス</label><input value={email} onChange={e => setEmail(e.target.value)} disabled={disabled} style={inputStyle} /></div>
            </div>

            {/* 会計設定 */}
            <div style={sectionStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>会計設定</div>
              <div><label style={labelStyle}>決算月</label>
                <select value={formFiscalMonth} onChange={e => setFormFiscalMonth(Number(e.target.value))} disabled={disabled} style={{ ...inputStyle, appearance: "auto" }}>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
                </select>
              </div>
            </div>

            {/* 振込先口座 */}
            <div style={sectionStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>振込先口座</div>
              <div style={{ marginBottom: 10 }}><label style={labelStyle}>銀行名</label>
                <select value={bankName} onChange={e => setBankName(e.target.value)} disabled={disabled} style={{ ...inputStyle, appearance: "auto" }}>
                  <option value="">選択してください</option>
                  {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              {bankName === "その他" && (
                <div style={{ marginBottom: 10 }}><label style={labelStyle}>銀行名（手入力）</label><input value={bankNameCustom} onChange={e => setBankNameCustom(e.target.value)} disabled={disabled} style={inputStyle} /></div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                <div><label style={labelStyle}>支店名</label><input value={bankBranch} onChange={e => setBankBranch(e.target.value)} disabled={disabled} style={inputStyle} /></div>
                <div><label style={labelStyle}>口座種別</label>
                  <select value={bankAccountType} onChange={e => setBankAccountType(e.target.value)} disabled={disabled} style={{ ...inputStyle, appearance: "auto" }}>
                    <option value="普通">普通</option><option value="当座">当座</option>
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={labelStyle}>口座番号</label><input value={bankAccountNumber} onChange={e => setBankAccountNumber(e.target.value)} disabled={disabled} style={inputStyle} /></div>
                <div><label style={labelStyle}>口座名義</label><input value={bankAccountHolder} onChange={e => setBankAccountHolder(e.target.value)} disabled={disabled} style={inputStyle} /></div>
              </div>
            </div>

            {/* 角印 */}
            <div style={sectionStyle}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)", marginBottom: 12 }}>角印</div>
              <input ref={sealInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleSealUpload} />
              {sealUrl ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <img src={sealUrl} alt="角印" style={{ width: 80, height: 80, objectFit: "contain", border: "1px solid var(--color-border)", borderRadius: 8 }} />
                  {isEditing && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <button onClick={() => sealInputRef.current?.click()} disabled={sealUploading} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid var(--color-border)", background: "#fff", fontSize: 12, cursor: "pointer" }}>変更</button>
                      <button onClick={handleSealDelete} style={{ padding: "6px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", color: "#dc2626", fontSize: 12, cursor: "pointer" }}>削除</button>
                    </div>
                  )}
                </div>
              ) : isEditing ? (
                <button onClick={() => sealInputRef.current?.click()} disabled={sealUploading}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "1px dashed var(--color-border)", background: "#fafafa", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--color-text-secondary)" }}>
                  <Upload size={14} /> {sealUploading ? "アップロード中..." : "角印画像をアップロード"}
                </button>
              ) : (
                <p style={{ fontSize: 13, color: "var(--color-text-muted)" }}>未設定</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
