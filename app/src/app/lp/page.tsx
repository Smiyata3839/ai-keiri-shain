"use client";
import { useState, useEffect, useRef, type ReactNode } from "react";
import Image from "next/image";
import { motion, useInView, useMotionValue, useTransform, animate } from "framer-motion";

/* ─────────── Colors ─────────── */
const C = {
  navy: "#0A1628",
  blue: "#1E5FA8",
  sky: "#3B9FE8",
  white: "#FFFFFF",
  offwhite: "#F7F9FC",
  gold: "#C8A96E",
  gray: "#64748B",
} as const;

/* ─────────── Fonts (Google Fonts via <link>) ─────────── */
function Fonts() {
  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        href="https://fonts.googleapis.com/css2?family=Noto+Serif+JP:wght@700;900&family=Noto+Sans+JP:wght@400;500;700&family=Bebas+Neue&display=swap"
        rel="stylesheet"
      />
    </>
  );
}

const serif = "'Noto Serif JP', serif";
const sans = "'Noto Sans JP', sans-serif";
const display = "'Bebas Neue', sans-serif";

/* ─────────── Shared Components ─────────── */

function FadeInUp({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.6, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function SlideIn({ children, from = "left", delay = 0 }: { children: ReactNode; from?: "left" | "right"; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: from === "left" ? -60 : 60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function SectionTitle({ children, color = C.navy }: { children: ReactNode; color?: string }) {
  return (
    <h2
      style={{
        fontFamily: serif,
        fontSize: "clamp(24px, 4vw, 40px)",
        fontWeight: 700,
        color,
        textAlign: "center",
        lineHeight: 1.5,
        marginBottom: 48,
      }}
    >
      {children}
    </h2>
  );
}

function Container({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px", ...style }}>
      {children}
    </div>
  );
}

function GoldButton({ children, large, onClick }: { children: ReactNode; large?: boolean; onClick?: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        background: `linear-gradient(135deg, ${C.gold}, #D4B87A)`,
        color: C.navy,
        border: "none",
        borderRadius: 12,
        padding: large ? "18px 48px" : "12px 32px",
        fontSize: large ? 18 : 15,
        fontWeight: 700,
        fontFamily: sans,
        cursor: "pointer",
        boxShadow: "0 4px 20px rgba(200,169,110,0.4)",
      }}
    >
      {children}
    </motion.button>
  );
}

/* ─────────── Counter Animation ─────────── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v).toLocaleString());

  useEffect(() => {
    if (isInView) {
      animate(count, target, { duration: 2, ease: "easeOut" });
    }
  }, [isInView, count, target]);

  return (
    <span ref={ref}>
      <motion.span>{rounded}</motion.span>
      {suffix}
    </span>
  );
}

/* ─────────── SVG Japanese Pattern Overlay ─────────── */
function AsanohaOverlay() {
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.04, pointerEvents: "none" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <pattern id="asanoha" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M30 0L60 15L30 30L0 15Z" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M30 30L60 45L30 60L0 45Z" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M0 15L30 30L0 45" fill="none" stroke="white" strokeWidth="0.5" />
          <path d="M60 15L30 30L60 45" fill="none" stroke="white" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#asanoha)" />
    </svg>
  );
}

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function LPPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div style={{ fontFamily: sans, color: C.navy, overflowX: "hidden" }}>
      <Fonts />

      {/* ══════ Section 0: Navigation ══════ */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: scrolled ? "rgba(10,22,40,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          transition: "background 0.3s, backdrop-filter 0.3s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Image src="/logo.png" alt="KANBEI" width={36} height={36} style={{ borderRadius: 8 }} />
          <span style={{ fontFamily: display, fontSize: 26, color: C.white, letterSpacing: 2 }}>KANBEI</span>
        </div>
        <GoldButton onClick={() => scrollTo("contact")}>無料相談はこちら</GoldButton>
      </nav>

      {/* ══════ Section 1: Hero ══════ */}
      <section
        id="hero"
        style={{
          position: "relative",
          minHeight: "100vh",
          background: `linear-gradient(135deg, ${C.navy} 0%, ${C.blue} 100%)`,
          display: "flex",
          alignItems: "center",
          overflow: "hidden",
        }}
      >
        <AsanohaOverlay />
        {/* Logo silhouette */}
        <div style={{ position: "absolute", right: -60, top: "50%", transform: "translateY(-50%)", opacity: 0.06, pointerEvents: "none" }}>
          <Image src="/logo.png" alt="" width={600} height={600} style={{ filter: "brightness(2) invert(1)" }} />
        </div>

        <Container style={{ position: "relative", zIndex: 1, paddingTop: 120, paddingBottom: 80 }}>
          <FadeInUp>
            <h1
              style={{
                fontFamily: serif,
                fontSize: "clamp(32px, 5.5vw, 56px)",
                fontWeight: 900,
                color: C.white,
                lineHeight: 1.6,
                marginBottom: 20,
              }}
            >
              経理担当者を<br />雇う前に、<br />読んでほしい。
            </h1>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <p style={{ fontSize: "clamp(16px, 2.5vw, 22px)", color: C.sky, marginBottom: 48, lineHeight: 1.7 }}>
              その採用コスト、年間460万円以上かかっていませんか？
            </p>
          </FadeInUp>

          {/* Problem cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20, marginBottom: 48 }}>
            {[
              { emoji: "💸", text: "経理正社員の採用・人件費\n年間460万円〜" },
              { emoji: "📋", text: "税理士顧問料\n年間36〜60万円" },
              { emoji: "⏰", text: "毎月末の経理作業に追われ\n本業に集中できない" },
            ].map((card, i) => (
              <SlideIn key={i} from="left" delay={0.1 * i}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    padding: "28px 24px",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{card.emoji}</div>
                  <p style={{ color: C.white, fontSize: 15, lineHeight: 1.7, whiteSpace: "pre-line", margin: 0 }}>{card.text}</p>
                </div>
              </SlideIn>
            ))}
          </div>

          <FadeInUp delay={0.4}>
            <div style={{ textAlign: "center" }}>
              <GoldButton large onClick={() => scrollTo("solution")}>
                解決策を見る ↓
              </GoldButton>
            </div>
          </FadeInUp>
        </Container>
      </section>

      {/* ══════ Section 2: Problem Deep Dive ══════ */}
      <section style={{ background: C.offwhite, padding: "100px 0", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -100, top: "50%", transform: "translateY(-50%)", opacity: 0.04, pointerEvents: "none" }}>
          <Image src="/logo.png" alt="" width={400} height={400} />
        </div>
        <Container>
          <FadeInUp>
            <SectionTitle>
              freeeやマネーフォワードを導入しても、<br />
              結局「使う人」が必要だった——
            </SectionTitle>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <p style={{ textAlign: "center", fontSize: 16, lineHeight: 2, color: C.gray, maxWidth: 680, margin: "0 auto 56px" }}>
              経理ソフトは「経理担当者のためのツール」です。<br />
              導入後も人を採用・育成するコストがかかり続けます。<br />
              経営者が直接使えるツールは、今まで存在しませんでした。
            </p>
          </FadeInUp>

          {/* Comparison */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32, maxWidth: 800, margin: "0 auto" }}>
            <SlideIn from="left">
              <div style={{ background: C.white, borderRadius: 16, padding: 32, border: `1px solid #e2e8f0` }}>
                <p style={{ fontFamily: serif, fontWeight: 700, fontSize: 18, marginBottom: 16, color: C.gray }}>従来の経理体制</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 14, color: C.gray, lineHeight: 2 }}>
                  <span>経営者</span><span>→</span><span>経理担当者</span><span>→</span><span>会計ソフト</span><span>→</span><span style={{ color: "#ef4444" }}>報告を待つ</span>
                </div>
              </div>
            </SlideIn>
            <SlideIn from="right">
              <div style={{ background: C.navy, borderRadius: 16, padding: 32, border: `2px solid ${C.gold}` }}>
                <p style={{ fontFamily: serif, fontWeight: 700, fontSize: 18, marginBottom: 16, color: C.gold }}>KANBEI</p>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", fontSize: 14, color: C.white, lineHeight: 2 }}>
                  <span>経営者</span><span>←→</span><span style={{ color: C.sky }}>KANBEI（AI）</span><span>→</span><span style={{ color: C.gold }}>即座に経営判断</span>
                </div>
              </div>
            </SlideIn>
          </div>
        </Container>
      </section>

      {/* ══════ Section 3: Solution ══════ */}
      <section
        id="solution"
        style={{
          background: C.navy,
          padding: "100px 0",
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <AsanohaOverlay />
        <Container style={{ position: "relative", zIndex: 1 }}>
          <FadeInUp>
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              style={{ margin: "0 auto 32px", width: 120, height: 120, position: "relative" }}
            >
              {/* Glow */}
              <div
                style={{
                  position: "absolute",
                  inset: -30,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(59,159,232,0.3) 0%, rgba(200,169,110,0.15) 50%, transparent 70%)`,
                  filter: "blur(20px)",
                }}
              />
              <Image src="/logo.png" alt="KANBEI" width={120} height={120} style={{ borderRadius: 24, position: "relative" }} />
            </motion.div>
          </FadeInUp>

          <FadeInUp delay={0.15}>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, color: C.white, lineHeight: 1.5, marginBottom: 16 }}>
              KANBEI ─ あなたの会社の、経理参謀。
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.25}>
            <p style={{ color: C.sky, fontSize: "clamp(14px, 2vw, 18px)", lineHeight: 1.9, marginBottom: 56, maxWidth: 600, margin: "0 auto 56px" }}>
              経営者が直接対話できる、AI経理エキスパート。<br />
              採用も育成も不要。経営者の意思決定を、即座に支援します。
            </p>
          </FadeInUp>

          {/* Feature Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {[
              { emoji: "🤖", title: "AIチャット", desc: "「今期黒字で終われる？」に即答" },
              { emoji: "📄", title: "受発注管理", desc: "適格請求書を自動発行・保存" },
              { emoji: "📊", title: "会計・財務", desc: "財務三表を自動生成" },
              { emoji: "💳", title: "経費精算", desc: "スマホ撮影で自動仕訳" },
            ].map((f, i) => (
              <FadeInUp key={i} delay={0.1 * i}>
                <motion.div
                  whileHover={{ y: -8, boxShadow: `0 8px 32px rgba(59,159,232,0.25)` }}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 16,
                    padding: "32px 24px",
                    cursor: "default",
                    transition: "box-shadow 0.3s",
                  }}
                >
                  <div style={{ fontSize: 36, marginBottom: 16 }}>{f.emoji}</div>
                  <p style={{ fontWeight: 700, color: C.white, fontSize: 17, marginBottom: 8 }}>{f.title}</p>
                  <p style={{ color: C.sky, fontSize: 14, lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                </motion.div>
              </FadeInUp>
            ))}
          </div>
        </Container>
      </section>

      {/* ══════ Section 4: USP ══════ */}
      <section style={{ background: C.white, padding: "100px 0" }}>
        <Container>
          <FadeInUp>
            <SectionTitle>KANBEIだけが持つ、3つの独自価値</SectionTitle>
          </FadeInUp>

          {[
            {
              title: "経営者が直接使える、唯一の経理AI",
              body: "freee等は経理担当者向けツール。KANBEIは経営者がチャットで直接操作。採用・育成コストゼロで、経理体制が完成します。",
              from: "left" as const,
            },
            {
              title: "使うほど、あなたの経営哲学を学ぶ",
              body: "「節税を優先したい」「キャッシュを手元に残したい」——経営者の意向をAIが学習し、財務判断に反映し続けます。",
              from: "right" as const,
            },
            {
              title: "ユーザー無制限・追加費用ゼロ",
              body: "freee・マネーフォワードは1名追加ごとに従量課金。KANBEIは何名でも同一料金。スタッフが増えてもコストは変わりません。",
              from: "left" as const,
            },
          ].map((usp, i) => (
            <SlideIn key={i} from={usp.from} delay={0.1}>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 24,
                  marginBottom: 48,
                  padding: 32,
                  borderRadius: 16,
                  background: C.offwhite,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontSize: 36, fontFamily: display, color: C.gold, fontWeight: 700, lineHeight: 1, flexShrink: 0 }}>
                  {String(i + 1).padStart(2, "0")}
                </div>
                <div>
                  <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 8, color: C.navy }}>{usp.title}</p>
                  <p style={{ fontSize: 15, lineHeight: 1.9, color: C.gray, margin: 0 }}>{usp.body}</p>
                </div>
              </div>
            </SlideIn>
          ))}
        </Container>
      </section>

      {/* ══════ Section 5: Impact Numbers ══════ */}
      <section style={{ background: `linear-gradient(135deg, ${C.navy}, ${C.blue})`, padding: "100px 0", position: "relative" }}>
        <AsanohaOverlay />
        <Container style={{ position: "relative", zIndex: 1 }}>
          <FadeInUp>
            <SectionTitle color={C.white}>従来の経理体制との比較</SectionTitle>
          </FadeInUp>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 24, textAlign: "center" }}>
            {[
              { label: "従来コスト（年間）", value: 638, suffix: "万円", sub: "経理正社員 + 税理士 + 会計ソフト" },
              { label: "KANBEI（年間）", value: 240, suffix: "万円", sub: "オールインワン" },
              { label: "最大コスト削減", value: 398, suffix: "万円", sub: "年間削減額" },
            ].map((item, i) => (
              <FadeInUp key={i} delay={0.15 * i}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 16,
                    padding: "40px 24px",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, marginBottom: 12 }}>{item.label}</p>
                  <p style={{ fontFamily: display, fontSize: 56, fontWeight: 700, color: i === 2 ? C.gold : C.white, margin: "0 0 8px", lineHeight: 1 }}>
                    <Counter target={item.value} suffix={item.suffix} />
                  </p>
                  <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, margin: 0 }}>{item.sub}</p>
                </div>
              </FadeInUp>
            ))}
          </div>
          <FadeInUp delay={0.5}>
            <p style={{ textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 24 }}>
              ※経理正社員人件費（460〜470万円）＋税理士顧問料（36〜60万円）＋会計ソフト（11〜108万円）との比較
            </p>
          </FadeInUp>
        </Container>
      </section>

      {/* ══════ Section 6: Pricing ══════ */}
      <section id="pricing" style={{ background: C.offwhite, padding: "100px 0" }}>
        <Container>
          <FadeInUp>
            <SectionTitle>シンプルな料金体系</SectionTitle>
          </FadeInUp>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 24, marginBottom: 40 }}>
            {/* Plan 1 */}
            <FadeInUp delay={0}>
              <div style={{ background: C.white, borderRadius: 20, padding: "40px 28px", border: "1px solid #e2e8f0", height: "100%" }}>
                <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 24 }}>1年プラン</p>
                <p style={{ fontFamily: display, fontSize: 42, color: C.navy, marginBottom: 4, lineHeight: 1 }}>2,400,000<span style={{ fontSize: 16, fontFamily: sans }}>円</span></p>
                <p style={{ color: C.gray, fontSize: 13, marginBottom: 24 }}>年額（税抜）・一括払い</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 14, color: C.gray, lineHeight: 2.2 }}>
                  <li>✓ IT補助金対象</li>
                  <li>✓ ユーザー数無制限</li>
                  <li>✓ 全機能利用可能</li>
                </ul>
              </div>
            </FadeInUp>

            {/* Plan 2 (recommended) */}
            <FadeInUp delay={0.1}>
              <div
                style={{
                  background: C.navy,
                  borderRadius: 20,
                  padding: "40px 28px",
                  border: `2px solid ${C.gold}`,
                  position: "relative",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -14,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: C.gold,
                    color: C.navy,
                    fontWeight: 700,
                    fontSize: 12,
                    padding: "6px 20px",
                    borderRadius: 20,
                  }}
                >
                  最もお得
                </div>
                <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 24, color: C.white }}>2年プラン</p>
                <p style={{ fontFamily: display, fontSize: 42, color: C.gold, marginBottom: 4, lineHeight: 1 }}>4,800,000<span style={{ fontSize: 16, fontFamily: sans, color: C.white }}>円</span></p>
                <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, marginBottom: 24 }}>総額（税抜）・一括払い</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 14, color: "rgba(255,255,255,0.8)", lineHeight: 2.2 }}>
                  <li>✓ IT補助金最大325万円返還</li>
                  <li>✓ ユーザー数無制限</li>
                  <li>✓ 全機能利用可能</li>
                </ul>
              </div>
            </FadeInUp>

            {/* Plan 3 */}
            <FadeInUp delay={0.2}>
              <div style={{ background: C.white, borderRadius: 20, padding: "40px 28px", border: "1px solid #e2e8f0", height: "100%" }}>
                <p style={{ fontFamily: serif, fontSize: 20, fontWeight: 700, marginBottom: 24 }}>3年目以降</p>
                <p style={{ fontFamily: display, fontSize: 42, color: C.navy, marginBottom: 4, lineHeight: 1 }}>30,000<span style={{ fontSize: 16, fontFamily: sans }}>円/月</span></p>
                <p style={{ color: C.gray, fontSize: 13, marginBottom: 24 }}>年額換算 360,000円（税抜）</p>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: 14, color: C.gray, lineHeight: 2.2 }}>
                  <li>✓ 2年目比 約85%コストダウン</li>
                  <li>✓ 解約自由</li>
                  <li>✓ ユーザー数無制限</li>
                </ul>
              </div>
            </FadeInUp>
          </div>

          {/* Subsidy banner */}
          <FadeInUp delay={0.3}>
            <div
              style={{
                background: `linear-gradient(135deg, ${C.gold}, #D4B87A)`,
                borderRadius: 16,
                padding: "24px 32px",
                textAlign: "center",
                marginBottom: 20,
              }}
            >
              <p style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: 0 }}>
                🎉 今なら最大325万円が補助金で戻ってきます
              </p>
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: C.gray, lineHeight: 1.8 }}>
              ※デジタル化・AI導入補助金2026（インボイス枠）対象。補助率最大3/4。補助上限350万円。<br />
              1次申請：2026年3月30日〜5月12日
            </p>
          </FadeInUp>
        </Container>
      </section>

      {/* ══════ Section 7: Case Study ══════ */}
      <section style={{ background: C.white, padding: "100px 0" }}>
        <Container>
          <FadeInUp>
            <SectionTitle>導入事例</SectionTitle>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <motion.div
              whileHover={{ y: -6, boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}
              style={{
                maxWidth: 720,
                margin: "0 auto",
                background: C.offwhite,
                borderRadius: 20,
                padding: "40px 36px",
                border: "1px solid #e2e8f0",
                transition: "box-shadow 0.3s",
              }}
            >
              <div style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
                <span style={{ background: C.navy, color: C.white, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8 }}>不動産業</span>
                <span style={{ background: "rgba(59,159,232,0.1)", color: C.blue, fontSize: 12, fontWeight: 700, padding: "6px 14px", borderRadius: 8 }}>社員数5名</span>
              </div>
              <p style={{ fontFamily: serif, fontSize: 17, fontWeight: 700, marginBottom: 12, lineHeight: 1.6 }}>
                課題：経理専任者不在。代表者が月次決算に多大な時間を要していた。
              </p>
              <ul style={{ padding: "0 0 0 20px", margin: 0, fontSize: 15, color: C.gray, lineHeight: 2.2 }}>
                <li>適格請求書の発行・保存が自動化</li>
                <li>売掛残高をリアルタイム把握</li>
                <li>AIチャットで経営数値を即時確認</li>
                <li>月次決算の工数を大幅削減</li>
              </ul>
              <p style={{ fontSize: 12, color: C.gray, marginTop: 16, marginBottom: 0 }}>※企業名は非公開</p>
            </motion.div>
          </FadeInUp>
        </Container>
      </section>

      {/* ══════ Section 8: CTA ══════ */}
      <section
        style={{
          background: C.navy,
          padding: "100px 0",
          position: "relative",
          overflow: "hidden",
          textAlign: "center",
        }}
      >
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", opacity: 0.05, pointerEvents: "none" }}>
          <Image src="/logo.png" alt="" width={500} height={500} style={{ filter: "brightness(2) invert(1)" }} />
        </div>
        <Container style={{ position: "relative", zIndex: 1 }}>
          <FadeInUp>
            <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 900, color: C.white, lineHeight: 1.5, marginBottom: 16 }}>
              KANBEI ─ あなたの会社の、経理参謀。
            </h2>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <p style={{ color: C.sky, fontSize: "clamp(14px, 2vw, 18px)", lineHeight: 1.8, marginBottom: 40 }}>
              経営者が直接使える経理AI。今すぐ始めましょう。
            </p>
          </FadeInUp>
          <FadeInUp delay={0.3}>
            <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => scrollTo("contact")}
                style={{
                  background: `linear-gradient(135deg, ${C.gold}, #D4B87A)`,
                  color: C.navy,
                  border: "none",
                  borderRadius: 12,
                  padding: "18px 48px",
                  fontSize: 18,
                  fontWeight: 700,
                  fontFamily: sans,
                  cursor: "pointer",
                  boxShadow: "0 4px 20px rgba(200,169,110,0.4)",
                  animation: "pulse 2s infinite",
                }}
              >
                無料相談はこちら
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.04, background: "rgba(255,255,255,0.08)" }}
                whileTap={{ scale: 0.97 }}
                style={{
                  background: "transparent",
                  color: C.white,
                  border: `2px solid rgba(255,255,255,0.3)`,
                  borderRadius: 12,
                  padding: "18px 36px",
                  fontSize: 16,
                  fontWeight: 600,
                  fontFamily: sans,
                  cursor: "pointer",
                }}
              >
                資料をダウンロード
              </motion.button>
            </div>
          </FadeInUp>
        </Container>
      </section>

      {/* ══════ Section 9: Contact Form ══════ */}
      <section id="contact" style={{ background: C.offwhite, padding: "100px 0" }}>
        <Container>
          <FadeInUp>
            <SectionTitle>まずは無料相談から</SectionTitle>
            <p style={{ textAlign: "center", color: C.gray, fontSize: 15, lineHeight: 1.8, marginTop: -32, marginBottom: 48 }}>
              IT補助金の申請方法から、KANBEIの導入まで。<br />
              専任スタッフが丁寧にご説明します。
            </p>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <ContactForm />
          </FadeInUp>
        </Container>
      </section>

      {/* ══════ Section 10: Footer ══════ */}
      <footer style={{ background: C.navy, padding: "60px 0 32px" }}>
        <Container>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 40,
              marginBottom: 40,
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <Image src="/logo.png" alt="KANBEI" width={36} height={36} style={{ borderRadius: 8 }} />
                <span style={{ fontFamily: display, fontSize: 24, color: C.white, letterSpacing: 2 }}>KANBEI</span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                あなたの会社の、経理参謀。
              </p>
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Menu</p>
              {["機能", "料金", "事例", "お問い合わせ"].map((link, i) => (
                <p key={i} style={{ margin: "0 0 8px" }}>
                  <span
                    onClick={() => scrollTo(["solution", "pricing", "", "contact"][i])}
                    style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", textDecoration: "none" }}
                  >
                    {link}
                  </span>
                </p>
              ))}
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, fontWeight: 700, marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>Company</p>
              <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, lineHeight: 1.8, margin: 0 }}>
                XANA Arabia Company
              </p>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 24, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, margin: 0 }}>
              © 2026 KANBEI by XANA Arabia Company. All rights reserved.
            </p>
          </div>
        </Container>
      </footer>

      {/* Pulse keyframes */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 4px 20px rgba(200,169,110,0.4); }
          50% { box-shadow: 0 4px 40px rgba(200,169,110,0.7); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ─────────── Contact Form Component ─────────── */
function ContactForm() {
  const [form, setForm] = useState({ company: "", name: "", email: "", phone: "", employees: "", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "14px 16px",
    border: "1px solid #d2d2d7",
    borderRadius: 12,
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: sans,
    background: C.white,
    color: C.navy,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 700,
    color: C.navy,
    display: "block",
    marginBottom: 6,
  };

  if (submitted) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <p style={{ fontSize: 48, marginBottom: 16 }}>✅</p>
        <p style={{ fontFamily: serif, fontSize: 22, fontWeight: 700, marginBottom: 8 }}>お問い合わせありがとうございます</p>
        <p style={{ color: C.gray, fontSize: 15 }}>📅 通常2営業日以内にご連絡いたします</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        maxWidth: 560,
        margin: "0 auto",
        background: C.white,
        borderRadius: 20,
        padding: "40px 36px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 24px rgba(0,0,0,0.04)",
      }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>会社名 <span style={{ color: "#ef4444" }}>*</span></label>
          <input required value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>お名前 <span style={{ color: "#ef4444" }}>*</span></label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} style={inputStyle} />
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>メールアドレス <span style={{ color: "#ef4444" }}>*</span></label>
        <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} style={inputStyle} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>電話番号</label>
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>従業員数</label>
          <select value={form.employees} onChange={(e) => setForm({ ...form, employees: e.target.value })} style={{ ...inputStyle, cursor: "pointer" }}>
            <option value="">選択してください</option>
            <option value="1">1名</option>
            <option value="2-5">2〜5名</option>
            <option value="6-10">6〜10名</option>
            <option value="11+">11名以上</option>
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>ご相談内容</label>
        <textarea
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          rows={4}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>
      <GoldButton large>お問い合わせを送信</GoldButton>
      <p style={{ textAlign: "center", color: C.gray, fontSize: 12, marginTop: 16, marginBottom: 0 }}>
        📅 通常2営業日以内にご連絡いたします
      </p>
    </form>
  );
}
