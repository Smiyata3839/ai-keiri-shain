"use client";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

const PUBLIC_PATHS = ["/lp", "/login", "/onboarding"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (isPublic) return <>{children}</>;

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "var(--font-sans)" }}>
      <Sidebar />
      <div style={{ marginLeft: "280px", flex: 1 }}>
        {children}
      </div>
    </div>
  );
}
