"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { Camera, FolderOpen, Check } from "lucide-react";

type ReceiptItem = {
  date: string; vendor: string; amount: number; tax_rate: number;
  category: string; description: string; is_food: boolean; notes: string;
  participants?: number;
  payment_method: "cash" | "bank" | "credit";
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

const FOOD_KEYWORDS = ["レストラン", "食堂", "飲食", "居酒屋", "焼肉", "寿司", "カフェ", "喫茶", "ラーメン", "うどん", "そば", "弁当", "料理"];

function isFoodVendor(vendor: string): boolean {
  return FOOD_KEYWORDS.some((kw) => vendor.includes(kw));
}

function getCreditAccount(pm: string) {
  if (pm === "cash") return "現金";
  if (pm === "bank") return "普通預金";
  return "未払金";
}

export default function MobileReceiptsPage() {
  const supabase = createClient();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/receipts", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "アップロードに失敗しました");
      if (data.receipts?.length) {
        setReceipts(prev => [...prev, ...data.receipts]);
        setMessage({ type: "success", text: `${data.receipts.length}件の明細を認識しました` });
      }
    } catch (e: any) {
      setMessage({ type: "error", text: e.message });
    }
    setUploading(false);
  };

  const updateReceipt = (idx: number, field: string, value: any) => {
    setReceipts(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const showFoodFields = (item: ReceiptItem) => item.is_food || isFoodVendor(item.vendor);

  const registerAll = async () => {
    setRegistering(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: company } = await supabase
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) return;

    const journals = receipts.map(item => ({
      company_id: company.id,
      journal_date: item.date,
      debit_account: item.category,
      credit_account: getCreditAccount(item.payment_method),
      amount: item.amount,
      description: `${item.vendor} ${item.description}`.trim(),
      source: "auto",
    }));

    const { error } = await supabase.from("journals").insert(journals);
    if (error) {
      setMessage({ type: "error", text: `登録エラー: ${error.message}` });
    } else {
      setMessage({ type: "success", text: `${journals.length}件の仕訳を登録しました` });
      setReceipts([]);
    }
    setRegistering(false);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "8px 10px", borderRadius: 8,
    border: "1px solid #d2d2d7", fontSize: 13, boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "auto" };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: "#6e6e73", display: "block", marginBottom: 4 };

  return (
    <>
      <MobileHeader title="領収書アップロード" />
      <div style={{ padding: "16px" }}>
        {message && (
          <div style={{
            padding: "10px 14px", marginBottom: 12, borderRadius: 10, fontSize: 13,
            background: message.type === "success" ? "#d1fae5" : "#fef2f2",
            color: message.type === "success" ? "#065f46" : "#dc2626",
          }}>
            {message.text}
          </div>
        )}

        {/* hidden inputs */}
        <input
          ref={cameraInputRef} type="file"
          accept="image/jpeg,image/png,image/webp" capture="environment"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />
        <input
          ref={fileInputRef} type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
        />

        {/* アップロードエリア */}
        {uploading ? (
          <div style={{
            background: "#fff", borderRadius: 16, padding: "48px 16px",
            textAlign: "center", border: "2px dashed #d2d2d7", marginBottom: 16,
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>認識中...</p>
          </div>
        ) : (
          <div style={{
            background: "#fff", borderRadius: 16, padding: "32px 16px",
            marginBottom: 16, border: "1px solid #f0f0f0",
            display: "flex", flexDirection: "column", alignItems: "center",
          }}>
            <Camera size={48} color="var(--color-primary)" style={{ marginBottom: 16 }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f", margin: "0 0 4px" }}>領収書を読み取る</p>
            <p style={{ fontSize: 12, color: "#6e6e73", margin: "0 0 20px" }}>JPG, PNG, WebP, PDF</p>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={() => cameraInputRef.current?.click()}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 10,
                  border: "none", background: "var(--color-primary)", color: "#fff",
                  fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                <Camera size={16} /> カメラで撮影
              </button>
              <button onClick={() => fileInputRef.current?.click()}
                style={{
                  flex: 1, padding: "12px 0", borderRadius: 10,
                  border: "1px solid var(--color-border)", background: "#fff",
                  color: "var(--color-text)", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                }}>
                <FolderOpen size={16} /> ファイル選択
              </button>
            </div>
          </div>
        )}

        {/* 認識結果 */}
        {receipts.map((item, idx) => (
          <div key={idx} style={{
            background: "#fff", borderRadius: 12, padding: "16px",
            marginBottom: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            border: "1px solid #f0f0f0",
          }}>
            {/* ヘッダー */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "#1d1d1f" }}>
                #{idx + 1} {item.vendor || "不明"}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: "var(--color-primary)" }}>
                ¥{(item.amount || 0).toLocaleString("ja-JP")}
              </span>
            </div>

            {/* 1行目: 日付・店名・金額 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>日付</label>
                <input type="date" value={item.date}
                  onChange={e => updateReceipt(idx, "date", e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>店名・発行元</label>
                <input type="text" value={item.vendor}
                  onChange={e => updateReceipt(idx, "vendor", e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>金額</label>
                <input type="text" value={String(item.amount)}
                  onChange={e => {
                    const v = parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
                    updateReceipt(idx, "amount", isNaN(v) ? 0 : v);
                  }} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>税率</label>
                <select value={item.tax_rate}
                  onChange={e => updateReceipt(idx, "tax_rate", Number(e.target.value))} style={selectStyle}>
                  <option value={10}>10%</option>
                  <option value={8}>8%</option>
                  <option value={0}>対象外</option>
                </select>
              </div>
            </div>

            {/* 2行目: 勘定科目・支払方法 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              <div>
                <label style={labelStyle}>勘定科目</label>
                <select value={item.category}
                  onChange={e => updateReceipt(idx, "category", e.target.value)} style={selectStyle}>
                  {ACCOUNTS.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>支払方法</label>
                <select value={item.payment_method}
                  onChange={e => updateReceipt(idx, "payment_method", e.target.value as any)} style={selectStyle}>
                  <option value="cash">現金</option>
                  <option value="bank">普通預金（振込）</option>
                  <option value="credit">クレジット（未払金）</option>
                </select>
              </div>
            </div>

            {/* 飲食系: 参加人数 */}
            {showFoodFields(item) && (
              <div style={{ marginBottom: 10 }}>
                <label style={labelStyle}>参加人数</label>
                <input type="number" min={1} value={item.participants ?? ""}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    updateReceipt(idx, "participants", isNaN(v) ? undefined : v);
                  }}
                  placeholder="人数を入力" style={{ ...inputStyle, width: "50%" }} />
                {item.participants && item.participants > 0 && (
                  <div style={{ fontSize: 11, color: "#6e6e73", marginTop: 4 }}>
                    1人あたり: ¥{Math.round(item.amount / item.participants).toLocaleString("ja-JP")}
                    {item.amount / item.participants <= 10000 ? " → 会議費" : " → 接待交際費"}
                  </div>
                )}
              </div>
            )}

            {/* 摘要 */}
            <div style={{ marginBottom: 10 }}>
              <label style={labelStyle}>摘要</label>
              <input type="text" value={item.description}
                onChange={e => updateReceipt(idx, "description", e.target.value)} style={inputStyle} />
            </div>

            {/* 備考 */}
            {item.notes && (
              <div style={{ marginBottom: 10, fontSize: 12, color: "#6e6e73", backgroundColor: "#f5f5f7", padding: "8px 12px", borderRadius: 8 }}>
                備考: {item.notes}
              </div>
            )}

            {/* 仕訳プレビュー */}
            <div style={{
              padding: "10px 12px", backgroundColor: "#f0f7ff",
              borderRadius: 8, border: "1px solid #bfdbfe", fontSize: 12,
            }}>
              <div style={{ fontWeight: 600, color: "#1e40af", marginBottom: 4 }}>仕訳プレビュー</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
                <span>借方: <strong style={{ color: "var(--color-primary)" }}>{item.category}</strong></span>
                <span>貸方: <strong style={{ color: "#1a7f37" }}>{getCreditAccount(item.payment_method)}</strong></span>
                <span>金額: <strong>¥{(item.amount || 0).toLocaleString("ja-JP")}</strong></span>
              </div>
            </div>
          </div>
        ))}

        {/* 一括登録ボタン */}
        {receipts.length > 0 && (
          <button
            onClick={registerAll}
            disabled={registering}
            style={{
              width: "100%", padding: "14px", borderRadius: 12,
              border: "none", background: "var(--color-primary)",
              color: "#fff", fontSize: 15, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8,
              opacity: registering ? 0.6 : 1,
            }}
          >
            <Check size={18} />
            {registering ? "登録中..." : `仕訳を一括登録（${receipts.length}件）`}
          </button>
        )}
      </div>
    </>
  );
}
