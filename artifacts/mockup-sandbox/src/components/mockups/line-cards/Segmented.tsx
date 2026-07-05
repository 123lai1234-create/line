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
    icon: <CloudRain size={20} />,
    title: "潛水海況",
    desc: "6 大潛點 · 未來 5 天浪高風速",
    accent: "#0EA5E9",
    bg: "#E0F2FE",
  },
  {
    icon: <TrendingUp size={20} />,
    title: "股票走勢",
    desc: "台股即時報價 · 一個月走勢圖",
    accent: "#DC2626",
    bg: "#FEE2E2",
  },
];

const CREATIONS: Svc[] = [
  {
    icon: <Music size={20} />,
    title: "音樂欣賞",
    desc: "創作 MV 精選輪播",
    accent: "#7C3AED",
    bg: "#EDE9FE",
  },
  {
    icon: <Dna size={20} />,
    title: "蛋白質設計",
    desc: "AI 流程導覽 + 序列分析",
    accent: "#059669",
    bg: "#D1FAE5",
  },
  {
    icon: <FolderKanban size={20} />,
    title: "專案介紹",
    desc: "生醫 AI、量化研究作品",
    accent: "#D97706",
    bg: "#FEF3C7",
  },
];

export function Segmented() {
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
          {/* Card A — 即時工具 tab active */}
          <div className="flex gap-2">
            <Avatar />
            <div className="flex items-end gap-2 max-w-[92%] w-full">
              <MenuCard active="live" />
              <Time />
            </div>
          </div>

          {/* Card B — 創作作品 tab active (shows what happens after tapping the other tab) */}
          <div className="flex gap-2">
            <Avatar />
            <div className="flex items-end gap-2 max-w-[92%] w-full">
              <MenuCard active="creations" />
              <Time />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuCard({ active }: { active: "live" | "creations" }) {
  const isLive = active === "live";
  const services = isLive ? LIVE_TOOLS : CREATIONS;

  return (
    <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden border border-slate-100 w-full">
      <div className="pt-6 px-5 pb-2">
        <h3 className="text-[17px] font-bold text-slate-900 mb-1.5 leading-tight">
          你好,我是作品集小幫手
        </h3>
        <p className="text-[14px] text-slate-500 mb-6">選一個分類,或直接輸入指令。</p>

        {/* Segmented Tabs (Underline) */}
        <div className="flex border-b border-slate-100 mb-2">
          <Tab label="即時工具" active={isLive} />
          <Tab label="創作作品" active={!isLive} />
        </div>
      </div>

      {/* Service List */}
      <div className="flex flex-col pb-2">
        {services.map((s, i) => (
          <ServiceRow key={s.title} svc={s} isLast={i === services.length - 1} />
        ))}
      </div>

      {/* Footer link row */}
      <div className="bg-slate-50/80 border-t border-slate-100 grid grid-cols-2 divide-x divide-slate-100">
        <FooterLink icon={<ExternalLink size={14} />} label="前往網站" />
        <FooterLink icon={<Info size={14} />} label="關於我" />
      </div>
    </div>
  );
}

function Tab({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={`flex-1 pb-3 text-center text-[15px] font-bold cursor-pointer transition-colors relative ${
        active ? "text-slate-900" : "text-slate-400 hover:text-slate-600"
      }`}
    >
      {label}
      {active && (
        <div className="absolute bottom-0 left-0 w-full h-[3px] bg-slate-900 rounded-t-full" />
      )}
    </div>
  );
}

function ServiceRow({ svc, isLast }: { svc: Svc; isLast: boolean }) {
  return (
    <div
      className={`flex items-center px-5 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group ${
        isLast ? "" : "border-b border-slate-50"
      }`}
    >
      <div
        className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 mr-3.5 transition-transform group-hover:scale-105"
        style={{ backgroundColor: svc.bg, color: svc.accent }}
      >
        {svc.icon}
      </div>
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-[15px] font-bold text-slate-800 truncate leading-tight mb-1">
          {svc.title}
        </div>
        <div className="text-[13px] text-slate-500 truncate leading-tight">
          {svc.desc}
        </div>
      </div>
      <ChevronRight
        size={18}
        className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0"
      />
    </div>
  );
}

function FooterLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-3.5 text-[13px] font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer">
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
