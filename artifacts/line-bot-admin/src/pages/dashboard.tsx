import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Send, Activity, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetStats();

  if (isError) {
    return (
      <div className="p-6 bg-destructive/5 text-destructive rounded-lg border border-destructive/20 flex items-center gap-3 animate-in fade-in">
        <Info className="w-5 h-5" />
        <p className="font-medium text-sm">無法載入儀表板統計資料，請嘗試重新整理。</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">數據總覽</h1>
        <p className="text-muted-foreground mt-3 text-base md:text-lg">監控機器人的觸及率與活動狀態。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Followers Card */}
        <Card className="border-border/60 shadow-sm overflow-hidden group hover:shadow-md hover:border-primary/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both" style={{ animationDelay: "100ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4 bg-secondary/10 border-b border-border/30">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide">總追蹤人數</CardTitle>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
              <Users size={16} strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-10 w-24 mb-2" />
            ) : stats?.followerCount !== null && stats?.followerCount !== undefined ? (
              <div className="flex flex-col">
                <span className="text-4xl font-display font-bold tracking-tight text-foreground">{stats?.followerCount?.toLocaleString() ?? 0}</span>
                {stats?.followerCountDate && (
                  <span className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5 bg-secondary/40 w-fit px-2 py-0.5 rounded-sm">
                    <Activity size={12} />
                    資料時間：{new Date(stats.followerCountDate).toLocaleDateString('zh-TW')}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-2xl font-display font-medium text-muted-foreground/70">尚無資料</span>
                <span className="text-xs text-muted-foreground mt-2">LINE Insights 資料處理中</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Usage Card */}
        <Card className="border-border/60 shadow-sm overflow-hidden group hover:shadow-md hover:border-primary/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both" style={{ animationDelay: "200ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4 bg-secondary/10 border-b border-border/30">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide flex items-center gap-1.5">
              本月訊息額度
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className="text-muted-foreground/50 hover:text-muted-foreground cursor-help transition-colors" />
                </TooltipTrigger>
                <TooltipContent className="bg-popover border-border/50 text-popover-foreground shadow-lg">
                  <p className="max-w-xs text-xs leading-relaxed">本月已發送的訊息數量（相對於您的 LINE 官方帳號額度）。資料可能會有 24 小時的延遲。</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
              <MessageSquare size={16} strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-10 w-32 mb-2" />
            ) : stats?.totalUsageThisMonth !== null && stats?.totalUsageThisMonth !== undefined ? (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-display font-bold tracking-tight text-foreground">{stats?.totalUsageThisMonth?.toLocaleString() ?? 0}</span>
                  {stats?.targetLimit && (
                    <span className="text-muted-foreground font-medium text-sm">/ {stats.targetLimit.toLocaleString()}</span>
                  )}
                </div>
                {stats?.targetLimit && (
                  <div className="w-full bg-secondary h-1.5 rounded-full mt-5 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${Math.min(100, ((stats.totalUsageThisMonth ?? 0) / stats.targetLimit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-2xl font-display font-medium text-muted-foreground/70">尚無資料</span>
                <span className="text-xs text-muted-foreground mt-2">使用量資料尚未同步</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Broadcasts Sent */}
        <Card className="border-border/60 shadow-sm overflow-hidden group hover:shadow-md hover:border-primary/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both" style={{ animationDelay: "300ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-4 bg-secondary/10 border-b border-border/30">
            <CardTitle className="text-sm font-medium text-muted-foreground tracking-wide">已發送推播</CardTitle>
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
              <Send size={16} strokeWidth={2} />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-10 w-16 mb-2" />
            ) : (
              <div className="flex flex-col">
                <span className="text-4xl font-display font-bold tracking-tight text-foreground">{stats?.broadcastCount?.toLocaleString() ?? 0}</span>
                <span className="text-xs text-muted-foreground mt-2">透過此系統發送的總推播次數</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
    </div>
  );
}
