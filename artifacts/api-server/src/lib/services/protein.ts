import { pill, quickReply, subtleLink, type LineMessage, type QuickItem } from "./flex";

const TOOL_URL = "https://donttalk.vercel.app/protein-mpnn";

// —————————————————————————————————————————————
// 導覽:一步步介紹蛋白質 AI 設計專案的 pipeline
// —————————————————————————————————————————————
interface Step {
  title: string;
  desc: string;
}

const STEPS: Step[] = [
  {
    title: "這個專案在做什麼?",
    desc: "用 AI 幫蛋白質「設計胺基酸序列」——給定想要的 3D 結構或功能,反推出最合適的序列,讓蛋白質更穩定、更好用。",
  },
  {
    title: "① ESM-2 語言模型",
    desc: "把蛋白質序列當成一種語言,用大型模型轉成 AI 看得懂的向量,理解序列背後的「語意」與規律。",
  },
  {
    title: "② 貝式最佳化",
    desc: "序列空間大到天文數字。Bayesian Optimization 讓我們用最少的嘗試,有效率地找到最有潛力的候選序列。",
  },
  {
    title: "③ ProteinMPNN",
    desc: "給定蛋白質的 3D 骨架,反推每個位置該放哪個胺基酸(inverse folding),產生高品質的設計序列。",
  },
  {
    title: "④ 強化學習微調",
    desc: "用 REINFORCE 把設計結果的回饋分數變成獎勵,持續優化策略,讓模型愈設計愈好。",
  },
];

function guideChips(step: number): QuickItem[] {
  const items: QuickItem[] = [];
  if (step < STEPS.length) {
    items.push({ label: "下一步 ›", data: `s=pro&step=${step + 1}`, displayText: "下一步" });
  }
  if (step > 1) {
    items.push({ label: "‹ 上一步", data: `s=pro&step=${step - 1}`, displayText: "上一步" });
  }
  items.push({ label: "🧪 分析序列", data: "s=pro&act=howto", displayText: "怎麼分析序列?" });
  return items;
}

export function proteinGuide(step = 1): LineMessage[] {
  const idx = Math.max(1, Math.min(STEPS.length, step));
  const s = STEPS[idx - 1];

  const card: LineMessage = {
    type: "flex",
    altText: `蛋白質設計・${s.title}`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "none",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            alignItems: "center",
            contents: [
              { type: "text", text: "PROTEIN DESIGN", size: "xs", weight: "bold", color: "#94A3B8", flex: 0 },
              { type: "filler" },
              { type: "text", text: `${idx} / ${STEPS.length}`, size: "xxs", color: "#CBD5E1", align: "end" },
            ],
          },
          { type: "text", text: s.title, size: "lg", weight: "bold", color: "#0F172A", margin: "md", wrap: true },
          { type: "text", text: s.desc, size: "sm", color: "#475569", margin: "md", wrap: true },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            cornerRadius: "10px",
            paddingAll: "12px",
            margin: "lg",
            contents: [
              {
                type: "text",
                text: "想試試看?直接把一段胺基酸序列(像 MKTAYIAKQR…)貼給我,我幫你分析它的物化性質。",
                size: "xs",
                color: "#64748B",
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        paddingTop: "0px",
        contents: [subtleLink("打開互動工作台", TOOL_URL)],
      },
    },
    quickReply: quickReply(guideChips(idx)),
  };
  return [card];
}

export function proteinHowto(): LineMessage[] {
  return [
    {
      type: "flex",
      altText: "怎麼分析蛋白質序列",
      contents: {
        type: "bubble",
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "20px",
          spacing: "none",
          contents: [
            { type: "text", text: "SEQUENCE ANALYSIS", size: "xs", weight: "bold", color: "#94A3B8" },
            { type: "text", text: "貼上序列即可分析", size: "lg", weight: "bold", color: "#0F172A", margin: "md" },
            {
              type: "text",
              text: "把一段胺基酸序列(單字母代碼,例如 MKTAYIAKQRQISFVK)直接傳給我,我會即時算出:長度、分子量、等電點 pI、平均親水性,以及胺基酸組成。",
              size: "sm",
              color: "#475569",
              margin: "md",
              wrap: true,
            },
            {
              type: "text",
              text: "註:這是序列的「物化性質分析」(真實計算);真正的序列「設計」請用互動工作台。",
              size: "xxs",
              color: "#CBD5E1",
              margin: "lg",
              wrap: true,
            },
          ],
        },
        footer: {
          type: "box",
          layout: "vertical",
          paddingAll: "12px",
          paddingTop: "0px",
          contents: [subtleLink("打開互動工作台", TOOL_URL)],
        },
      },
      quickReply: quickReply([
        { label: "← 回導覽", data: "s=pro&step=1", displayText: "蛋白質設計導覽" },
        { label: "看完整報告", text: "專案 蛋白質" },
      ]),
    },
  ];
}

// —————————————————————————————————————————————
// 序列分析(真實計算,無需外部 API)
// —————————————————————————————————————————————
const AA = "ACDEFGHIKLMNPQRSTVWY";

// 平均殘基質量(peptide 內,已扣水)
const RES_MASS: Record<string, number> = {
  A: 71.0788, R: 156.1875, N: 114.1038, D: 115.0886, C: 103.1388, E: 129.1155,
  Q: 128.1307, G: 57.0519, H: 137.1411, I: 113.1594, L: 113.1594, K: 128.1741,
  M: 131.1926, F: 147.1766, P: 97.1167, S: 87.0782, T: 101.1051, W: 186.2132,
  Y: 163.176, V: 99.1326,
};
const WATER = 18.01524;

// Kyte-Doolittle 親水性指數
const KD: Record<string, number> = {
  A: 1.8, R: -4.5, N: -3.5, D: -3.5, C: 2.5, E: -3.5, Q: -3.5, G: -0.4, H: -3.2,
  I: 4.5, L: 3.8, K: -3.9, M: 1.9, F: 2.8, P: -1.6, S: -0.8, T: -0.7, W: -0.9,
  Y: -1.3, V: 4.2,
};

const HYDROPHOBIC = new Set(["A", "V", "L", "I", "M", "F", "W", "P"]);
const POSITIVE = new Set(["K", "R", "H"]);
const NEGATIVE = new Set(["D", "E"]);

export function looksLikeProteinSeq(text: string): boolean {
  const s = text.toUpperCase().replace(/\s/g, "");
  return new RegExp(`^[${AA}]{12,}$`).test(s);
}

function pI(counts: Record<string, number>): number {
  const pKa = { nterm: 9.69, cterm: 2.34, C: 8.3, D: 3.9, E: 4.07, H: 6.04, K: 10.5, R: 12.48, Y: 10.46 };
  const pos = (pH: number, pk: number, n: number) => (n * 1) / (1 + Math.pow(10, pH - pk));
  const neg = (pH: number, pk: number, n: number) => (n * 1) / (1 + Math.pow(10, pk - pH));
  const charge = (pH: number) =>
    pos(pH, pKa.nterm, 1) +
    pos(pH, pKa.K, counts.K ?? 0) +
    pos(pH, pKa.R, counts.R ?? 0) +
    pos(pH, pKa.H, counts.H ?? 0) -
    neg(pH, pKa.cterm, 1) -
    neg(pH, pKa.D, counts.D ?? 0) -
    neg(pH, pKa.E, counts.E ?? 0) -
    neg(pH, pKa.C, counts.C ?? 0) -
    neg(pH, pKa.Y, counts.Y ?? 0);

  let lo = 0;
  let hi = 14;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (charge(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function compBar(label: string, pct: number, color: string): LineMessage {
  const w = Math.max(2, Math.min(100, Math.round(pct)));
  return {
    type: "box",
    layout: "horizontal",
    alignItems: "center",
    paddingTop: "6px",
    paddingBottom: "6px",
    contents: [
      { type: "text", text: label, size: "xs", color: "#64748B", flex: 0, gravity: "center" },
      {
        type: "box",
        layout: "vertical",
        flex: 1,
        height: "8px",
        backgroundColor: "#F1F5F9",
        cornerRadius: "4px",
        margin: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            width: `${w}%`,
            height: "8px",
            backgroundColor: color,
            cornerRadius: "4px",
            contents: [{ type: "filler" }],
          },
        ],
      },
      {
        type: "text",
        text: `${pct.toFixed(0)}%`,
        size: "xs",
        weight: "bold",
        color: "#334155",
        flex: 0,
        align: "end",
        gravity: "center",
        margin: "md",
      },
    ],
  };
}

function metricRow(label: string, value: string): LineMessage {
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
        flex: 5,
      },
    ],
  };
}

export function proteinAnalyze(input: string): LineMessage[] {
  const seq = input.toUpperCase().replace(/[^A-Z]/g, "");
  const valid = seq.split("").filter((c) => AA.includes(c));
  const len = valid.length;
  if (len < 12) return proteinHowto();

  const counts: Record<string, number> = {};
  let mass = WATER;
  let kdSum = 0;
  let nHydro = 0;
  let nPos = 0;
  let nNeg = 0;
  for (const c of valid) {
    counts[c] = (counts[c] ?? 0) + 1;
    mass += RES_MASS[c];
    kdSum += KD[c];
    if (HYDROPHOBIC.has(c)) nHydro++;
    if (POSITIVE.has(c)) nPos++;
    if (NEGATIVE.has(c)) nNeg++;
  }
  const gravy = kdSum / len;
  const kda = mass / 1000;
  const iso = pI(counts);
  const pctHydro = (nHydro / len) * 100;
  const pctPos = (nPos / len) * 100;
  const pctNeg = (nNeg / len) * 100;

  const gravyLabel = gravy > 0 ? "偏疏水" : "偏親水";
  const gravyPill = gravy > 0 ? pill(gravyLabel, "#FFF7ED", "#C2410C") : pill(gravyLabel, "#EFF6FF", "#1D4ED8");

  const card: LineMessage = {
    type: "flex",
    altText: `序列分析・${len} 個胺基酸`,
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "20px",
        spacing: "none",
        contents: [
          { type: "text", text: "SEQUENCE ANALYSIS", size: "xs", weight: "bold", color: "#94A3B8" },
          { type: "text", text: "序列分析結果", size: "lg", weight: "bold", color: "#0F172A", margin: "md" },
          { type: "separator", margin: "lg", color: "#F1F5F9" },
          {
            type: "box",
            layout: "vertical",
            margin: "sm",
            spacing: "none",
            contents: [
              metricRow("長度", `${len} aa`),
              { type: "separator", color: "#F1F5F9" },
              metricRow("分子量", `${kda.toFixed(2)} kDa`),
              { type: "separator", color: "#F1F5F9" },
              metricRow("等電點 pI", iso.toFixed(2)),
              { type: "separator", color: "#F1F5F9" },
              {
                type: "box",
                layout: "horizontal",
                alignItems: "center",
                paddingTop: "10px",
                paddingBottom: "10px",
                contents: [
                  { type: "text", text: "平均親水性", size: "sm", color: "#64748B", flex: 3, gravity: "center" },
                  {
                    type: "text",
                    text: gravy.toFixed(2),
                    size: "sm",
                    weight: "bold",
                    color: "#1E293B",
                    align: "end",
                    gravity: "center",
                    flex: 3,
                  },
                  { type: "box", layout: "vertical", flex: 0, justifyContent: "center", paddingStart: "10px", contents: [gravyPill] },
                ],
              },
            ],
          },
          { type: "separator", margin: "lg", color: "#F1F5F9" },
          { type: "text", text: "胺基酸組成", size: "xs", weight: "bold", color: "#94A3B8", margin: "lg" },
          {
            type: "box",
            layout: "vertical",
            margin: "sm",
            contents: [
              compBar("疏水", pctHydro, "#0EA5E9"),
              compBar("帶正電", pctPos, "#DC2626"),
              compBar("帶負電", pctNeg, "#16A34A"),
            ],
          },
          {
            type: "text",
            text: "以上為序列的物化性質(真實計算)。想做序列「設計」請用互動工作台。",
            size: "xxs",
            color: "#CBD5E1",
            margin: "lg",
            wrap: true,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "12px",
        paddingTop: "0px",
        contents: [subtleLink("打開互動工作台", TOOL_URL)],
      },
    },
    quickReply: quickReply([
      { label: "← 回導覽", data: "s=pro&step=1", displayText: "蛋白質設計導覽" },
      { label: "看完整報告", text: "專案 蛋白質" },
    ]),
  };
  return [card];
}

