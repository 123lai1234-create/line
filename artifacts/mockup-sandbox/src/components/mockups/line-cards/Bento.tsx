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
    icon: <CloudRain size={22} />,
    title: "潛水海況",
    desc: "6 大潛點 · 未來 5 天浪高風速",
    accent: "#0EA5E9",
    bg: "#E0F2FE",
  },
  {
    icon: <TrendingUp size={22} />,
    title: "股票走勢",
    desc: "台股即時報價 · 一個月走勢圖",
    accent: "#DC2626",
    bg: "#FEE2E2",
  },
];

const CREATIONS: Svc[] = [
  {
    icon: <Music size={22} />,
    title: "音樂欣賞",
    desc: "創作 MV 精選輪播",
    accent: "#7C3AED",
    bg: "#EDE9FE",
  },
  {
    icon: <Dna size={22} />,
    title: "蛋白質設計",
    desc: "AI 流程導覽 + 序列分析",
    accent: "#059669",
    bg: "#D1FAE5",
  },
  {
    icon: <FolderKanban size={22} />,
    title: "專案介紹",
    desc: "生醫 AI、量化研究作品",
    accent: "#D97706",
    bg: "#FEF3C7",
  },
];

export function Bento() {
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
              <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden border border-slate-100 w-full">
                <div className="p-4 pb-2">
                  <div className="text-[11px] font-bold tracking-widest text-slate-400 mb-2 uppercase">
                    Main Menu
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">
                    你好,我是作品集小幫手
                  </h3>
                  <p className="text-sm text-slate-500 mb-4">選一個分類,或直接輸入指令。</p>

                  <div className="space-y-4">
                    {/* Tools Section */}
                    <div>
                      <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        即時工具
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {LIVE_TOOLS.map((svc) => (
                          <BentoTile key={svc.title} svc={svc} />
                        ))}
                      </div>
                    </div>

                    {/* Creations Section */}
                    <div>
                      <div className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                        創作作品
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Make the first creation a full-width feature tile */}
                        <BentoTile 
                          svc={CREATIONS[0]} 
                          className="col-span-2 flex-row items-center gap-3" 
                          iconClassName="mb-0 bg-white/50 w-12 h-12"
                        />
                        <BentoTile svc={CREATIONS[1]} />
                        <BentoTile svc={CREATIONS[2]} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer link row */}
                <div className="mt-4 bg-slate-50 border-t border-slate-100 grid grid-cols-2 divide-x divide-slate-200">
                  <FooterLink icon={<ExternalLink size={13} />} label="前往網站" />
                  <FooterLink icon={<Info size={13} />} label="關於我" />
                </div>
              </div>
              <Time />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BentoTile({ 
  svc, 
  className = "flex-col", 
  iconClassName = "mb-2 bg-white/50 w-10 h-10" 
}: { 
  svc: Svc; 
  className?: string;
  iconClassName?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-3 cursor-pointer hover:opacity-90 transition-opacity flex ${className}`}
      style={{ backgroundColor: svc.bg }}
    >
      <div
        className={`rounded-xl flex items-center justify-center shrink-0 ${iconClassName}`}
        style={{ color: svc.accent }}
      >
        {svc.icon}
      </div>
      <div className="flex-1">
        <div 
          className="text-[15px] font-bold mb-0.5"
          style={{ color: svc.accent }}
        >
          {svc.title}
        </div>
        <div className="text-[11px] font-medium text-slate-600/80 leading-snug">
          {svc.desc}
        </div>
      </div>
    </div>
  );
}

function FooterLink({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center justify-center gap-1.5 py-3 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer">
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
