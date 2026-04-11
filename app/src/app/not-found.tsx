export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 48, fontWeight: 700, color: "#1a1d26", margin: "0 0 8px" }}>404</h1>
        <p style={{ fontSize: 14, color: "#6b7280" }}>ページが見つかりません</p>
      </div>
    </div>
  );
}
