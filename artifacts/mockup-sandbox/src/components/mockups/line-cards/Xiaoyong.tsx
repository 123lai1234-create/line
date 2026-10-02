import React from "react";
import {
  CloudRain,
  TrendingUp,
  Music,
  Dna,
  FolderKanban,
  Globe,
  Info,
  ChevronRight,
  Sparkles,
} from "lucide-react";

/**
 * Xiaoyong (小詠機器人風格) — Refined bank-style 的姊妹 colorway。
 *
 * 借鑑台股 LINE bot「小詠機器人」的視覺語言:
 *   - 深色對話背景 (#0d1117) + 深綠灰面板 (#163524)
 *   - 綠色 CTA (#2E7D5B) — 取代 Refined 的 slate-50 subtle link
 *   - 機器人 IP 圓形頭像 (從 /bot-ip.png 載入)
 *   - 4 列按鈕 (主要功能白底黑字) + 底部「綠底 CTA + 灰底 secondary」雙按鈕
 *
 * 對齊小詠 LINE bot 的設計:
 *   - 3 欄 carousel (公司公告 / ETF / 總經),本變體保留 bot 自身的 5 服務,
 *     但用 3 大分類(工具 / 創作 / 導覽)包裝
 *   - 主要功能按鈕:白底黑字 (像小詠機器人的「月營收評級」「ETF 持股排行」)
 *   - 次要按鈕:灰底白字 (像小詠機器人的「網頁」「回主選單」)
 *   - 綠底 CTA:重要行動 (像小詠機器人的「網站地圖」)
 *
 * 與 api-server/src/lib/services/flex.ts 的 XIAOYONG 常數對齊
 * (深色背景 + 綠色 CTA 配色 token)。
 */

const BOT_IP_SRC = "/bot-ip.png"; // 由 build-bot-ip.ts 生成

export function Xiaoyong() {
  return (
    <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl relative border border-[#1a2424]">
        {/* LINE Header (mock) — Xiaoyong 深色風 */}
        <div className="bg-[#0d1117] px-5 py-3 flex items-center gap-3 sticky top-0 z-10 border-b border-[#1a2424]">
          <div className="w-9 h-9 rounded-full overflow-hidden bg-[#163524] flex items-center justify-center">
            <img src={BOT_IP_SRC} alt="不說的助理 IP" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <div className="font-semibold text-white tracking-wide text-sm">不說的助理</div>
            <div className="text-[10px] text-[#94a3b8]">LINE 官方 AI · 隨時為你服務</div>
          </div>
          <div className="w-2 h-2 rounded-full bg-[#2E7D5B] shadow-[0_0_8px_2px_rgba(46,125,91,0.6)]" />
        </div>

        {/* Chat Area */}
        <div className="p-3 space-y-4 overflow-y-auto h-[820px] pb-24">
          {/* Message 1: Welcome + 主選單 */}
          <div className="flex gap-2">
            <IpBubbleAvatar />
            <div className="flex items-end gap-2 max-w-[88%] w-full">
              <WelcomeCard />
              <Time />
            </div>
          </div>

          {/* Message 2: 4 列按鈕 (小詠風格 — 工具) */}
          <div className="flex gap-2">
            <IpBubbleAvatar />
            <div className="flex items-end gap-2 max-w-[92%] w-full">
              <ToolsCard />
              <Time />
            </div>
          </div>

          {/* Message 3: 4 列按鈕 (小詠風格 — 創作) */}
          <div className="flex gap-2">
            <IpBubbleAvatar />
            <div className="flex items-end gap-2 max-w-[92%] w-full">
              <CreationsCard />
              <Time />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IpBubbleAvatar() {
  return (
    <div className="w-8 h-8 shrink-0 rounded-full overflow-hidden bg-[#163524] flex items-center justify-center shadow-sm">
      <img src={BOT_IP_SRC} alt="IP" className="w-full h-full object-cover" />
    </div>
  );
}

function Time() {
  return <div className="text-[10px] text-[#94a3b8]/80 shrink-0 mb-1 font-medium">10:42</div>;
}

function WelcomeCard() {
  return (
    <div className="bg-[#163524] rounded-2xl rounded-tl-sm w-full overflow-hidden border border-[#2E7D5B]/40 shadow-sm">
      {/* Header (深綠 + 機器人 IP) */}
      <div className="bg-[#0d2118] px-5 py-4 border-b border-[#2E7D5B]/30">
        <div className="flex items-center gap-3 mb-2">
          <img src={BOT_IP_SRC} alt="IP" className="w-8 h-8 rounded-full" />
          <div>
            <div className="text-xs font-bold tracking-widest text-[#2E7D5B] uppercase">Main Menu</div>
          </div>
        </div>
        <h3 className="text-base font-bold text-white mb-1">你好，我是「不說」</h3>
        <p className="text-xs text-[#94a3b8]">作品集 AI 小幫手 · 一行就能開始</p>
      </div>
      <div className="p-4 space-y-2">
        <div className="text-[11px] font-bold tracking-widest text-[#94a3b8] uppercase mb-2">指令</div>
        <CmdRow label="潛水海況 / 股票走勢" sub="即時資料" />
        <CmdRow label="音樂 / 蛋白質 / 專案" sub="創作與研究" />
        <CmdRow label="關於我" sub="自我介紹" />
        <CmdRow label="選單" sub="回主選單" />
      </div>
    </div>
  );
}

function CmdRow({ label, sub }: { label: string; sub: string }) {
  return (
    <div className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
      <div>
        <div className="text-sm font-semibold text-[#0d1117]">{label}</div>
        <div className="text-[10px] text-[#475569]">{sub}</div>
      </div>
      <ChevronRight size={14} className="text-[#94a3b8]" />
    </div>
  );
}

function ToolsCard() {
  const tiles = [
    { label: "潛水海況", sub: "6 大潛點 · 5 天浪高風速", icon: <CloudRain size={16} /> },
    { label: "股票走勢", sub: "台股即時報價 · 走勢圖", icon: <TrendingUp size={16} /> },
    { label: "蛋白質設計", sub: "AI 流程導覽 + 序列分析", icon: <Dna size={16} /> },
    { label: "完整選單", sub: "展開全部功能", icon: <Sparkles size={16} /> },
  ];
  return (
    <div className="bg-[#163524] rounded-2xl rounded-tl-sm w-full overflow-hidden border border-[#2E7D5B]/40 shadow-sm">
      <div className="px-5 py-3 border-b border-[#2E7D5B]/30 bg-[#0d2118]">
        <div className="text-[11px] font-bold tracking-widest text-[#2E7D5B] uppercase">即時工具</div>
      </div>
      <div className="p-2.5 space-y-1.5">
        {tiles.map((t) => (
          <WhiteTile key={t.label} icon={t.icon} label={t.label} sub={t.sub} />
        ))}
      </div>
      {/* Footer: 綠色 CTA + 灰色 secondary — 小詠機器人風格 */}
      <div className="bg-[#0d1117] p-2.5 grid grid-cols-2 gap-2 border-t border-[#1a2424]">
        <button className="bg-[#2E7D5B] hover:bg-[#26684c] text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-white transition-colors">
          <Globe size={12} />
          網站地圖
        </button>
        <button className="bg-[#475569] hover:bg-[#3a4759] text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 text-white transition-colors">
          <Info size={12} />
          回主選單
        </button>
      </div>
    </div>
  );
}

function CreationsCard() {
  const tiles = [
    { label: "音樂欣賞", sub: "創作 MV 精選輪播", icon: <Music size={16} /> },
    { label: "專案介紹", sub: "生醫 AI · 量化研究", icon: <FolderKanban size={16} /> },
    { label: "關於我", sub: "創作者介紹", icon: <Info size={16} /> },
    { label: "個人網站", sub: "donttalk.vercel.app", icon: <Globe size={16} /> },
  ];
  return (
    <div className="bg-[#163524] rounded-2xl rounded-tl-sm w-full overflow-hidden border border-[#2E7D5B]/40 shadow-sm">
      <div className="px-5 py-3 border-b border-[#2E7D5B]/30 bg-[#0d2118]">
        <div className="text-[11px] font-bold tracking-widest text-[#7C3AED] uppercase">創作作品</div>
      </div>
      <div className="p-2.5 space-y-1.5">
        {tiles.map((t) => (
          <WhiteTile key={t.label} icon={t.icon} label={t.label} sub={t.sub} />
        ))}
      </div>
    </div>
  );
}

function WhiteTile({ icon, label, sub }: { icon: React.ReactNode; label: string; sub: string }) {
  return (
    <div className="bg-white rounded-lg px-3 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-50">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-md bg-[#163524] text-[#2E7D5B] flex items-center justify-center">
          {icon}
        </div>
        <div>
          <div className="text-sm font-semibold text-[#0d1117]">{label}</div>
          <div className="text-[10px] text-[#475569]">{sub}</div>
        </div>
      </div>
      <ChevronRight size={14} className="text-[#94a3b8]" />
    </div>
  );
}