import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetCurrentMember, 
  useUpdateCurrentMember,
  useUploadImage,
  useListMemberPosts,
  useListSocialAccounts,
  useCreateSocialConnection,
  useDisconnectSocialAccount,
  getListMemberPostsQueryKey,
  getGetCurrentMemberQueryKey,
  getListSocialAccountsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, User, Palette, CheckCircle2, ImagePlus, FileText, Share2, Link2, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  title: z.string().min(2, "Title is required"),
  company: z.string().min(2, "Company is required"),
  bio: z.string().optional().nullable(),
  themePreference: z.enum(["light", "dark"]),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code"),
  autoPostShares: z.boolean(),
  preferredPostPlatforms: z.array(z.enum(["facebook", "linkedin", "instagram"])),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SocialPlatform = ProfileFormValues["preferredPostPlatforms"][number];

const SOCIAL_PLATFORMS: Array<{ value: SocialPlatform; label: string }> = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
];

const COLOR_PRESETS = [
  { name: "Electric Blue", value: "#00aaff" },
  { name: "Neon Purple", value: "#b026ff" },
  { name: "Cyber Green", value: "#00ff66" },
  { name: "Sunset Orange", value: "#ff5e00" },
  { name: "Crimson Red", value: "#ff003c" },
];

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isSaved, setIsSaved] = useState(false);
  const profileImageInput = useRef<HTMLInputElement>(null);

  const { data: memberData, isLoading } = useGetCurrentMember({
    query: {
      queryKey: getGetCurrentMemberQueryKey(),
    }
  });
  const { data: socialAccountsData } = useListSocialAccounts({
    query: { queryKey: getListSocialAccountsQueryKey() },
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      title: "",
      company: "",
      bio: "",
      themePreference: "dark",
      primaryColor: "#00aaff",
      autoPostShares: false,
      preferredPostPlatforms: [],
    },
  });
  const { data: memberPosts } = useListMemberPosts(
    memberData?.member.id ?? "",
    { limit: 100 },
    { query: { enabled: Boolean(memberData?.member.id), queryKey: getListMemberPostsQueryKey(memberData?.member.id ?? "", { limit: 100 }) } },
  );

  // Hydrate form when data loads
  useEffect(() => {
    if (memberData?.member) {
      form.reset({
        name: memberData.member.name || "",
        title: memberData.member.title || "",
        company: memberData.member.company || "",
        bio: memberData.member.bio || "",
        themePreference: memberData.member.themePreference as any || "dark",
        primaryColor: memberData.member.primaryColor || "#00aaff",
        autoPostShares: memberData.member.autoPostShares,
        preferredPostPlatforms: memberData.member.preferredPostPlatforms,
      });
    }
  }, [memberData, form]);

  const updateMutation = useUpdateCurrentMember({
    mutation: {
      onSuccess: (data) => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        queryClient.setQueryData(getGetCurrentMemberQueryKey(), data);
        toast({ title: "Profile updated successfully" });
        
        // Re-apply theme if they changed it
        if (data.member.themePreference === "dark") {
          document.documentElement.classList.add("dark");
        } else {
          document.documentElement.classList.remove("dark");
        }
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err.message, variant: "destructive" });
      }
    }
  });
  const connectSocialMutation = useCreateSocialConnection({
    mutation: {
      onSuccess: (result) => {
        window.location.assign(result.authorizationUrl);
      },
      onError: (error: Error) => {
        toast({
          title: "Could not start connection",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  });
  const disconnectSocialMutation = useDisconnectSocialAccount({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getListSocialAccountsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetCurrentMemberQueryKey(),
        });
        toast({ title: "Social account disconnected" });
      },
      onError: (error: Error) => {
        toast({
          title: "Could not disconnect account",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  });
  const uploadProfileImage = useUploadImage({
    mutation: {
      onSuccess: (upload) => {
        updateMutation.mutate({ data: { profilePictureUrl: upload.url } });
      },
      onError: (error: Error) => toast({ title: "Photo upload failed", description: error.message, variant: "destructive" }),
    },
  });

  const onSubmit = (data: ProfileFormValues) => {
    updateMutation.mutate({ data });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("social");
    const platform = params.get("platform");
    if (!result || !platform) return;

    toast({
      title:
        result === "success"
          ? `${platform.charAt(0).toUpperCase()}${platform.slice(1)} connected`
          : "Social connection was not completed",
      description:
        result === "success"
          ? "Your account is ready to use for selected future shares."
          : "You can try again when your provider account is ready.",
      variant: result === "success" ? "default" : "destructive",
    });
    queryClient.invalidateQueries({ queryKey: getListSocialAccountsQueryKey() });
    window.history.replaceState({}, "", window.location.pathname);
  }, [queryClient, toast]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24 w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const member = memberData?.member;
  const posts = memberPosts?.posts ?? [];
  const shareCount = posts.reduce((total, post) => total + post.shareCount, 0);
  const socialAccounts = socialAccountsData?.accounts ?? [];
  const activePlatforms = new Set(
    socialAccounts
      .filter((account) => account.isActive)
      .map((account) => account.platform),
  );

  return (
    <div className="max-w-4xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-2">Manage your public presence and personal preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <Avatar className="h-32 w-32 mb-4 border-4 border-card ring-2 ring-primary/20">
                <AvatarImage src={member?.profilePictureUrl || ""} alt={member?.name} />
                <AvatarFallback className="text-4xl bg-primary/10 text-primary">{member?.name?.charAt(0)}</AvatarFallback>
              </Avatar>
              <h3 className="text-xl font-bold font-display">{member?.name}</h3>
              <p className="text-primary font-medium text-sm mb-1">{member?.title}</p>
              <p className="text-muted-foreground text-sm">{member?.company}</p>
               <input ref={profileImageInput} className="hidden" type="file" accept="image/*" data-testid="input-profile-picture" onChange={(event) => {
                 const file = event.target.files?.[0];
                 if (file) uploadProfileImage.mutate({ data: { image: file } });
               }} />
               <Button variant="outline" size="sm" className="mt-4" onClick={() => profileImageInput.current?.click()} disabled={uploadProfileImage.isPending} data-testid="button-upload-profile-picture">
                 {uploadProfileImage.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                 Update photo
               </Button>
              
              <div className="w-full mt-6 pt-6 border-t border-border flex flex-col gap-2 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chapter</span>
                  <span className="font-medium">{member?.chapter}</span>
                </div>
                 <div className="grid grid-cols-2 gap-2 pt-2">
                   <div className="rounded-md bg-muted/40 p-2 text-center"><FileText className="mx-auto mb-1 h-4 w-4 text-primary" /><span className="block font-semibold">{memberPosts?.pagination.total ?? 0}</span><span className="text-xs text-muted-foreground">Posts</span></div>
                   <div className="rounded-md bg-muted/40 p-2 text-center"><Share2 className="mx-auto mb-1 h-4 w-4 text-primary" /><span className="block font-semibold">{shareCount}</span><span className="text-xs text-muted-foreground">Shares</span></div>
                 </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium capitalize">{member?.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Role</span>
                  <span className="font-medium capitalize">{member?.role?.replace("_", " ")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>Update how others see you in the chapter.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input data-testid="input-profile-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Professional Title</FormLabel>
                          <FormControl>
                            <Input data-testid="input-profile-title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="company"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company / Organization</FormLabel>
                          <FormControl>
                            <Input data-testid="input-profile-company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Biography</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Tell your chapter about your experience and goals..." 
                            className="min-h-[120px] resize-y"
                            data-testid="input-profile-bio"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="rounded-lg border border-primary/15 bg-primary/5 p-4 space-y-4">
                    <div className="flex items-center gap-2">
                      <Share2 className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Social sharing</h3>
                        <p className="text-sm text-muted-foreground">
                          Choose where selected future shares can be published.
                        </p>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="autoPostShares"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-md bg-background/60 px-3 py-2.5">
                          <div className="pr-4">
                            <FormLabel className="cursor-pointer">Auto-post selected shares</FormLabel>
                            <FormDescription>
                              Publish to your selected connected accounts after you confirm a share.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={field.value}
                              onClick={() => field.onChange(!field.value)}
                              data-testid="switch-auto-post-shares"
                              className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                                field.value ? "bg-primary" : "bg-muted"
                              }`}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="preferredPostPlatforms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Selected platforms</FormLabel>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {SOCIAL_PLATFORMS.map((platform) => {
                              const connected = activePlatforms.has(platform.value);
                              const checked = field.value?.includes(platform.value);
                              return (
                                <label
                                  key={platform.value}
                                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                                    connected
                                      ? "cursor-pointer bg-background/50 hover:border-primary/60"
                                      : "cursor-not-allowed opacity-50"
                                  }`}
                                >
                                  <Checkbox
                                    checked={checked}
                                    disabled={!connected}
                                    onCheckedChange={(isChecked) => {
                                      const selected = field.value ?? [];
                                      field.onChange(
                                        isChecked
                                          ? [...selected, platform.value]
                                          : selected.filter(
                                              (value) => value !== platform.value,
                                            ),
                                      );
                                    }}
                                  />
                                  {platform.label}
                                </label>
                              );
                            })}
                          </div>
                          <FormDescription>
                            Connect an active account below before selecting it.
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      {SOCIAL_PLATFORMS.map((platform) => {
                        const account = socialAccounts.find(
                          (item) => item.platform === platform.value,
                        );
                        const isBusy =
                          connectSocialMutation.isPending ||
                          disconnectSocialMutation.isPending;
                        return (
                          <div
                            key={platform.value}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{platform.label}</span>
                              {account ? (
                                <Badge
                                  variant={account.isActive ? "secondary" : "destructive"}
                                  className={account.isActive ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : ""}
                                >
                                  {account.isActive ? "Connected" : "Reconnect needed"}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">Not connected</span>
                              )}
                            </div>
                            {account ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isBusy}
                                onClick={() =>
                                  disconnectSocialMutation.mutate({
                                    platform: platform.value,
                                  })
                                }
                              >
                                <Unplug className="mr-2 h-4 w-4" />
                                Disconnect
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isBusy}
                                onClick={() =>
                                  connectSocialMutation.mutate({
                                    platform: platform.value,
                                  })
                                }
                              >
                                <Link2 className="mr-2 h-4 w-4" />
                                Connect
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Preferences
                  </CardTitle>
                  <CardDescription>Customize your app experience.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="themePreference"
                    render={({ field }) => (
                      <FormItem className="space-y-3">
                        <FormLabel>Interface Theme</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="flex gap-4"
                            data-testid="input-profile-theme"
                          >
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="dark" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Dark Mode
                              </FormLabel>
                            </FormItem>
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <RadioGroupItem value="light" />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                Light Mode
                              </FormLabel>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Identity Color</FormLabel>
                        <FormDescription>Choose a color that represents you on your profile.</FormDescription>
                        <FormControl>
                          <div className="flex flex-col gap-3 mt-2">
                            <div className="flex gap-3">
                              {COLOR_PRESETS.map((color) => (
                                <button
                                  key={color.value}
                                  type="button"
                                  className={`w-8 h-8 rounded-full border-2 transition-all ${field.value === color.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'}`}
                                  style={{ backgroundColor: color.value }}
                                  onClick={() => field.onChange(color.value)}
                                  title={color.name}
                                />
                              ))}
                            </div>
                            <div className="flex items-center gap-3">
                              <Input 
                                type="color" 
                                className="w-12 h-10 p-1 cursor-pointer" 
                                {...field} 
                              />
                              <Input 
                                type="text" 
                                className="w-32 uppercase font-mono text-sm" 
                                {...field}
                                onChange={(e) => {
                                  // Auto-prefix with # if missing
                                  let val = e.target.value;
                                  if (val.length > 0 && !val.startsWith('#')) val = '#' + val;
                                  field.onChange(val);
                                }}
                              />
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={updateMutation.isPending || !form.formState.isDirty}
                  data-testid="button-save-profile"
                  className={isSaved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : isSaved ? (
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                  ) : (
                    <Save className="mr-2 h-5 w-5" />
                  )}
                  {isSaved ? "Saved!" : "Save Changes"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />My recent posts</CardTitle>
          <CardDescription>Your latest contributions to the chapter feed.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {posts.slice(0, 5).map((post) => <div key={post.id} className="rounded-md border border-border p-3"><p className="whitespace-pre-wrap">{post.caption}</p><p className="mt-2 text-xs text-muted-foreground">{post.shareCount} {post.shareCount === 1 ? "share" : "shares"}</p></div>)}
          {!posts.length && <p className="text-sm text-muted-foreground">You have not shared a post with the chapter yet.</p>}
        </CardContent>
      </Card>
    </div>
  );
}
