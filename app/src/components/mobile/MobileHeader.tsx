"use client";
import Image from "next/image";

export function MobileHeader({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 52,
        background: "#2d3748",
        display: "flex",
        alignItems: "center",
        zIndex: 999,
        padding: "0 16px",
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      <Image
        src="/logo-lp.png"
        alt="KANBEI"
        width={28}
        height={28}
        style={{ filter: "brightness(0) invert(1)", objectFit: "contain", marginRight: 10 }}
      />
      <h1 style={{
        margin: 0,
        fontSize: 16,
        fontWeight: 700,
        color: "#ffffff",
        letterSpacing: "0.02em",
        flex: 1,
      }}>
        {title}
      </h1>
      {right && (
        <div>{right}</div>
      )}
    </header>
  );
}
