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
  botName: z.string().min(1, "Bot name is required"),
  introMessage: z.string().min(1, "Introduction message is required"),
  websiteUrl: z.string().url("Must be a valid URL").min(1, "Website URL is required"),
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
        toast({ title: "Profile updated", description: "Changes have been saved successfully." });
        queryClient.setQueryData(getGetProfileQueryKey(), updatedData);
      },
      onError: () => {
        toast({ title: "Failed to update profile", variant: "destructive" });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Spinner className="w-8 h-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-4xl font-display font-bold text-foreground tracking-tight">Identity</h1>
        <p className="text-muted-foreground mt-2 text-lg">Configure how your bot introduces you to the world.</p>
      </div>

      <Card className="border-border/50 shadow-sm overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary to-primary/50 w-full" />
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Bot Persona
          </CardTitle>
          <CardDescription>
            These details are used when welcoming new friends or providing your portfolio link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="botName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-foreground">Bot Name</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                          <Input className="pl-9 h-11 bg-secondary/30 focus:bg-background" {...field} />
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
                      <FormLabel className="font-semibold text-foreground">Portfolio URL</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                          <Input type="url" className="pl-9 h-11 bg-secondary/30 focus:bg-background" {...field} />
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
                    <FormLabel className="font-semibold text-foreground flex items-center gap-2">
                      <MessageCircle size={16} className="text-primary" />
                      Introduction Message
                    </FormLabel>
                    <FormDescription>
                      The standard greeting sent to users interacting with your bot.
                    </FormDescription>
                    <FormControl>
                      <Textarea 
                        className="min-h-[160px] resize-y bg-secondary/30 focus:bg-background text-base p-4 leading-relaxed" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="pt-4 flex items-center justify-between border-t border-border/50">
                <div className="text-sm text-muted-foreground">
                  {profile?.updatedAt && `Last updated: ${new Date(profile.updatedAt).toLocaleString()}`}
                </div>
                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending || !form.formState.isDirty}
                  className="px-8 h-11 rounded-lg shadow-sm"
                >
                  {updateProfile.isPending ? <Spinner className="mr-2" /> : <Save className="mr-2 w-4 h-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
