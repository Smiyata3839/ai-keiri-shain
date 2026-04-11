"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { Pencil, Trash2, Plus } from "lucide-react";

type ProfileField = {
  key: string;
  label: string;
  description: string;
  value: string;
};

const FIELD_DEFS: { key: string; label: string; description: string }[] = [
  { key: "industry", label: "業種・事業内容", description: "業種やビジネスモデルに関する情報" },
  { key: "accounting_characteristics", label: "経理の特徴", description: "勘定科目の使い方、締め日、支払サイトなど" },
  { key: "special_rules", label: "特殊ルール", description: "会社固有の仕訳パターンや例外処理" },
  { key: "tax_notes", label: "税務メモ", description: "消費税の扱い、課税区分、インボイス対応など" },
  { key: "other_notes", label: "その他", description: "上記に当てはまらない重要な情報" },
];

export default function MobileCompanyProfilePage() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState<ProfileField[]>(
    FIELD_DEFS.map(d => ({ ...d, value: "" }))
  );
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const res = await fetch("/api/company-profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile) {
          setFields(FIELD_DEFS.map(d => ({
            ...d,
            value: data.profile[d.key] ?? "",
          })));
          setUpdatedAt(data.profile.updated_at ?? null);
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (editingKey && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editingKey]);

  const saveField = async (key: string, value: string) => {
    setSaving(true);
    const payload: Record<string, string | null> = {};
    for (const f of fields) {
      payload[f.key] = f.key === key ? (value.trim() || null) : (f.value.trim() || null);
    }
    const res = await fetch("/api/company-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      setFields(prev => prev.map(f => f.key === key ? { ...f, value: value.trim() } : f));
      setUpdatedAt(new Date().toISOString());
      setSavedMessage("保存しました");
      setTimeout(() => setSavedMessage(""), 2000);
    }
    setEditingKey(null);
    setSaving(false);
  };

  const clearField = (key: string) => {
    saveField(key, "");
  };

  const hasAnyData = fields.some(f => f.value);

  return (
    <>
      <MobileHeader title="会社プロファイル" />
      <div style={{ padding: "12px 16px" }}>
        {/* サブタイトル */}
        <div style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 4px", lineHeight: 1.6 }}>
            KANBEIがチャットから自動学習した御社の情報です。修正・削除ができます。
          </p>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {updatedAt && (
              <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>
                最終更新: {new Date(updatedAt).toLocaleString("ja-JP")}
              </span>
            )}
            {savedMessage && (
              <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 600 }}>{savedMessage}</span>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--color-text-muted)", padding: 60 }}>読み込み中...</div>
        ) : !hasAnyData && !editingKey ? (
          <div style={{ textAlign: "center", padding: "40px 16px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🧠</div>
            <p style={{ fontSize: 15, fontWeight: 600, color: "var(--color-text)", margin: "0 0 8px" }}>まだ学習データがありません</p>
            <p style={{ fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.8, margin: 0 }}>
              チャットで「当社はIT企業です」「簡易課税を使っています」のように話すと、KANBEIが自動的に学習します。
            </p>
          </div>
        ) : (
          fields.map(field => (
            <div key={field.key} style={{
              background: "#fff", borderRadius: 12, padding: 16,
              marginBottom: 10, boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              border: "1px solid #f0f0f0",
            }}>
              <div style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text)" }}>{field.label}</div>
                <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{field.description}</div>
              </div>

              {editingKey === field.key ? (
                <>
                  <textarea
                    ref={textareaRef}
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    rows={3}
                    style={{
                      width: "100%", padding: "10px 12px", borderRadius: 8, fontSize: 13,
                      border: "1px solid var(--color-primary)", boxSizing: "border-box",
                      outline: "none", resize: "vertical", lineHeight: 1.6,
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => setEditingKey(null)}
                      style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid var(--color-border)", background: "#fff", fontSize: 12, cursor: "pointer", color: "var(--color-text)" }}>
                      キャンセル
                    </button>
                    <button onClick={() => saveField(field.key, editValue)} disabled={saving}
                      style={{ padding: "6px 14px", borderRadius: 6, border: "none", background: "var(--color-primary)", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", opacity: saving ? 0.5 : 1 }}>
                      {saving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </>
              ) : field.value ? (
                <>
                  <p style={{ fontSize: 13, color: "var(--color-text)", lineHeight: 1.7, margin: "8px 0", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {field.value}
                  </p>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button onClick={() => { setEditingKey(field.key); setEditValue(field.value); }}
                      style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid var(--color-border)", background: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-secondary)" }}>
                      <Pencil size={12} /> 編集
                    </button>
                    <button onClick={() => clearField(field.key)}
                      style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "#dc2626" }}>
                      <Trash2 size={12} /> クリア
                    </button>
                  </div>
                </>
              ) : (
                <button onClick={() => { setEditingKey(field.key); setEditValue(""); }}
                  style={{ marginTop: 8, padding: "6px 14px", borderRadius: 6, border: "1px dashed var(--color-border)", background: "#fafafa", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-secondary)" }}>
                  <Plus size={12} /> 手動入力
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
