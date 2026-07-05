import { fetchWithTimeout, pill, subtleLink, type LineMessage } from "./flex";

const MUSIC_URL = "https://donttalk.vercel.app/music";

interface Track {
  name: string;
  style: string;
  duration: string;
  album: string;
  mvUrl: string;
}

// 音樂頁把曲目清單內嵌在 <script id="music-tracks"> 的 JSON 裡,
// 直接抓頁面、解析出有 MV 的曲目。快取 10 分鐘避免每次都抓 60KB+ 頁面。
let cache: { at: number; tracks: Track[] } | null = null;
const TTL_MS = 10 * 60 * 1000;

async function fetchTracks(): Promise<Track[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.tracks;
  try {
    const res = await fetchWithTimeout(MUSIC_URL, {}, 6000);
    if (!res.ok) return cache?.tracks ?? [];
    const html = await res.text();
    const m = html.match(/<script[^>]*id="music-tracks"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return cache?.tracks ?? [];
    const parsed = JSON.parse(m[1]);
    if (!Array.isArray(parsed)) return cache?.tracks ?? [];
    const raw = parsed as Array<Record<string, unknown>>;
    const tracks: Track[] = raw
      .map((t) => {
        const mv = (t.mv ?? {}) as Record<string, unknown>;
        const cover = (t.cover ?? {}) as Record<string, unknown>;
        const mvUrl = typeof mv.cdn === "string" ? mv.cdn : "";
        return {
          name: typeof t.name === "string" ? t.name : "",
          style: String((t.style_label as string) ?? (cover.style_label as string) ?? t.style ?? ""),
          duration: typeof t.duration === "string" ? t.duration : "",
          album: typeof t.album === "string" ? t.album : "",
          mvUrl,
        };
      })
      .filter((t) => t.name && /^https:\/\//.test(t.mvUrl));
    cache = { at: Date.now(), tracks };
    return tracks;
  } catch {
    return cache?.tracks ?? [];
  }
}

// 單一 MV 卡:白底、曲名為主,曲風膠囊 + 時長,底部「觀看 MV」連結。
function mvCard(t: Track): LineMessage {
  const meta: LineMessage[] = [];
  if (t.style) meta.push(pill(t.style, "#F1F5F9", "#475569"));
  if (t.duration) {
    meta.push({
      type: "text",
      text: t.duration,
      size: "xs",
      color: "#94A3B8",
      gravity: "center",
      flex: 0,
    });
  }

  const body: LineMessage[] = [
    { type: "text", text: "MUSIC VIDEO", size: "xxs", weight: "bold", color: "#94A3B8" },
    { type: "text", text: t.name, size: "lg", weight: "bold", color: "#0F172A", wrap: true, margin: "sm" },
  ];
  if (meta.length) {
    body.push({ type: "box", layout: "horizontal", spacing: "sm", alignItems: "center", margin: "md", contents: meta });
  }
  if (t.album) {
    body.push({ type: "text", text: t.album, size: "xxs", color: "#CBD5E1", margin: "md" });
  }

  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "18px",
      spacing: "none",
      contents: body,
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      paddingTop: "0px",
      contents: [subtleLink("▶ 觀看 MV", t.mvUrl)],
    },
  };
}

function allMvsCard(count: number): LineMessage {
  return {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "18px",
      justifyContent: "center",
      spacing: "sm",
      contents: [
        { type: "text", text: "MUSIC", size: "xxs", weight: "bold", color: "#94A3B8" },
        { type: "text", text: `共 ${count} 部 MV`, size: "lg", weight: "bold", color: "#0F172A", wrap: true },
        { type: "text", text: "到音樂平台聽完整專輯、看所有 MV 與歌詞。", size: "xs", color: "#64748B", wrap: true, margin: "sm" },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      paddingTop: "0px",
      contents: [subtleLink("前往音樂平台", MUSIC_URL)],
    },
  };
}

// 抓不到曲目時的後備卡(維持精緻白卡風格)
function fallbackCard(): LineMessage {
  return {
    type: "flex",
    altText: "我的音樂平台 — 點開來看看",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "sm",
        contents: [
          { type: "text", text: "MUSIC", size: "xs", weight: "bold", color: "#94A3B8" },
          { type: "text", text: "我的音樂與 MV", size: "lg", weight: "bold", color: "#0F172A", margin: "md" },
          {
            type: "text",
            text: "這裡收錄我的原創音樂與 MV,點下面就能前往聽聽、看看。",
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
        contents: [subtleLink("前往音樂平台", MUSIC_URL)],
      },
    },
  };
}

export async function musicMenu(): Promise<LineMessage[]> {
  const tracks = await fetchTracks();
  if (tracks.length === 0) return [fallbackCard()];

  const shown = tracks.slice(0, 10);
  const bubbles: LineMessage[] = shown.map(mvCard);
  bubbles.push(allMvsCard(tracks.length));

  return [
    {
      type: "flex",
      altText: `MV 精選・共 ${tracks.length} 部`,
      contents: { type: "carousel", contents: bubbles },
    },
  ];
}
