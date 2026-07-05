import React from "react";
import {
  CloudRain,
  TrendingUp,
  Music,
  Dna,
  FolderKanban,
  Bot,
  ExternalLink,
  Info,
  ChevronRight,
  Sparkles
} from "lucide-react";

type Svc = {
  icon: React.ReactNode;
  title: string;
  desc: string;
  accent: string;
  bg: string;
};

const LIVE_TOOLS: Svc[] = [
  {
    icon: <CloudRain size={18} />,
    title: "潛水海況",
    desc: "6 大潛點 · 未來 5 天浪高風速",
    accent: "#0EA5E9",
    bg: "#E0F2FE",
  },
  {
    icon: <TrendingUp size={18} />,
    title: "股票走勢",
    desc: "台股即時報價 · 一個月走勢圖",
    accent: "#DC2626",
    bg: "#FEE2E2",
  },
];

const CREATIONS: Svc[] = [
  {
    icon: <Music size={18} />,
    title: "音樂欣賞",
    desc: "創作 MV 精選輪播",
    accent: "#7C3AED",
    bg: "#EDE9FE",
  },
  {
    icon: <Dna size={18} />,
    title: "蛋白質設計",
    desc: "AI 流程導覽 + 序列分析",
    accent: "#059669",
    bg: "#D1FAE5",
  },
  {
    icon: <FolderKanban size={18} />,
    title: "專案介紹",
    desc: "生醫 AI、量化研究作品",
    accent: "#D97706",
    bg: "#FEF3C7",
  },
];

export function Hero() {
  return (
    <div className="min-h-screen bg-[#F1F3F5] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl bg-[#abc1d1] relative border border-slate-200/50">
        {/* LINE Header (mock) */}
        <div className="bg-slate-900 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
            <Bot className="w-4 h-4 text-slate-300" />
          </div>
          <div className="font-semibold text-white tracking-wide">作品集小幫手</div>
        </div>

        {/* Chat Area */}
        <div className="p-4 space-y-6">
          <div className="flex gap-2">
            <Avatar />
            <div className="flex items-end gap-2 max-w-[92%] w-full">
              <MenuCard />
              <Time />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuCard() {
  return (
    <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden border border-slate-100 w-full flex flex-col">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 opacity-10">
          <Sparkles size={100} />
        </div>
        <div className="relative z-10">
          <div className="inline-block bg-white/20 backdrop-blur-md rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase mb-3 border border-white/20">
            Main Menu
          </div>
          <h3 className="text-xl font-bold mb-1 shadow-sm">你好,我是作品集小幫手</h3>
          <p className="text-sm text-indigo-50 font-medium">選一個分類,或直接輸入指令。</p>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-5">
        {/* Category: 即時工具 */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">即時工具</div>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>
          <div className="flex flex-col gap-1.5">
            {LIVE_TOOLS.map((s) => (
              <ServiceRow key={s.title} svc={s} />
            ))}
          </div>
        </div>

        {/* Category: 創作作品 */}
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">創作作品</div>
            <div className="h-px bg-slate-100 flex-1"></div>
          </div>
          <div className="flex flex-col gap-1.5">
            {CREATIONS.map((s) => (
              <ServiceRow key={s.title} svc={s} />
            ))}
          </div>
        </div>
      </div>

      {/* Footer link row */}
      <div className="bg-slate-50 border-t border-slate-100 grid grid-cols-2 divide-x divide-slate-200 mt-auto">
        <FooterLink icon={<ExternalLink size={13} />} label="前往網站" />
        <FooterLink icon={<Info size={13} />} label="關於我" />
      </div>
    </div>
  );
}

function ServiceRow({ svc }: { svc: Svc }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer group border border-transparent hover:border-slate-100">
      <div
        className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center"
        style={{ backgroundColor: svc.bg, color: svc.accent }}
      >
        {svc.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-slate-800 mb-0.5">{svc.title}</div>
        <div className="text-[11px] text-slate-500 truncate">{svc.desc}</div>
      </div>
      <ChevronRight size={16} className="text-slate-300 group-hover:text-slate-400 transition-colors shrink-0" />
    </div>
  );
}

function FooterLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-3.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer">
      {icon}
      {label}
    </div>
  );
}

function Avatar() {
  return (
    <div className="w-8 h-8 shrink-0 rounded-full bg-slate-900 flex items-center justify-center shadow-sm">
      <Bot className="w-4 h-4 text-slate-100" />
    </div>
  );
}

function Time() {
  return (
    <div className="text-[10px] text-slate-500/80 shrink-0 mb-1 font-medium">10:42</div>
  );
}
