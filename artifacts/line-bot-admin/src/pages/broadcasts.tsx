import { useListBroadcasts, useCreateBroadcast, getListBroadcastsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import type { Broadcast, BroadcastInput } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  History,
  MessageSquareText,
  Image as ImageIcon,
  LayoutPanelTop,
  CalendarClock,
  Link as LinkIcon,
} from "lucide-react";

const TEXT_MAX = 2000;
const TITLE_MAX = 100;
const LABEL_MAX = 20;

const httpsUrl = (v: string) => v.startsWith("https://");

const broadcastSchema = z
  .object({
    kind: z.enum(["text", "image", "flex"]),
    message: z.string().max(TEXT_MAX, `內容不能超過 ${TEXT_MAX} 字`).optional(),
    title: z.string().max(TITLE_MAX, `標題不能超過 ${TITLE_MAX} 字`).optional(),
    imageUrl: z.string().max(TEXT_MAX).optional(),
    linkUrl: z.string().max(TEXT_MAX).optional(),
    linkLabel: z.string().max(LABEL_MAX, `按鈕文字不能超過 ${LABEL_MAX} 字`).optional(),
    schedule: z.boolean(),
    scheduledAt: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    if (val.kind === "text") {
      if (!val.message?.trim()) {
        ctx.addIssue({ path: ["message"], code: z.ZodIssueCode.custom, message: "請輸入訊息內容" });
      }
    }
    if (val.kind === "image") {
      if (!val.imageUrl?.trim()) {
        ctx.addIssue({ path: ["imageUrl"], code: z.ZodIssueCode.custom, message: "請輸入圖片網址" });
      } else if (!httpsUrl(val.imageUrl)) {
        ctx.addIssue({ path: ["imageUrl"], code: z.ZodIssueCode.custom, message: "圖片網址必須以 https:// 開頭" });
      }
    }
    if (val.kind === "flex") {
      if (!val.title?.trim()) {
        ctx.addIssue({ path: ["title"], code: z.ZodIssueCode.custom, message: "請輸入卡片標題" });
      }
      if (!val.message?.trim()) {
        ctx.addIssue({ path: ["message"], code: z.ZodIssueCode.custom, message: "請輸入卡片內文" });
      }
      if (val.imageUrl?.trim() && !httpsUrl(val.imageUrl)) {
        ctx.addIssue({ path: ["imageUrl"], code: z.ZodIssueCode.custom, message: "圖片網址必須以 https:// 開頭" });
      }
      if (val.linkUrl?.trim()) {
        if (!httpsUrl(val.linkUrl)) {
          ctx.addIssue({ path: ["linkUrl"], code: z.ZodIssueCode.custom, message: "連結必須以 https:// 開頭" });
        }
        if (!val.linkLabel?.trim()) {
          ctx.addIssue({ path: ["linkLabel"], code: z.ZodIssueCode.custom, message: "請輸入按鈕文字" });
        }
      }
    }
    if (val.schedule) {
      if (!val.scheduledAt) {
        ctx.addIssue({ path: ["scheduledAt"], code: z.ZodIssueCode.custom, message: "請選擇發送時間" });
      } else if (new Date(val.scheduledAt).getTime() <= Date.now()) {
        ctx.addIssue({ path: ["scheduledAt"], code: z.ZodIssueCode.custom, message: "排程時間必須是未來的時間" });
      }
    }
  });

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

const KINDS = [
  { value: "text", label: "文字", icon: MessageSquareText },
  { value: "image", label: "圖片", icon: ImageIcon },
  { value: "flex", label: "卡片", icon: LayoutPanelTop },
] as const;

const KIND_META: Record<string, { label: string; className: string }> = {
  text: { label: "文字", className: "bg-secondary text-secondary-foreground" },
  image: { label: "圖片", className: "bg-primary/10 text-primary" },
  flex: { label: "卡片", className: "bg-primary/10 text-primary" },
};

function StatusBadge({ item }: { item: Broadcast }) {
  if (item.status === "scheduled") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 gap-1">
        <CalendarClock className="w-3 h-3" /> 已排程
      </Badge>
    );
  }
  if (item.status === "failed") {
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 gap-1">
        <AlertCircle className="w-3 h-3" /> 發送失敗
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10 gap-1">
      <CheckCircle2 className="w-3 h-3" /> 已發送
    </Badge>
  );
}

function toLocalInputValue(d: Date): string {
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 16);
}

export default function Broadcasts() {
  const { data: broadcasts, isLoading: isLoadingHistory } = useListBroadcasts();
  const createBroadcast = useCreateBroadcast();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      kind: "text",
      message: "",
      title: "",
      imageUrl: "",
      linkUrl: "",
      linkLabel: "",
      schedule: false,
      scheduledAt: "",
    },
  });

  const kind = form.watch("kind");
  const schedule = form.watch("schedule");
  const preview = form.watch();

  const onSubmit = (data: BroadcastFormValues) => {
    const payload: BroadcastInput = { kind: data.kind };
    if (data.kind === "text") {
      payload.message = data.message?.trim();
    } else if (data.kind === "image") {
      payload.imageUrl = data.imageUrl?.trim();
      if (data.message?.trim()) payload.message = data.message.trim();
    } else {
      payload.title = data.title?.trim();
      payload.message = data.message?.trim();
      if (data.imageUrl?.trim()) payload.imageUrl = data.imageUrl.trim();
      if (data.linkUrl?.trim()) {
        payload.linkUrl = data.linkUrl.trim();
        payload.linkLabel = data.linkLabel?.trim();
      }
    }
    if (data.schedule && data.scheduledAt) {
      payload.scheduledAt = new Date(data.scheduledAt).toISOString();
    }

    createBroadcast.mutate(
      { data: payload },
      {
        onSuccess: () => {
          toast({
            title: data.schedule ? "已排程" : "已發送",
            description: data.schedule ? "訊息將在指定時間自動推播。" : "訊息已推播給所有好友。",
          });
          form.reset();
          queryClient.invalidateQueries({ queryKey: getListBroadcastsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        },
        onError: (err) => {
          toast({
            title: "發送失敗",
            description: err.data?.error || "無法發送訊息,請稍後再試。",
            variant: "destructive",
          });
        },
      },
    );
  };

  const charCount = (preview.message ?? "").length;

  return (
    <div className="space-y-10 max-w-5xl">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">推播訊息</h1>
        <p className="text-muted-foreground mt-3 text-base md:text-lg">
          發送文字、圖片或卡片給所有 LINE 好友,也可以排定未來時間自動發送。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <Card
          className="lg:col-span-3 border-border/60 shadow-sm overflow-hidden rounded-lg animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
          style={{ animationDelay: "100ms" }}
        >
          <div className="h-1.5 bg-primary w-full" />
          <CardHeader className="pb-6 border-b border-border/30 bg-secondary/10">
            <CardTitle className="flex items-center gap-2.5 text-xl font-display">
              <Send className="w-5 h-5 text-primary" strokeWidth={2} />
              建立推播
            </CardTitle>
            <CardDescription className="text-sm mt-1.5">選擇訊息類型並填寫內容,發送前可在右側預覽。</CardDescription>
          </CardHeader>
          <CardContent className="pt-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                  control={form.control}
                  name="kind"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-foreground text-sm tracking-wide">訊息類型</FormLabel>
                      <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          {KINDS.map((k) => (
                            <TabsTrigger key={k.value} value={k.value} className="gap-1.5">
                              <k.icon className="w-4 h-4" /> {k.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </Tabs>
                    </FormItem>
                  )}
                />

                {kind === "flex" && (
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-foreground text-sm tracking-wide">卡片標題</FormLabel>
                        <FormControl>
                          <Input
                            className="h-11 bg-secondary/20 focus:bg-background border-border/60 focus:border-primary transition-all rounded-md shadow-sm"
                            placeholder="例如:最新作品上線了"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(kind === "text" || kind === "flex") && (
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-foreground text-sm tracking-wide flex items-center justify-between">
                          <span>{kind === "flex" ? "卡片內文" : "訊息內容"}</span>
                          <span className={`text-xs font-normal ${charCount > TEXT_MAX ? "text-destructive" : "text-muted-foreground"}`}>
                            {charCount} / {TEXT_MAX}
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[140px] resize-y bg-secondary/20 focus:bg-background text-sm p-4 leading-relaxed border-border/60 focus:border-primary transition-all rounded-md shadow-sm"
                            placeholder="輸入要發送的內容…"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {(kind === "image" || kind === "flex") && (
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-foreground text-sm tracking-wide flex items-center gap-2">
                          <ImageIcon size={16} className="text-primary" strokeWidth={1.5} />
                          圖片網址{kind === "flex" && <span className="text-muted-foreground font-normal">(選填)</span>}
                        </FormLabel>
                        <FormDescription className="text-xs">請填入以 https:// 開頭的公開圖片連結。</FormDescription>
                        <FormControl>
                          <Input
                            type="url"
                            className="h-11 bg-secondary/20 focus:bg-background border-border/60 focus:border-primary transition-all rounded-md shadow-sm"
                            placeholder="https://example.com/image.jpg"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {kind === "image" && (
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-medium text-foreground text-sm tracking-wide">
                          說明文字 <span className="text-muted-foreground font-normal">(選填)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[90px] resize-y bg-secondary/20 focus:bg-background text-sm p-4 leading-relaxed border-border/60 focus:border-primary transition-all rounded-md shadow-sm"
                            placeholder="圖片下方要附帶的文字…"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {kind === "flex" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="linkUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground text-sm tracking-wide flex items-center gap-2">
                            <LinkIcon size={16} className="text-primary" strokeWidth={1.5} />
                            按鈕連結 <span className="text-muted-foreground font-normal">(選填)</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              className="h-11 bg-secondary/20 focus:bg-background border-border/60 focus:border-primary transition-all rounded-md shadow-sm"
                              placeholder="https://"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linkLabel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="font-medium text-foreground text-sm tracking-wide">按鈕文字</FormLabel>
                          <FormControl>
                            <Input
                              className="h-11 bg-secondary/20 focus:bg-background border-border/60 focus:border-primary transition-all rounded-md shadow-sm"
                              placeholder="查看更多"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <div className="rounded-md border border-border/60 bg-secondary/10 p-4 space-y-4">
                  <FormField
                    control={form.control}
                    name="schedule"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-4 space-y-0">
                        <div className="space-y-0.5">
                          <FormLabel className="font-medium text-foreground text-sm tracking-wide flex items-center gap-2">
                            <CalendarClock size={16} className="text-primary" strokeWidth={1.5} />
                            排程發送
                          </FormLabel>
                          <FormDescription className="text-xs">開啟後可指定未來時間自動發送。</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  {schedule && (
                    <FormField
                      control={form.control}
                      name="scheduledAt"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              type="datetime-local"
                              min={toLocalInputValue(new Date(Date.now() + 60000))}
                              className="h-11 bg-background border-border/60 focus:border-primary transition-all rounded-md shadow-sm"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    disabled={createBroadcast.isPending}
                    className="w-full md:w-auto px-8 h-11 rounded-md shadow-sm transition-all font-medium"
                  >
                    {createBroadcast.isPending ? (
                      <Spinner className="mr-2" />
                    ) : schedule ? (
                      <CalendarClock className="mr-2 w-4 h-4" />
                    ) : (
                      <Send className="mr-2 w-4 h-4" />
                    )}
                    {schedule ? "排程發送" : "立即發送"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card
          className="lg:col-span-2 border-border/60 shadow-sm overflow-hidden rounded-lg animate-in fade-in slide-in-from-bottom-4 fill-mode-both lg:sticky lg:top-6"
          style={{ animationDelay: "200ms" }}
        >
          <CardHeader className="pb-4 border-b border-border/30 bg-secondary/10">
            <CardTitle className="text-base font-display">預覽</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="rounded-xl bg-[#8AB4D6] p-4 min-h-[160px]">
              <BroadcastPreview values={preview} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card
        className="border-border/60 shadow-sm overflow-hidden rounded-lg animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
        style={{ animationDelay: "300ms" }}
      >
        <CardHeader className="pb-6 border-b border-border/30 bg-secondary/10">
          <CardTitle className="flex items-center gap-2.5 text-xl font-display">
            <History className="w-5 h-5 text-primary" strokeWidth={2} />
            發送紀錄
          </CardTitle>
          <CardDescription className="text-sm mt-1.5">最近的推播與排程紀錄。</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {isLoadingHistory ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-20 w-full bg-secondary/30 animate-pulse rounded-md" />
              ))}
            </div>
          ) : !broadcasts || broadcasts.length === 0 ? (
            <div className="text-center py-12">
              <div className="mx-auto w-12 h-12 rounded-full bg-secondary/40 flex items-center justify-center mb-3">
                <History className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground text-sm">尚無發送紀錄</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {broadcasts.map((item) => (
                <li
                  key={item.id}
                  className="flex gap-4 rounded-md border border-border/50 bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all"
                >
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="w-14 h-14 rounded-md object-cover border border-border/50 flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center flex-wrap gap-2">
                      <StatusBadge item={item} />
                      <Badge variant="secondary" className={`${KIND_META[item.kind]?.className ?? ""}`}>
                        {KIND_META[item.kind]?.label ?? item.kind}
                      </Badge>
                    </div>
                    {item.title && <p className="font-medium text-sm text-foreground truncate">{item.title}</p>}
                    {item.message && <p className="text-sm text-muted-foreground line-clamp-2">{item.message}</p>}
                    {item.status === "failed" && item.errorMessage && (
                      <p className="text-xs text-destructive">{item.errorMessage}</p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-1 pt-0.5">
                      <Clock className="w-3 h-3" />
                      {item.status === "scheduled" && item.scheduledAt
                        ? `預定 ${new Date(item.scheduledAt).toLocaleString("zh-TW")}`
                        : new Date(item.sentAt).toLocaleString("zh-TW")}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BroadcastPreview({ values }: { values: BroadcastFormValues }) {
  const { kind, message, title, imageUrl, linkUrl, linkLabel } = values;
  const empty = <p className="text-white/80 text-sm text-center py-8">填寫內容後這裡會顯示預覽</p>;

  if (kind === "text") {
    if (!message?.trim()) return empty;
    return (
      <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message}</p>
      </div>
    );
  }

  if (kind === "image") {
    if (!imageUrl?.trim()) return empty;
    return (
      <div className="space-y-2 max-w-[85%]">
        <img src={imageUrl} alt="" className="rounded-2xl rounded-tl-sm w-full object-cover shadow-sm" />
        {message?.trim() && (
          <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2.5 shadow-sm">
            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{message}</p>
          </div>
        )}
      </div>
    );
  }

  // flex card
  if (!title?.trim() && !message?.trim() && !imageUrl?.trim()) return empty;
  return (
    <div className="max-w-[85%] bg-white rounded-2xl rounded-tl-sm overflow-hidden shadow-sm">
      {imageUrl?.trim() && <img src={imageUrl} alt="" className="w-full aspect-[20/13] object-cover" />}
      <div className="p-3.5 space-y-1.5">
        {title?.trim() && <p className="font-bold text-[15px] text-foreground break-words">{title}</p>}
        {message?.trim() && <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">{message}</p>}
      </div>
      {linkUrl?.trim() && (
        <div className="px-3.5 pb-3.5">
          <div className="w-full text-center rounded-md bg-[#2563EB] text-white text-sm font-medium py-2">
            {linkLabel?.trim() || "查看更多"}
          </div>
        </div>
      )}
    </div>
  );
}
