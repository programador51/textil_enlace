export function SiteMark({ size }: { size: number }) {
  const pad = Math.max(2, Math.round(size * 0.18));
  const gap = Math.max(1, Math.round(size * 0.06));
  const cell = Math.floor((size - pad * 2 - gap) / 2);

  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        backgroundColor: "#1c1915",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: cell * 2 + gap }}>
        <div style={{ display: "flex", width: cell * 2 + gap, height: cell }}>
          <div style={{ width: cell, height: cell, backgroundColor: "#f3eee4" }} />
          <div style={{ width: gap, height: cell, backgroundColor: "#1c1915" }} />
          <div style={{ width: cell, height: cell, backgroundColor: "#8d6b2f" }} />
        </div>
        <div style={{ width: cell * 2 + gap, height: gap, backgroundColor: "#1c1915" }} />
        <div style={{ display: "flex", width: cell * 2 + gap, height: cell }}>
          <div style={{ width: cell, height: cell, backgroundColor: "#1b4338" }} />
          <div style={{ width: gap, height: cell, backgroundColor: "#1c1915" }} />
          <div style={{ width: cell, height: cell, backgroundColor: "#8d3016" }} />
        </div>
      </div>
    </div>
  );
}
