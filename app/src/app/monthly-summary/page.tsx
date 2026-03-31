"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Summary = {
  id: string;
  year_month: string;
  detail_level: string;
  financial_summary: string | null;
  chat_insights: string | null;
  action_items: string | null;
  generated_at: string | null;
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-card)",
  borderRadius: "16px",
  padding: "28px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "1px solid var(--color-border)",
  marginBottom: "20px",
};

const detailLabels: Record<string, { label: string; bg: string; color: string }> = {
  full: { label: "詳細", bg: "#d1fae5", color: "#065f46" },
  condensed: { label: "要約", bg: "#fef3c7", color: "#92400e" },
  minimal: { label: "概要", bg: "#e5e7eb", color: "#374151" },
};

export default function MonthlySummaryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  useEffect(() => {
    // デフォルトを先月に設定
    const now = new Date();
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    setSelectedMonth(`${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, "0")}`);

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      await fetchSummaries();
      setLoading(false);
    };
    init();
  }, []);

  const fetchSummaries = async () => {
    const res = await fetch("/api/monthly-summary");
    if (res.ok) {
      const data = await res.json();
      setSummaries(data.summaries ?? []);
    }
  };

  const generateSummary = async () => {
    if (!selectedMonth) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/monthly-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year_month: selectedMonth }),
      });
      if (res.ok) {
        await fetchSummaries();
      }
    } catch (e) {
      console.error("Generate error:", e);
    }
    setGenerating(false);
  };

  // 月選択用の候補（過去12ヶ月）
  const monthOptions: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  if (loading) {
    return (
      <div style={{ background: "var(--color-background)", minHeight: "100vh", padding: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ background: "var(--color-background)", minHeight: "100vh", padding: "40px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* ヘッダー */}
        <div style={{ marginBottom: "32px" }}>
          <h2 style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
            月次要約
          </h2>
          <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "4px 0 0 0" }}>
            直近3ヶ月は詳細、それ以前は自動的に圧縮されます
          </p>
        </div>

        {/* 生成パネル */}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "16px" }}>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "var(--font-sans)",
              background: "white",
            }}
          >
            {monthOptions.map((ym) => (
              <option key={ym} value={ym}>{ym}</option>
            ))}
          </select>
          <button
            onClick={generateSummary}
            disabled={generating}
            style={{
              padding: "10px 24px",
              borderRadius: "var(--radius-button)",
              border: "none",
              background: generating ? "#ccc" : "#0d9488",
              color: "white",
              fontSize: "14px",
              fontWeight: "600",
              cursor: generating ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
            }}
          >
            {generating ? "生成中..." : "月次要約を生成"}
          </button>
        </div>

        {/* 要約一覧 */}
        {summaries.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "48px 28px" }}>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", margin: 0 }}>
              まだ月次要約がありません。上のボタンから生成してください。
            </p>
          </div>
        ) : (
          summaries.map((s) => {
            const dl = detailLabels[s.detail_level] ?? detailLabels.full;
            return (
              <div key={s.id} style={cardStyle}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
                    {s.year_month}
                  </h3>
                  <span style={{
                    padding: "2px 10px",
                    borderRadius: "12px",
                    background: dl.bg,
                    color: dl.color,
                    fontSize: "11px",
                    fontWeight: "600",
                  }}>
                    {dl.label}
                  </span>
                </div>

                {s.financial_summary && (
                  <div style={{ marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: "#0d9488", margin: "0 0 4px 0" }}>財務</p>
                    <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--color-text)", margin: 0, whiteSpace: "pre-wrap" }}>
                      {s.financial_summary}
                    </p>
                  </div>
                )}

                {s.chat_insights && (
                  <div style={{ marginBottom: "14px" }}>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: "#0d9488", margin: "0 0 4px 0" }}>学び</p>
                    <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--color-text)", margin: 0, whiteSpace: "pre-wrap" }}>
                      {s.chat_insights}
                    </p>
                  </div>
                )}

                {s.action_items && (
                  <div>
                    <p style={{ fontSize: "12px", fontWeight: "700", color: "#0d9488", margin: "0 0 4px 0" }}>アクション</p>
                    <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--color-text)", margin: 0, whiteSpace: "pre-wrap" }}>
                      {s.action_items}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
