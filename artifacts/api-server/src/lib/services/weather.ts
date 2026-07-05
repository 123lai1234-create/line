import { linkButton, type LineMessage } from "./flex";

const DIVING_URL = "https://donttalk.vercel.app/diving";

function weatherCard(): LineMessage {
  return {
    type: "flex",
    altText: "🤿 潛水天氣 — 前往我的潛水平台查詢",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0EA5E9",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "🤿 潛水天氣", color: "#FFFFFF", weight: "bold", size: "xl" },
          { type: "text", text: "我的潛水資訊平台", color: "#E0F2FE", size: "sm", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "這裡可以查各潛點的即時海況與天氣,還能看到更多潛水相關數據。點下面按鈕就能前往查詢 🌊",
            wrap: true,
            size: "sm",
            color: "#334155",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [linkButton("前往潛水平台", DIVING_URL, "#0EA5E9")],
      },
    },
  };
}

export function weatherMenu(): LineMessage[] {
  return [weatherCard()];
}
