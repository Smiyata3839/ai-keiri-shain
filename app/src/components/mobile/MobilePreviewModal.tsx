"use client";
import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export function MobilePreviewModal({
  src,
  title,
  onClose,
}: {
  src: string;
  title: string;
  onClose: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const calcScale = () => {
      const screenWidth = window.innerWidth - 32; // 16px padding each side
      setScale(screenWidth / 900);
    };
    calcScale();
    window.addEventListener("resize", calcScale);
    return () => window.removeEventListener("resize", calcScale);
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        zIndex: 2000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        paddingTop: 12,
      }}
    >
      {/* ヘッダー */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "calc(100% - 32px)",
          maxWidth: 900 * scale,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{title}</span>
        <button
          onClick={onClose}
          style={{
            border: "none",
            background: "rgba(255,255,255,0.2)",
            borderRadius: 8,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          <X size={18} color="#fff" />
        </button>
      </div>

      {/* iframe（PC幅で描画し、縮小して中央表示） */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: `${900 * scale}px`,
          height: `${1200 * scale}px`,
          overflow: "hidden",
          borderRadius: 8,
          boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
        }}
      >
        <iframe
          src={src}
          style={{
            width: 900,
            height: 1200,
            border: "none",
            background: "#fff",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
