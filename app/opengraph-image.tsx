import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteConfig } from "@/lib/site";

export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const runtime = "nodejs";

export default async function OpenGraphImage() {
  const logoPath = join(process.cwd(), "public/logo-icon.png");
  const logoData = await readFile(logoPath);
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 45%, #ecfeff 100%)",
          padding: "64px",
        }}
      >
        <div
          style={{
            display: "flex",
            flex: 1,
            flexDirection: "column",
            justifyContent: "space-between",
            border: "1px solid rgba(5, 150, 105, 0.15)",
            borderRadius: "32px",
            background: "rgba(255, 255, 255, 0.92)",
            padding: "56px",
            boxShadow: "0 24px 80px rgba(5, 150, 105, 0.12)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "28px" }}>
            <img
              src={logoSrc}
              alt=""
              width={112}
              height={112}
              style={{ borderRadius: "24px" }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  fontSize: 56,
                  fontWeight: 700,
                  color: "#064e3b",
                  letterSpacing: "-0.03em",
                }}
              >
                {siteConfig.name}
              </div>
              <div style={{ fontSize: 28, color: "#047857" }}>
                Pregnancy & child care
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                fontSize: 34,
                lineHeight: 1.35,
                color: "#334155",
                maxWidth: "900px",
              }}
            >
              {siteConfig.description}
            </div>
            <div
              style={{
                display: "flex",
                gap: "12px",
                fontSize: 22,
                color: "#059669",
                fontWeight: 600,
              }}
            >
              <span>EN</span>
              <span>•</span>
              <span>AM</span>
              <span>•</span>
              <span>OM</span>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
