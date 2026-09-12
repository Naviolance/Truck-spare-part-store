import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TruckParts — Truck Spare Parts Store";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "#18181b",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#a1a1aa",
            marginBottom: 24,
          }}
        >
          New &amp; Used, Inspected
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: -2,
          }}
        >
          TruckParts
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            color: "#d4d4d8",
            marginTop: 32,
            maxWidth: 900,
          }}
        >
          Quality new and used truck spare parts, with vehicle compatibility lookup.
        </div>
      </div>
    ),
    { ...size },
  );
}
