import { logger } from "../logger";
import { fetchWithTimeout, kvRow, textMessage, type LineMessage, type QuickItem } from "./flex";

interface DiveSpot {
  key: string;
  name: string;
  lat: number;
  lon: number;
}

const DIVE_SPOTS: DiveSpot[] = [
  { key: "綠島", name: "綠島", lat: 22.6579, lon: 121.49 },
  { key: "蘭嶼", name: "蘭嶼", lat: 22.0569, lon: 121.5386 },
  { key: "墾丁", name: "墾丁後壁湖", lat: 21.945, lon: 120.745 },
  { key: "小琉球", name: "小琉球", lat: 22.34, lon: 120.37 },
  { key: "龍洞", name: "東北角龍洞", lat: 25.116, lon: 121.92 },
  { key: "澎湖", name: "澎湖", lat: 23.5711, lon: 119.5793 },
];

function spotItems(): QuickItem[] {
  return DIVE_SPOTS.map((s) => ({ label: s.name, text: `潛水天氣 ${s.key}` }));
}

export function weatherMenu(): LineMessage[] {
  return [
    textMessage(
      "🤿 潛水天氣查詢\n想看哪個潛點今天的海況?點下面按鈕,或直接打潛點名稱都可以。",
      spotItems(),
    ),
  ];
}

function findSpot(input: string): DiveSpot | undefined {
  const cleaned = input.replace(/潛水天氣|海況|天氣/g, "").trim();
  return DIVE_SPOTS.find((s) => cleaned.includes(s.key) || input.includes(s.key));
}

function weatherCodeText(code: number | undefined): string {
  if (code == null) return "—";
  if (code === 0) return "☀️ 晴朗";
  if (code <= 2) return "🌤️ 多雲時晴";
  if (code === 3) return "☁️ 陰天";
  if (code === 45 || code === 48) return "🌫️ 有霧";
  if (code >= 51 && code <= 57) return "🌦️ 毛毛雨";
  if (code >= 61 && code <= 67) return "🌧️ 下雨";
  if (code >= 71 && code <= 77) return "🌨️ 下雪";
  if (code >= 80 && code <= 82) return "🌧️ 陣雨";
  if (code >= 95) return "⛈️ 雷雨";
  return "—";
}

function diveAdvice(wave: number | null, wind: number | null): { emoji: string; text: string; color: string } {
  if (wave == null) return { emoji: "❔", text: "海況資料不足,請以現場為準", color: "#64748B" };
  if (wave < 0.8 && (wind == null || wind < 20))
    return { emoji: "🟢", text: "海況良好,適合下水", color: "#10B981" };
  if (wave < 1.5 && (wind == null || wind < 30))
    return { emoji: "🟡", text: "海況普通,請留意流況與能見度", color: "#F59E0B" };
  return { emoji: "🔴", text: "浪大風強,不建議下水", color: "#EF4444" };
}

async function fetchJson(url: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetchWithTimeout(url);
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch (err) {
    logger.error({ err, url }, "weather fetch failed");
    return null;
  }
}

export async function weatherResult(input: string): Promise<LineMessage[]> {
  const spot = findSpot(input);
  if (!spot) return weatherMenu();

  const marineUrl = `https://marine-api.open-meteo.com/v1/marine?latitude=${spot.lat}&longitude=${spot.lon}&current=wave_height,sea_surface_temperature&timezone=Asia%2FTaipei`;
  const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${spot.lat}&longitude=${spot.lon}&current=temperature_2m,wind_speed_10m,weather_code&timezone=Asia%2FTaipei`;

  const [marine, forecast] = await Promise.all([fetchJson(marineUrl), fetchJson(forecastUrl)]);

  const mCur = (marine?.current ?? {}) as Record<string, number | undefined>;
  const fCur = (forecast?.current ?? {}) as Record<string, number | undefined>;

  const wave = typeof mCur.wave_height === "number" ? mCur.wave_height : null;
  const seaTemp = typeof mCur.sea_surface_temperature === "number" ? mCur.sea_surface_temperature : null;
  const airTemp = typeof fCur.temperature_2m === "number" ? fCur.temperature_2m : null;
  const wind = typeof fCur.wind_speed_10m === "number" ? fCur.wind_speed_10m : null;
  const code = typeof fCur.weather_code === "number" ? fCur.weather_code : undefined;

  if (wave == null && seaTemp == null && airTemp == null) {
    return [
      textMessage(
        `抱歉,目前查不到「${spot.name}」的海況資料,請稍後再試 🙏`,
        spotItems(),
      ),
    ];
  }

  const advice = diveAdvice(wave, wind);
  const now = new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const bubble: LineMessage = {
    type: "flex",
    altText: `${spot.name} 潛水海況 — ${advice.text}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0EA5E9",
        paddingAll: "16px",
        contents: [
          { type: "text", text: "🤿 潛水天氣", color: "#E0F2FE", size: "sm", weight: "bold" },
          { type: "text", text: spot.name, color: "#FFFFFF", size: "xl", weight: "bold" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F1F5F9",
            cornerRadius: "8px",
            paddingAll: "12px",
            contents: [
              { type: "text", text: `${advice.emoji} ${advice.text}`, weight: "bold", size: "md", color: advice.color, wrap: true },
            ],
          },
          { type: "separator" },
          kvRow("浪高", wave == null ? "—" : `${wave.toFixed(1)} m`),
          kvRow("水溫", seaTemp == null ? "—" : `${seaTemp.toFixed(1)} °C`),
          kvRow("氣溫", airTemp == null ? "—" : `${airTemp.toFixed(1)} °C`),
          kvRow("風速", wind == null ? "—" : `${wind.toFixed(0)} km/h`),
          kvRow("天氣", weatherCodeText(code)),
          { type: "text", text: `更新於 ${now} · 資料來源 Open-Meteo`, size: "xxs", color: "#94A3B8", margin: "md", wrap: true },
        ],
      },
    },
  };

  return [{ ...bubble, quickReply: textMessage("", spotItems()).quickReply as Record<string, unknown> }];
}
