"use client";
import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { MobileHeader } from "@/components/mobile/MobileHeader";
import { Send, Scissors, TrendingUp, Coins, Target, Brain, ShieldCheck, Zap, AlertTriangle, BarChart2, BookOpen, Wallet, ArrowUpRight, ClipboardList } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = { role: "user" | "assistant"; content: string; id?: string; created_at?: string };

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: "おはようございます！KANBEIです。今日もサポートします。何かお手伝いできることはありますか？",
};

const CACHE_KEY = "kanbei-m-chat-cache";

function loadCache(): { sessionId: string; messages: Message[] } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function saveCache(sessionId: string, messages: Message[]) {
  try {
    // INITIAL_MESSAGEは保存しない、最新50件のみキャッシュ
    const toSave = messages.filter(m => m.id || m.created_at).slice(-50);
    localStorage.setItem(CACHE_KEY, JSON.stringify({ sessionId, messages: toSave }));
  } catch {}
}

const KEYWORDS = [
  { label: "経費削減", icon: Scissors, message: "経費削減できそうな科目は？" },
  { label: "売上傾向", icon: TrendingUp, message: "売上の傾向を教えて" },
  { label: "資金繰り", icon: Coins, message: "資金繰りを教えて" },
  { label: "着地予想", icon: Target, message: "今期の着地予想は？" },
  { label: "経営診断", icon: Brain, message: "経営診断して" },
];

const ADVISORY_TRIGGERS = [
  "経営診断", "財務分析", "財務診断", "会社の状況", "経営戦略",
  "アクションプラン", "経営課題", "SWOT", "今後どうすべき",
  "経営アドバイス", "経営を分析", "診断して", "経営を見て", "業績分析",
];

function isAdvisoryTrigger(message: string): boolean {
  return ADVISORY_TRIGGERS.some((t) => message.includes(t));
}

// Web版と同じMarkdownコンポーネント
const markdownComponents = {
  p: ({ children }: any) => (
    <p style={{ margin: "0 0 0.75em 0", lineHeight: "1.75", wordBreak: "break-word" as const }}>{children}</p>
  ),
  table: ({ children }: any) => (
    <div style={{ overflowX: "auto", margin: "0.75em 0" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>{children}</table>
    </div>
  ),
  th: ({ children }: any) => (
    <th style={{
      padding: "6px 8px", borderBottom: "2px solid var(--color-border)",
      textAlign: "left", fontWeight: 600, color: "var(--color-text)", whiteSpace: "nowrap",
    }}>{children}</th>
  ),
  td: ({ children }: any) => (
    <td style={{
      padding: "6px 8px", borderBottom: "1px solid var(--color-border)",
      color: "var(--color-text)", lineHeight: "1.6",
    }}>{children}</td>
  ),
  h3: ({ children }: any) => {
    const text = String(children).replace(
      /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, ""
    ).trim();
    const iconMap: { keywords: string[]; icon: React.ReactNode }[] = [
      { keywords: ["収益", "粗利", "利益", "売上"], icon: <TrendingUp size={14} strokeWidth={1.5} /> },
      { keywords: ["安全", "流動", "自己資本"], icon: <ShieldCheck size={14} strokeWidth={1.5} /> },
      { keywords: ["効率", "成長", "回転"], icon: <Zap size={14} strokeWidth={1.5} /> },
      { keywords: ["BEP", "損益分岐", "固定費"], icon: <BarChart2 size={14} strokeWidth={1.5} /> },
      { keywords: ["課題", "問題", "リスク"], icon: <AlertTriangle size={14} strokeWidth={1.5} /> },
      { keywords: ["戦略", "SWOT", "3C", "PPM", "5F"], icon: <ClipboardList size={14} strokeWidth={1.5} /> },
      { keywords: ["アクション", "施策", "次の一手"], icon: <Target size={14} strokeWidth={1.5} /> },
      { keywords: ["資金", "キャッシュ", "銀行", "バーンレート"], icon: <Wallet size={14} strokeWidth={1.5} /> },
      { keywords: ["売掛", "入金", "回収"], icon: <ArrowUpRight size={14} strokeWidth={1.5} /> },
      { keywords: ["KPI", "指標", "推移"], icon: <BookOpen size={14} strokeWidth={1.5} /> },
    ];
    const matched = iconMap.find(({ keywords }) => keywords.some((kw) => text.includes(kw)));
    return (
      <h3 style={{
        fontSize: "13px", fontWeight: 700, margin: "1.2em 0 0.5em",
        color: "var(--color-text)", display: "flex", alignItems: "center", gap: "6px",
      }}>
        {matched && <span style={{ color: "var(--color-text-muted)", flexShrink: 0 }}>{matched.icon}</span>}
        {text}
      </h3>
    );
  },
  ul: ({ children }: any) => (
    <ul style={{ paddingLeft: "1.4em", margin: "0.4em 0", lineHeight: "1.75" }}>{children}</ul>
  ),
  li: ({ children }: any) => (
    <li style={{ marginBottom: "0.25em", wordBreak: "break-word" as const }}>{children}</li>
  ),
  strong: ({ children }: any) => (
    <strong style={{ fontWeight: 600, color: "var(--color-text)" }}>{children}</strong>
  ),
  code: ({ children }: any) => (
    <code style={{
      background: "#f5f5f7", padding: "2px 6px", borderRadius: "4px",
      fontSize: "11px", fontFamily: "monospace", wordBreak: "break-all" as const,
    }}>{children}</code>
  ),
  hr: () => (
    <hr style={{ border: "none", borderTop: "1px dashed var(--color-border)", margin: "1em 0" }} />
  ),
};

export default function MobileChatPage() {
  const supabase = createClient();
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isDemoUser, setIsDemoUser] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setReady(true); return; }
      if (user.email === "demo@kanbei.jp") setIsDemoUser(true);

      const { data: company } = await supabase
        .from("companies").select("id").eq("user_id", user.id).single();
      if (!company) { setReady(true); return; }

      const sessionRes = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionData.sessionId) { setReady(true); return; }
      setSessionId(sessionData.sessionId);

      let finalMessages: Message[] = [INITIAL_MESSAGE];

      if (!sessionData.isNew) {
        const msgRes = await fetch(`/api/chat/messages?sessionId=${sessionData.sessionId}`);
        const msgData = await msgRes.json();
        if (msgData.messages?.length > 0) {
          finalMessages = [INITIAL_MESSAGE, ...msgData.messages];
          saveCache(sessionData.sessionId, msgData.messages);
        }
      } else {
        saveCache(sessionData.sessionId, []);
      }

      try {
        const followupRes = await fetch("/api/chat/followup");
        if (followupRes.ok) {
          const data = await followupRes.json();
          if (data.message) {
            finalMessages = [{ role: "assistant", content: data.message }, ...finalMessages.slice(1)];
          }
        }
      } catch {}

      setMessages(finalMessages);
      setReady(true);

      // 全データセット後、次フレームでスクロール（アニメーションなし）
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
        initializedRef.current = true;
      });
    };
    init();
  }, []);

  // 送信後の新メッセージのみスムーズスクロール
  useEffect(() => {
    if (initializedRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: scrollContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages.length]);

  const sendMessage = async (text: string) => {
    if (isDemoUser || !text.trim() || loading || !sessionId) return;
    const userMsg: Message = { role: "user", content: text, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      let assistantContent: string;
      if (isAdvisoryTrigger(text)) {
        const res = await fetch("/api/chat/advisory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: text, phase: "diagnosis" }),
        });
        const data = await res.json();
        assistantContent = data.content || "エラーが発生しました";
      } else {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, message: text }),
        });
        const data = await res.json();
        assistantContent = data.content || "エラーが発生しました";
      }
      const assistantMsg: Message = { role: "assistant", content: assistantContent, created_at: new Date().toISOString() };
      setMessages(prev => {
        const updated = [...prev, assistantMsg];
        saveCache(sessionId, updated.filter(m => m.created_at));
        return updated;
      });
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "通信エラーが発生しました。もう一度お試しください。" }]);
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <>
        <MobileHeader title="KANBEI チャット" />
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          height: "calc(100vh - 52px - 64px)", background: "var(--color-background)",
        }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
            <p style={{ color: "var(--color-text-muted)", fontSize: 13 }}>チャットを読み込んでいます...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <MobileHeader title="KANBEI チャット" />
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px - 64px)" }}>
        {/* メッセージ一覧 */}
        <div ref={scrollContainerRef} style={{ flex: 1, overflowY: "auto", padding: "12px 16px" }}>
          {messages.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}>
              <div style={{
                maxWidth: "88%",
                padding: "10px 14px",
                borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                background: msg.role === "user" ? "var(--color-user-bubble)" : "#ffffff",
                color: msg.role === "user" ? "#fff" : "var(--color-text)",
                fontSize: 13,
                lineHeight: 1.7,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                overflow: "hidden",
                wordBreak: "break-word",
              }}>
                {msg.role === "user" ? (
                  <span style={{ whiteSpace: "pre-wrap" }}>{msg.content}</span>
                ) : (
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 12 }}>
              <div style={{
                padding: "10px 14px", borderRadius: "16px 16px 16px 4px",
                background: "#ffffff", color: "var(--color-text-muted)", fontSize: 13,
              }}>
                考え中...
              </div>
            </div>
          )}
        </div>

        {/* キーワードボタン */}
        <div style={{ padding: "8px 16px", display: "flex", gap: 6, overflowX: "auto", flexShrink: 0 }}>
          {KEYWORDS.map(kw => {
            const Icon = kw.icon;
            return (
              <button key={kw.label} onClick={() => sendMessage(kw.message)}
                disabled={isDemoUser}
                style={{
                  padding: "6px 12px", borderRadius: 20,
                  border: "1px solid var(--color-border)", background: "#fff",
                  color: "var(--color-text-secondary)", fontSize: 12,
                  cursor: "pointer", whiteSpace: "nowrap",
                  display: "flex", alignItems: "center", gap: 4,
                  flexShrink: 0,
                }}>
                <Icon size={12} /> {kw.label}
              </button>
            );
          })}
        </div>

        {/* 入力エリア */}
        <div style={{
          padding: "8px 16px 12px", borderTop: "1px solid var(--color-border)",
          background: "#fff", display: "flex", gap: 8, alignItems: "flex-end",
        }}>
          <input
            value={input}
            onChange={e => { if (!isDemoUser) setInput(e.target.value); }}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
            placeholder={isDemoUser ? "デモアカウントでは入力できません" : "メッセージを入力..."}
            disabled={isDemoUser}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 20,
              border: "1px solid var(--color-border)", fontSize: 14,
              outline: "none", background: "#f9fafb",
            }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading || isDemoUser}
            style={{
              width: 40, height: 40, borderRadius: "50%",
              border: "none", background: "var(--color-primary)",
              color: "#fff", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
              opacity: !input.trim() || loading ? 0.5 : 1,
              flexShrink: 0,
            }}>
            <Send size={18} />
          </button>
        </div>
      </div>
    </>
  );
}
