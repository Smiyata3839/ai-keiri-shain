"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProfileField = {
  key: string;
  label: string;
  description: string;
  value: string;
};

const FIELDS: { key: string; label: string; description: string }[] = [
  { key: "industry", label: "業種・事業内容", description: "業種やビジネスモデルに関する情報" },
  { key: "accounting_characteristics", label: "経理の特徴", description: "勘定科目の使い方、締め日、支払サイトなど" },
  { key: "special_rules", label: "特殊ルール", description: "会社固有の仕訳パターンや例外処理" },
  { key: "tax_notes", label: "税務メモ", description: "消費税の扱い、課税区分、インボイス対応など" },
  { key: "other_notes", label: "その他", description: "上記に当てはまらない重要な情報" },
];

export default function CompanyProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<ProfileField[]>(
    FIELDS.map((f) => ({ ...f, value: "" }))
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const res = await fetch("/api/company-profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setFields(FIELDS.map((f) => ({
            ...f,
            value: data.profile[f.key] ?? "",
          })));
          setUpdatedAt(data.profile.updated_at ?? null);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const startEdit = (key: string) => {
    const field = fields.find((f) => f.key === key);
    setEditingKey(key);
    setEditValue(field?.value ?? "");
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setEditValue("");
  };

  const saveField = async (key: string, value: string) => {
    setSaving(true);
    const updates: Record<string, string | null> = {};
    fields.forEach((f) => {
      updates[f.key] = f.key === key ? (value.trim() || null) : (f.value || null);
    });

    const res = await fetch("/api/company-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });

    if (res.ok) {
      setFields((prev) =>
        prev.map((f) => f.key === key ? { ...f, value: value.trim() } : f)
      );
      setUpdatedAt(new Date().toISOString());
      setSavedMessage("保存しました");
      setTimeout(() => setSavedMessage(""), 2000);
    }
    setEditingKey(null);
    setEditValue("");
    setSaving(false);
  };

  const clearField = async (key: string) => {
    await saveField(key, "");
  };

  if (loading) {
    return (
      <div style={{ background: "var(--color-background)", minHeight: "100vh", padding: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>読み込み中...</p>
      </div>
    );
  }

  const hasAnyData = fields.some((f) => f.value);

  return (
    <div style={{ background: "var(--color-background)", minHeight: "100vh", padding: "40px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-text)", margin: "0 0 4px 0" }}>
            会社プロファイル
          </h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "0 0 4px 0" }}>
            KANBEIがチャットから自動学習した御社の情報です。修正・削除ができます。
          </p>
          {updatedAt && (
            <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>
              最終更新: {new Date(updatedAt).toLocaleString("ja-JP")}
            </p>
          )}
          {savedMessage && (
            <p style={{ fontSize: "12px", color: "#059669", fontWeight: "600", margin: "4px 0 0 0" }}>
              {savedMessage}
            </p>
          )}
        </div>

        {!hasAnyData && (
          <div style={{
            background: "var(--color-card)", borderRadius: "16px",
            padding: "40px 28px", textAlign: "center",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid var(--color-border)", marginBottom: "20px",
          }}>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 8px 0" }}>
              まだ学習データがありません
            </p>
            <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
              チャットで「当社はIT企業です」「簡易課税を使っています」のように話すと、KANBEIが自動的に学習します。
            </p>
          </div>
        )}

        {/* フィールド一覧 */}
        {fields.map((field) => (
          <div
            key={field.key}
            style={{
              background: "var(--color-card)",
              borderRadius: "16px",
              padding: "20px 24px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              border: "1px solid var(--color-border)",
              marginBottom: "14px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: field.value || editingKey === field.key ? "10px" : 0 }}>
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)", margin: "0 0 2px 0" }}>
                  {field.label}
                </h3>
                <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: 0 }}>
                  {field.description}
                </p>
              </div>
              {editingKey !== field.key && (
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  {field.value && (
                    <>
                      <button onClick={() => startEdit(field.key)} style={smallButtonStyle}>
                        編集
                      </button>
                      <button
                        onClick={() => clearField(field.key)}
                        style={{ ...smallButtonStyle, color: "#dc2626" }}
                      >
                        クリア
                      </button>
                    </>
                  )}
                  {!field.value && (
                    <button onClick={() => startEdit(field.key)} style={smallButtonStyle}>
                      手動入力
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 編集モード */}
            {editingKey === field.key ? (
              <div>
                <textarea
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  rows={3}
                  autoFocus
                  style={{
                    width: "100%", padding: "10px 12px",
                    border: "1px solid var(--color-primary)", borderRadius: "10px",
                    fontSize: "14px", outline: "none", fontFamily: "var(--font-sans)",
                    background: "white", color: "var(--color-text)",
                    boxSizing: "border-box", resize: "vertical", lineHeight: "1.6",
                  }}
                />
                <div style={{ display: "flex", gap: "8px", marginTop: "8px", justifyContent: "flex-end" }}>
                  <button onClick={cancelEdit} style={smallButtonStyle}>
                    キャンセル
                  </button>
                  <button
                    onClick={() => saveField(field.key, editValue)}
                    disabled={saving}
                    style={{
                      ...smallButtonStyle,
                      background: "var(--color-primary)", color: "white",
                      border: "none",
                    }}
                  >
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>
              </div>
            ) : field.value ? (
              <p style={{
                fontSize: "14px", lineHeight: "1.7", color: "var(--color-text)",
                margin: 0, whiteSpace: "pre-wrap",
              }}>
                {field.value}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const smallButtonStyle: React.CSSProperties = {
  padding: "4px 12px",
  borderRadius: "8px",
  border: "1px solid var(--color-border)",
  background: "white",
  color: "var(--color-text-secondary)",
  fontSize: "12px",
  fontWeight: "600",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};
