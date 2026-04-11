"use client";
import { useState, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./Sidebar";

const PUBLIC_PATHS = ["/lp", "/lp2", "/login", "/onboarding", "/m"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia("(max-width: 768px)");
    setIsMobile(mql.matches);
    const handler = (e: MediaQueryListEvent) => {
      setIsMobile(e.matches);
      if (!e.matches) setSidebarOpen(false);
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const isEmbed = searchParams.get("embed") === "1";
  if (isPublic || isEmbed) return <>{children}</>;

  return (
    <>
      <style>{`
        @media print {
          .sidebar-wrapper,
          .sidebar-fixed { display: none !important; }
          .main-content { margin-left: 0 !important; }
        }
      `}</style>
      <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
        {/* デスクトップ用サイドバー（モバイル時はhiddenで非表示） */}
        <Sidebar hidden={isMobile} />

        {/* モバイル用ハンバーガーボタン */}
        {isMobile && (
          <button
            onClick={() => setSidebarOpen(true)}
            style={{
              position: "fixed",
              top: 10,
              left: 10,
              zIndex: 1000,
              width: 40,
              height: 40,
              borderRadius: 8,
              border: "none",
              background: "var(--color-sidebar)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
            aria-label="メニューを開く"
          >
            <Menu size={22} />
          </button>
        )}

        {/* モバイル用オーバーレイ */}
        {sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: 1001,
            }}
          />
        )}

        {/* モバイル用スライドインドロワー */}
        {isMobile && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              height: "100vh",
              zIndex: 1002,
              transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.3s ease",
            }}
          >
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                style={{
                  position: "absolute",
                  top: 12,
                  right: -44,
                  zIndex: 1003,
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  border: "none",
                  background: "rgba(0,0,0,0.6)",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                }}
                aria-label="メニューを閉じる"
              >
                <X size={20} />
              </button>
            )}
            <Sidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        )}

        {/* メインコンテンツ */}
        <div className="main-content" style={{ marginLeft: isMobile ? 0 : "280px", flex: 1, paddingTop: isMobile ? 56 : 0 }}>
          {children}
        </div>
      </div>
    </>
  );
}
