import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, MessageSquare, Send, Activity, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function Dashboard() {
  const { data: stats, isLoading, isError } = useGetStats();

  if (isError) {
    return (
      <div className="p-6 bg-destructive/10 text-destructive rounded-xl border border-destructive/20 flex items-center gap-3">
        <Info className="w-5 h-5" />
        <p>Failed to load dashboard statistics. Please try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Overview</h1>
        <p className="text-muted-foreground mt-2 text-lg">Monitor your bot's reach and activity.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Followers Card */}
        <Card className="border-border/50 shadow-sm overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/30">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Followers</CardTitle>
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
              <Users size={16} />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-10 w-24 mb-2" />
            ) : stats?.followerCount !== null ? (
              <div className="flex flex-col">
                <span className="text-4xl font-display font-bold">{stats?.followerCount?.toLocaleString() ?? 0}</span>
                {stats?.followerCountDate && (
                  <span className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <Activity size={12} />
                    As of {new Date(stats.followerCountDate).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-xl font-medium text-muted-foreground">Not available</span>
                <span className="text-xs text-muted-foreground mt-1">LINE Insights data processing</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message Usage Card */}
        <Card className="border-border/50 shadow-sm overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/30">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
              Monthly Quota
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className="text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Messages sent this month against your LINE account limit. May be delayed by 24h.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
              <MessageSquare size={16} />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-10 w-32 mb-2" />
            ) : stats?.totalUsageThisMonth !== null ? (
              <div className="flex flex-col">
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-display font-bold">{stats?.totalUsageThisMonth?.toLocaleString() ?? 0}</span>
                  {stats?.targetLimit && (
                    <span className="text-muted-foreground font-medium">/ {stats.targetLimit.toLocaleString()}</span>
                  )}
                </div>
                {stats?.targetLimit && (
                  <div className="w-full bg-secondary h-1.5 rounded-full mt-4 overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-1000 ease-out" 
                      style={{ width: `${Math.min(100, ((stats.totalUsageThisMonth ?? 0) / stats.targetLimit) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col">
                <span className="text-xl font-medium text-muted-foreground">Not available</span>
                <span className="text-xs text-muted-foreground mt-1">Usage data not synced yet</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Broadcasts Sent */}
        <Card className="border-border/50 shadow-sm overflow-hidden group">
          <CardHeader className="flex flex-row items-center justify-between pb-2 bg-secondary/30">
            <CardTitle className="text-sm font-medium text-muted-foreground">Broadcasts Sent</CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
              <Send size={16} />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {isLoading ? (
              <Skeleton className="h-10 w-16 mb-2" />
            ) : (
              <div className="flex flex-col">
                <span className="text-4xl font-display font-bold">{stats?.broadcastCount?.toLocaleString() ?? 0}</span>
                <span className="text-xs text-muted-foreground mt-1">Total messages pushed from this panel</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Decorative abstract shape */}
      <div className="hidden lg:block absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-tl-[100px] pointer-events-none -z-10" />
    </div>
  );
}
