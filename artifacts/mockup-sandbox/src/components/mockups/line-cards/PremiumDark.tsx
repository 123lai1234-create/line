import React from "react";
import {
  ChevronRight,
  Droplets,
  TrendingUp,
  Music,
  LayoutTemplate,
  Activity,
  Wind,
  Thermometer,
  ExternalLink,
  Bot,
  Waves
} from "lucide-react";

export function PremiumDark() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 font-sans text-slate-200">
      {/* Phone Frame */}
      <div className="w-full max-w-[420px] bg-slate-950 rounded-[40px] shadow-2xl border-[8px] border-slate-900 overflow-hidden flex flex-col h-[850px]">
        
        {/* Header */}
        <div className="bg-slate-900/80 backdrop-blur-md px-6 py-4 flex items-center border-b border-slate-800 z-10 sticky top-0">
          <ChevronRight className="w-6 h-6 text-slate-400 rotate-180 mr-4" />
          <h1 className="text-lg font-medium text-slate-100 flex-1">作品集小幫手</h1>
          <div className="flex gap-4">
            <span className="w-5 h-5 rounded-full border-2 border-slate-600"></span>
            <span className="w-5 h-5 rounded-full border-2 border-slate-600"></span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide bg-[#0a0f16]">
          
          {/* Message 1: Main Menu */}
          <MessageBlock time="10:42 AM">
            <div className="bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/50 rounded-2xl overflow-hidden shadow-lg">
              <div className="p-5">
                <h2 className="text-xl font-semibold text-white mb-1">主選單</h2>
                <p className="text-sm text-slate-400 mb-5">請選擇您需要的服務</p>
                
                <div className="space-y-2">
                  <MenuButton icon={<Droplets className="w-5 h-5 text-teal-400" />} title="潛水天氣" />
                  <MenuButton icon={<TrendingUp className="w-5 h-5 text-teal-400" />} title="股票快報" />
                  <MenuButton icon={<Music className="w-5 h-5 text-teal-400" />} title="音樂欣賞" />
                  <MenuButton icon={<LayoutTemplate className="w-5 h-5 text-teal-400" />} title="專案介紹" />
                </div>
              </div>
              <div className="bg-slate-900/50 border-t border-slate-800 px-5 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-800/50 transition-colors">
                <span className="text-xs text-slate-400">donttalk.vercel.app</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </div>
            </div>
          </MessageBlock>

          {/* Message 2: Stock Snapshot */}
          <MessageBlock time="10:43 AM">
            <div className="bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-teal-400" />
                  股票快報
                </h2>
                <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded border border-slate-700">台股</span>
              </div>

              {/* Hero Index */}
              <div className="mb-6 pb-5 border-b border-slate-800">
                <div className="text-sm text-slate-400 mb-1">加權指數 (TAIEX)</div>
                <div className="flex items-baseline gap-3">
                  <span className="text-3xl font-light text-white tracking-tight">46,780.62</span>
                  <span className="text-sm font-medium text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">▲ 36.46 (0.08%)</span>
                </div>
              </div>

              {/* Stock List */}
              <div className="space-y-4">
                <StockRow name="台積電" code="2330" price="2,445.00" change="-20.00" percent="-0.81%" isUp={false} />
                <StockRow name="鴻海" code="2317" price="240.50" change="+1.50" percent="+0.63%" isUp={true} />
                <StockRow name="聯發科" code="2454" price="4,195.00" change="-150.00" percent="-3.45%" isUp={false} />
                <StockRow name="元大台灣50" code="0050" price="108.35" change="-0.45" percent="-0.41%" isUp={false} />
              </div>

              <div className="mt-5 text-[10px] text-slate-500 text-right">
                資料來源 Yahoo Finance · 即時
              </div>
            </div>
          </MessageBlock>

          {/* Message 3: Dive Forecast */}
          <MessageBlock time="10:43 AM">
            <div className="bg-gradient-to-b from-slate-800/80 to-slate-900 border border-slate-700/50 rounded-2xl p-5 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-white flex items-center gap-2">
                  <Droplets className="w-4 h-4 text-teal-400" />
                  龍洞海況
                </h2>
                <span className="text-xs text-slate-400">今日預報</span>
              </div>

              {/* Verdict */}
              <div className="flex items-center gap-4 mb-5 pb-5 border-b border-slate-800">
                <div className="w-2 h-12 bg-red-500 rounded-full"></div>
                <div>
                  <div className="text-sm text-slate-400 mb-1">整體評估</div>
                  <div className="text-2xl font-semibold text-red-500 tracking-wide">不建議 (NO-GO)</div>
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                <Metric label="浪高" value="0.6 m" status="caution" icon={<Waves className="w-4 h-4 text-slate-500" />} />
                <Metric label="週期" value="5.5 s" status="bad" icon={<Activity className="w-4 h-4 text-slate-500" />} />
                <Metric label="風速" value="2.4 m/s 南(S)" status="good" icon={<Wind className="w-4 h-4 text-slate-500" />} />
                <Metric label="水溫" value="30.7°C" status="bad" icon={<Thermometer className="w-4 h-4 text-slate-500" />} />
              </div>

              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                <p className="text-xs text-red-400 leading-relaxed">
                  湧浪週期偏短、浪況不穩，建議改期。
                </p>
              </div>
            </div>
          </MessageBlock>

        </div>
        
        {/* Input Area */}
        <div className="bg-slate-900 px-4 py-3 border-t border-slate-800">
          <div className="flex gap-2">
            <div className="bg-slate-800 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
              <span className="text-slate-400 text-xl">+</span>
            </div>
            <div className="flex-1 bg-slate-800 rounded-full px-4 py-2 flex items-center">
              <span className="text-slate-500 text-sm">輸入訊息...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBlock({ children, time }: { children: React.ReactNode; time: string }) {
  return (
    <div className="flex items-end gap-2 max-w-[90%]">
      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center mb-1 flex-shrink-0 border border-slate-700">
        <Bot className="w-4 h-4 text-teal-400" />
      </div>
      <div className="flex flex-col gap-1 items-start flex-1 min-w-0">
        <span className="text-[10px] text-slate-500 ml-1">作品集小幫手</span>
        <div className="flex items-end gap-2 w-full">
          <div className="flex-1 w-full">{children}</div>
          <span className="text-[9px] text-slate-500 mb-1 flex-shrink-0">{time}</span>
        </div>
      </div>
    </div>
  );
}

function MenuButton({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-3 bg-slate-800/40 hover:bg-slate-700/60 transition-colors p-3 rounded-xl border border-slate-700/50 cursor-pointer">
      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800">
        {icon}
      </div>
      <span className="text-slate-200 font-medium text-sm">{title}</span>
      <ChevronRight className="w-4 h-4 text-slate-600 ml-auto" />
    </div>
  );
}

function StockRow({ name, code, price, change, percent, isUp }: { name: string; code: string; price: string; change: string; percent: string; isUp: boolean }) {
  const colorClass = isUp ? "text-red-500" : "text-green-500";
  const bgClass = isUp ? "bg-red-500/10" : "bg-green-500/10";
  
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm font-medium text-slate-200">{name}</div>
        <div className="text-[10px] text-slate-500 font-mono">{code}</div>
      </div>
      <div className="text-right">
        <div className="text-sm font-medium text-white tracking-tight">{price}</div>
        <div className={`text-[11px] px-1.5 py-0.5 rounded mt-0.5 inline-block ${colorClass} ${bgClass}`}>
          {isUp ? '▲' : '▼'} {change} ({percent})
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, status, icon }: { label: string; value: string; status: 'good' | 'caution' | 'bad', icon: React.ReactNode }) {
  const statusColors = {
    good: "bg-green-500",
    caution: "bg-amber-500",
    bad: "bg-red-500"
  };

  return (
    <div className="bg-slate-800/40 p-3 rounded-xl border border-slate-700/30">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-100">{value}</span>
        <div className={`w-1.5 h-1.5 rounded-full ${statusColors[status]}`}></div>
      </div>
    </div>
  );
}
