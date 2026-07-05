import { linkButton, type LineMessage } from "./flex";

const MUSIC_URL = "https://dontalk.vercel.app/music";

function musicCard(): LineMessage {
  return {
    type: "flex",
    altText: "🎧 我發表作品的地方 — 點開來看看",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#DB2777",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🎧 我發表作品的地方", color: "#FFFFFF", weight: "bold", size: "lg" },
          { type: "text", text: "我的音樂與創作平台", color: "#FCE7F3", size: "sm", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "這裡是我發表作品的地方,收錄我的音樂與創作。點下面按鈕就能前往看看、聽聽 🎶",
            wrap: true,
            size: "sm",
            color: "#334155",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [linkButton("前往作品平台", MUSIC_URL, "#DB2777")],
      },
    },
  };
}

export function musicMenu(): LineMessage[] {
  return [musicCard()];
}
