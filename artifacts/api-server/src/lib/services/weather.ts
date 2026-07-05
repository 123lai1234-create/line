import {
  fetchWithTimeout,
  dot,
  pill,
  pickRow,
  quickReply,
  subtleLink,
  type LineMessage,
  type QuickItem,
} from "./flex";

const DIVING_URL = "https://donttalk.vercel.app/diving";

type Severity = 0 | 1 | 2; // 0 GO, 1 CAUTION, 2 NO-GO

interface Loc {
  id: string;
  name: string;
  region: string;
  lat: number;
  lon: number;
  // 龍洞口朝東,離岸風(西風)是溺水主因 → 強制 NO-GO。只有面東的點適用。
  offshoreWest?: boolean;
}

const LOCATIONS: Loc[] = [
  { id: "longdong", name: "龍洞", region: "東北角", lat: 25.11, lon: 121.92, offshoreWest: true },
  { id: "north", name: "北海岸", region: "石門一帶", lat: 25.29, lon: 121.57 },
  { id: "kenting", name: "墾丁", region: "後壁湖", lat: 21.94, lon: 120.745 },
  { id: "green", name: "綠島", region: "台東外海", lat: 22.66, lon: 121.49 },
  { id: "orchid", name: "蘭嶼", region: "台東外海", lat: 22.05, lon: 121.53 },
  { id: "liuqiu", name: "小琉球", region: "屏東外海", lat: 22.34, lon: 120.37 },
];

function locById(id: string): Loc | undefined {
  return LOCATIONS.find((l) => l.id === id);
}

// 直接輸入地名時對應到潛點
export function locByKeyword(text: string): Loc | undefined {
  if (/龍洞|東北角/.test(text)) return locById("longdong");
  if (/北海岸|石門|白沙灣|富貴角/.test(text)) return locById("north");
  if (/墾丁|後壁湖|南灣/.test(text)) return locById("kenting");
  if (/綠島/.test(text)) return locById("green");
  if (/蘭嶼/.test(text)) return locById("orchid");
  if (/小琉球|琉球/.test(text)) return locById("liuqiu");
  return undefined;
}

interface DayData {
  waveHeight: number | null;
  wavePeriod: number | null;
  waveDir: number | null;
  windSpeed: number | null;
  windDir: number | null;
  seaTemp: number | null; // 只有今天(current)才有
  date: string | null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

async function fetchDays(loc: Loc): Promise<DayData[] | null> {
  try {
    const marineUrl =
      `https://marine-api.open-meteo.com/v1/marine?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&daily=wave_height_max,wave_period_max,wave_direction_dominant&current=sea_surface_temperature` +
      `&timezone=Asia%2FTaipei&forecast_days=5`;
    const windUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}` +
      `&daily=wind_speed_10m_max,wind_direction_10m_dominant&wind_speed_unit=ms&timezone=Asia%2FTaipei&forecast_days=5`;

    const [marineRes, windRes] = await Promise.all([fetchWithTimeout(marineUrl), fetchWithTimeout(windUrl)]);
    if (!marineRes.ok || !windRes.ok) return null;

    const marine = (await marineRes.json()) as {
      current?: Record<string, unknown>;
      daily?: Record<string, unknown[]>;
    };
    const wind = (await windRes.json()) as { daily?: Record<string, unknown[]> };
    const md = marine.daily ?? {};
    const wd = wind.daily ?? {};
    const times = (md.time ?? wd.time ?? []) as string[];
    const seaTempNow = num(marine.current?.sea_surface_temperature);

    return times.map((date, i) => ({
      waveHeight: num(md.wave_height_max?.[i]),
      wavePeriod: num(md.wave_period_max?.[i]),
      waveDir: num(md.wave_direction_dominant?.[i]),
      windSpeed: num(wd.wind_speed_10m_max?.[i]),
      windDir: num(wd.wind_direction_10m_dominant?.[i]),
      seaTemp: i === 0 ? seaTempNow : null,
      date,
    }));
  } catch {
    return null;
  }
}

// 日最大值門檻(較保守,對安全有利)
function sevWave(h: number): Severity {
  if (h < 0.8) return 0;
  if (h <= 1.5) return 1;
  return 2;
}
function sevWind(s: number): Severity {
  if (s < 6) return 0;
  if (s <= 9) return 1;
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
function isOffshoreWest(deg: number): boolean {
  return deg > 247.5 && deg < 292.5;
}

const SEV_DOT: Record<Severity, string> = { 0: "#22C55E", 1: "#F59E0B", 2: "#EF4444" };

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
  if (sev === 0) return "海況穩定,適合下水,仍請留意自身狀況與裝備。";
  if (sev === 1) return "海況普通,請依經驗與裝備斟酌是否下水。";
  return "浪況不穩,建議改期再訪。";
}

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

function eyebrow(loc: Loc): LineMessage {
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    contents: [
      { type: "text", text: "DIVE CONDITIONS", size: "xs", weight: "bold", color: "#94A3B8", flex: 0 },
      { type: "filler" },
      { type: "text", text: `${loc.name}・${loc.region}`, size: "xxs", color: "#CBD5E1", align: "end" },
    ],
  };
}

function dayShort(i: number, date: string | null): string {
  if (i === 0) return "今天";
  if (i === 1) return "明天";
  if (i === 2) return "後天";
  if (date) {
    const d = new Date(`${date}T00:00:00+08:00`);
    return ["週日", "週一", "週二", "週三", "週四", "週五", "週六"][d.getDay()] ?? `第${i + 1}天`;
  }
  return `第${i + 1}天`;
}

function dayChips(loc: Loc, days: DayData[], active: number): QuickItem[] {
  const items: QuickItem[] = days.slice(0, 5).map((d, i) => ({
    label: `${i === active ? "・" : ""}${dayShort(i, d.date)}`,
    data: `s=wx&loc=${loc.id}&d=${i}`,
    displayText: `${loc.name}・${dayShort(i, d.date)}海況`,
  }));
  items.push({ label: "🔀 換地點", data: "s=wx", displayText: "查其他潛點" });
  return items;
}

// 潛點挑選卡
export function weatherEntry(): LineMessage[] {
  const rows: LineMessage[] = [];
  LOCATIONS.forEach((l, i) => {
    if (i > 0) rows.push({ type: "separator", color: "#F1F5F9" });
    rows.push(pickRow(l.name, l.region, `s=wx&loc=${l.id}&d=0`, `${l.name}海況`));
  });

  return [
    {
      type: "flex",
      altText: "選擇潛點查看海況",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "20px",
          spacing: "none",
          contents: [
            { type: "text", text: "DIVE SPOTS", size: "xs", weight: "bold", color: "#94A3B8" },
            { type: "text", text: "想看哪個潛點?", size: "lg", weight: "bold", color: "#0F172A", margin: "md" },
            {
              type: "text",
              text: "選一個地點,查今天到未來幾天的海況與下水建議。",
              size: "sm",
              color: "#64748B",
              margin: "sm",
              wrap: true,
            },
            { type: "separator", margin: "lg", color: "#F1F5F9" },
            { type: "box", layout: "vertical", margin: "sm", spacing: "none", contents: rows },
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
    },
  ];
}

function unavailableCard(loc: Loc): LineMessage {
  return {
    type: "flex",
    altText: `${loc.name}海況 — 資料暫時抓不到`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "sm",
        contents: [
          eyebrow(loc),
          { type: "text", text: "海況資料暫時抓不到", weight: "bold", size: "lg", color: "#0F172A", margin: "md" },
          {
            type: "text",
            text: "請稍後再試一次,或直接查看完整浪況資料。",
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

function conditionsCard(loc: Loc, day: DayData, dayIndex: number): LineMessage {
  const severities: Severity[] = [];
  const rows: LineMessage[] = [];

  function pushRow(label: string, value: string, sev: Severity) {
    if (rows.length > 0) rows.push({ type: "separator", color: "#F1F5F9" });
    rows.push(metricRow(label, value, sev));
  }

  if (day.waveHeight !== null) {
    const s = sevWave(day.waveHeight);
    severities.push(s);
    pushRow("浪高", `${day.waveHeight.toFixed(1)} m`, s);
  }
  if (day.wavePeriod !== null) {
    const s = sevPeriod(day.wavePeriod);
    severities.push(s);
    pushRow("週期", `${day.wavePeriod.toFixed(1)} s`, s);
  }
  if (day.windSpeed !== null) {
    const s = sevWind(day.windSpeed);
    severities.push(s);
    const dir = day.windDir !== null ? ` ${compass(day.windDir)}風` : "";
    pushRow("風速", `${day.windSpeed.toFixed(1)} m/s${dir}`, s);
  }
  if (day.seaTemp !== null) {
    const s = sevTemp(day.seaTemp);
    severities.push(s);
    pushRow("水溫", `${day.seaTemp.toFixed(1)} °C`, s);
  }

  const offshore = loc.offshoreWest === true && day.windDir !== null && isOffshoreWest(day.windDir);
  let overall: Severity = severities.length ? (Math.max(...severities) as Severity) : 1;
  if (offshore) overall = 2;

  const body: LineMessage[] = [
    eyebrow(loc),
    {
      type: "box",
      layout: "horizontal",
      alignItems: "center",
      margin: "lg",
      contents: [
        {
          type: "text",
          text: `${dayShort(dayIndex, day.date)}海況`,
          size: "sm",
          weight: "bold",
          color: "#475569",
          flex: 0,
          gravity: "center",
        },
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
          text: "目前偏西風(離岸風)會把潛水員推向外海,是東北角溺水主因之一,強烈建議改期。",
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

  if (dayIndex > 0 || day.seaTemp === null) {
    body.push({
      type: "text",
      text: "註:未來預報以當日最大浪高/風速估算;水溫僅顯示今日即時值。",
      size: "xxs",
      color: "#CBD5E1",
      margin: "lg",
      wrap: true,
    });
  }
  if (day.date) {
    body.push({ type: "text", text: `資料日期 ${day.date}`, size: "xxs", color: "#CBD5E1", margin: "sm" });
  }

  return {
    type: "flex",
    altText: `${loc.name}・${dayShort(dayIndex, day.date)}海況・${verdictAlt(overall)}`,
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

export async function weatherFor(locId: string, dayIndex = 0): Promise<LineMessage[]> {
  const loc = locById(locId);
  if (!loc) return weatherEntry();

  const days = await fetchDays(loc);
  if (!days || days.length === 0) return [unavailableCard(loc)];

  const idx = Math.max(0, Math.min(days.length - 1, dayIndex));
  const day = days[idx];
  const hasMetric =
    day.waveHeight !== null || day.wavePeriod !== null || day.windSpeed !== null || day.seaTemp !== null;
  if (!hasMetric) return [unavailableCard(loc)];

  const card = conditionsCard(loc, day, idx);
  card.quickReply = quickReply(dayChips(loc, days, idx));
  return [card];
}
