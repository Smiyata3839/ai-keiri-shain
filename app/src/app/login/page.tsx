"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Briefcase } from "lucide-react";

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
      background: "linear-gradient(135deg, #0B1426 0%, #1B2A4A 50%, #0D1B2A 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "var(--font-sans)",
    }}>
      <div style={{
        background: "var(--color-card)",
        borderRadius: "20px",
        padding: "52px",
        width: "100%",
        maxWidth: "420px",
        boxShadow: "0 8px 40px rgba(0,0,0,0.3)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "36px" }}>
          <div style={{
            width: "52px", height: "52px",
            background: "linear-gradient(135deg, #00D4FF 0%, #0098B8 100%)",
            borderRadius: "14px",
            margin: "0 auto 18px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Briefcase size={26} color="white" />
          </div>
          <h1 style={{ fontSize: "26px", fontWeight: "700", color: "var(--color-text)", margin: 0 }}>
            AI経理社員
          </h1>
          <p style={{ color: "var(--color-text-secondary)", marginTop: "8px", fontSize: "15px" }}>
            ログインしてください
          </p>
        </div>

        {error && (
          <div style={{
            background: error.includes("送信") ? "#d1fae5" : "#fef2f2",
            color: error.includes("送信") ? "#065f46" : "#dc2626",
            padding: "12px 16px",
            borderRadius: "10px",
            fontSize: "14px",
            marginBottom: "20px",
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: "18px" }}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "var(--color-text)", display: "block", marginBottom: "8px" }}>
            メールアドレス
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@company.com"
            style={{
              width: "100%", padding: "14px 16px",
              border: "1px solid var(--color-border)",
              borderRadius: "10px", fontSize: "16px",
              outline: "none", boxSizing: "border-box",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        <div style={{ marginBottom: "28px" }}>
          <label style={{ fontSize: "14px", fontWeight: "500", color: "var(--color-text)", display: "block", marginBottom: "8px" }}>
            パスワード
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: "100%", padding: "14px 16px",
              border: "1px solid var(--color-border)",
              borderRadius: "10px", fontSize: "16px",
              outline: "none", boxSizing: "border-box",
              fontFamily: "var(--font-sans)",
            }}
          />
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "16px",
            background: "linear-gradient(135deg, #00D4FF 0%, #0098B8 100%)",
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
            width: "100%", padding: "16px",
            background: "transparent",
            color: "#00D4FF",
            border: "2px solid #00D4FF",
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
