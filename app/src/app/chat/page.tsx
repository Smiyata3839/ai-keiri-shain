"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Sidebar } from "@/components/Sidebar";
import { Send, Scissors, TrendingUp, Coins, Target } from "lucide-react";

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
  { label: "経費削減できそうな科目は？", icon: Scissors, message: "経費削減できそうな科目は？" },
  { label: "売上の傾向を教えて", icon: TrendingUp, message: "売上の傾向を教えて" },
  { label: "資金繰りを教えて", icon: Coins, message: "資金繰りを教えて" },
  { label: "今期の着地予想は？", icon: Target, message: "今期の着地予想は？" },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>(loadMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
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
      <Sidebar />

      {/* チャットエリア */}
      <div style={{
        marginLeft: "360px", flex: 1, display: "flex", flexDirection: "column",
        height: "100vh", background: "var(--color-background)",
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: "var(--space-4) var(--space-8)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-header-bg)",
          backdropFilter: "blur(16px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <h2 style={{
            margin: 0, fontSize: "16px", fontWeight: "600",
            color: "var(--color-text)", lineHeight: "1.4",
          }}>チャット</h2>
          <p style={{
            margin: "2px 0 0", fontSize: "12px",
            color: "var(--color-text-muted)",
          }}>AI経理社員</p>
        </div>

        {/* メッセージ一覧 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-8)" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "var(--space-5)",
            }}>
              <div style={{ maxWidth: "560px" }}>
                <div style={{
                  fontSize: "11px", fontWeight: "500",
                  color: "var(--color-text-muted)",
                  marginBottom: "var(--space-1)",
                  textAlign: msg.role === "user" ? "right" : "left",
                  paddingLeft: msg.role === "assistant" ? "var(--space-1)" : "0",
                  paddingRight: msg.role === "user" ? "var(--space-1)" : "0",
                }}>
                  {msg.role === "assistant" ? "AI経理社員" : "あなた"}
                </div>
                <div style={{
                  padding: "var(--space-3) var(--space-4)",
                  borderRadius: msg.role === "user"
                    ? "var(--radius-xl) var(--radius-xl) var(--radius-sm) var(--radius-xl)"
                    : "var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm)",
                  background: msg.role === "user"
                    ? "var(--color-user-bubble)"
                    : "var(--color-card)",
                  color: msg.role === "user" ? "white" : "var(--color-text)",
                  fontSize: "14px",
                  lineHeight: "1.75",
                  border: msg.role === "assistant" ? "1px solid var(--color-border)" : "none",
                  boxShadow: "var(--shadow-xs)",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "var(--space-5)" }}>
              <div style={{
                padding: "var(--space-3) var(--space-4)",
                borderRadius: "var(--radius-xl) var(--radius-xl) var(--radius-xl) var(--radius-sm)",
                background: "var(--color-card)",
                color: "var(--color-text-muted)",
                fontSize: "14px",
                border: "1px solid var(--color-border)",
                boxShadow: "var(--shadow-xs)",
              }}>
                考え中...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 下部エリア：クイックアクション + 入力欄 */}
        <div style={{
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-card)",
          padding: "var(--space-4) var(--space-8) var(--space-6)",
        }}>
          {/* クイックアクション */}
          <div style={{
            display: "flex", gap: "var(--space-2)", flexWrap: "wrap",
            marginBottom: "var(--space-3)",
          }}>
            {KEYWORDS.map((kw) => {
              const Icon = kw.icon;
              return (
                <button key={kw.label} onClick={() => sendMessage(kw.message)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid var(--color-border)",
                    background: "var(--color-background)",
                    color: "var(--color-text-secondary)",
                    fontSize: "12.5px",
                    cursor: "pointer",
                    fontFamily: "var(--font-sans)",
                    display: "flex", alignItems: "center", gap: "6px",
                    transition: "background 0.15s, border-color 0.15s",
                    lineHeight: "1.5",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-primary)";
                    e.currentTarget.style.color = "var(--color-primary)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "var(--color-border)";
                    e.currentTarget.style.color = "var(--color-text-secondary)";
                  }}
                >
                  <Icon size={14} strokeWidth={1.75} />
                  {kw.label}
                </button>
              );
            })}
          </div>

          {/* 入力エリア */}
          <div style={{
            display: "flex", gap: "var(--space-2)", alignItems: "flex-end",
          }}>
            <div style={{
              flex: 1,
              borderRadius: "var(--radius-lg)",
              border: inputFocused ? "1px solid var(--color-primary)" : "1px solid var(--color-border)",
              boxShadow: inputFocused ? "var(--shadow-ring)" : "var(--shadow-sm)",
              background: "white",
              transition: "border-color 0.15s, box-shadow 0.15s",
            }}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                placeholder="メッセージを入力..."
                style={{
                  width: "100%",
                  padding: "var(--space-3) var(--space-4)",
                  border: "none",
                  borderRadius: "var(--radius-lg)",
                  fontSize: "14px",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  background: "transparent",
                  color: "var(--color-text)",
                  lineHeight: "1.5",
                }}
              />
            </div>
            <button onClick={() => sendMessage(input)} disabled={loading}
              style={{
                width: "42px", height: "42px",
                borderRadius: "var(--radius-lg)",
                background: input.trim() ? "var(--color-primary)" : "var(--color-border)",
                color: "white",
                border: "none", cursor: input.trim() ? "pointer" : "default",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.15s",
                flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
