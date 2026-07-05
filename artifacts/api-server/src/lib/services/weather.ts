import { fetchWithTimeout, kvRow, linkButton, type LineMessage } from "./flex";

const DIVING_URL = "https://donttalk.vercel.app/diving";
// 龍洞（東北角）
const LAT = 25.11;
const LON = 121.92;

type Severity = 0 | 1 | 2; // 0 GO, 1 CAUTION, 2 NO-GO

interface Conditions {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDir: number | null;
  seaTemp: number | null;
  windSpeed: number | null; // m/s
  windDir: number | null; // 風的來向
  time: string | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function fetchConditions(): Promise<Conditions | null> {
  try {
    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}` +
      `&current=wave_height,wave_period,wave_direction,sea_surface_temperature&timezone=Asia%2FTaipei`;
    const windUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=Asia%2FTaipei`;

    const [marineRes, windRes] = await Promise.all([
      fetchWithTimeout(marineUrl),
      fetchWithTimeout(windUrl),
    ]);
    if (!marineRes.ok || !windRes.ok) return null;

    const marine = (await marineRes.json()) as { current?: Record<string, unknown> };
    const wind = (await windRes.json()) as { current?: Record<string, unknown> };
    const mc = marine.current ?? {};
    const wc = wind.current ?? {};

    return {
      waveHeight: num(mc.wave_height),
      wavePeriod: num(mc.wave_period),
      waveDir: num(mc.wave_direction),
      seaTemp: num(mc.sea_surface_temperature),
      windSpeed: num(wc.wind_speed_10m),
      windDir: num(wc.wind_direction_10m),
      time: (wc.time as string) ?? (mc.time as string) ?? null,
    };
  } catch {
    return null;
  }
}

function sevWave(h: number): Severity {
  if (h < 0.6) return 0;
  if (h <= 1.2) return 1;
  return 2;
}
function sevWind(s: number): Severity {
  if (s < 5) return 0;
  if (s <= 8) return 1;
  return 2;
}
function sevPeriod(p: number): Severity {
  if (p > 9) return 0;
  if (p >= 6) return 1;
  return 2;
}
function sevTemp(t: number): Severity {
  if (t >= 24 && t <= 28) return 0;
  if ((t >= 21 && t < 24) || (t > 28 && t <= 30)) return 1;
  return 2;
}

const DIRS = ["北", "東北", "東", "東南", "南", "西南", "西", "西北"];
function compass(deg: number): string {
  return DIRS[Math.round(deg / 45) % 8];
}
// 龍洞口朝東，離岸風 ≈ 西風（來向約 247.5–292.5°）
function isOffshoreWest(deg: number): boolean {
  return deg > 247.5 && deg < 292.5;
}

const DOT: Record<Severity, string> = { 0: "🟢", 1: "🟡", 2: "🔴" };

function verdict(sev: Severity): { label: string; color: string } {
  if (sev === 0) return { label: "🟢 GO・適合下水", color: "#10B981" };
  if (sev === 1) return { label: "🟡 CAUTION・斟酌", color: "#F59E0B" };
  return { label: "🔴 NO-GO・建議改期", color: "#EF4444" };
}

function unavailableCard(): LineMessage {
  return {
    type: "flex",
    altText: "🤿 龍洞浪況 — 資料暫時抓不到",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🤿 龍洞浪況", weight: "bold", size: "lg", color: "#0F172A" },
          {
            type: "text",
            text: "海況資料暫時抓不到,請稍後再試一次 🌊",
            wrap: true,
            size: "sm",
            color: "#64748B",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [linkButton("看完整浪況(Windguru/氣象署)", DIVING_URL, "#0EA5E9")],
      },
    },
  };
}

function conditionsCard(c: Conditions): LineMessage {
  const severities: Severity[] = [];
  const rows: LineMessage[] = [];

  if (c.waveHeight !== null) {
    const s = sevWave(c.waveHeight);
    severities.push(s);
    rows.push(kvRow("🌊 浪高", `${c.waveHeight.toFixed(1)} m ${DOT[s]}`));
  }
  if (c.wavePeriod !== null) {
    const s = sevPeriod(c.wavePeriod);
    severities.push(s);
    rows.push(kvRow("📏 週期", `${c.wavePeriod.toFixed(1)} s ${DOT[s]}`));
  }
  if (c.windSpeed !== null) {
    const s = sevWind(c.windSpeed);
    severities.push(s);
    const dir = c.windDir !== null ? `${compass(c.windDir)}風` : "";
    rows.push(kvRow("🌬️ 風速", `${c.windSpeed.toFixed(1)} m/s ${dir} ${DOT[s]}`.trim()));
  }
  if (c.seaTemp !== null) {
    const s = sevTemp(c.seaTemp);
    severities.push(s);
    rows.push(kvRow("🌡️ 水溫", `${c.seaTemp.toFixed(1)} °C ${DOT[s]}`));
  }

  const offshore = c.windDir !== null && isOffshoreWest(c.windDir);
  let overall: Severity = severities.length
    ? (Math.max(...severities) as Severity)
    : 1;
  // 龍洞離岸風(西風)是東北角溺水主因之一 → 直接列為 NO-GO
  if (offshore) overall = 2;

  const v = verdict(overall);
  const bodyContents: LineMessage[] = [...rows];
  if (offshore) {
    bodyContents.push({
      type: "text",
      text: "🔴 目前偏西風(離岸風),會把潛水員推向外海,是東北角溺水主因之一,強烈建議改期。",
      wrap: true,
      size: "xs",
      color: "#B91C1C",
      margin: "md",
    });
  }
  const updated = c.time ? c.time.replace("T", " ") : "";

  return {
    type: "flex",
    altText: `🤿 龍洞浪況 ${v.label}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: v.color,
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🤿 龍洞(東北角)浪況", color: "#FFFFFF", weight: "bold", size: "lg" },
          { type: "text", text: v.label, color: "#FFFFFF", weight: "bold", size: "md", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        paddingAll: "16px",
        contents: bodyContents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          ...(updated
            ? [{ type: "text", text: `更新 ${updated}`, size: "xxs", color: "#94A3B8", align: "center" } as LineMessage]
            : []),
          linkButton("看完整浪況(Windguru/氣象署)", DIVING_URL, "#0EA5E9"),
        ],
      },
    },
  };
}

export async function weatherMenu(): Promise<LineMessage[]> {
  const c = await fetchConditions();
  return [c ? conditionsCard(c) : unavailableCard()];
}
