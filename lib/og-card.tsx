function RegistrationMark({ top, bottom, left, right }: { top?: number; bottom?: number; left?: number; right?: number }) {
  return (
    <div
      style={{
        position: "absolute",
        ...(top !== undefined ? { top } : {}),
        ...(bottom !== undefined ? { bottom } : {}),
        ...(left !== undefined ? { left } : {}),
        ...(right !== undefined ? { right } : {}),
        width: 28,
        height: 28,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          width: 28,
          height: 2,
          backgroundColor: "rgba(28, 25, 21, 0.28)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 2,
          height: 28,
          backgroundColor: "rgba(28, 25, 21, 0.28)",
          display: "flex",
        }}
      />
      <div
        style={{
          width: 14,
          height: 14,
          borderRadius: 999,
          border: "1.5px solid rgba(28, 25, 21, 0.28)",
          display: "flex",
        }}
      />
    </div>
  );
}

export function BrandSocialCard({ width, height }: { width: number; height: number }) {
  const processes = ["Serigrafía", "DTF", "DTG", "Sublimación", "Vinil textil"];

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        position: "relative",
        backgroundColor: "#f3eee4",
        color: "#1c1915",
        padding: "54px 64px",
        justifyContent: "space-between",
        alignItems: "stretch",
        fontFamily: "sans-serif",
      }}
    >
      <RegistrationMark top={20} left={20} />
      <RegistrationMark top={20} right={20} />
      <RegistrationMark bottom={20} left={20} />
      <RegistrationMark bottom={20} right={20} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 650,
          paddingRight: 28,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 14,
                height: 14,
                borderRadius: 999,
                backgroundColor: "#8d3016",
                display: "flex",
              }}
            />
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: "#8d6b2f",
                textTransform: "uppercase",
              }}
            >
              TextilEnlace · Monterrey y área metropolitana
            </span>
          </div>

          <div
            style={{
              marginTop: 22,
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.08,
              color: "#1c1915",
              display: "flex",
            }}
          >
            Impresión textil directa con talleres locales.
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: 25,
              lineHeight: 1.4,
              color: "#4f493f",
              display: "flex",
            }}
          >
            Describe la prenda, mira qué proceso suele usarse y envía la misma solicitud por WhatsApp. Cada taller cotiza por su cuenta.
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {processes.map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                backgroundColor: "#e6f2ed",
                color: "#1b4338",
                borderRadius: 999,
                padding: "9px 18px",
                fontSize: 20,
                fontWeight: 700,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          width: 390,
          backgroundColor: "#fffdf8",
          border: "2px solid #ddd2c0",
          borderRadius: 28,
          padding: "32px 30px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#1b4338",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            Orientación clara
          </div>

          <div
            style={{
              marginTop: 14,
              fontSize: 36,
              fontWeight: 800,
              color: "#1c1915",
              display: "flex",
            }}
          >
            Playera · 24 pzas
          </div>

          <div
            style={{
              marginTop: 8,
              fontSize: 20,
              color: "#4f493f",
              display: "flex",
            }}
          >
            Pocos colores · Tela oscura
          </div>

          <div
            style={{
              marginTop: 22,
              paddingTop: 20,
              borderTop: "2px dashed #ddd2c0",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                color: "#8d6b2f",
              }}
            >
              Proceso sugerido
            </span>
            <span
              style={{
                marginTop: 8,
                fontSize: 21,
                lineHeight: 1.38,
                color: "#1c1915",
              }}
            >
              Serigrafía, vinil o sublimación, preparados en el navegador.
            </span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#1b4338",
            color: "#fffdf8",
            borderRadius: 18,
            padding: "14px 18px",
            fontSize: 19,
            fontWeight: 700,
          }}
        >
          <span>Sin cuenta para encargar</span>
          <span style={{ color: "#e6f2ed" }}>→</span>
        </div>
      </div>
    </div>
  );
}

export function SeparatorSocialCard({ width, height }: { width: number; height: number }) {
  const layers = [
    { step: "01", name: "Base blanca · 43–48 hilos/cm", dot: "#ffffff", border: "#94a3b8" },
    { step: "02", name: "Amarillo · capa transparente", dot: "#f5d000", border: "#f5d000" },
    { step: "03", name: "Rojo · capa transparente", dot: "#d21e1e", border: "#d21e1e" },
    { step: "04", name: "Negro · al final del orden", dot: "#0f172a", border: "#64748b" },
  ];

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        position: "relative",
        backgroundColor: "#f3eee4",
        color: "#1c1915",
        padding: "54px 64px",
        justifyContent: "space-between",
        alignItems: "stretch",
        fontFamily: "sans-serif",
      }}
    >
      <RegistrationMark top={20} left={20} />
      <RegistrationMark top={20} right={20} />
      <RegistrationMark bottom={20} left={20} />
      <RegistrationMark bottom={20} right={20} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: 635,
          paddingRight: 24,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 21,
              fontWeight: 700,
              letterSpacing: "0.08em",
              color: "#8d6b2f",
              textTransform: "uppercase",
            }}
          >
            Separador de tintas · TextilEnlace
          </span>

          <div
            style={{
              marginTop: 20,
              fontSize: 54,
              fontWeight: 800,
              lineHeight: 1.08,
              color: "#1c1915",
              display: "flex",
            }}
          >
            Sube el logo. Serigrafía, vinil o sublimación.
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: 24,
              lineHeight: 1.4,
              color: "#4f493f",
              display: "flex",
            }}
          >
            Capas y PSD para serigrafía, DXF para vinil textil, o imagen en espejo para sublimación.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {["Serigrafía y PSD", "Vinil en DXF", "Sublimación en espejo"].map((badge) => (
            <div
              key={badge}
              style={{
                display: "flex",
                backgroundColor: "#fffdf8",
                border: "1.5px solid #ddd2c0",
                color: "#1c1915",
                borderRadius: 999,
                padding: "9px 18px",
                fontSize: 19,
                fontWeight: 700,
              }}
            >
              {badge}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          width: 405,
          backgroundColor: "#1c2430",
          color: "#f8fafc",
          borderRadius: 28,
          padding: "30px 28px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.14em",
              color: "#93c5fd",
              textTransform: "uppercase",
              display: "flex",
            }}
          >
            ZIP listo para taller
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {layers.map((layer) => (
              <div
                key={layer.step}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  backgroundColor: "rgba(255, 255, 255, 0.08)",
                  borderRadius: 14,
                  padding: "12px 14px",
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 999,
                    backgroundColor: layer.dot,
                    border: `2px solid ${layer.border}`,
                    display: "flex",
                  }}
                />
                <span style={{ fontSize: 18, fontWeight: 600, color: "#f8fafc" }}>
                  {layer.step} · {layer.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#8d3016",
            color: "#ffffff",
            borderRadius: 16,
            padding: "13px 18px",
            fontSize: 19,
            fontWeight: 700,
          }}
        >
          <span>capas.psd + receta.txt</span>
          <span>ZIP</span>
        </div>
      </div>
    </div>
  );
}
