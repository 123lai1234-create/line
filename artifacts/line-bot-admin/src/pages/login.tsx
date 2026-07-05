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
  password: z.string().min(1, "Password is required"),
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
        toast({ title: "Welcome back" });
        setLocation("/");
      },
      onError: () => {
        toast({ 
          title: "Access Denied", 
          description: "Incorrect password. Please try again.",
          variant: "destructive" 
        });
        form.reset();
      }
    });
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg mb-6 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
            <Bot size={32} />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tight mb-2 text-foreground">Command Center</h1>
          <p className="text-muted-foreground text-sm max-w-[250px]">
            Private administrative interface for your creative portfolio bot.
          </p>
        </div>

        <div className="bg-card border border-border/50 rounded-2xl shadow-xl shadow-black/5 p-6 sm:p-8 backdrop-blur-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-foreground font-medium">Access Key</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                        <Input 
                          type="password" 
                          placeholder="Enter your password" 
                          className="pl-10 h-12 bg-secondary/50 border-border/50 focus:border-primary focus:bg-background transition-all"
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
                className="w-full h-12 font-medium text-base rounded-xl shadow-md hover:shadow-lg transition-all" 
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? <Spinner className="mr-2" /> : null}
                {loginMutation.isPending ? "Authenticating..." : "Enter Command Center"}
              </Button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
