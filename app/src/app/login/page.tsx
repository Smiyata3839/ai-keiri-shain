"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const redirectAfterLogin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/chat"); return; }
    const { data: company } = await supabase
      .from("companies").select("id").eq("user_id", user.id).single();
    router.push(company ? "/chat" : "/onboarding");
  };

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません");
    } else {
      await redirectAfterLogin();
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: "demo@kanbei.jp",
      password: "demo1234",
    });
    if (error) {
      setError("デモログインに失敗しました");
    } else {
      await redirectAfterLogin();
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setError("現在、新規登録は受け付けておりません。");
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    border: "1px solid #d2d2d7",
    borderRadius: "12px",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "var(--font-sans)",
    background: "#fbfbfd",
    color: "#1d1d1f",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#ffffff",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        width: "100%",
        maxWidth: "380px",
        padding: "0 24px",
      }}>
        {/* Logo & Title */}
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ color: "#86868b", margin: "0 0 4px", fontSize: "12px", fontWeight: "400" }}>
            あなたの会社の経理参謀
          </p>
          <h1 style={{ fontSize: "32px", fontWeight: "700", color: "#1d1d1f", margin: "0 0 8px", letterSpacing: "-0.5px" }}>
            KANBEI
          </h1>
          <p style={{ color: "#86868b", margin: 0, fontSize: "15px", fontWeight: "400" }}>
            アカウントにログイン
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            background: error.includes("送信") ? "#f0fdf4" : "#fef2f2",
            color: error.includes("送信") ? "#166534" : "#dc2626",
            padding: "12px 16px",
            borderRadius: "12px",
            fontSize: "14px",
            marginBottom: "20px",
            textAlign: "center",
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#1d1d1f", display: "block", marginBottom: "6px" }}>
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            onFocus={(e) => e.currentTarget.style.borderColor = "#0071e3"}
            onBlur={(e) => e.currentTarget.style.borderColor = "#d2d2d7"}
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label style={{ fontSize: "13px", fontWeight: "600", color: "#1d1d1f", display: "block", marginBottom: "6px" }}>
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            onFocus={(e) => e.currentTarget.style.borderColor = "#0071e3"}
            onBlur={(e) => e.currentTarget.style.borderColor = "#d2d2d7"}
            style={inputStyle}
          />
        </div>

        {/* Buttons */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: "#1d1d1f",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            marginBottom: "10px",
            fontFamily: "var(--font-sans)",
            transition: "opacity 0.2s",
            letterSpacing: "0.2px",
          }}
        >
          {loading ? "処理中..." : "ログイン"}
        </button>

        <button
          onClick={handleSignUp}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            background: "transparent",
            color: "#86868b",
            border: "1px solid #e5e5ea",
            borderRadius: "12px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "not-allowed",
            fontFamily: "var(--font-sans)",
            opacity: 0.5,
            letterSpacing: "0.2px",
          }}
        >
          新規登録（現在停止中）
        </button>

        <div style={{ marginTop: "28px", textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", background: "#d2d2d7" }} />
            <span style={{ fontSize: "12px", color: "#86868b" }}>または</span>
            <div style={{ flex: 1, height: "1px", background: "#d2d2d7" }} />
          </div>
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            style={{
              width: "100%",
              padding: "14px",
              background: "#f5f5f7",
              color: "#1d1d1f",
              border: "1px solid #d2d2d7",
              borderRadius: "12px",
              fontSize: "14px",
              fontWeight: "500",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: "var(--font-sans)",
              transition: "background 0.2s",
            }}
          >
            デモアカウントでログイン
          </button>
        </div>

        <p style={{ textAlign: "center", marginTop: "32px", fontSize: "12px", color: "#86868b" }}>
          © KANBEI
        </p>
      </div>
    </div>
  );
}
