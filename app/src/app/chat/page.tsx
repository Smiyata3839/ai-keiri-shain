"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Send, Scissors, TrendingUp, Coins, Target, ThumbsUp, ThumbsDown, Plus, Brain, CalendarCheck, CalendarDays, Building2, ChevronRight, ChevronLeft } from "lucide-react";
import { OWNER_TYPES, type OwnerType } from "@/lib/owner-types";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

type CompanyProfile = {
  industry: string | null;
  accounting_characteristics: string | null;
  special_rules: string | null;
  tax_notes: string | null;
  other_notes: string | null;
};

type MonthlySummary = {
  year_month: string;
  detail_level: string;
  financial_summary: string | null;
  chat_insights: string | null;
  action_items: string | null;
};

type AnnualSummary = {
  fiscal_year: number;
  financial_summary: string | null;
  chat_insights: string | null;
  key_decisions: string | null;
  owner_type_evaluation: string | null;
};

const FEEDBACK_STORAGE_KEY = "ai-keiri-chat-feedback";

const DEFAULT_GREETING = "おはようございます！KANBEIです。今日もサポートします。何かお手伝いできることはありますか？";

const INITIAL_MESSAGE: Message = {
  role: "assistant",
  content: DEFAULT_GREETING,
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

// KANBEI Sync 右パネルのセクション切り替え
type SyncTab = "owner" | "profile" | "monthly" | "annual";

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [inputFocused, setInputFocused] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState<Record<number, "good" | "bad">>(loadFeedback);
  const [showCorrectionFor, setShowCorrectionFor] = useState<number | null>(null);
  const [correctionText, setCorrectionText] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // KANBEI Sync state
  const [syncOpen, setSyncOpen] = useState(true);
  const [syncTab, setSyncTab] = useState<SyncTab>("owner");
  const [ownerType, setOwnerType] = useState<OwnerType | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [monthlySummaries, setMonthlySummaries] = useState<MonthlySummary[]>([]);
  const [annualSummaries, setAnnualSummaries] = useState<AnnualSummary[]>([]);
  const [syncLoading, setSyncLoading] = useState(true);

  // 初期化: セッション取得 + メッセージ読み込み
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: company } = await supabase
        .from("companies")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (!company) return;
      setCompanyId(company.id);

      // セッション取得 or 作成
      const sessionRes = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: company.id }),
      });
      const sessionData = await sessionRes.json();
      if (!sessionData.sessionId) return;
      setSessionId(sessionData.sessionId);

      // メッセージ読み込み
      if (!sessionData.isNew) {
        const msgRes = await fetch(`/api/chat/messages?sessionId=${sessionData.sessionId}`);
        const msgData = await msgRes.json();
        if (msgData.messages && msgData.messages.length > 0) {
          setMessages([INITIAL_MESSAGE, ...msgData.messages]);
          setHasMore(msgData.hasMore);
        }
      }

      // フォローアップ挨拶を取得（新規セッションまたは既存セッションの冒頭）
      try {
        const followupRes = await fetch("/api/chat/followup");
        if (followupRes.ok) {
          const followupData = await followupRes.json();
          if (followupData.message) {
            setMessages((prev) => [
              { role: "assistant", content: followupData.message },
              ...prev.slice(1),
            ]);
          }
        }
      } catch { /* フォローアップ取得失敗時はデフォルトメッセージのまま */ }

      // KANBEI Sync データ取得
      loadSyncData();
    };
    init();
  }, []);

  const loadSyncData = async () => {
    setSyncLoading(true);
    try {
      const [ownerRes, profileRes, monthlyRes, annualRes] = await Promise.all([
        fetch("/api/owner-profile"),
        fetch("/api/company-profile"),
        fetch("/api/monthly-summary"),
        fetch("/api/annual-summary"),
      ]);

      if (ownerRes.ok) {
        const data = await ownerRes.json();
        if (data.profile?.owner_type) {
          setOwnerType(OWNER_TYPES[data.profile.owner_type] ?? null);
        }
      }
      if (profileRes.ok) {
        const data = await profileRes.json();
        setCompanyProfile(data.profile ?? null);
      }
      if (monthlyRes.ok) {
        const data = await monthlyRes.json();
        setMonthlySummaries(data.summaries ?? []);
      }
      if (annualRes.ok) {
        const data = await annualRes.json();
        setAnnualSummaries(data.summaries ?? []);
      }
    } catch { /* ignore */ }
    setSyncLoading(false);
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(feedbackSent));
    } catch { /* ignore */ }
  }, [feedbackSent]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading || !sessionId) return;
    const userMessage: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "エラーが発生しました。もう一度お試しください。" }]);
    }
    setLoading(false);
  };

  const loadOlderMessages = async () => {
    if (!sessionId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const oldestDbMsg = messages.find((m) => m.created_at);
    const beforeParam = oldestDbMsg?.created_at ? `&before=${oldestDbMsg.created_at}` : "";
    try {
      const res = await fetch(`/api/chat/messages?sessionId=${sessionId}${beforeParam}`);
      const data = await res.json();
      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => [prev[0], ...data.messages, ...prev.slice(1)]);
        setHasMore(data.hasMore);
      } else {
        setHasMore(false);
      }
    } catch { /* ignore */ }
    setLoadingMore(false);
  };

  const startNewSession = async () => {
    if (!companyId) return;
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyId, forceNew: true }),
    });
    const data = await res.json();
    if (data.sessionId) {
      setSessionId(data.sessionId);
      setMessages([INITIAL_MESSAGE]);
      setHasMore(false);
      setFeedbackSent({});
      sessionStorage.removeItem(FEEDBACK_STORAGE_KEY);

      // 新しい会話でもフォローアップ挨拶を取得
      try {
        const followupRes = await fetch("/api/chat/followup");
        if (followupRes.ok) {
          const followupData = await followupRes.json();
          if (followupData.message) {
            setMessages([{ role: "assistant", content: followupData.message }]);
          }
        }
      } catch { /* ignore */ }
    }
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
    } catch { /* ignore */ }
  };

  const syncTabs: { key: SyncTab; label: string; icon: typeof Brain }[] = [
    { key: "owner", label: "経営者タイプ", icon: Brain },
    { key: "profile", label: "会社プロファイル", icon: Building2 },
    { key: "monthly", label: "月次要約", icon: CalendarDays },
    { key: "annual", label: "年次要約", icon: CalendarCheck },
  ];

  const detailLabels: Record<string, { label: string; bg: string; color: string }> = {
    full: { label: "詳細", bg: "#d1fae5", color: "#065f46" },
    condensed: { label: "要約", bg: "#fef3c7", color: "#92400e" },
    minimal: { label: "概要", bg: "#e5e7eb", color: "#374151" },
  };

  const renderSyncContent = () => {
    if (syncLoading) {
      return <p style={{ fontSize: "13px", color: "var(--color-text-muted)", padding: "20px", textAlign: "center" }}>読み込み中...</p>;
    }

    switch (syncTab) {
      case "owner":
        if (!ownerType) {
          return (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "0 0 12px 0" }}>まだ診断していません</p>
              <button onClick={() => router.push("/owner-diagnosis")} style={syncButtonStyle}>診断を受ける</button>
            </div>
          );
        }
        return (
          <div style={{ padding: "16px" }}>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span style={{
                display: "inline-block", padding: "3px 12px", borderRadius: "16px",
                background: "rgba(59,109,240,0.1)", color: "var(--color-primary)",
                fontSize: "12px", fontWeight: "700", letterSpacing: "2px",
              }}>{ownerType.code}</span>
              <h3 style={{ fontSize: "18px", fontWeight: "700", color: "var(--color-primary)", margin: "8px 0 2px 0" }}>
                {ownerType.name}
              </h3>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: 0 }}>{ownerType.title}</p>
            </div>
            <p style={{ fontSize: "13px", lineHeight: "1.7", color: "var(--color-text)", margin: "0 0 14px 0" }}>
              {ownerType.description}
            </p>
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#059669", margin: "0 0 6px 0" }}>強み</p>
              {ownerType.strengths.map((s, i) => (
                <p key={i} style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--color-text)", margin: "0 0 4px 0", paddingLeft: "10px", textIndent: "-10px" }}>
                  + {s}
                </p>
              ))}
            </div>
            <div style={{ marginBottom: "12px" }}>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "#dc2626", margin: "0 0 6px 0" }}>注意点</p>
              {ownerType.weaknesses.map((w, i) => (
                <p key={i} style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--color-text)", margin: "0 0 4px 0", paddingLeft: "10px", textIndent: "-10px" }}>
                  ! {w}
                </p>
              ))}
            </div>
            <div>
              <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--color-primary)", margin: "0 0 6px 0" }}>KANBEI対応方針</p>
              <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--color-text)", margin: 0 }}>
                {ownerType.communicationStyle}
              </p>
            </div>
          </div>
        );

      case "profile":
        if (!companyProfile) {
          return (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
                チャットで会社の情報を話すと自動的に学習します
              </p>
            </div>
          );
        }
        const profileItems = [
          { label: "業種", value: companyProfile.industry },
          { label: "経理の特徴", value: companyProfile.accounting_characteristics },
          { label: "特殊ルール", value: companyProfile.special_rules },
          { label: "税務メモ", value: companyProfile.tax_notes },
          { label: "その他", value: companyProfile.other_notes },
        ].filter((item) => item.value);
        if (profileItems.length === 0) {
          return (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: 0 }}>
                まだ学習データがありません
              </p>
            </div>
          );
        }
        return (
          <div style={{ padding: "16px" }}>
            {profileItems.map((item, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <p style={{ fontSize: "11px", fontWeight: "700", color: "var(--color-primary)", margin: "0 0 4px 0" }}>
                  {item.label}
                </p>
                <p style={{ fontSize: "13px", lineHeight: "1.6", color: "var(--color-text)", margin: 0 }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        );

      case "monthly":
        if (monthlySummaries.length === 0) {
          return (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "0 0 12px 0" }}>まだ月次要約がありません</p>
              <button onClick={() => router.push("/monthly-summary")} style={syncButtonStyle}>月次要約を生成</button>
            </div>
          );
        }
        return (
          <div style={{ padding: "16px" }}>
            {monthlySummaries.slice(0, 3).map((s, i) => {
              const dl = detailLabels[s.detail_level] ?? detailLabels.full;
              return (
                <div key={i} style={{
                  marginBottom: "14px", padding: "12px",
                  background: "var(--color-background)", borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--color-text)" }}>{s.year_month}</span>
                    <span style={{
                      padding: "1px 8px", borderRadius: "10px",
                      background: dl.bg, color: dl.color, fontSize: "10px", fontWeight: "600",
                    }}>{dl.label}</span>
                  </div>
                  {s.financial_summary && (
                    <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--color-text)", margin: "0 0 6px 0", whiteSpace: "pre-wrap" }}>
                      {s.financial_summary}
                    </p>
                  )}
                  {s.action_items && (
                    <p style={{ fontSize: "11px", lineHeight: "1.5", color: "#dc2626", margin: 0, whiteSpace: "pre-wrap" }}>
                      {s.action_items}
                    </p>
                  )}
                </div>
              );
            })}
            <button onClick={() => router.push("/monthly-summary")} style={{ ...syncButtonStyle, marginTop: "4px" }}>すべて見る</button>
          </div>
        );

      case "annual":
        if (annualSummaries.length === 0) {
          return (
            <div style={{ padding: "20px", textAlign: "center" }}>
              <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "0 0 12px 0" }}>まだ年次要約がありません</p>
              <button onClick={() => router.push("/annual-summary")} style={syncButtonStyle}>年次要約を生成</button>
            </div>
          );
        }
        return (
          <div style={{ padding: "16px" }}>
            {annualSummaries.slice(0, 2).map((s, i) => (
              <div key={i} style={{
                marginBottom: "14px", padding: "12px",
                background: "var(--color-background)", borderRadius: "10px",
                border: "1px solid var(--color-border)",
              }}>
                <span style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-text)" }}>{s.fiscal_year}年度</span>
                {s.financial_summary && (
                  <p style={{ fontSize: "12px", lineHeight: "1.6", color: "var(--color-text)", margin: "8px 0 6px 0", whiteSpace: "pre-wrap" }}>
                    {s.financial_summary}
                  </p>
                )}
                {s.owner_type_evaluation && (
                  <p style={{ fontSize: "11px", lineHeight: "1.5", color: "#7c3aed", margin: 0, whiteSpace: "pre-wrap" }}>
                    {s.owner_type_evaluation}
                  </p>
                )}
              </div>
            ))}
            <button onClick={() => router.push("/annual-summary")} style={{ ...syncButtonStyle, marginTop: "4px" }}>すべて見る</button>
          </div>
        );
    }
  };

  const syncButtonStyle: React.CSSProperties = {
    padding: "6px 16px", borderRadius: "8px",
    border: "1px solid var(--color-border)", background: "white",
    color: "var(--color-text-secondary)", fontSize: "12px", fontWeight: "600",
    cursor: "pointer", fontFamily: "var(--font-sans)",
  };

  return (
    <div style={{ display: "flex", height: "100vh", background: "var(--color-background)" }}>
      {/* チャットエリア（中央） */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        minWidth: 0,
      }}>
        {/* ヘッダー */}
        <div style={{
          padding: "var(--space-4) var(--space-8)",
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-header-bg)",
          backdropFilter: "blur(16px)",
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <div>
            <h2 style={{
              margin: 0, fontSize: "16px", fontWeight: "600",
              color: "var(--color-text)", lineHeight: "1.4",
            }}>チャット</h2>
            <p style={{
              margin: "2px 0 0", fontSize: "12px",
              color: "var(--color-text-muted)",
            }}>KANBEI</p>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <button
              onClick={startNewSession}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "6px 14px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                background: "var(--color-background)",
                color: "var(--color-text-secondary)",
                fontSize: "12.5px", cursor: "pointer",
                fontFamily: "var(--font-sans)",
                transition: "border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-primary)"; e.currentTarget.style.color = "var(--color-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
            >
              <Plus size={14} strokeWidth={1.75} />
              新しい会話
            </button>
            <button
              onClick={() => setSyncOpen(!syncOpen)}
              style={{
                display: "flex", alignItems: "center", gap: "4px",
                padding: "6px 12px", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--color-border)",
                background: syncOpen ? "rgba(59,109,240,0.08)" : "var(--color-background)",
                color: syncOpen ? "var(--color-primary)" : "var(--color-text-secondary)",
                fontSize: "12.5px", cursor: "pointer",
                fontFamily: "var(--font-sans)",
                fontWeight: syncOpen ? "600" : "400",
              }}
            >
              {syncOpen ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              Sync
            </button>
          </div>
        </div>

        {/* メッセージ一覧 */}
        <div style={{ flex: 1, overflowY: "auto", padding: "var(--space-6) var(--space-8)" }}>
          {hasMore && (
            <div style={{ textAlign: "center", marginBottom: "var(--space-4)" }}>
              <button
                onClick={loadOlderMessages}
                disabled={loadingMore}
                style={{
                  padding: "8px 20px", borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--color-border)",
                  background: "var(--color-card)", color: "var(--color-text-muted)",
                  fontSize: "12px", cursor: loadingMore ? "default" : "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {loadingMore ? "読み込み中..." : "過去のメッセージを表示"}
              </button>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={msg.id || i} style={{
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

        {/* 下部エリア */}
        <div style={{
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-card)",
          padding: "var(--space-4) var(--space-8) var(--space-6)",
        }}>
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

          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "flex-end" }}>
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

      {/* KANBEI Sync パネル（右側） */}
      {syncOpen && (
        <div style={{
          width: "360px", flexShrink: 0,
          borderLeft: "1px solid var(--color-border)",
          background: "var(--color-card)",
          display: "flex", flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}>
          {/* Sync ヘッダー */}
          <div style={{
            padding: "16px",
            borderBottom: "1px solid var(--color-border)",
            background: "rgba(59,109,240,0.03)",
          }}>
            <h3 style={{ fontSize: "14px", fontWeight: "700", color: "var(--color-primary)", margin: 0 }}>
              KANBEI Sync
            </h3>
            <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: "2px 0 0 0" }}>
              経営者に寄り添うAIエンジン
            </p>
          </div>

          {/* タブ */}
          <div style={{
            display: "flex", borderBottom: "1px solid var(--color-border)",
            overflow: "hidden",
          }}>
            {syncTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = syncTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSyncTab(tab.key)}
                  style={{
                    flex: 1, padding: "10px 4px",
                    border: "none",
                    borderBottom: isActive ? "2px solid var(--color-primary)" : "2px solid transparent",
                    background: "transparent",
                    color: isActive ? "var(--color-primary)" : "var(--color-text-muted)",
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: "3px",
                    fontSize: "10px", fontWeight: isActive ? "600" : "400",
                    fontFamily: "var(--font-sans)",
                    transition: "color 0.15s",
                  }}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* コンテンツ */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {renderSyncContent()}
          </div>
        </div>
      )}
    </div>
  );
}
