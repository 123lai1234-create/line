import { linkButton, type LineMessage } from "./flex";

const MUSIC_URL = "https://dontalk.vercel.app/music";

function musicCard(): LineMessage {
  return {
    type: "flex",
    altText: "🎧 我的音樂平台 — 點開來聽聽看",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#DB2777",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🎧 我的音樂", color: "#FFFFFF", weight: "bold", size: "xl" },
          { type: "text", text: "原創與精選音樂平台", color: "#FCE7F3", size: "sm", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "這是我自己的音樂平台,收錄我創作與精選的作品。點下面按鈕就能直接前往聆聽 🎶",
            wrap: true,
            size: "sm",
            color: "#334155",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [linkButton("前往音樂平台", MUSIC_URL, "#DB2777")],
      },
    },
  };
}

export function musicMenu(): LineMessage[] {
  return [musicCard()];
}
