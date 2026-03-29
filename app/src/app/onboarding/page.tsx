"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DIAGNOSIS_QUESTIONS, OWNER_TYPES, calculateTypeCode, type OwnerType } from "@/lib/owner-types";

type OnboardingStep = "welcome" | "company" | "diagnosis" | "complete";

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<OnboardingStep>("welcome");

  // 自社情報
  const [companyName, setCompanyName] = useState("");
  const [fiscalMonth, setFiscalMonth] = useState(3);
  const [savingCompany, setSavingCompany] = useState(false);

  // 経営者診断
  const [diagStep, setDiagStep] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState<string[]>([]);
  const [diagResult, setDiagResult] = useState<OwnerType | null>(null);
  const [savingDiag, setSavingDiag] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);

      // 既に会社がある場合はチャットへ
      const { data: company } = await supabase
        .from("companies").select("id").eq("user_id", user.id).single();
      if (company) {
        router.push("/chat");
        return;
      }

      setLoading(false);
    };
    init();
  }, []);

  const saveCompany = async () => {
    if (!companyName.trim() || !userId) return;
    setSavingCompany(true);
    const { error } = await supabase.from("companies").insert({
      user_id: userId,
      name: companyName.trim(),
      fiscal_month: fiscalMonth,
    });
    setSavingCompany(false);
    if (!error) {
      setStep("diagnosis");
    }
  };

  const handleDiagAnswer = (code: string) => {
    const newAnswers = [...diagAnswers, code];
    setDiagAnswers(newAnswers);

    if (newAnswers.length === DIAGNOSIS_QUESTIONS.length) {
      const typeCode = calculateTypeCode(newAnswers);
      const type = OWNER_TYPES[typeCode];
      if (type) {
        setDiagResult(type);
        saveDiagResult(type);
      }
    } else {
      setDiagStep(diagStep + 1);
    }
  };

  const saveDiagResult = async (type: OwnerType) => {
    setSavingDiag(true);
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
    } catch { /* ignore */ }
    setSavingDiag(false);
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <p style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>読み込み中...</p>
      </div>
    );
  }

  // ── Step 1: ウェルカム ──
  if (step === "welcome") {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: "520px", textAlign: "center" }}>
          <div style={{
            width: "80px", height: "80px", borderRadius: "20px",
            background: "linear-gradient(135deg, var(--color-primary), #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 8px 32px rgba(59,109,240,0.3)",
          }}>
            <span style={{ fontSize: "36px", color: "white", fontWeight: "800" }}>K</span>
          </div>
          <h1 style={{ fontSize: "32px", fontWeight: "800", color: "var(--color-text)", margin: "0 0 12px 0" }}>
            KANBEIへようこそ
          </h1>
          <p style={{ fontSize: "16px", color: "var(--color-text-secondary)", lineHeight: "1.8", margin: "0 0 8px 0" }}>
            あなた専属のAI経理社員です。
          </p>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: "1.8", margin: "0 0 40px 0" }}>
            まず、あなたの会社について教えてください。<br />
            KANBEIがあなたの経営スタイルに合わせて成長します。
          </p>
          <button onClick={() => setStep("company")} style={primaryButtonStyle}>
            はじめる
          </button>
          <div style={{ marginTop: "32px", display: "flex", justifyContent: "center", gap: "24px" }}>
            {["自社情報の登録", "経営者タイプ診断", "チャット開始"].map((label, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{
                  width: "24px", height: "24px", borderRadius: "50%",
                  background: "var(--color-border)", color: "var(--color-text-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "12px", fontWeight: "700",
                }}>{i + 1}</div>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: 自社情報入力 ──
  if (step === "company") {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: "480px", width: "100%" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <p style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: "600", margin: "0 0 8px 0" }}>
              STEP 1 / 3
            </p>
            <h2 style={{ fontSize: "24px", fontWeight: "700", color: "var(--color-text)", margin: "0 0 8px 0" }}>
              自社情報の登録
            </h2>
            <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: 0 }}>
              最低限の情報だけでOK。あとから設定画面で追加できます。
            </p>
          </div>

          <div style={cardStyle}>
            <div style={{ marginBottom: "20px" }}>
              <label style={labelStyle}>
                会社名 <span style={{ color: "#dc2626" }}>*</span>
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例: 株式会社サンプル"
                style={inputStyle}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={labelStyle}>決算月</label>
              <select
                value={fiscalMonth}
                onChange={(e) => setFiscalMonth(Number(e.target.value))}
                style={{ ...inputStyle, appearance: "auto" as const }}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
            </div>

            <button
              onClick={saveCompany}
              disabled={!companyName.trim() || savingCompany}
              style={{
                ...primaryButtonStyle,
                width: "100%",
                opacity: !companyName.trim() || savingCompany ? 0.5 : 1,
                cursor: !companyName.trim() || savingCompany ? "not-allowed" : "pointer",
              }}
            >
              {savingCompany ? "保存中..." : "次へ — 経営者タイプ診断"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Step 3: 経営者診断 ──
  if (step === "diagnosis") {
    const totalQuestions = DIAGNOSIS_QUESTIONS.length;

    // 診断結果表示
    if (diagResult) {
      return (
        <div style={containerStyle}>
          <div style={{ maxWidth: "520px", width: "100%" }}>
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <p style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: "600", margin: "0 0 8px 0" }}>
                STEP 2 / 3 — 診断完了
              </p>
              <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 16px 0" }}>
                あなたの経営者タイプは
              </p>
              <h1 style={{ fontSize: "32px", fontWeight: "800", color: "var(--color-primary)", margin: "0 0 4px 0" }}>
                {diagResult.name}
              </h1>
              <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", margin: "0 0 8px 0" }}>
                {diagResult.title}
              </p>
              <span style={{
                display: "inline-block", padding: "4px 16px", borderRadius: "20px",
                background: "rgba(59,109,240,0.1)", color: "var(--color-primary)",
                fontSize: "16px", fontWeight: "700", letterSpacing: "3px",
              }}>{diagResult.code}</span>
            </div>

            <div style={{ ...cardStyle, marginBottom: "16px" }}>
              <p style={{ fontSize: "14px", lineHeight: "1.8", color: "var(--color-text)", margin: 0 }}>
                {diagResult.description}
              </p>
            </div>

            <div style={{ ...cardStyle, marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#059669", margin: "0 0 10px 0" }}>強み</h3>
              {diagResult.strengths.map((s, i) => (
                <p key={i} style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)", margin: "0 0 4px 0" }}>
                  + {s}
                </p>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "#dc2626", margin: "0 0 10px 0" }}>注意点</h3>
              {diagResult.weaknesses.map((w, i) => (
                <p key={i} style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)", margin: "0 0 4px 0" }}>
                  ! {w}
                </p>
              ))}
            </div>

            <div style={{ ...cardStyle, marginBottom: "24px" }}>
              <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-primary)", margin: "0 0 10px 0" }}>
                KANBEIの対応方針
              </h3>
              <p style={{ fontSize: "13px", lineHeight: "1.7", color: "var(--color-text)", margin: 0 }}>
                {diagResult.communicationStyle}
              </p>
            </div>

            <button onClick={() => setStep("complete")} style={{ ...primaryButtonStyle, width: "100%" }}>
              次へ
            </button>
            {savingDiag && (
              <p style={{ textAlign: "center", fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "8px" }}>
                診断結果を保存中...
              </p>
            )}
          </div>
        </div>
      );
    }

    // 質問表示
    const question = DIAGNOSIS_QUESTIONS[diagStep];
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: "520px", width: "100%" }}>
          <p style={{ fontSize: "12px", color: "var(--color-primary)", fontWeight: "600", margin: "0 0 16px 0", textAlign: "center" }}>
            STEP 2 / 3 — 経営者タイプ診断
          </p>

          {/* プログレスバー */}
          <div style={{ marginBottom: "32px" }}>
            <div style={{
              width: "100%", height: "4px", borderRadius: "2px",
              background: "var(--color-border)", overflow: "hidden",
            }}>
              <div style={{
                width: `${((diagStep + 1) / totalQuestions) * 100}%`,
                height: "100%", borderRadius: "2px",
                background: "var(--color-primary)",
                transition: "width 0.3s ease",
              }} />
            </div>
          </div>

          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", margin: "0 0 8px 0", fontWeight: "600" }}>
              Q{diagStep + 1} / {totalQuestions} — {question.axis}
            </p>
            <h2 style={{ fontSize: "20px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
              {question.label}
            </h2>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            {[question.optionA, question.optionB].map((option) => (
              <button
                key={option.code}
                onClick={() => handleDiagAnswer(option.code)}
                style={choiceButtonStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-primary)";
                  e.currentTarget.style.boxShadow = "0 4px 20px rgba(59,109,240,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--color-border)";
                  e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.06)";
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: "700", color: "var(--color-text)", marginBottom: "4px" }}>
                  {option.label}
                </div>
                <div style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: "1.6" }}>
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: 完了 ──
  if (step === "complete") {
    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: "480px", textAlign: "center" }}>
          <div style={{
            width: "72px", height: "72px", borderRadius: "50%",
            background: "linear-gradient(135deg, #059669, #10b981)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
            boxShadow: "0 8px 32px rgba(5,150,105,0.3)",
          }}>
            <span style={{ fontSize: "32px", color: "white" }}>&#10003;</span>
          </div>
          <h1 style={{ fontSize: "28px", fontWeight: "800", color: "var(--color-text)", margin: "0 0 12px 0" }}>
            準備完了！
          </h1>
          <p style={{ fontSize: "15px", color: "var(--color-text-secondary)", lineHeight: "1.8", margin: "0 0 12px 0" }}>
            KANBEIがあなたの経営スタイルを理解しました。
          </p>
          <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", lineHeight: "1.8", margin: "0 0 32px 0" }}>
            会話を重ねるほど、あなたに寄り添った経理パートナーに成長します。<br />
            まずは気軽に話しかけてみてください。
          </p>
          <button onClick={() => router.push("/chat")} style={primaryButtonStyle}>
            KANBEIと話す
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Styles ──

const containerStyle: React.CSSProperties = {
  background: "var(--color-background)",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "40px 20px",
};

const cardStyle: React.CSSProperties = {
  background: "var(--color-card)",
  borderRadius: "16px",
  padding: "24px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "1px solid var(--color-border)",
};

const primaryButtonStyle: React.CSSProperties = {
  padding: "14px 40px",
  borderRadius: "12px",
  border: "none",
  background: "var(--color-primary)",
  color: "white",
  fontSize: "15px",
  fontWeight: "700",
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  transition: "opacity 0.15s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: "600",
  color: "var(--color-text)",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid var(--color-border)",
  borderRadius: "10px",
  fontSize: "14px",
  outline: "none",
  fontFamily: "var(--font-sans)",
  background: "white",
  color: "var(--color-text)",
  boxSizing: "border-box",
};

const choiceButtonStyle: React.CSSProperties = {
  background: "var(--color-card)",
  borderRadius: "14px",
  padding: "20px 24px",
  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
  border: "2px solid var(--color-border)",
  cursor: "pointer",
  textAlign: "left",
  transition: "all 0.2s",
  fontFamily: "var(--font-sans)",
};
