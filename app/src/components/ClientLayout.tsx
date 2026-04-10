"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

const PUBLIC_PATHS = ["/lp", "/lp2", "/login", "/onboarding"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPublic) return <>{children}</>;

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
        <div className="sidebar-wrapper">
          <Sidebar />
        </div>
        <div className="main-content" style={{ marginLeft: "280px", flex: 1 }}>
          {children}
        </div>
      </div>
    </>
  );
}
