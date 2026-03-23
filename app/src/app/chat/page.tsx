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
      <div style={{ marginLeft: "260px", flex: 1, display: "flex", flexDirection: "column", height: "100vh", background: "var(--color-background)" }}>
        {/* ヘッダー */}
        <div style={{
          padding: "18px 28px", borderBottom: "1px solid var(--color-border)",
          background: "var(--color-header-bg)", backdropFilter: "blur(20px)",
          position: "sticky", top: 0, zIndex: 10,
        }}>
          <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "var(--color-text)" }}>チャット</h2>
          <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>AI経理社員</p>
        </div>

        {/* メッセージ一覧 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "28px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: "18px",
            }}>
              <div>
                {msg.role === "assistant" && (
                  <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "6px" }}>AI経理社員</div>
                )}
                {msg.role === "user" && (
                  <div style={{ fontSize: "11px", color: "var(--color-text-secondary)", marginBottom: "6px", textAlign: "right" }}>あなた</div>
                )}
                <div style={{
                  maxWidth: "520px", padding: "14px 18px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, #00D4FF 0%, #0098B8 100%)"
                    : "white",
                  color: msg.role === "user" ? "white" : "var(--color-text)",
                  fontSize: "15px", lineHeight: "1.7",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  whiteSpace: "pre-wrap",
                }}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: "18px" }}>
              <div style={{
                padding: "14px 18px", borderRadius: "18px 18px 18px 4px",
                background: "white", color: "var(--color-text-secondary)",
                fontSize: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}>
                考え中...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* キーワードボタン */}
        <div style={{ padding: "0 28px 14px", display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {KEYWORDS.map((kw) => {
            const Icon = kw.icon;
            return (
              <button key={kw.label} onClick={() => sendMessage(kw.message)}
                style={{
                  padding: "8px 16px", borderRadius: "980px",
                  border: "1px solid var(--color-border)",
                  background: "white", color: "var(--color-text)",
                  fontSize: "13px", cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                  display: "flex", alignItems: "center", gap: "6px",
                }}
              >
                <Icon size={14} color="#00D4FF" />
                {kw.label}
              </button>
            );
          })}
        </div>

        {/* 入力エリア */}
        <div style={{
          padding: "14px 28px 28px",
          display: "flex", gap: "12px", alignItems: "flex-end",
        }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder="メッセージを入力..."
            style={{
              flex: 1, padding: "14px 18px",
              border: "1px solid var(--color-border)",
              borderRadius: "980px", fontSize: "15px",
              outline: "none", fontFamily: "var(--font-sans)",
              background: "white",
            }}
          />
          <button onClick={() => sendMessage(input)} disabled={loading}
            style={{
              width: "44px", height: "44px", borderRadius: "50%",
              background: "linear-gradient(135deg, #00D4FF 0%, #0098B8 100%)",
              color: "white",
              border: "none", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
