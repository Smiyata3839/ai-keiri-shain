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

  const handleLogin = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("メールアドレスまたはパスワードが正しくありません");
    } else {
      router.push("/chat");
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setError(error.message);
    } else {
      setError("確認メールを送信しました。メールをご確認ください。");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-background)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        background: "var(--color-card)",
        borderRadius: "var(--radius-card)",
        padding: "48px",
        width: "100%",
        maxWidth: "400px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "48px", height: "48px",
            background: "var(--color-primary)",
            borderRadius: "12px",
            margin: "0 auto 16px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "white", fontSize: "24px" }}>💼</span>
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
            AI経理社員
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "8px", fontSize: "14px" }}>
            ログインしてください
          </p>
        </div>

        {error && (
          <div style={{
            background: error.includes("送信") ? "#e8f5e9" : "#ffeaea",
            color: error.includes("送信") ? "#2e7d32" : "#c62828",
            padding: "12px 16px",
            borderRadius: "8px",
            fontSize: "14px",
            marginBottom: "16px",
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            style={{
              width: "100%", padding: "12px 16px",
              border: "1px solid var(--color-border)",
              borderRadius: "8px", fontSize: "16px",
              outline: "none", boxSizing: "border-box",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "var(--color-text)", display: "block", marginBottom: "6px" }}>
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%", padding: "12px 16px",
              border: "1px solid var(--color-border)",
              borderRadius: "8px", fontSize: "16px",
              outline: "none", boxSizing: "border-box",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "14px",
            background: "var(--color-primary)",
            color: "white", border: "none",
            borderRadius: "var(--radius-button)",
            fontSize: "16px", fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginBottom: "12px",
            fontFamily: "var(--font-sans)",
          }}
        >
          {loading ? "処理中..." : "ログイン"}
        </button>

        <button
          onClick={handleSignUp}
          disabled={loading}
          style={{
            width: "100%", padding: "14px",
            background: "transparent",
            color: "var(--color-primary)",
            border: "1px solid var(--color-primary)",
            borderRadius: "var(--radius-button)",
            fontSize: "16px", fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          新規登録
        </button>
      </div>
    </div>
  );
}
