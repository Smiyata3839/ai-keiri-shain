"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Summary = {
  id: string;
  fiscal_year: number;
  financial_summary: string | null;
  chat_insights: string | null;
  key_decisions: string | null;
  owner_type_evaluation: string | null;
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

export default function AnnualSummaryPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [fiscalMonth, setFiscalMonth] = useState<number>(4);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: company } = await supabase
        .from("companies").select("fiscal_month").eq("user_id", user.id).single();
      if (company?.fiscal_month) setFiscalMonth(company.fiscal_month);

      await fetchSummaries();
      setLoading(false);
    };
    init();
  }, []);

  const fetchSummaries = async () => {
    const res = await fetch("/api/annual-summary");
    if (res.ok) {
      const data = await res.json();
      setSummaries(data.summaries ?? []);
    }
  };

  const generateSummary = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/annual-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fiscal_year: selectedYear }),
      });
      if (res.ok) {
        await fetchSummaries();
      }
    } catch (e) {
      console.error("Generate error:", e);
    }
    setGenerating(false);
  };

  // 年度選択用の候補（現在から5年前まで）
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px" }}>
          <div>
            <h2 style={{ fontSize: "28px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
              年次要約
            </h2>
            <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", margin: "4px 0 0 0" }}>
              決算月: {fiscalMonth}月 / 年度ごとの経理記録と学びを蓄積します
            </p>
          </div>
        </div>

        {/* 生成パネル */}
        <div style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "16px" }}>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            style={{
              padding: "8px 12px",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              fontSize: "14px",
              fontFamily: "var(--font-sans)",
              background: "white",
            }}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}年度</option>
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
            {generating ? "生成中..." : "年次要約を生成"}
          </button>
        </div>

        {/* 要約一覧 */}
        {summaries.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "48px 28px" }}>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "14px", margin: 0 }}>
              まだ年次要約がありません。上のボタンから生成してください。
            </p>
          </div>
        ) : (
          summaries.map((s) => (
            <div key={s.id}>
              <h3 style={{ fontSize: "20px", fontWeight: "700", color: "var(--color-text)", margin: "32px 0 16px 0" }}>
                {s.fiscal_year}年度
                {s.generated_at && (
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "400", marginLeft: "12px" }}>
                    生成日: {new Date(s.generated_at).toLocaleDateString("ja-JP")}
                  </span>
                )}
              </h3>

              {s.financial_summary && (
                <div style={cardStyle}>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0d9488", margin: "0 0 12px 0" }}>
                    財務実績
                  </h4>
                  <p style={{ fontSize: "14px", lineHeight: "1.8", color: "var(--color-text)", margin: 0, whiteSpace: "pre-wrap" }}>
                    {s.financial_summary}
                  </p>
                </div>
              )}

              {s.key_decisions && (
                <div style={cardStyle}>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0d9488", margin: "0 0 12px 0" }}>
                    重要な決定事項
                  </h4>
                  <p style={{ fontSize: "14px", lineHeight: "1.8", color: "var(--color-text)", margin: 0, whiteSpace: "pre-wrap" }}>
                    {s.key_decisions}
                  </p>
                </div>
              )}

              {s.chat_insights && (
                <div style={cardStyle}>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0d9488", margin: "0 0 12px 0" }}>
                    チャットからの学び
                  </h4>
                  <p style={{ fontSize: "14px", lineHeight: "1.8", color: "var(--color-text)", margin: 0, whiteSpace: "pre-wrap" }}>
                    {s.chat_insights}
                  </p>
                </div>
              )}

              {s.owner_type_evaluation && (
                <div style={cardStyle}>
                  <h4 style={{ fontSize: "15px", fontWeight: "700", color: "#0d9488", margin: "0 0 12px 0" }}>
                    経営者タイプ評価
                  </h4>
                  <p style={{ fontSize: "14px", lineHeight: "1.8", color: "var(--color-text)", margin: 0, whiteSpace: "pre-wrap" }}>
                    {s.owner_type_evaluation}
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
