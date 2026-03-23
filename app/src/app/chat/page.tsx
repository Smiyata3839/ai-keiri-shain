"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "ai-keiri-chat-messages";

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "おはようございます！AI経理社員です。今日もサポートします。何かお手伝いできることはありますか？",
};

const loadMessages = (): Message[] => {
  if (typeof window === "undefined") return [INITIAL_MESSAGE];
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Message[];
      if (parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return [INITIAL_MESSAGE];
};

const KEYWORDS = [
  { label: "✂️ 経費削減できそうな科目は？", message: "経費削減できそうな科目は？" },
  { label: "📈 売上の傾向を教えて", message: "売上の傾向を教えて" },
  { label: "💰 資金繰りを教えて", message: "資金繰りを教えて" },
  { label: "🎯 今期の着地予想は？", message: "今期の着地予想は？" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (company) setCompanyId(company.id);
    };
    init();
  }, []);

  // messagesが変更されるたびにsessionStorageに保存
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch { /* storage full — ignore */ }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMessage], companyId }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      {/* サイドバー */}
      <div style={{
        width: "240px", minWidth: "240px",
        background: "#1c1c1e", color: "white",
        display: "flex", flexDirection: "column",
        height: "100vh", position: "fixed", left: 0, top: 0,
        overflowY: "auto",
      }}>
        <div style={{
          padding: "20px 16px 16px",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: "10px",
        }}>
          <div style={{
            width: "32px", height: "32px", background: "var(--color-primary)",
            borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px",
          }}>💼</div>
          <span style={{ fontSize: "15px", fontWeight: "700" }}>AI経理社員</span>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px" }}>
          {[
            { label: "メイン", items: [{ icon: "💬", label: "チャット", path: "/chat" }] },
            { label: "受発注", items: [
              { icon: "📄", label: "請求書発行", path: "/invoices/new" },
              { icon: "📋", label: "請求書一覧", path: "/invoices" },
              { icon: "💰", label: "売掛管理", path: "/receivables" },
            ]},
            { label: "会計", items: [
              { icon: "🏦", label: "銀行明細取込", path: "/bank" },
              { icon: "📒", label: "仕訳一覧", path: "/journals" },
              { icon: "📒", label: "総勘定元帳", path: "/general-ledger" },
              { icon: "📊", label: "残高試算表", path: "/trial-balance" },
              { icon: "📈", label: "貸借対照表", path: "/balance-sheet" },
              { icon: "📉", label: "損益計算書", path: "/profit-loss" },
            ]},
            { label: "経費", items: [{ icon: "🧾", label: "領収書アップロード", path: "/receipts" }] },
            { label: "設定", items: [
              { icon: "👥", label: "顧客管理", path: "/customers" },
              { icon: "🏢", label: "自社情報", path: "/company" },
            ]},
          ].map((group) => (
            <div key={group.label} style={{ marginBottom: "20px" }}>
              <div style={{ fontSize: "11px", fontWeight: "600", color: "rgba(255,255,255,0.35)", padding: "0 8px 6px", letterSpacing: "0.08em", textTransform: "uppercase" as const }}>
                {group.label}
              </div>
              {group.items.map((item) => (
                <div key={item.path} onClick={() => router.push(item.path)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 10px", borderRadius: "7px", cursor: "pointer", marginBottom: "2px",
                    background: item.path === "/chat" ? "rgba(0,113,227,0.3)" : "transparent",
                    color: item.path === "/chat" ? "white" : "rgba(255,255,255,0.7)",
                    fontSize: "13.5px",
                  }}
                  onMouseEnter={(e) => { if (item.path !== "/chat") e.currentTarget.style.background = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { if (item.path !== "/chat") e.currentTarget.style.background = "transparent"; }}
                >
                  <span>{item.icon}</span><span>{item.label}</span>
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 8px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div onClick={() => { supabase.auth.signOut(); router.push("/login"); }}
            style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "7px", cursor: "pointer", fontSize: "13.5px", color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <span>🚪</span><span>ログアウト</span>
          </div>
        </div>
      </div>

      {/* チャットエリア */}
      <div style={{ marginLeft: "240px", flex: 1, display: "flex", flexDirection: "column", height: "100vh", background: "var(--color-background)" }}>
        {/* ヘッダー */}
        <div style={{
          padding: "16px 24px", borderBottom: "1px solid var(--color-border)",
          background: "rgba(255,255,255,0.8)", backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "700", color: "var(--color-text)" }}>チャット</h2>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>AI経理社員</p>
        </div>

        {/* メッセージ一覧 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "16px",
            }}>
              {msg.role === "assistant" && (
                <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px", display: "block" }}>
                </div>
              )}
              <div>
                {msg.role === "assistant" && (
                  <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px" }}>AI経理社員</div>
                )}
                {msg.role === "user" && (
                  <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "4px", textAlign: "right" }}>あなた</div>
                )}
                <div style={{
                  maxWidth: "480px", padding: "12px 16px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "var(--color-primary)" : "white",
                  color: msg.role === "user" ? "white" : "var(--color-text)",
                  fontSize: "14px", lineHeight: "1.6",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "16px" }}>
              <div style={{
                padding: "12px 16px", borderRadius: "18px 18px 18px 4px",
                background: "white", color: "var(--color-text-secondary)",
                fontSize: "14px", boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}>
                考え中...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* キーワードボタン */}
        <div style={{ padding: "0 24px 12px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {KEYWORDS.map((kw) => (
            <button key={kw.label} onClick={() => sendMessage(kw.message)}
              style={{
                padding: "6px 14px", borderRadius: "980px",
                border: "1px solid var(--color-border)",
                background: "white", color: "var(--color-text)",
                fontSize: "13px", cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              {kw.label}
            </button>
          ))}
        </div>

        {/* 入力エリア */}
        <div style={{
          padding: "12px 24px 24px",
          display: "flex", gap: "12px", alignItems: "flex-end",
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="メッセージを入力..."
            style={{
              flex: 1, padding: "12px 16px",
              border: "1px solid var(--color-border)",
              borderRadius: "980px", fontSize: "14px",
              outline: "none", fontFamily: "var(--font-sans)",
              background: "white",
            }}
          />
          <button onClick={() => sendMessage(input)} disabled={loading}
            style={{
              width: "40px", height: "40px", borderRadius: "50%",
              background: "var(--color-primary)", color: "white",
              border: "none", cursor: "pointer", fontSize: "16px",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
