"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DIAGNOSIS_QUESTIONS, OWNER_TYPES, calculateTypeCode, type OwnerType } from "@/lib/owner-types";

export default function OwnerDiagnosisPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0); // 0-11: 質問, 12: 結果
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<OwnerType | null>(null);
  const [existingProfile, setExistingProfile] = useState<OwnerType | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // 既存の診断結果を取得
      const res = await fetch("/api/owner-profile");
      if (res.ok) {
        const data = await res.json();
        if (data.profile?.owner_type) {
          const type = OWNER_TYPES[data.profile.owner_type];
          if (type) {
            setExistingProfile(type);
            setResult(type);
            setStep(DIAGNOSIS_QUESTIONS.length);
          }
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleAnswer = (code: string) => {
    const newAnswers = [...answers, code];
    setAnswers(newAnswers);

    if (newAnswers.length === DIAGNOSIS_QUESTIONS.length) {
      const typeCode = calculateTypeCode(newAnswers);
      const type = OWNER_TYPES[typeCode];
      if (type) {
        setResult(type);
        saveResult(type);
      }
      setStep(DIAGNOSIS_QUESTIONS.length);
    } else {
      setStep(step + 1);
    }
  };

  const saveResult = async (type: OwnerType) => {
    setSaving(true);
    try {
      await fetch("/api/owner-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner_type: type.code,
          diagnosis_summary: type.description,
          strengths: type.strengths.join("\n"),
          risk_points: type.weaknesses.join("\n"),
          communication_style: type.communicationStyle,
        }),
      });
    } catch (e) {
      console.error("Save error:", e);
    }
    setSaving(false);
  };

  const retryDiagnosis = () => {
    setAnswers([]);
    setResult(null);
    setExistingProfile(null);
    setStep(0);
  };

  if (loading) {
    return (
      <div style={{ background: "var(--color-background)", minHeight: "100vh", padding: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>読み込み中...</p>
      </div>
    );
  }

  const totalQuestions = DIAGNOSIS_QUESTIONS.length;

  // 結果画面
  if (step === totalQuestions && result) {
    return (
      <div style={{ background: "var(--color-background)", minHeight: "100vh", padding: "40px" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto" }}>
          {/* ヘッダー */}
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 8px 0" }}>
              あなたの経営者タイプは
            </p>
            <h1 style={{ fontSize: "36px", fontWeight: "800", color: "#0d9488", margin: "0 0 4px 0" }}>
              {result.name}
            </h1>
            <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", margin: "0 0 8px 0" }}>
              {result.title}
            </p>
            <span style={{
              display: "inline-block",
              padding: "4px 16px",
              borderRadius: "20px",
              background: "rgba(13,148,136,0.1)",
              color: "#0d9488",
              fontSize: "18px",
              fontWeight: "700",
              letterSpacing: "4px",
            }}>
              {result.code}
            </span>
          </div>

          {/* 診断結果 */}
          <div style={{
            background: "var(--color-card)",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid var(--color-border)",
            marginBottom: "20px",
          }}>
            <p style={{ fontSize: "14px", lineHeight: "1.8", color: "var(--color-text)", margin: 0 }}>
              {result.description}
            </p>
          </div>

          {/* 強み */}
          <div style={{
            background: "var(--color-card)",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid var(--color-border)",
            marginBottom: "20px",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#0d9488", margin: "0 0 16px 0" }}>
              強み
            </h3>
            {result.strengths.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", marginBottom: i < result.strengths.length - 1 ? "12px" : 0 }}>
                <span style={{ color: "#059669", fontWeight: "700", flexShrink: 0 }}>+</span>
                <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--color-text)", margin: 0 }}>{s}</p>
              </div>
            ))}
          </div>

          {/* 弱み */}
          <div style={{
            background: "var(--color-card)",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid var(--color-border)",
            marginBottom: "20px",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "rgba(13,148,136,0.7)", margin: "0 0 16px 0" }}>
              注意点
            </h3>
            {result.weaknesses.map((w, i) => (
              <div key={i} style={{ display: "flex", gap: "10px", marginBottom: i < result.weaknesses.length - 1 ? "12px" : 0 }}>
                <span style={{ color: "rgba(13,148,136,0.7)", fontWeight: "700", flexShrink: 0 }}>!</span>
                <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--color-text)", margin: 0 }}>{w}</p>
              </div>
            ))}
          </div>

          {/* コミュニケーションスタイル */}
          <div style={{
            background: "var(--color-card)",
            borderRadius: "16px",
            padding: "28px",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            border: "1px solid var(--color-border)",
            marginBottom: "32px",
          }}>
            <h3 style={{ fontSize: "16px", fontWeight: "700", color: "rgba(13,148,136,0.5)", margin: "0 0 12px 0" }}>
              KANBEIの対応方針
            </h3>
            <p style={{ fontSize: "14px", lineHeight: "1.8", color: "var(--color-text)", margin: 0 }}>
              {result.communicationStyle}
            </p>
          </div>

          {/* もう一度診断ボタン */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={retryDiagnosis}
              style={{
                padding: "12px 32px",
                borderRadius: "var(--radius-button)",
                border: "1px solid var(--color-border)",
                background: "white",
                color: "var(--color-text)",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              もう一度診断する
            </button>
          </div>
          {saving && (
            <p style={{ textAlign: "center", fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "12px" }}>
              診断結果を保存中...
            </p>
          )}
        </div>
      </div>
    );
  }

  // 質問画面
  const question = DIAGNOSIS_QUESTIONS[step];

  return (
    <div style={{ background: "var(--color-background)", minHeight: "100vh", padding: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ maxWidth: "600px", width: "100%" }}>
        {/* プログレス */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            width: "100%", height: "4px", borderRadius: "2px",
            background: "var(--color-border)", overflow: "hidden",
          }}>
            <div style={{
              width: `${((step + 1) / totalQuestions) * 100}%`,
              height: "100%", borderRadius: "2px",
              background: "#0d9488",
              transition: "width 0.3s ease",
            }} />
          </div>
        </div>

        {/* 質問ヘッダー */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "0 0 8px 0", fontWeight: "600" }}>
            Q{step + 1} / {totalQuestions} — {question.axis}
          </p>
          <h2 style={{ fontSize: "22px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
            {question.label}
          </h2>
        </div>

        {/* 選択肢 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {[question.optionA, question.optionB].map((option) => (
            <button
              key={option.code}
              onClick={() => handleAnswer(option.code)}
              style={{
                background: "var(--color-card)",
                borderRadius: "16px",
                padding: "24px 28px",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                border: "2px solid var(--color-border)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.2s",
                fontFamily: "var(--font-sans)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#0d9488";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(13,148,136,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
              }}
            >
              <div style={{ fontSize: "16px", fontWeight: "700", color: "var(--color-text)", marginBottom: "6px" }}>
                {option.label}
              </div>
              <div style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
                {option.description}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
