import { logger } from "../logger";
import { fetchWithTimeout, linkButton, textMessage, type LineMessage, type QuickItem } from "./flex";

const MOODS: QuickItem[] = [
  { label: "🎹 放鬆", text: "音樂 放鬆 lofi chill" },
  { label: "💪 專注工作", text: "音樂 focus study beats" },
  { label: "🏃 運動", text: "音樂 workout energy" },
  { label: "🎸 華語流行", text: "音樂 華語 流行" },
  { label: "🎷 爵士", text: "音樂 jazz" },
];

export function musicMenu(): LineMessage[] {
  return [
    textMessage(
      "🎧 音樂欣賞\n選一種心情,或直接打歌手/歌名,我幫你找幾首來聽!\n例如:「音樂 周杰倫」。",
      MOODS,
    ),
  ];
}

interface Track {
  trackName?: string;
  artistName?: string;
  trackViewUrl?: string;
  artworkUrl100?: string;
}

export async function musicResult(input: string): Promise<LineMessage[]> {
  const query = input.replace(/音樂欣賞|音樂|推薦/g, "").trim();
  if (!query) return musicMenu();

  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=6&country=TW&lang=zh_tw`;

  let tracks: Track[] = [];
  try {
    const res = await fetchWithTimeout(url);
    if (res.ok) {
      const data = (await res.json()) as { results?: Track[] };
      tracks = (data.results ?? []).filter((t) => t.trackName && t.trackViewUrl);
    }
  } catch (err) {
    logger.error({ err, query }, "music fetch failed");
  }

  if (tracks.length === 0) {
    return [textMessage(`找不到「${query}」相關的歌曲,換個關鍵字試試看吧 🎵`, MOODS)];
  }

  const bubbles = tracks.slice(0, 6).map((t) => {
    const art = (t.artworkUrl100 ?? "").replace("100x100bb", "400x400bb");
    return {
      type: "bubble",
      size: "kilo",
      hero: art
        ? { type: "image", url: art, size: "full", aspectRatio: "1:1", aspectMode: "cover" }
        : undefined,
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: t.trackName ?? "", weight: "bold", size: "sm", wrap: true, maxLines: 2 },
          { type: "text", text: t.artistName ?? "", size: "xs", color: "#64748B", wrap: true, maxLines: 1 },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [linkButton("試聽 / 查看", t.trackViewUrl ?? "https://music.apple.com", "#EC4899")],
      },
    };
  });

  const carousel: LineMessage = {
    type: "flex",
    altText: `🎧 為你找到 ${tracks.length} 首「${query}」`,
    contents: { type: "carousel", contents: bubbles },
    quickReply: textMessage("", MOODS).quickReply as Record<string, unknown>,
  };

  return [textMessage(`🎧 為你找到幾首「${query}」,點卡片就能到 Apple Music 試聽:`), carousel];
}
