import { useGetProfile, useUpdateProfile, getGetProfileQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Save, User, Link as LinkIcon, MessageCircle } from "lucide-react";

const profileSchema = z.object({
  botName: z.string().min(1, "請輸入機器人名稱"),
  introMessage: z.string().min(1, "請輸入介紹訊息"),
  websiteUrl: z.string().url("請輸入有效的網址").min(1, "請輸入作品集網址"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export default function Profile() {
  const { data: profile, isLoading } = useGetProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      botName: "",
      introMessage: "",
      websiteUrl: "",
    },
  });

  // Init form with data
  useEffect(() => {
    if (profile) {
      form.reset({
        botName: profile.botName,
        introMessage: profile.introMessage,
        websiteUrl: profile.websiteUrl,
      });
    }
  }, [profile, form]);

  const onSubmit = (data: ProfileFormValues) => {
    updateProfile.mutate({ data }, {
      onSuccess: (updatedData) => {
        toast({ title: "設定已更新", description: "您的變更已成功儲存。" });
        queryClient.setQueryData(getGetProfileQueryKey(), updatedData);
      },
      onError: () => {
        toast({ title: "更新設定失敗", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col space-y-8 max-w-3xl">
        <div className="space-y-2">
          <div className="h-10 w-48 bg-secondary/50 animate-pulse rounded-md"></div>
          <div className="h-6 w-96 bg-secondary/50 animate-pulse rounded-md"></div>
        </div>
        <div className="h-[500px] w-full bg-secondary/30 animate-pulse rounded-lg border border-border/50"></div>
      </div>
    );
  }

  return (
    <div className="space-y-10 max-w-3xl">
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 ease-out">
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">機器人設定</h1>
        <p className="text-muted-foreground mt-3 text-base md:text-lg">設定機器人對外的自我介紹與相關資訊。</p>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden rounded-lg animate-in fade-in slide-in-from-bottom-4 fill-mode-both" style={{ animationDelay: "100ms" }}>
        <div className="h-1.5 bg-primary w-full" />
        <CardHeader className="pb-6 border-b border-border/30 bg-secondary/10">
          <CardTitle className="flex items-center gap-2.5 text-xl font-display">
            <User className="w-5 h-5 text-primary" strokeWidth={2} />
            角色設定
          </CardTitle>
          <CardDescription className="text-sm mt-1.5">
            這些資訊將用於歡迎新好友或提供您的作品集連結。
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <FormField
                  control={form.control}
                  name="botName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-foreground text-sm tracking-wide">機器人名稱</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={16} strokeWidth={1.5} />
                          <Input className="pl-10 h-11 bg-secondary/20 focus:bg-background border-border/60 focus:border-primary transition-all rounded-md shadow-sm" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="websiteUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-medium text-foreground text-sm tracking-wide">作品集網址</FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={16} strokeWidth={1.5} />
                          <Input type="url" className="pl-10 h-11 bg-secondary/20 focus:bg-background border-border/60 focus:border-primary transition-all rounded-md shadow-sm" placeholder="https://" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="introMessage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-medium text-foreground text-sm tracking-wide flex items-center gap-2">
                      <MessageCircle size={16} className="text-primary" strokeWidth={1.5} />
                      介紹訊息
                    </FormLabel>
                    <FormDescription className="text-xs mb-3">
                      當使用者與您的機器人互動時，所發送的標準問候語。
                    </FormDescription>
                    <FormControl>
                      <Textarea 
                        className="min-h-[160px] resize-y bg-secondary/20 focus:bg-background text-sm p-4 leading-relaxed border-border/60 focus:border-primary transition-all rounded-md shadow-sm" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-6 mt-2 flex flex-col-reverse md:flex-row items-center justify-between gap-4 border-t border-border/40">
                <div className="text-xs text-muted-foreground w-full md:w-auto text-center md:text-left">
                  {profile?.updatedAt && `最後更新時間：${new Date(profile.updatedAt).toLocaleString('zh-TW')}`}
                </div>
                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending || !form.formState.isDirty}
                  className="w-full md:w-auto px-8 h-11 rounded-md shadow-sm transition-all font-medium"
                >
                  {updateProfile.isPending ? <Spinner className="mr-2" /> : <Save className="mr-2 w-4 h-4" />}
                  儲存變更
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
