import { useListBroadcasts, useCreateBroadcast, getListBroadcastsQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Send, Clock, CheckCircle2, AlertCircle, History } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const MAX_CHARS = 2000;

const broadcastSchema = z.object({
  message: z.string()
    .min(1, "Message cannot be empty")
    .max(MAX_CHARS, `Message must be less than ${MAX_CHARS} characters`),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

export default function Broadcasts() {
  const { data: broadcasts, isLoading: isLoadingHistory } = useListBroadcasts();
  const createBroadcast = useCreateBroadcast();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<BroadcastFormValues>({
    resolver: zodResolver(broadcastSchema),
    defaultValues: {
      message: "",
    },
  });

  const messageContent = form.watch("message");
  const charCount = messageContent.length;

  const onSubmit = (data: BroadcastFormValues) => {
    createBroadcast.mutate({ data }, {
      onSuccess: () => {
        toast({ title: "Broadcast Sent", description: "Your message has been pushed to all followers." });
        form.reset();
        queryClient.invalidateQueries({ queryKey: getListBroadcastsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      },
      onError: (err) => {
        toast({ 
          title: "Broadcast Failed", 
          description: err.data?.error || "Failed to send message",
          variant: "destructive" 
        });
      }
    });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Broadcast</h1>
        <p className="text-muted-foreground mt-2 text-lg">Push updates, news, or portfolio additions to your audience.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3 space-y-6">
          {/* Compose Form */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-secondary/20 pb-4 border-b border-border/50">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Send className="w-5 h-5 text-primary" />
                Compose Message
              </CardTitle>
              <CardDescription>
                This will be sent immediately as a push message to everyone who follows your bot.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea 
                            placeholder="Type your announcement here..." 
                            className="min-h-[200px] resize-y bg-background text-base p-4 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary border-input transition-all" 
                            {...field} 
                          />
                        </FormControl>
                        <div className="flex justify-between items-center mt-2">
                          <FormMessage />
                          <span className={`text-xs font-medium ${charCount > MAX_CHARS ? 'text-destructive' : 'text-muted-foreground'} ml-auto`}>
                            {charCount} / {MAX_CHARS}
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="pt-2 flex justify-end">
                    <Button 
                      type="submit" 
                      size="lg"
                      className="px-8 rounded-full shadow-md font-semibold"
                      disabled={createBroadcast.isPending || charCount === 0 || charCount > MAX_CHARS}
                    >
                      {createBroadcast.isPending ? <Spinner className="mr-2" /> : <Send className="mr-2 w-4 h-4" />}
                      Send Broadcast
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* History Sidebar */}
        <div className="lg:col-span-2">
          <Card className="border-border/50 shadow-sm h-full flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <History className="w-5 h-5 text-muted-foreground" />
                Recent History
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {isLoadingHistory ? (
                <div className="flex justify-center p-8">
                  <Spinner className="w-6 h-6 text-primary" />
                </div>
              ) : broadcasts && broadcasts.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {broadcasts.map((b) => (
                    <div key={b.id} className="p-4 hover:bg-secondary/20 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(b.sentAt).toLocaleString()}
                        </div>
                        {b.status === "sent" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Sent
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Failed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground/90 line-clamp-3 leading-relaxed whitespace-pre-wrap">
                        {b.message}
                      </p>
                      {b.errorMessage && (
                        <p className="text-xs text-destructive mt-2 bg-destructive/5 p-2 rounded border border-destructive/10">
                          {b.errorMessage}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-8 text-muted-foreground flex flex-col items-center">
                  <Send className="w-8 h-8 opacity-20 mb-3" />
                  <p className="text-sm">No broadcasts sent yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
