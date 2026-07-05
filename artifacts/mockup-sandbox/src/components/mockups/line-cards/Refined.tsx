import React from "react";
import { 
  CloudRain, 
  TrendingUp, 
  Music, 
  Briefcase, 
  ChevronRight, 
  ExternalLink,
  Droplets,
  Wind,
  Waves,
  Thermometer,
  Bot
} from "lucide-react";

export function Refined() {
  return (
    <div className="min-h-screen bg-[#F1F3F5] flex items-center justify-center p-4 font-sans text-slate-900">
      <div className="w-full max-w-[420px] rounded-3xl overflow-hidden shadow-2xl bg-[#abc1d1] relative border border-slate-200/50">
        
        {/* LINE Header (mock) */}
        <div className="bg-slate-900 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
              <Bot className="w-4 h-4 text-slate-300" />
            </div>
            <div className="font-semibold text-white tracking-wide">作品集小幫手</div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="p-4 space-y-6 overflow-y-auto h-[800px] pb-24 scrollbar-hide">
          
          {/* Message 1: Main Menu */}
          <div className="flex gap-2">
            <Avatar />
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden border border-slate-100 w-full">
                <div className="p-5">
                  <div className="text-[11px] font-bold tracking-widest text-slate-400 mb-4 uppercase">Main Menu</div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">您好，需要什麼協助？</h3>
                  <p className="text-sm text-slate-500 mb-5">請選擇下方服務，或直接輸入指令。</p>
                  
                  <div className="space-y-1">
                    <MenuRow icon={<CloudRain size={16} />} title="潛水天氣" />
                    <div className="h-px bg-slate-100 mx-2" />
                    <MenuRow icon={<TrendingUp size={16} />} title="股票快報" />
                    <div className="h-px bg-slate-100 mx-2" />
                    <MenuRow icon={<Music size={16} />} title="音樂欣賞" />
                    <div className="h-px bg-slate-100 mx-2" />
                    <MenuRow icon={<Briefcase size={16} />} title="專案介紹" />
                  </div>
                </div>
                <div className="bg-slate-50 p-3 border-t border-slate-100">
                  <a href="https://donttalk.vercel.app" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                    前往作品集網站
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
              <Time />
            </div>
          </div>

          {/* Message 2: Stock */}
          <div className="flex gap-2">
            <Avatar />
            <div className="flex items-end gap-2 max-w-[88%]">
              <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden border border-slate-100 w-full">
                <div className="p-5">
                  <div className="flex justify-between items-baseline mb-4">
                    <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Market Update</div>
                    <div className="text-[10px] text-slate-400">Yahoo Finance · 即時</div>
                  </div>
                  
                  <div className="mb-5">
                    <div className="text-xs text-slate-500 mb-1">加權指數 (TAIEX)</div>
                    <div className="flex items-baseline gap-3">
                      <div className="text-2xl font-bold tracking-tight text-slate-900">46,780.62</div>
                      <div className="text-sm font-semibold text-[#E53935] flex items-center">
                        <span className="text-xs mr-0.5">▲</span> +36.46 (+0.08%)
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <StockRow name="台積電" code="2330" price="2,445.00" change="-20.00" percent="-0.81%" up={false} />
                    <div className="h-px bg-slate-100" />
                    <StockRow name="鴻海" code="2317" price="240.50" change="+1.50" percent="+0.63%" up={true} />
                    <div className="h-px bg-slate-100" />
                    <StockRow name="聯發科" code="2454" price="4,195.00" change="-150.00" percent="-3.45%" up={false} />
                    <div className="h-px bg-slate-100" />
                    <StockRow name="元大台灣50" code="0050" price="108.35" change="-0.45" percent="-0.41%" up={false} />
                  </div>
                </div>
              </div>
              <Time />
            </div>
          </div>

          {/* Message 3: Dive Weather */}
          <div className="flex gap-2">
            <Avatar />
            <div className="flex items-end gap-2 max-w-[85%]">
              <div className="bg-white rounded-2xl rounded-tl-sm shadow-sm overflow-hidden border border-slate-100 w-full">
                <div className="p-5">
                  <div className="flex justify-between items-baseline mb-4">
                    <div className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Dive Conditions</div>
                    <div className="text-[11px] font-medium text-slate-500">龍洞 (Long Dong)</div>
                  </div>

                  <div className="mb-6 flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-600">今日海況</div>
                    <div className="px-3 py-1 bg-red-50 border border-red-100 rounded text-red-600 font-bold tracking-wider text-sm">
                      不建議 GO
                    </div>
                  </div>

                  <div className="space-y-4 mb-5">
                    <ConditionRow icon={<Waves size={14} />} label="浪高" value="0.6 m" status="caution" />
                    <ConditionRow icon={<Wind size={14} />} label="週期" value="5.5 s" status="bad" />
                    <ConditionRow icon={<Droplets size={14} />} label="風速" value="2.4 m/s 南風(S)" status="good" />
                    <ConditionRow icon={<Thermometer size={14} />} label="水溫" value="30.7°C" status="bad" />
                  </div>

                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs text-slate-600 leading-relaxed">
                    湧浪週期偏短、浪況不穩，建議改期。
                  </div>
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

function MenuRow({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors group">
      <div className="flex items-center gap-3">
        <div className="text-slate-400 group-hover:text-slate-700 transition-colors">{icon}</div>
        <div className="font-medium text-slate-700">{title}</div>
      </div>
      <ChevronRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
    </div>
  );
}

function StockRow({ name, code, price, change, percent, up }: { name: string; code: string; price: string; change: string; percent: string; up: boolean }) {
  const colorClass = up ? "text-[#E53935]" : "text-[#43A047]";
  const bgClass = up ? "bg-red-50" : "bg-green-50";
  
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <div className="text-sm font-semibold text-slate-800">{name}</div>
        <div className="text-[10px] text-slate-400 font-mono">{code}</div>
      </div>
      <div className="text-right flex items-center gap-3">
        <div className="text-sm font-bold tracking-tight text-slate-800 tabular-nums">{price}</div>
        <div className={`w-[72px] text-right flex flex-col items-end ${colorClass}`}>
          <div className="text-[11px] font-bold tabular-nums tracking-tighter flex items-center">
            <span className="text-[9px] mr-0.5">{up ? "▲" : "▼"}</span>
            {change}
          </div>
          <div className="text-[10px] font-semibold tabular-nums tracking-tighter opacity-90">{percent}</div>
        </div>
      </div>
    </div>
  );
}

function ConditionRow({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: string; status: 'good' | 'caution' | 'bad' }) {
  const statusColors = {
    good: "bg-green-500",
    caution: "bg-amber-500",
    bad: "bg-red-500"
  };
  
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-slate-500">
        <div className="text-slate-400">{icon}</div>
        <div className="text-xs font-medium">{label}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-sm font-semibold text-slate-800 tracking-tight tabular-nums">{value}</div>
        <div className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
      </div>
    </div>
  );
}
