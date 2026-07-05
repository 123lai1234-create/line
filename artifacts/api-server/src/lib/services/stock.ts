import { linkButton, type LineMessage } from "./flex";

const STOCK_URL = "https://donttalk.vercel.app/stock";

function stockCard(): LineMessage {
  return {
    type: "flex",
    altText: "📈 股票快報 — 前往我的股票平台查詢",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1E293B",
        paddingAll: "20px",
        contents: [
          { type: "text", text: "📈 股票快報", color: "#FFFFFF", weight: "bold", size: "xl" },
          { type: "text", text: "我的股票資訊平台", color: "#94A3B8", size: "sm", margin: "sm" },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "這裡可以查即時股價、漲跌與更多市場數據。點下面按鈕就能前往查詢 💹",
            wrap: true,
            size: "sm",
            color: "#334155",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [linkButton("前往股票平台", STOCK_URL, "#1E293B")],
      },
    },
  };
}

export function stockMenu(): LineMessage[] {
  return [stockCard()];
}
