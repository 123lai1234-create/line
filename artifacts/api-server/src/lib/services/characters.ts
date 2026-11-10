// characters.ts — LINE 人偶卡片:五隻 3D 角色的 Flex 輪播 + 單隻介紹。
//
// 圖片是網站上公開的渲染圖(跟 3D 頁、右下角浮動人偶同一批角色):
//   https://donttalk.vercel.app/images/characters/<id>.png
// 四隻新角色用建模驗證時的 Blender 同棚渲染(800x800);柯基用同一棚重渲的 v4 完整版。
// 圖片放 ddd repo 的 astro/public/images/characters/,由網站部署提供公開連結。
import { type LineMessage } from "./flex";

export interface Character {
  id: string;
  name: string;
  emoji: string;
  tagline: string;
  desc: string;
  stats: string;
}

const CHARACTERS: Character[] = [
  {
    id: "corgi",
    name: "香菇柯基",
    emoji: "🍄",
    tagline: "網站吉祥物，戴菇帽的柯基",
    desc: "網站的招牌吉祥物。棕色菇帽、白色身體，吐著舌頭、右前爪舉起，3D 頁和右下角浮動人偶都是牠。",
    stats: "TRELLIS.2 · 131 K 三角面 · 3.6 MB",
  },
  {
    id: "robot",
    name: "綠機器人",
    emoji: "🤖",
    tagline: "軍綠裝甲，單顆青藍大眼",
    desc: "軍綠裝甲機器人。單顆青藍大眼、胸口三條通風口、黑色關節，站得直挺挺。",
    stats: "Blender 程序化 · 186 K 三角面 · 0.6 MB",
  },
  {
    id: "philosopher",
    name: "哲學家",
    emoji: "🧙",
    tagline: "白髮白鬍，月桂冠老者",
    desc: "白髮白鬍的老哲學家。白袍藍腰帶、頭戴月桂冠，左手持卷軸、右手持法杖。",
    stats: "Blender 程序化 · 147 K 三角面 · 0.6 MB",
  },
  {
    id: "cat",
    name: "黑貓",
    emoji: "🐈⬛",
    tagline: "黃眼粉鼻，雙臂交叉",
    desc: "黑貓。黃色直瞳眼睛、粉紅鼻子、白色鬍鬚，雙臂交叉、尾巴在身後。",
    stats: "Blender 程序化 · 49.6 K 三角面 · 0.2 MB",
  },
  {
    id: "crystal",
    name: "水晶怪",
    emoji: "💎",
    tagline: "淺藍多面體小怪",
    desc: "淺藍多面體小怪。黑色圓眼睛、微笑小嘴，有手臂和雙腿，五隻裡最小、最輕的一隻。",
    stats: "Blender 程序化 · 3.3 K 三角面 · 39 KB",
  },
];

function charImageUrl(websiteUrl: string, id: string): string {
  const base = (websiteUrl || "https://donttalk.vercel.app").replace(/\/$/, "");
  return `${base}/images/characters/${id}.png`;
}

// 單隻輪播卡:大圖 hero + 名字 + 一句話,點圖或按鈕都進介紹。
function charBubble(c: Character, websiteUrl: string): LineMessage {
  const detail: Record<string, unknown> = {
    type: "postback",
    label: c.name,
    data: `s=char&id=${c.id}`,
    displayText: `看${c.name}的介紹`,
  };
  return {
    type: "bubble",
    size: "kilo",
    hero: {
      type: "image",
      url: charImageUrl(websiteUrl, c.id),
      size: "full",
      aspectRatio: "1:1",
      aspectMode: "cover",
      action: detail,
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "18px",
      spacing: "none",
      contents: [
        { type: "text", text: `${c.emoji} ${c.name}`, size: "lg", weight: "bold", color: "#0F172A", wrap: true },
        { type: "text", text: c.tagline, size: "xs", color: "#64748B", wrap: true, margin: "sm" },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      paddingTop: "0px",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0F172A",
          action: { ...detail, label: "看介紹" },
        },
      ],
    },
  };
}

// 五隻輪播:左右滑著看,點一隻進介紹。
export function charactersCarousel(websiteUrl: string): LineMessage[] {
  return [
    {
      type: "flex",
      altText: "人偶・五隻 3D 角色",
      contents: { type: "carousel", contents: CHARACTERS.map((c) => charBubble(c, websiteUrl)) },
    },
  ];
}

// 單隻介紹卡:大圖 + 介紹 + 數據,底部回輪播 / 去網站看 3D。
export function characterDetail(id: string, websiteUrl: string): LineMessage[] {
  const c = CHARACTERS.find((x) => x.id === id);
  if (!c) return charactersCarousel(websiteUrl);
  const bubble: LineMessage = {
    type: "bubble",
    size: "mega",
    hero: {
      type: "image",
      url: charImageUrl(websiteUrl, c.id),
      size: "full",
      aspectRatio: "1:1",
      aspectMode: "cover",
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "20px",
      spacing: "none",
      contents: [
        { type: "text", text: "CHARACTERS", size: "xs", weight: "bold", color: "#94A3B8" },
        { type: "text", text: `${c.emoji} ${c.name}`, size: "xl", weight: "bold", color: "#0F172A", margin: "md", wrap: true },
        { type: "text", text: c.desc, size: "sm", color: "#64748B", margin: "sm", wrap: true },
        { type: "text", text: c.stats, size: "xxs", color: "#94A3B8", margin: "md", wrap: true },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "12px",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          color: "#0F172A",
          action: { type: "postback", label: "看其他人偶", data: "s=char", displayText: "看其他人偶" },
        },
        {
          type: "button",
          style: "link",
          action: { type: "uri", label: "去網站看 3D", uri: "https://donttalk.vercel.app/3d-mascot" },
        },
      ],
    },
  };
  return [
    {
      type: "flex",
      altText: `${c.emoji} ${c.name}・人偶介紹`,
      contents: bubble,
    },
  ];
}
