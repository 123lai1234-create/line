import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useLogin } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Bot, KeyRound } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";

const loginSchema = z.object({
  password: z.string().min(1, "請輸入密碼"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: "",
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    loginMutation.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "歡迎回來" });
        setLocation("/");
      },
      onError: () => {
        toast({ 
          title: "拒絕存取", 
          description: "密碼錯誤，請再試一次。",
          variant: "destructive" 
        });
        form.reset();
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden font-sans">
      {/* Decorative refined background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-10 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both" style={{ animationDelay: "100ms" }}>
          <div className="w-16 h-16 rounded-sm bg-primary flex items-center justify-center text-primary-foreground shadow-lg mb-6 hover:scale-105 transition-transform duration-500 ease-out">
            <Bot size={32} strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-3 tracking-tight">控制中心</h1>
          <p className="text-muted-foreground text-sm max-w-[250px] leading-relaxed">
            專屬的創意作品集機器人管理介面。
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-lg shadow-2xl shadow-primary/5 p-8 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both" style={{ animationDelay: "300ms" }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium text-sm">登入密碼</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-primary" size={18} strokeWidth={1.5} />
                        <Input 
                          type="password" 
                          placeholder="請輸入密碼" 
                          className="pl-10 h-12 bg-secondary/30 border-border/60 focus:border-primary focus:bg-background transition-all rounded-md shadow-sm"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full h-12 font-medium text-base rounded-md shadow-md hover:shadow-lg transition-all" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Spinner className="mr-2" /> : null}
                {loginMutation.isPending ? "驗證中..." : "進入系統"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
