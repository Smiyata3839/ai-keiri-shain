"use client";
import { useState, useEffect, useRef, useCallback, useId } from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════
   CSS Variables & Styles (injected via <style>)
   ═══════════════════════════════════════════ */
const GLOBAL_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Shippori+Mincho:wght@400;500;600;700;800&family=Noto+Sans+JP:wght@300;400;500;700&display=swap');

:root {
  --bg: #ffffff;
  --bg-sub: #f5f8fc;
  --bg-dark: #0a1628;
  --blue: #1E5FA8;
  --blue-light: #3B9FE8;
  --blue-pale: #e8f2fb;
  --gold: #c9a84c;
  --gold-bright: #f0c040;
  --text: #1a1a1a;
  --text-sub: #555f6d;
  --text-muted: #8a96a3;
  --white: #ffffff;
  --border: #e2e8f0;
  --border-blue: rgba(30,95,168,.15);
  --font-serif: 'Shippori Mincho', serif;
  --font-sans: 'Noto Sans JP', sans-serif;
}

.lp-root * { box-sizing: border-box; margin: 0; padding: 0; }
.lp-root { font-family: var(--font-sans); background: var(--bg); color: var(--text); -webkit-font-smoothing: antialiased; }
.lp-root h1, .lp-root h2, .lp-root h3 { font-family: var(--font-serif); }

.accent-gold {
  background: linear-gradient(135deg, #b8860b 0%, #f0c040 50%, #c9a84c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  display: inline-block;
  background: var(--blue);
  color: #fff;
  font-family: var(--font-sans);
  font-weight: 700;
  letter-spacing: .05em;
  border: none;
  border-radius: 4px;
  padding: 16px 40px;
  cursor: pointer;
  transition: background .2s, transform .2s, box-shadow .2s;
  box-shadow: 0 4px 20px rgba(30,95,168,.25);
  text-decoration: none;
  font-size: 15px;
}
.btn-primary:hover {
  background: var(--blue-light);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(30,95,168,.35);
}

.btn-secondary {
  display: inline-block;
  background: transparent;
  color: var(--blue);
  border: 1.5px solid var(--blue);
  border-radius: 4px;
  padding: 15px 40px;
  font-family: var(--font-sans);
  font-weight: 500;
  cursor: pointer;
  transition: background .2s, color .2s;
  text-decoration: none;
  font-size: 15px;
}
.btn-secondary:hover {
  background: var(--blue);
  color: var(--white);
}

.card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 32px;
  transition: box-shadow .3s, transform .3s, border-color .3s;
}
.card:hover {
  box-shadow: 0 12px 40px rgba(30,95,168,.1);
  transform: translateY(-4px);
  border-color: var(--border-blue);
}

.fade-in {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity .7s ease, transform .7s ease;
}
.fade-in.visible {
  opacity: 1;
  transform: translateY(0);
}
.delay-1 { transition-delay: .1s; }
.delay-2 { transition-delay: .2s; }
.delay-3 { transition-delay: .3s; }
.delay-4 { transition-delay: .4s; }

.divider-gold {
  width: 48px;
  height: 2px;
  background: linear-gradient(90deg, var(--gold), var(--gold-bright));
  margin: 16px auto;
}

.section { padding: 100px 24px; max-width: 1100px; margin: 0 auto; }

@keyframes pulse-blue {
  0%   { box-shadow: 0 4px 20px rgba(30,95,168,.3); }
  50%  { box-shadow: 0 4px 40px rgba(30,95,168,.5); }
  100% { box-shadow: 0 4px 20px rgba(30,95,168,.3); }
}
.btn-cta { animation: pulse-blue 3s ease-in-out infinite; }

@keyframes scroll-bounce {
  0%, 100% { transform: translateY(0); opacity: 0.6; }
  50% { transform: translateY(8px); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .lp-root *, .lp-root *::before, .lp-root *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
  .fade-in { opacity: 1; transform: none; }
}

@media (max-width: 768px) {
  .lp-root br { display: none; }
  .hero-title { font-size: 32px !important; }
  .section-title { font-size: 20px !important; }
  .section { padding: 60px 16px !important; }
  .usp-row, .usp-row-reverse { flex-direction: column !important; }
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr !important; }
  .hero-buttons { flex-direction: column !important; align-items: center !important; }
  .nav-inner { padding: 0 16px !important; }
  .footer-grid { grid-template-columns: 1fr !important; text-align: center !important; }
  .card { padding: 24px !important; }
  .cost-num { font-size: 28px !important; }
  .usp-num { font-size: 48px !important; }
  .usp-title { font-size: 20px !important; }
  .usp-body { font-size: 14px !important; }
  .cta-title { font-size: 32px !important; }
  .solution-title { font-size: 32px !important; }
  .solution-sub { font-size: 16px !important; }
  .hero-sub { font-size: 15px !important; }
  .impact-num { font-size: 56px !important; }
  .impact-label { font-size: 20px !important; }
  .table-cell { font-size: 14px !important; padding: 12px 8px !important; }
  .table-header { font-size: 12px !important; padding: 10px 8px !important; }
  .case-card { padding: 28px 20px !important; }
  .case-before { font-size: 17px !important; }
}
`;

/* ═══════════════════════════════════════════
   Diamond Particles (Canvas)
   ═══════════════════════════════════════════ */
function HeroParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particles: { x: number; y: number; size: number; opacity: number; speedY: number; speedX: number; rotation: number; rotSpeed: number }[] = [];

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 2 + Math.random() * 3,
        opacity: 0.1 + Math.random() * 0.3,
        speedY: -(0.1 + Math.random() * 0.2),
        speedX: -0.1 + Math.random() * 0.2,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: 0.005 + Math.random() * 0.01,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotSpeed;
        if (p.y < -10) { p.y = canvas.height + 10; p.x = Math.random() * canvas.width; }
        if (p.x < -10) p.x = canvas.width + 10;
        if (p.x > canvas.width + 10) p.x = -10;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size * 0.6, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size * 0.6, 0);
        ctx.closePath();
        ctx.fillStyle = `rgba(201,168,76,${p.opacity})`;
        ctx.fill();
        ctx.restore();
      }
      animId = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 0 }} />;
}

/* ═══════════════════════════════════════════
   Seigaiha (青海波) Pattern + KANBEI Mon Overlay
   Uses unique pattern IDs per instance to avoid SVG conflicts
   ═══════════════════════════════════════════ */
function SeigaihaOverlay() {
  const id = useId();
  const patternId = `${id}-pat`;
  const maskId = `${id}-mask`;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.05 }} xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={patternId} x="0" y="0" width="56" height="28" patternUnits="userSpaceOnUse">
            <path d="M28 0c15.46 0 28 12.54 28 28" fill="none" stroke="white" strokeWidth="0.5" />
            <path d="M28 0c-15.46 0-28 12.54-28 28" fill="none" stroke="white" strokeWidth="0.5" />
            <path d="M28 0c11.05 0 20 8.95 20 20" fill="none" stroke="white" strokeWidth="0.5" />
            <path d="M28 0c-11.05 0-20 8.95-20 20" fill="none" stroke="white" strokeWidth="0.5" />
            <path d="M28 0c6.63 0 12 5.37 12 12" fill="none" stroke="white" strokeWidth="0.5" />
            <path d="M28 0c-6.63 0-12 5.37-12 12" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* KANBEIロゴ「家紋」— 青海波パターンで描かれたロゴシルエット */}
      <div
        style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 420, height: 420, opacity: 0.1,
        }}
      >
        {/* 円形の枠 */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 420 420" xmlns="http://www.w3.org/2000/svg">
          <circle cx="210" cy="210" r="200" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
          <circle cx="210" cy="210" r="208" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        </svg>
        {/* ロゴシルエットの中に青海波パターンを表示（CSS maskで抜く） */}
        <div
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: 280, height: 280,
            WebkitMaskImage: "url(/logo-lp.png)",
            WebkitMaskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskImage: "url(/logo-lp.png)",
            maskSize: "contain",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          }}
        >
          <svg style={{ width: "100%", height: "100%" }} xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id={`${maskId}-pat`} x="0" y="0" width="28" height="14" patternUnits="userSpaceOnUse">
                <path d="M14 0c7.73 0 14 6.27 14 14" fill="none" stroke="white" strokeWidth="0.8" />
                <path d="M14 0c-7.73 0-14 6.27-14 14" fill="none" stroke="white" strokeWidth="0.8" />
                <path d="M14 0c5.52 0 10 4.48 10 10" fill="none" stroke="white" strokeWidth="0.8" />
                <path d="M14 0c-5.52 0-10 4.48-10 10" fill="none" stroke="white" strokeWidth="0.8" />
                <path d="M14 0c3.31 0 6 2.69 6 6" fill="none" stroke="white" strokeWidth="0.8" />
                <path d="M14 0c-3.31 0-6 2.69-6 6" fill="none" stroke="white" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${maskId}-pat)`} />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Counter (requestAnimationFrame)
   ═══════════════════════════════════════════ */
function Counter({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const start = performance.now();
          const duration = 2000;
          const step = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            el.textContent = Math.round(target * eased).toLocaleString();
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>0</span>;
}

/* ═══════════════════════════════════════════
   SVG Icons (inline, Feather-style)
   ═══════════════════════════════════════════ */
const IconPerson = ({ color = "var(--text-muted)", size = 32 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 4-7 8-7s8 3 8 7" /><path d="M16 4l1 2" /><circle cx="18" cy="7" r="2" />
  </svg>
);
const IconDoc = ({ color = "var(--text-muted)", size = 32 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="9" y1="13" x2="15" y2="13" /><line x1="9" y1="17" x2="13" y2="17" />
  </svg>
);
const IconSum = ({ color = "var(--text-muted)", size = 32 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 3H6l6 9-6 9h12" />
  </svg>
);
const IconChat = ({ color = "rgba(255,255,255,.7)", size = 40 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><line x1="8" y1="9" x2="16" y2="9" /><line x1="8" y1="13" x2="13" y2="13" />
  </svg>
);
const IconDocCheck = ({ color = "rgba(255,255,255,.7)", size = 40 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><polyline points="9 15 11 17 15 13" />
  </svg>
);
const IconChart = ({ color = "rgba(255,255,255,.7)", size = 40 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);
const IconReceipt = ({ color = "rgba(255,255,255,.7)", size = 40 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 2v20l3-2 3 2 3-2 3 2 3-2 3 2V2l-3 2-3-2-3 2-3-2-3 2-3-2z" /><line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" />
  </svg>
);

/* ═══════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════ */
export default function LPPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Intersection Observer for fade-in
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); }),
      { threshold: 0.15 }
    );
    document.querySelectorAll(".fade-in").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const CTA_URL = "https://tinyurl.com/mw8v222j";

  return (
    <div className="lp-root">
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />

      {/* ══════ Section 0: Navigation ══════ */}
      <nav
        style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, height: 72,
          display: "flex", alignItems: "center",
          background: scrolled ? "rgba(255,255,255,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? "1px solid var(--border)" : "1px solid transparent",
          transition: "background .3s, border-color .3s, backdrop-filter .3s",
        }}
      >
        <div className="nav-inner" style={{ maxWidth: 1100, margin: "0 auto", width: "100%", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
            <Image src="/logo-lp.png" alt="KANBEI" width={48} height={52} style={{ objectFit: "contain" }} />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.3 }}>
              <span style={{ fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.05em", fontFamily: "var(--font-sans)" }}>あなたの会社の経理参謀。</span>
              <span style={{ fontSize: 20, color: "var(--blue)", fontFamily: "var(--font-serif)", fontWeight: 700 }}>KANBEI</span>
            </div>
          </div>
          <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ padding: "12px 28px", fontSize: 14 }}>無料相談</a>
        </div>
      </nav>

      {/* ══════ Section 1: Hero ══════ */}
      <section style={{ position: "relative", minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", overflow: "hidden" }}>
        <HeroParticles />
        <div style={{ position: "relative", zIndex: 1, padding: "120px 24px 80px", maxWidth: 720 }}>
          <div className="fade-in">
            <Image src="/logo-lp.png" alt="KANBEI" width={100} height={100} style={{ margin: "0 auto 24px", objectFit: "contain" }} />
          </div>
          <p className="fade-in delay-1" style={{ fontSize: 13, color: "var(--text-muted)", letterSpacing: "0.25em", marginBottom: 8 }}>AI ACCOUNTING PARTNER</p>
          <div className="divider-gold fade-in delay-1" />
          <h1 className="fade-in delay-2 hero-title" style={{ fontSize: 64, fontWeight: 800, lineHeight: 1.3, marginTop: 24, marginBottom: 24, color: "var(--text)" }}>
            採用より、<br />賢い選択。
          </h1>
          <p className="fade-in delay-3 hero-sub" style={{ fontSize: 18, color: "var(--text-sub)", lineHeight: 1.9, marginBottom: 48 }}>
            経理担当者を雇う前に、KANBEIという選択肢がある。<br />
            月末4〜5時間の経理作業が、チャット一つで完結する。
          </p>
          <div className="fade-in delay-4 hero-buttons" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
            <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-primary">無料相談はこちら</a>
            <button className="btn-secondary" onClick={() => scrollTo("solution")}>詳しく見る</button>
          </div>
          <div className="fade-in delay-4" style={{ marginTop: 64, color: "var(--text-muted)", fontSize: 12, letterSpacing: "0.15em" }}>
            <span>SCROLL</span>
            <div style={{ animation: "scroll-bounce 2s ease-in-out infinite", marginTop: 8 }}>↓</div>
          </div>
        </div>
      </section>

      {/* ══════ Section 2: Problem ══════ */}
      <section style={{ background: "var(--bg-sub)", padding: "100px 0" }}>
        <div className="section">
          <h2 className="fade-in section-title" style={{ fontSize: 48, fontWeight: 800, textAlign: "center", lineHeight: 1.4, marginBottom: 8 }}>
            その採用コスト、<br />本当に必要ですか？
          </h2>
          <div className="divider-gold fade-in" />

          <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginTop: 48, marginBottom: 56 }}>
            {[
              { icon: <IconPerson />, num: "¥460万〜", label: "経理正社員の年間コスト", sub: "給与400万円＋社会保険料会社負担分" },
              { icon: <IconDoc />, num: "¥36〜60万", label: "税理士顧問料（年間）", sub: "月3〜5万円 × 12ヶ月" },
              { icon: <IconSum />, num: "¥507万〜", label: "従来の経理体制コスト（年間）", sub: "これが毎年かかり続ける" },
            ].map((c, i) => (
              <div key={i} className={`card fade-in delay-${i + 1}`} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}>
                <div style={{ marginBottom: 16 }}>{c.icon}</div>
                <p className="cost-num" style={{ fontSize: 48, fontFamily: "var(--font-serif)", color: "var(--blue)", fontWeight: 700, marginBottom: 8 }}>{c.num}</p>
                <p style={{ fontSize: 16, color: "var(--text)", fontWeight: 500, marginBottom: 8 }}>{c.label}</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{c.sub}</p>
              </div>
            ))}
          </div>

          <p className="fade-in" style={{ fontSize: 17, color: "var(--text-sub)", lineHeight: 2, textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            freeeやマネーフォワードは優れたツールです。<br />
            しかし、それは「経理担当者のための」ツールでした。<br />
            ソフトを導入しても、使う人の採用・育成コストは変わりません。
          </p>
        </div>
      </section>

      {/* ══════ Section 3: Solution ══════ */}
      <section id="solution" style={{ background: "var(--bg-dark)", padding: "120px 0", color: "white", textAlign: "center", position: "relative", overflow: "hidden" }}>
        <SeigaihaOverlay />
        <div className="section" style={{ padding: "0 24px", position: "relative", zIndex: 1 }}>
          <div className="fade-in" style={{ marginBottom: 24 }}>
            <Image
              src="/logo-lp.png" alt="KANBEI" width={120} height={120}
              style={{ filter: "brightness(0) invert(1) drop-shadow(0 0 40px rgba(59,159,232,.4))", margin: "0 auto", objectFit: "contain" }}
            />
          </div>
          <h2 className="fade-in solution-title" style={{ fontSize: 56, fontWeight: 800, color: "white", marginBottom: 8 }}>KANBEI</h2>
          <p className="fade-in delay-1 solution-sub" style={{ fontSize: 24, color: "var(--blue-light)", marginBottom: 8 }}>あなたの会社の、経理参謀。</p>
          <div className="divider-gold fade-in delay-1" />
          <p className="fade-in delay-2" style={{ fontSize: 18, color: "rgba(255,255,255,.75)", lineHeight: 2, maxWidth: 600, margin: "24px auto 56px" }}>
            経営者が直接対話できる、AIによる経理エキスパート。<br />
            採用も育成も不要。チャット一つで経営判断を即座に支援します。
          </p>

          <div className="grid-4" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 20, maxWidth: 900, margin: "0 auto" }}>
            {[
              { icon: <IconChat />, title: "AIチャット経営助言", l1: "「今期黒字で終われる？」に即答", l2: "会計エキスパートとして経営を支援" },
              { icon: <IconDocCheck />, title: "受発注・インボイス対応", l1: "適格請求書を自動発行・電磁的保存", l2: "電帳法準拠・7年保存・改ざん防止" },
              { icon: <IconChart />, title: "会計・財務三表自動生成", l1: "仕訳から財務三表まで自動処理", l2: "月次決算の工数を大幅削減" },
              { icon: <IconReceipt />, title: "経費精算・AI自動仕訳", l1: "スマホ撮影するだけ", l2: "AIが勘定科目を判定・自動計上" },
            ].map((f, i) => (
              <div
                key={i}
                className={`fade-in delay-${i + 1}`}
                style={{
                  background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, padding: 32,
                  textAlign: "left", transition: "border-color .3s, background .3s", height: "100%",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--blue-light)"; e.currentTarget.style.background = "rgba(59,159,232,.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,.1)"; e.currentTarget.style.background = "rgba(255,255,255,.06)"; }}
              >
                <div style={{ marginBottom: 16 }}>{f.icon}</div>
                <p style={{ fontWeight: 700, color: "white", fontSize: 17, marginBottom: 8 }}>{f.title}</p>
                <p style={{ color: "rgba(255,255,255,.6)", fontSize: 14, lineHeight: 1.8 }}>{f.l1}<br />{f.l2}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ Section 4: USP ══════ */}
      <section style={{ background: "var(--bg)", padding: "100px 0" }}>
        <div className="section">
          <h2 className="fade-in section-title" style={{ fontSize: 48, fontWeight: 800, textAlign: "center", marginBottom: 56 }}>
            KANBEIだけが持つ、3つの強み
          </h2>

          {[
            { num: "01", title: "経営者が直接使える、唯一の経理AI", body: "freee・マネーフォワード・弥生は経理担当者向けのツールです。\n導入後も人を採用・育成するコストが必要でした。\nKANBEIは経営者がチャットで直接操作する——\n採用コストゼロで経理体制が完成します。", reverse: false },
            { num: "02", title: "使うほど、あなたの経営哲学を学ぶ", body: "「節税を優先したい」「キャッシュを手元に残したい」——\n経営者の意向をAIが継続的に学習し、\n財務処理・費用計上のタイミングに反映します。", reverse: true },
            { num: "03", title: "ユーザー無制限・追加費用ゼロ", body: "freeeは1名追加ごとに月300円〜の従量課金。\nKANBEIはスタッフが何名になっても同一料金。\n成長するほどコストパフォーマンスが高まります。", reverse: false },
          ].map((usp, i) => (
            <div
              key={i}
              className={`fade-in ${usp.reverse ? "usp-row-reverse" : "usp-row"}`}
              style={{
                display: "flex", flexDirection: usp.reverse ? "row-reverse" : "row",
                gap: 40, alignItems: "flex-start", marginBottom: 64,
              }}
            >
              <div style={{ flexShrink: 0 }}>
                <span className="usp-num" style={{ fontSize: 80, fontFamily: "var(--font-serif)", fontWeight: 800, color: "var(--blue)", lineHeight: 1 }}>{usp.num}</span>
              </div>
              <div>
                <h3 className="usp-title" style={{ fontSize: 26, fontWeight: 700, color: "var(--text)", marginBottom: 16 }}>{usp.title}</h3>
                <p className="usp-body" style={{ fontSize: 16, color: "var(--text-sub)", lineHeight: 2, whiteSpace: "pre-line" }}>{usp.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════ Section 5: Impact Numbers ══════ */}
      <section style={{ background: "var(--bg-sub)", padding: "100px 0" }}>
        <div className="section">
          <h2 className="fade-in section-title" style={{ fontSize: 48, fontWeight: 800, textAlign: "center", marginBottom: 48 }}>
            従来の経理体制との比較
          </h2>

          <div className="fade-in" style={{ textAlign: "center", marginBottom: 56 }}>
            <p style={{ fontSize: 18, color: "var(--text-sub)", marginBottom: 8 }}>最大</p>
            <p style={{ fontSize: 96, fontFamily: "var(--font-serif)", fontWeight: 800, lineHeight: 1 }} className="accent-gold impact-num">
              <Counter target={398} />
            </p>
            <p className="impact-label" style={{ fontSize: 28, color: "var(--text)", fontWeight: 700, marginTop: 8 }}>万円のコスト削減</p>
          </div>

          <div className="fade-in" style={{ maxWidth: 720, margin: "0 auto 24px", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "var(--font-sans)" }}>
              <thead>
                <tr style={{ background: "var(--blue)", color: "white" }}>
                  <th className="table-header" style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, textAlign: "center" }}>従来の経理体制</th>
                  <th className="table-header" style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, textAlign: "center" }}>KANBEI</th>
                  <th className="table-header" style={{ padding: "14px 20px", fontSize: 14, fontWeight: 600, textAlign: "center" }}>削減額</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: "white" }}>
                  <td className="table-cell" style={{ padding: "20px", textAlign: "center", fontSize: 20, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-serif)" }}>507〜638万円/年</td>
                  <td className="table-cell" style={{ padding: "20px", textAlign: "center", fontSize: 20, fontWeight: 700, color: "var(--blue)", fontFamily: "var(--font-serif)" }}>240万円/年</td>
                  <td className="table-cell" style={{ padding: "20px", textAlign: "center", fontSize: 20, fontWeight: 700, color: "var(--blue)", fontFamily: "var(--font-serif)" }}>最大398万円</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="fade-in" style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)" }}>
            ※経理正社員人件費（460〜470万円）＋税理士顧問料（36〜60万円）＋会計ソフト（11〜108万円）との比較
          </p>
        </div>
      </section>

      {/* ══════ Section 6: Pricing ══════ */}
      <section id="pricing" style={{ background: "var(--bg)", padding: "100px 0" }}>
        <div className="section">
          <h2 className="fade-in section-title" style={{ fontSize: 48, fontWeight: 800, textAlign: "center", marginBottom: 48 }}>
            シンプルな料金体系
          </h2>

          <div className="grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 24, maxWidth: 800, margin: "0 auto" }}>
            {/* Plan 1 */}
            <div className="card fade-in delay-1" style={{ display: "flex", flexDirection: "column", height: "100%", padding: 40 }}>
              <p style={{ fontSize: 11, color: "var(--blue)", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 16 }}>1 YEAR PLAN</p>
              <p style={{ fontSize: 42, fontFamily: "var(--font-serif)", color: "var(--text)", fontWeight: 700, marginBottom: 4, lineHeight: 1 }}>¥2,400,000</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>税抜 / 一括払い</p>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 24, flex: 1 }}>
                {["ユーザー数無制限", "インボイス完全対応", "電帳法準拠", "AIチャット経営助言"].map((t) => (
                  <p key={t} style={{ fontSize: 14, color: "var(--text-sub)", lineHeight: 2.2, paddingLeft: 20, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--blue)" }}>✓</span>{t}
                  </p>
                ))}
              </div>
              <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: "100%", textAlign: "center" }}>無料相談はこちら</a>
            </div>

            {/* Plan 2 (recommended) */}
            <div
              className="card fade-in delay-2"
              style={{
                display: "flex", flexDirection: "column", height: "100%", padding: 40,
                border: "2px solid var(--blue)", boxShadow: "0 12px 40px rgba(30,95,168,.12)", position: "relative",
              }}
            >
              <span style={{
                position: "absolute", top: -14, left: "50%", transform: "translateX(-50%)",
                background: "var(--blue)", color: "white", fontSize: 12, fontWeight: 700, padding: "6px 20px", borderRadius: 4,
              }}>
                おすすめ
              </span>
              <p style={{ fontSize: 11, color: "var(--blue)", letterSpacing: "0.2em", fontWeight: 700, marginBottom: 16 }}>2 YEAR PLAN</p>
              <p style={{ fontSize: 42, fontFamily: "var(--font-serif)", color: "var(--blue)", fontWeight: 700, marginBottom: 4, lineHeight: 1 }}>¥4,800,000</p>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>税抜 / 一括払い</p>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginBottom: 24, flex: 1 }}>
                {["1 Year Planのすべて", "請求書自動送信機能", "期日超過メール自動送信機能", "長期利用によるAI精度向上"].map((t) => (
                  <p key={t} style={{ fontSize: 14, color: "var(--text-sub)", lineHeight: 2.2, paddingLeft: 20, position: "relative" }}>
                    <span style={{ position: "absolute", left: 0, color: "var(--blue)" }}>✓</span>{t}
                  </p>
                ))}
              </div>
              <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ width: "100%", textAlign: "center" }}>無料相談はこちら</a>
            </div>
          </div>

          <p className="fade-in" style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 24 }}>
            ※価格はすべて税抜表示です。
          </p>
        </div>
      </section>

      {/* ══════ Section 7: Case Study ══════ */}
      <section id="case-study" style={{ background: "var(--bg-sub)", padding: "100px 0" }}>
        <div className="section">
          <h2 className="fade-in section-title" style={{ fontSize: 48, fontWeight: 800, textAlign: "center", marginBottom: 48 }}>
            導入事例
          </h2>

          <div className="card fade-in case-card" style={{ maxWidth: 860, margin: "0 auto", padding: 56 }}>
            <p style={{ fontSize: 12, color: "var(--blue)", letterSpacing: "0.3em", fontWeight: 700, marginBottom: 8 }}>CASE STUDY 01</p>
            <p style={{ fontSize: 16, color: "var(--text-sub)" }}>不動産業 ｜ 社員数5名（小規模事業者）</p>

            <div style={{ borderTop: "1px solid var(--border)", margin: "24px 0" }} />

            <p style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: "0.2em", marginBottom: 12 }}>BEFORE</p>
            <p className="case-before" style={{ fontFamily: "var(--font-serif)", fontSize: 22, color: "var(--text)", lineHeight: 1.9, marginBottom: 0 }}>
              経理専任者が不在。代表者が請求書発行・売掛管理・<br />
              会計処理をすべて手作業で行っており、<br />
              月次決算に多大な時間を要していた。
            </p>

            <div style={{ borderTop: "1px solid var(--border)", margin: "32px 0" }} />

            <p style={{ fontSize: 12, color: "var(--blue)", letterSpacing: "0.2em", marginBottom: 12 }}>AFTER</p>
            <div style={{ fontSize: 18, color: "var(--text-sub)", lineHeight: 2.2 }}>
              {[
                "適格請求書の発行・電磁的保存が自動化",
                "売掛残高をリアルタイムで把握できるように",
                "AIチャットで経営数値を即時確認",
                "月次決算にかかる工数を大幅削減",
                "顧問税理士への確認作業が必要なくなり、決断の速度向上",
              ].map((t) => (
                <p key={t}><span style={{ color: "var(--blue)", marginRight: 8 }}>›</span>{t}</p>
              ))}
            </div>

            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 24 }}>※企業名は非公開としています。</p>
          </div>
        </div>
      </section>

      {/* ══════ Section 8: CTA ══════ */}
      <section style={{ background: "var(--bg-dark)", padding: "140px 24px", textAlign: "center", color: "white", position: "relative", overflow: "hidden" }}>
        <SeigaihaOverlay />
        <div style={{ maxWidth: 720, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <h2 className="fade-in cta-title" style={{ fontFamily: "var(--font-serif)", fontSize: 56, fontWeight: 800, color: "white", lineHeight: 1.4, marginBottom: 24 }}>
            経営の参謀を、<br />今すぐ手に入れる。
          </h2>
          <p className="fade-in delay-1" style={{ fontSize: 18, color: "rgba(255,255,255,.7)", lineHeight: 2, marginBottom: 48 }}>
            採用よりも賢く。税理士よりも安く。<br />
            KANBEIが、あなたの経営を変えます。
          </p>
          <div className="fade-in delay-2">
            <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-primary btn-cta" style={{ padding: "18px 56px", fontSize: 17 }}>
              無料相談はこちら
            </a>
          </div>
        </div>
      </section>

      {/* ══════ Section 9: Footer ══════ */}
      <footer style={{ background: "var(--bg-dark)", borderTop: "1px solid rgba(255,255,255,.08)", padding: "60px 24px 32px", position: "relative", overflow: "hidden" }}>
        <SeigaihaOverlay />
        <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div className="footer-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 40, marginBottom: 40 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <Image src="/logo-lp.png" alt="KANBEI" width={36} height={36} style={{ filter: "brightness(0) invert(1)", objectFit: "contain" }} />
                <span style={{ fontFamily: "var(--font-serif)", fontSize: 18, color: "white", fontWeight: 700 }}>KANBEI</span>
              </div>
              <p style={{ color: "rgba(255,255,255,.5)", fontSize: 13, marginBottom: 8 }}>あなたの会社の、経理参謀。</p>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 12 }}>運営：株式会社TMファースト</p>
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 11, letterSpacing: "0.15em", marginBottom: 12, fontWeight: 700 }}>MENU</p>
              {[
                { label: "機能", id: "solution" },
                { label: "料金", id: "pricing" },
                { label: "事例", id: "case-study", href: undefined },
                { label: "無料相談", id: undefined, href: CTA_URL },
              ].map((link) => (
                <p key={link.label} style={{ marginBottom: 8 }}>
                  {link.href ? (
                    <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.6)", fontSize: 13, textDecoration: "none", cursor: "pointer" }}>{link.label}</a>
                  ) : (
                    <span onClick={() => scrollTo(link.id ?? "")} style={{ color: "rgba(255,255,255,.6)", fontSize: 13, cursor: "pointer" }}>{link.label}</span>
                  )}
                </p>
              ))}
            </div>
            <div>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 11, letterSpacing: "0.15em", marginBottom: 12, fontWeight: 700 }}>COMPANY</p>
              <p style={{ marginBottom: 8 }}><a href="https://buildforce.studio.site/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.6)", fontSize: 13, textDecoration: "none", cursor: "pointer" }}>運営会社</a></p>
              <p><a href="https://xana.net/" target="_blank" rel="noopener noreferrer" style={{ color: "rgba(255,255,255,.6)", fontSize: 13, textDecoration: "none", cursor: "pointer" }}>開発元</a></p>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 24, textAlign: "center" }}>
            <p style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>© 2026 KANBEI by XANA Arabia Company. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
