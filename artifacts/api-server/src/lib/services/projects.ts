import { linkButton, textMessage, type LineMessage, type QuickItem } from "./flex";

interface Project {
  key: string;
  emoji: string;
  name: string;
  desc: string;
  path: string;
}

const PROJECTS: Project[] = [
  {
    key: "蛋白質",
    emoji: "🧬",
    name: "蛋白質 AI 設計系統",
    desc: "端到端 Pipeline:ESM-2 嵌入、Bayesian Optimization、ProteinMPNN 序列設計、REINFORCE RL 微調。",
    path: "/report",
  },
  {
    key: "基因",
    emoji: "🔬",
    name: "基因 AI 分析平台",
    desc: "序列資料庫、RAG 文件搜尋、啟動子設計、CRISPR 導引排序、變異效應評估一站整合。",
    path: "/gene-ai",
  },
  {
    key: "ngs",
    emoji: "📊",
    name: "NGS 次世代定序工作站",
    desc: "實驗設計計算器、定序深度估算、QC 到功能分析的完整結果圖表集。",
    path: "/ngs",
  },
  {
    key: "互動",
    emoji: "🧪",
    name: "ProteinMPNN 互動工作台",
    desc: "直接操作序列設計、3D 結構預覽、突變著色與 Rosetta 簡化評分。",
    path: "/protein-mpnn",
  },
  {
    key: "量化",
    emoji: "📈",
    name: "遺傳演算法量化研究",
    desc: "以 48 檔 ETF50 股票池重建 PPTS × GAPPTS,族群演化視覺化與逐檔回測比較。",
    path: "/thesis",
  },
];

function projectItems(): QuickItem[] {
  return PROJECTS.map((p) => ({ label: `${p.emoji} ${p.name}`.slice(0, 20), text: `專案 ${p.key}` }));
}

function baseUrl(website: string): string {
  return website.replace(/\/$/, "");
}

export function projectsMenu(): LineMessage[] {
  return [
    textMessage(
      "🧬 專案介紹\n想深入了解哪個作品?點下面按鈕看介紹與連結。",
      projectItems(),
    ),
  ];
}

export function projectResult(input: string, website: string): LineMessage[] {
  const cleaned = input.replace(/專案介紹|專案|作品/g, "").trim().toLowerCase();
  const project = PROJECTS.find(
    (p) => cleaned.includes(p.key.toLowerCase()) || input.toLowerCase().includes(p.key.toLowerCase()),
  );
  if (!project) return projectsMenu();

  const url = `${baseUrl(website)}${project.path}`;
  const bubble: LineMessage = {
    type: "flex",
    altText: `${project.name}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0F172A",
        paddingAll: "16px",
        contents: [
          { type: "text", text: `${project.emoji} 專案介紹`, color: "#34D399", size: "sm", weight: "bold" },
          { type: "text", text: project.name, color: "#FFFFFF", size: "lg", weight: "bold", wrap: true },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: [{ type: "text", text: project.desc, size: "sm", color: "#334155", wrap: true }],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [linkButton("看完整內容 →", url, "#10B981")],
      },
    },
    quickReply: textMessage("", projectItems()).quickReply as Record<string, unknown>,
  };

  return [bubble];
}
