"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Send, Scissors, TrendingUp, Coins, Target, ThumbsUp, ThumbsDown } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const STORAGE_KEY = "ai-keiri-chat-messages";
const FEEDBACK_STORAGE_KEY = "ai-keiri-chat-feedback";

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "おはようございます！KANBEIです。今日もサポートします。何かお手伝いできることはありますか？",
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

const loadFeedback = (): Record<number, "good" | "bad"> => {
  if (typeof window === "undefined") return {};
  try {
    const stored = sessionStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore */ }
  return {};
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
  const [feedbackSent, setFeedbackSent] = useState<Record<number, "good" | "bad">>(loadFeedback);
  const [showCorrectionFor, setShowCorrectionFor] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState("");
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
    try {
      sessionStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackSent));
    } catch { /* ignore */ }
  }, [feedbackSent]);

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

  const sendFeedback = async (msgIndex: number, feedbackType: "good" | "bad", correction?: string) => {
    const userMsg = messages[msgIndex - 1];
    const assistantMsg = messages[msgIndex];
    if (!userMsg || !assistantMsg || !companyId) return;

    setFeedbackSent((prev) => ({ ...prev, [msgIndex]: feedbackType }));
    setShowCorrectionFor(null);
    setCorrectionText("");

    try {
      await fetch("/api/chat/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          userMessage: userMsg.content,
          assistantMessage: assistantMsg.content,
          feedbackType,
          correction: correction || undefined,
        }),
      });
    } catch {
      // フィードバック送信失敗は静かに無視
    }
  };

  return (
      <div style={{
        display: "flex", flexDirection: "column",
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
          }}>KANBEI</p>
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
                  {msg.role === "assistant" ? "KANBEI" : "あなた"}
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
                {/* フィードバックボタン（アシスタントメッセージ、初期メッセージ以外） */}
                {msg.role === "assistant" && i > 0 && (
                  <div style={{ marginTop: "6px", paddingLeft: "var(--space-1)" }}>
                    {feedbackSent[i] ? (
                      <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        {feedbackSent[i] === "good" ? "高評価を送信しました" : "フィードバックを送信しました"}
                      </span>
                    ) : showCorrectionFor === i ? (
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <input
                          value={correctionText}
                          onChange={(e) => setCorrectionText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { sendFeedback(i, "bad", correctionText); } }}
                          placeholder="正しい回答や修正内容を入力..."
                          style={{
                            flex: 1, padding: "6px 10px", fontSize: "12px",
                            border: "1px solid var(--color-border)", borderRadius: "8px",
                            outline: "none", fontFamily: "var(--font-sans)",
                            background: "var(--color-background)", color: "var(--color-text)",
                          }}
                        />
                        <button
                          onClick={() => sendFeedback(i, "bad", correctionText)}
                          style={{
                            padding: "6px 12px", fontSize: "11px", fontWeight: "600",
                            border: "none", borderRadius: "8px", cursor: "pointer",
                            background: "var(--color-primary)", color: "white",
                            fontFamily: "var(--font-sans)",
                          }}
                        >
                          送信
                        </button>
                        <button
                          onClick={() => { setShowCorrectionFor(null); setCorrectionText(""); }}
                          style={{
                            padding: "6px 8px", fontSize: "11px",
                            border: "1px solid var(--color-border)", borderRadius: "8px",
                            cursor: "pointer", background: "transparent",
                            color: "var(--color-text-muted)", fontFamily: "var(--font-sans)",
                          }}
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => sendFeedback(i, "good")}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--color-text-muted)", padding: "2px",
                            display: "flex", alignItems: "center", gap: "3px", fontSize: "11px",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#22c55e"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
                        >
                          <ThumbsUp size={13} />
                        </button>
                        <button onClick={() => setShowCorrectionFor(i)}
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: "var(--color-text-muted)", padding: "2px",
                            display: "flex", alignItems: "center", gap: "3px", fontSize: "11px",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-text-muted)"; }}
                        >
                          <ThumbsDown size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                )}
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
  );
}
