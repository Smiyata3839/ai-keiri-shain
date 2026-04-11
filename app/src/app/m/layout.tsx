import { MobileTabBar } from "@/components/mobile/MobileTabBar";

export default function MobileLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--color-background)",
    }}>
      <div style={{ paddingTop: 52, paddingBottom: 80 }}>
        {children}
      </div>
      <MobileTabBar />
    </div>
  );
}
