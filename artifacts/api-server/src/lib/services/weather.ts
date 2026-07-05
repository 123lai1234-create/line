import { fetchWithTimeout, dot, pill, subtleLink, type LineMessage } from "./flex";

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

const SEV_DOT: Record<Severity, string> = { 0: "#22C55E", 1: "#F59E0B", 2: "#EF4444" };

// 今日海況徽章:低調的膠囊標籤,顏色即訊號
function verdictBadge(sev: Severity): LineMessage {
  if (sev === 0) return pill("適合下水", "#F0FDF4", "#16A34A");
  if (sev === 1) return pill("建議斟酌", "#FFFBEB", "#D97706");
  return pill("不建議下水", "#FEF2F2", "#DC2626");
}

function verdictAlt(sev: Severity): string {
  if (sev === 0) return "適合下水";
  if (sev === 1) return "建議斟酌";
  return "不建議下水";
}

function reasonText(sev: Severity): string {
  if (sev === 0) return "海況穩定，適合下水，仍請留意自身狀況與裝備。";
  if (sev === 1) return "海況普通，請依經驗與裝備斟酌是否下水。";
  return "浪況不穩，建議改期再訪。";
}

// 單一指標:標籤 + 數值 + 狀態圓點(取代指標條,更精簡)
function metricRow(label: string, value: string, sev: Severity): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    paddingTop: "10px",
    paddingBottom: "10px",
    contents: [
      { type: "text", text: label, size: "sm", color: "#64748B", flex: 3, gravity: "center" },
      {
        type: "text",
        text: value,
        size: "sm",
        weight: "bold",
        color: "#1E293B",
        align: "end",
        gravity: "center",
        flex: 4,
      },
      {
        type: "box",
        layout: "vertical",
        flex: 0,
        justifyContent: "center",
        paddingStart: "10px",
        contents: [dot(SEV_DOT[sev])],
      },
    ],
  };
}

function eyebrow(): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    contents: [
      { type: "text", text: "DIVE CONDITIONS", size: "xs", weight: "bold", color: "#94A3B8", flex: 0 },
      { type: "filler" },
      { type: "text", text: "龍洞 Long Dong", size: "xxs", color: "#CBD5E1", align: "end" },
    ],
  };
}

function unavailableCard(): LineMessage {
  return {
    type: "flex",
    altText: "龍洞海況 — 資料暫時抓不到",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "sm",
        contents: [
          eyebrow(),
          { type: "text", text: "海況資料暫時抓不到", weight: "bold", size: "lg", color: "#0F172A", margin: "md" },
          {
            type: "text",
            text: "請稍後再試一次，或直接查看完整浪況資料。",
            wrap: true,
            size: "sm",
            color: "#64748B",
            margin: "sm",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        paddingTop: "0px",
        contents: [subtleLink("查看完整浪況資料", DIVING_URL)],
      },
    },
  };
}

function conditionsCard(c: Conditions): LineMessage {
  const severities: Severity[] = [];
  const rows: LineMessage[] = [];

  function pushRow(label: string, value: string, sev: Severity) {
    if (rows.length > 0) rows.push({ type: "separator", color: "#F1F5F9" });
    rows.push(metricRow(label, value, sev));
  }

  if (c.waveHeight !== null) {
    const s = sevWave(c.waveHeight);
    severities.push(s);
    pushRow("浪高", `${c.waveHeight.toFixed(1)} m`, s);
  }
  if (c.wavePeriod !== null) {
    const s = sevPeriod(c.wavePeriod);
    severities.push(s);
    pushRow("週期", `${c.wavePeriod.toFixed(1)} s`, s);
  }
  if (c.windSpeed !== null) {
    const s = sevWind(c.windSpeed);
    severities.push(s);
    const dir = c.windDir !== null ? ` ${compass(c.windDir)}風` : "";
    pushRow("風速", `${c.windSpeed.toFixed(1)} m/s${dir}`, s);
  }
  if (c.seaTemp !== null) {
    const s = sevTemp(c.seaTemp);
    severities.push(s);
    pushRow("水溫", `${c.seaTemp.toFixed(1)} °C`, s);
  }

  const offshore = c.windDir !== null && isOffshoreWest(c.windDir);
  let overall: Severity = severities.length ? (Math.max(...severities) as Severity) : 1;
  // 龍洞離岸風(西風)是東北角溺水主因之一 → 直接列為 NO-GO
  if (offshore) overall = 2;

  const body: LineMessage[] = [
    eyebrow(),
    {
      type: "box",
      layout: "horizontal",
      alignItems: "center",
      margin: "lg",
      contents: [
        { type: "text", text: "今日海況", size: "sm", weight: "bold", color: "#475569", flex: 0, gravity: "center" },
        { type: "filler" },
        verdictBadge(overall),
      ],
    },
    { type: "separator", margin: "lg", color: "#F1F5F9" },
    { type: "box", layout: "vertical", margin: "sm", spacing: "none", contents: rows },
  ];

  if (offshore) {
    body.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#FEF2F2",
      cornerRadius: "10px",
      paddingAll: "12px",
      margin: "lg",
      contents: [
        {
          type: "text",
          text: "目前偏西風(離岸風)會把潛水員推向外海，是東北角溺水主因之一，強烈建議改期。",
          wrap: true,
          size: "xs",
          color: "#B91C1C",
        },
      ],
    });
  } else {
    body.push({
      type: "box",
      layout: "vertical",
      backgroundColor: "#F8FAFC",
      cornerRadius: "10px",
      paddingAll: "12px",
      margin: "lg",
      contents: [{ type: "text", text: reasonText(overall), wrap: true, size: "xs", color: "#64748B" }],
    });
  }

  const updated = c.time ? c.time.replace("T", " ") : "";
  if (updated) {
    body.push({ type: "text", text: `更新 ${updated}`, size: "xxs", color: "#CBD5E1", margin: "lg" });
  }

  return {
    type: "flex",
    altText: `龍洞海況・${verdictAlt(overall)}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "none",
        contents: body,
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        paddingTop: "0px",
        contents: [subtleLink("查看完整浪況資料", DIVING_URL)],
      },
    },
  };
}

export async function weatherMenu(): Promise<LineMessage[]> {
  const c = await fetchConditions();
  return [c ? conditionsCard(c) : unavailableCard()];
}
