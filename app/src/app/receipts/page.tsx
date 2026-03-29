"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ReceiptItem = {
  date: string;
  vendor: string;
  amount: number;
  tax_rate: number;
  category: string;
  description: string;
  is_food: boolean;
  notes: string;
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

function determineCategory(item: ReceiptItem): string {
  const desc = (item.description || "") + (item.vendor || "");

  // 飲食系判定
  if (item.is_food || isFoodVendor(item.vendor)) {
    if (item.participants && item.participants > 0) {
      const perPerson = item.amount / item.participants;
      return perPerson <= 10000 ? "会議費" : "接待交際費";
    }
    return "接待交際費";
  }

  // 但し書きベース
  if (/会議費として/.test(desc)) return "会議費";
  if (/お食事として|飲食/.test(desc)) return "接待交際費";
  if (/交通費として|電車|タクシー|新幹線|ホテル|宿泊/.test(desc)) return "旅費交通費";
  if (/消耗品|文具/.test(desc)) return "消耗品費";
  if (/書籍|図書|新聞/.test(desc)) return "新聞図書費";
  if (/研修|セミナー/.test(desc)) return "研修費";
  if (/広告|印刷/.test(desc)) return "広告宣伝費";

  return item.category || "雑費";
}

function getCreditAccount(method: "cash" | "bank" | "credit"): string {
  switch (method) {
    case "cash": return "現金";
    case "bank": return "普通預金";
    case "credit": return "未払金";
  }
}

export default function ReceiptsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [fileName, setFileName] = useState("");

  const handleFile = useCallback(async (file: File) => {
    const validTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: "error", text: "対応形式: JPEG, PNG, WebP, PDF" });
      return;
    }

    setUploading(true);
    setMessage(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/receipts", { method: "POST", body: formData });
      const data = await res.json();

      if (!res.ok || !data.receipts?.length) {
        setMessage({ type: "error", text: "領収書を認識できませんでした。画像を確認してください。" });
        setUploading(false);
        return;
      }

      const items: ReceiptItem[] = data.receipts.map((r: any) => ({
        date: r.date || "",
        vendor: r.vendor || "",
        amount: r.amount || 0,
        tax_rate: r.tax_rate ?? 10,
        category: r.category || "雑費",
        description: r.description || "",
        is_food: r.is_food || false,
        notes: r.notes || "",
        participants: undefined,
        payment_method: "cash" as const,
      }));

      // 自動判定を適用
      items.forEach((item) => {
        item.category = determineCategory(item);
      });

      setReceipts(items);
      setMessage({ type: "success", text: `${items.length}件の領収書を認識しました` });
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    }
    setUploading(false);
  }, []);

  const updateReceipt = (index: number, field: keyof ReceiptItem, value: any) => {
    setReceipts((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      // 飲食系で参加人数が変わったら再判定
      if (field === "participants" || field === "amount") {
        next[index].category = determineCategory(next[index]);
      }
      return next;
    });
  };

  const handleRegister = async () => {
    setRegistering(true);
    setMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    const { data: company } = await supabase
      .from("companies").select("id").eq("user_id", user.id).single();
    if (!company) {
      setMessage({ type: "error", text: "自社情報を先に登録してください" });
      setRegistering(false);
      return;
    }

    const journals = receipts.map((r) => ({
      company_id: company.id,
      journal_date: r.date,
      debit_account: r.category,
      credit_account: getCreditAccount(r.payment_method),
      amount: r.amount,
      description: `${r.vendor} ${r.description}`.trim(),
      source: "auto",
    }));

    const { error } = await supabase.from("journals").insert(journals);

    if (error) {
      setMessage({ type: "error", text: `登録エラー: ${error.message}` });
    } else {
      setMessage({ type: "success", text: `${journals.length}件の仕訳を登録しました` });
      setReceipts([]);
      setFileName("");
    }
    setRegistering(false);
  };

  const showFoodFields = (item: ReceiptItem) => item.is_food || isFoodVendor(item.vendor);

  const activePath = "/receipts";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 14px", borderRadius: 10,
    border: "1px solid #d2d2d7", fontSize: 14, color: "#1d1d1f",
    backgroundColor: "#fff", boxSizing: "border-box",
  };
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "auto" };
  const labelStyle: React.CSSProperties = { fontSize: 13, color: "#6e6e73", display: "block", marginBottom: 6 };

  return (
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f7", fontFamily: '"Helvetica Neue", "Hiragino Sans", "Yu Gothic", sans-serif' }}>
        {/* ヘッダー */}
        <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #d2d2d7", padding: "24px 32px 20px", position: "sticky", top: 0, zIndex: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#1d1d1f", margin: 0 }}>領収書アップロード</h1>
          <p style={{ fontSize: 13, color: "#6e6e73", margin: "4px 0 0" }}>領収書を撮影・アップロードしてAIが自動認識・仕訳します</p>
        </div>

        <div style={{ padding: "28px 32px", maxWidth: 1200, margin: "0 auto" }}>
          {/* メッセージ */}
          {message && (
            <div style={{
              padding: "12px 16px", marginBottom: 20, borderRadius: 12, fontSize: 14,
              background: message.type === "success" ? "#d1fae5" : "#fef2f2",
              color: message.type === "success" ? "#065f46" : "#dc2626",
              border: `1px solid ${message.type === "success" ? "#6ee7b7" : "#fca5a5"}`,
            }}>
              {message.text}
            </div>
          )}

          {/* アップロードエリア */}
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "24px", marginBottom: 24, boxShadow: "0 1px 3px rgba(0,0,0,0.08)", border: "1px solid #f0f0f0" }}>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFile(file);
              }}
              style={{
                border: `2px dashed ${dragOver ? "#00D4FF" : "#d2d2d7"}`,
                borderRadius: 12,
                padding: "48px 32px",
                textAlign: "center",
                cursor: "pointer",
                backgroundColor: dragOver ? "#e8f1fb" : "#fafafa",
                transition: "all 0.2s",
                marginBottom: 20,
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFile(file);
                  e.target.value = "";
                }}
              />
              {uploading ? (
                <div>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#1d1d1f", margin: "0 0 8px" }}>認識中...</p>
                  <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>AIが領収書を読み取っています</p>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📸</div>
                  <p style={{ fontSize: 16, fontWeight: 600, color: "#1d1d1f", margin: "0 0 8px" }}>
                    ドラッグ&ドロップ または クリックでファイル選択
                  </p>
                  <p style={{ fontSize: 13, color: "#6e6e73", margin: 0 }}>
                    対応形式: JPEG / PNG / WebP / PDF
                  </p>
                  {fileName && (
                    <p style={{ fontSize: 13, color: "#00D4FF", margin: "8px 0 0", fontWeight: 500 }}>
                      選択中: {fileName}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 注意事項 */}
            <div style={{
              backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 12,
              padding: "16px 20px", fontSize: 13, color: "#92400e", lineHeight: 1.8,
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>📸 撮影・アップロードの注意事項</div>
              <div>・横向きの画像は認識精度が大きく下がります。必ず正立させてアップロードしてください</div>
              <div>・領収書全体が画面に収まるように撮影してください</div>
              <div>・暗い場所での撮影は文字が読み取れない場合があります</div>
              <div>・複数の領収書は重ならないように並べてください</div>
              <div>・読み取り結果は必ず確認・修正してから仕訳を登録してください</div>
              <div style={{ marginTop: 8, fontWeight: 600, color: "#dc2626" }}>
                ⚠️ 認識エラーがあると財務諸表の数値に影響します。必ず内容を確認してください。
              </div>
            </div>
          </div>

          {/* 認識結果一覧 */}
          {receipts.length > 0 && (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, color: "#1d1d1f", margin: "0 0 16px" }}>
                認識結果（{receipts.length}件）
              </h2>

              {receipts.map((item, idx) => (
                <div key={idx} style={{
                  backgroundColor: "#fff", borderRadius: 16, padding: "24px",
                  marginBottom: 16, boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  border: "1px solid #f0f0f0",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: "#1d1d1f" }}>
                      #{idx + 1} {item.vendor || "不明"}
                    </span>
                    <span style={{ fontSize: 18, fontWeight: 700, color: "#00D4FF" }}>
                      ¥{(item.amount || 0).toLocaleString("ja-JP")}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>日付</label>
                      <input type="date" value={item.date} onChange={(e) => updateReceipt(idx, "date", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>店名・発行元</label>
                      <input type="text" value={item.vendor} onChange={(e) => updateReceipt(idx, "vendor", e.target.value)} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>金額</label>
                      <input type="text" value={String(item.amount)} onChange={(e) => {
                        const v = parseInt(e.target.value.replace(/[^\d]/g, ""), 10);
                        updateReceipt(idx, "amount", isNaN(v) ? 0 : v);
                      }} style={inputStyle} />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <label style={labelStyle}>税率</label>
                      <select value={item.tax_rate} onChange={(e) => updateReceipt(idx, "tax_rate", Number(e.target.value))} style={selectStyle}>
                        <option value={10}>10%</option>
                        <option value={8}>8%</option>
                        <option value={0}>対象外</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>勘定科目</label>
                      <select value={item.category} onChange={(e) => updateReceipt(idx, "category", e.target.value)} style={selectStyle}>
                        {ACCOUNTS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>支払方法</label>
                      <select value={item.payment_method} onChange={(e) => updateReceipt(idx, "payment_method", e.target.value as any)} style={selectStyle}>
                        <option value="cash">現金</option>
                        <option value="bank">普通預金（銀行振込・デビット）</option>
                        <option value="credit">クレジットカード（未払金）</option>
                      </select>
                    </div>
                  </div>

                  {/* 飲食系の場合: 参加人数 */}
                  {showFoodFields(item) && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 16, marginBottom: 16 }}>
                      <div>
                        <label style={labelStyle}>参加人数</label>
                        <input type="number" min={1} value={item.participants ?? ""} onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          updateReceipt(idx, "participants", isNaN(v) ? undefined : v);
                        }} placeholder="人数を入力" style={inputStyle} />
                        {item.participants && item.participants > 0 && (
                          <div style={{ fontSize: 12, color: "#6e6e73", marginTop: 4 }}>
                            1人あたり: ¥{Math.round(item.amount / item.participants).toLocaleString("ja-JP")}
                            {item.amount / item.participants <= 10000 ? " → 会議費" : " → 接待交際費"}
                          </div>
                        )}
                      </div>
                      <div />
                    </div>
                  )}

                  <div>
                    <label style={labelStyle}>摘要</label>
                    <input type="text" value={item.description} onChange={(e) => updateReceipt(idx, "description", e.target.value)} style={inputStyle} />
                  </div>

                  {item.notes && (
                    <div style={{ marginTop: 12, fontSize: 12, color: "#6e6e73", backgroundColor: "#f5f5f7", padding: "8px 12px", borderRadius: 8 }}>
                      備考: {item.notes}
                    </div>
                  )}

                  {/* 仕訳プレビュー */}
                  <div style={{
                    marginTop: 16, padding: "12px 16px", backgroundColor: "#f0f7ff",
                    borderRadius: 10, border: "1px solid #bfdbfe", fontSize: 13,
                  }}>
                    <div style={{ fontWeight: 600, color: "#1e40af", marginBottom: 6 }}>仕訳プレビュー</div>
                    <div style={{ display: "flex", gap: 24 }}>
                      <span>借方: <strong style={{ color: "#00D4FF" }}>{item.category}</strong></span>
                      <span>貸方: <strong style={{ color: "#1a7f37" }}>{getCreditAccount(item.payment_method)}</strong></span>
                      <span>金額: <strong>¥{(item.amount || 0).toLocaleString("ja-JP")}</strong></span>
                    </div>
                  </div>
                </div>
              ))}

              {/* 一括登録ボタン */}
              <div style={{ textAlign: "center", padding: "24px 0" }}>
                <button
                  onClick={handleRegister}
                  disabled={registering}
                  style={{
                    backgroundColor: registering ? "#9ca3af" : "#00D4FF",
                    color: "#fff", border: "none", borderRadius: 980,
                    padding: "14px 40px", fontSize: 16, fontWeight: 600,
                    cursor: registering ? "default" : "pointer",
                    transition: "background-color 0.2s",
                  }}
                >
                  {registering ? "登録中..." : `仕訳を一括登録（${receipts.length}件）`}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
  );
}
