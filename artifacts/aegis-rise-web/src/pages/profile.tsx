import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { 
  useGetCurrentMember, 
  useUpdateCurrentMember,
  useUploadImage,
  useUploadProfileWallpaper,
  useListMemberPosts,
  useListSocialAccounts,
  useCreateSocialConnection,
  useDisconnectSocialAccount,
   useChangePassword,
  useListMembers,
  getListMemberPostsQueryKey,
  getGetCurrentMemberQueryKey,
  getListSocialAccountsQueryKey,
  getListMembersQueryKey,
  getGetNewsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, User, Palette, CheckCircle2, ImagePlus, FileText, Share2, Link2, Unplug, Settings, Users, ChevronDown, ShieldCheck, Newspaper } from "lucide-react";

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
import { Skeleton } from "@/components/ui/skeleton";
import { PostGallery } from "@/components/feed/post-gallery";
import { ProfileHero } from "./components/profile-hero";
import { ProfileNewsSidebar } from "./components/profile-news-sidebar";

const newsInterestValues = [
  "business", "construction", "real_estate", "cooking", "entertainment",
  "politics", "world_news", "health_wellness", "cybersecurity_it", "general_contractor",
  "travel", "stock_market", "financial", "diy"
] as const;

const profileSchema = z.object({
  name: z.string().min(2, "Name is required"),
  title: z.string().min(2, "Title is required"),
  company: z.string().min(2, "Company is required"),
  bio: z.string().optional().nullable(),
  themePreference: z.enum(["light", "dark"]),
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code"),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code").optional().default("#00aaff"),
  profileBackgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Must be a valid hex color code").optional().default("#0a0a0a"),
  profileWallpaperScale: z.number().int().min(50).max(200).default(100),
  autoPostShares: z.boolean(),
  preferredPostPlatforms: z.array(z.enum(["facebook", "linkedin", "instagram"])),
  newsInterests: z.array(z.enum(newsInterestValues)).max(14).optional().default([]),
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type SocialPlatform = ProfileFormValues["preferredPostPlatforms"][number];

const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .max(72, "New password must be 72 characters or fewer.")
      .refine(
        (value) => new TextEncoder().encode(value).length <= 72,
        "New password must be at most 72 bytes when UTF-8 encoded.",
      )
      .refine((value) => /[A-Z]/.test(value), "Add an uppercase letter.")
      .refine((value) => /[a-z]/.test(value), "Add a lowercase letter.")
      .refine((value) => /[0-9]/.test(value), "Add a number.")
      .refine((value) => /[^A-Za-z0-9]/.test(value), "Add a special character."),
    confirmNewPassword: z
      .string()
      .min(1, "Please confirm your new password."),
  })
  .superRefine((values, context) => {
    if (
      values.currentPassword &&
      values.newPassword &&
      values.currentPassword === values.newPassword
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "New password must be different from your current password.",
      });
    }
    if (
      values.confirmNewPassword &&
      values.newPassword !== values.confirmNewPassword
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmNewPassword"],
        message: "New passwords do not match.",
      });
    }
  });

type PasswordChangeFormValues = z.infer<typeof passwordChangeSchema>;

const passwordRequirements = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One number", test: (value: string) => /[0-9]/.test(value) },
  {
    label: "One special character",
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
  {
    label: "At most 72 UTF-8 bytes",
    test: (value: string) =>
      value.length > 0 && new TextEncoder().encode(value).length <= 72,
  },
] as const;

const SOCIAL_PLATFORMS: Array<{
  value: SocialPlatform;
  label: string;
  canAutoPost: boolean;
}> = [
  { value: "linkedin", label: "LinkedIn", canAutoPost: true },
  { value: "facebook", label: "Facebook", canAutoPost: true },
  { value: "instagram", label: "Instagram", canAutoPost: true },
];

function getAuthorizationUrl(result: unknown): string | undefined {
  if (!result || typeof result !== "object") {
    return undefined;
  }

  const response = result as {
    authorizationUrl?: unknown;
    data?: { authorizationUrl?: unknown };
  };
  const authorizationUrl =
    response.authorizationUrl ?? response.data?.authorizationUrl;

  return typeof authorizationUrl === "string" && authorizationUrl.length > 0
    ? authorizationUrl
    : undefined;
}

const COLOR_PRESETS = [
  { name: "Electric Blue", value: "#00aaff" },
  { name: "Neon Purple", value: "#b026ff" },
  { name: "Cyber Green", value: "#00ff66" },
  { name: "Sunset Orange", value: "#ff5e00" },
  { name: "Crimson Red", value: "#ff003c" },
  { name: "Goldenrod", value: "#ffb700" },
];

const BACKGROUND_PRESETS = [
  { name: "Deep Space", value: "#0a0a0a" },
  { name: "Midnight Blue", value: "#050b14" },
  { name: "Dark Purple", value: "#120a1f" },
  { name: "Crimson Void", value: "#140505" },
  { name: "Forest Shadow", value: "#051408" },
];

export default function Profile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [location] = useLocation();
  const isProfileSettings = location === "/profile/settings";
  const [isSaved, setIsSaved] = useState(false);
  const [connectingPlatform, setConnectingPlatform] =
    useState<SocialPlatform | null>(null);
  const profileImageInput = useRef<HTMLInputElement>(null);
  const wallpaperImageInput = useRef<HTMLInputElement>(null);
  const [wallpaperFile, setWallpaperFile] = useState<File | null>(null);
  const [wallpaperPreviewUrl, setWallpaperPreviewUrl] = useState<string | null>(
    null,
  );
  const [removeWallpaper, setRemoveWallpaper] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState<string | null>(
    null,
  );
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState(false);

  const { data: memberData, isLoading } = useGetCurrentMember({
    query: {
      queryKey: getGetCurrentMemberQueryKey(),
    }
  });
  const { data: socialAccountsData } = useListSocialAccounts({
    query: { queryKey: getListSocialAccountsQueryKey() },
  });
  const { data: chapterMembersData, isLoading: chapterMembersLoading, isError: chapterMembersError } =
    useListMembers({
      query: {
        enabled: Boolean(memberData?.member.id),
        queryKey: getListMembersQueryKey(),
      },
    });
  const [visibleChapterMemberCount, setVisibleChapterMemberCount] = useState(9);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      title: "",
      company: "",
      bio: "",
      themePreference: "dark",
      primaryColor: "#00aaff",
      accentColor: "#00aaff",
      profileBackgroundColor: "#0a0a0a",
      profileWallpaperScale: 100,
      autoPostShares: false,
      preferredPostPlatforms: [],
      newsInterests: [],
    },
  });
  const passwordChangeForm = useForm<PasswordChangeFormValues>({
    resolver: zodResolver(passwordChangeSchema),
    mode: "onChange",
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });
  const newPasswordValue = passwordChangeForm.watch("newPassword");
  const passwordRequirementResults = passwordRequirements.map((requirement) => ({
    ...requirement,
    met: requirement.test(newPasswordValue),
  }));
  const passwordStrength = passwordRequirementResults.filter(
    (requirement) => requirement.met,
  ).length;
  const passwordStrengthLabel =
    passwordStrength === 0
      ? "Not started"
      : passwordStrength <= 2
        ? "Weak"
        : passwordStrength < passwordRequirements.length
          ? "Good"
          : "Strong";
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
        accentColor: memberData.member.accentColor || memberData.member.primaryColor,
        profileBackgroundColor: memberData.member.profileBackgroundColor || "#0a0a0a",
        profileWallpaperScale: memberData.member.profileWallpaperScale || 100,
        autoPostShares: memberData.member.autoPostShares,
        preferredPostPlatforms: memberData.member.preferredPostPlatforms,
        newsInterests: memberData.member.newsInterests,
      });
      // reset wallpaper tracking on load
      setWallpaperFile(null);
      setRemoveWallpaper(false);
    }
  }, [memberData, form]);

  useEffect(() => {
    if (!wallpaperFile) {
      setWallpaperPreviewUrl(null);
      return;
    }

    const previewUrl = URL.createObjectURL(wallpaperFile);
    setWallpaperPreviewUrl(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [wallpaperFile]);

  useEffect(() => {
    setVisibleChapterMemberCount(9);
  }, [memberData?.member.chapter]);

  const updateMutation = useUpdateCurrentMember({
    mutation: {
      onSuccess: (data) => {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
        queryClient.setQueryData(getGetCurrentMemberQueryKey(), data);
        queryClient.invalidateQueries({ queryKey: getGetNewsQueryKey() });
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
  const changePasswordMutation = useChangePassword({
    mutation: {
      onSuccess: () => {
        passwordChangeForm.reset();
        setPasswordChangeError(null);
        setPasswordChangeSuccess(true);
        toast({ title: "Password changed successfully" });
      },
      onError: (error: Error) => {
        const message =
          error.message || "Your password could not be changed. Please try again.";
        setPasswordChangeSuccess(false);
        setPasswordChangeError(message);
        toast({
          title: "Password change failed",
          description: message,
          variant: "destructive",
        });
      },
    },
  });
  const connectSocialMutation = useCreateSocialConnection({
    mutation: {
      onSuccess: (result) => {
        const authorizationUrl = getAuthorizationUrl(result);
        if (!authorizationUrl) {
          setConnectingPlatform(null);
          toast({
            title: "Could not start connection",
            description:
              "The server did not return an authorization link. Please try again.",
            variant: "destructive",
          });
          return;
        }

        try {
          const destination = new URL(authorizationUrl, window.location.origin);
          if (
            destination.protocol !== "https:" &&
            destination.protocol !== "http:"
          ) {
            throw new Error("Unsupported authorization URL protocol.");
          }
          window.location.assign(destination.toString());
        } catch {
          setConnectingPlatform(null);
          toast({
            title: "Could not start connection",
            description:
              "The authorization link was invalid. Please try again.",
            variant: "destructive",
          });
        }
      },
      onError: (error: Error) => {
        setConnectingPlatform(null);
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

  const uploadWallpaperMutation = useUploadProfileWallpaper();

  const onSubmit = async (data: ProfileFormValues) => {
    let finalWallpaperUrl = memberData?.member.profileWallpaperUrl;

    try {
      if (wallpaperFile) {
        const res = await uploadWallpaperMutation.mutateAsync({ data: { image: wallpaperFile } });
        finalWallpaperUrl = res.url;
      } else if (removeWallpaper) {
        finalWallpaperUrl = null;
      }

      await updateMutation.mutateAsync({
        data: {
          ...data,
          profileWallpaperUrl: finalWallpaperUrl,
        },
      });

      if (wallpaperFile || removeWallpaper) {
        setWallpaperFile(null);
        setRemoveWallpaper(false);
      }
    } catch (err: any) {
      toast({ title: "Failed to upload wallpaper", description: err.message, variant: "destructive" });
    }
  };
  const onPasswordChange = (data: PasswordChangeFormValues) => {
    setPasswordChangeSuccess(false);
    setPasswordChangeError(null);
    changePasswordMutation.mutate({ data });
  };
  const startSocialConnection = (platform: SocialPlatform) => {
    setConnectingPlatform(platform);
    connectSocialMutation.mutate({ platform });
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
  const chapterMembers = (chapterMembersData?.members ?? []).filter(
    (chapterMember) => chapterMember.id !== member?.id,
  );
  const visibleChapterMembers = chapterMembers.slice(
    0,
    visibleChapterMemberCount,
  );
  const posts = memberPosts?.posts ?? [];
  const shareCount = posts.reduce((total, post) => total + post.shareCount, 0);
  const socialAccounts = socialAccountsData?.accounts ?? [];
  const activePlatforms = new Set(
    socialAccounts
      .filter((account) => account.isActive && account.isPublishingEligible)
      .map((account) => account.platform),
  );

  const watchPrimaryColor = form.watch("primaryColor");
  const watchAccentColor = form.watch("accentColor");
  const watchBackgroundColor = form.watch("profileBackgroundColor");
  const watchWallpaperScale = form.watch("profileWallpaperScale");
  const watchName = form.watch("name");
  const watchTitle = form.watch("title");
  const watchCompany = form.watch("company");
  const watchBio = form.watch("bio");

  const wallpaperUrlForPreview = wallpaperPreviewUrl
    ? wallpaperPreviewUrl
    : removeWallpaper
      ? null
      : member?.profileWallpaperUrl;

  return (
    <div
      className={`${isProfileSettings ? "max-w-4xl" : "max-w-[90rem]"} mx-auto w-full p-4 md:p-6 lg:p-8 space-y-8`}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">
            {isProfileSettings ? "Profile Settings" : "My Profile"}
          </h1>
          <p className="text-muted-foreground mt-2">
            {isProfileSettings
              ? "Customize how your profile looks to other members."
              : "Manage your public presence and personal preferences."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link
              href={isProfileSettings ? "/profile" : "/profile/settings"}
              data-testid={
                isProfileSettings
                  ? "link-back-to-profile"
                  : "link-profile-settings"
              }
            >
              <Settings className="mr-2 h-4 w-4" />
              {isProfileSettings ? "Back to Profile" : "Profile Settings"}
            </Link>
          </Button>
        </div>
      </div>

      <div className="w-full">
        <h2 className="text-lg font-medium mb-3">
          {isProfileSettings ? "Live Profile Preview" : "Profile Picture & Banner"}
        </h2>
        <ProfileHero
          member={{
            name: watchName || member?.name,
            title: watchTitle || member?.title,
            company: watchCompany || member?.company,
            bio: watchBio !== undefined ? watchBio : member?.bio,
            profilePictureUrl: member?.profilePictureUrl,
          }}
          primaryColor={watchPrimaryColor}
          accentColor={watchAccentColor}
          backgroundColor={watchBackgroundColor}
          wallpaperUrl={wallpaperUrlForPreview}
          wallpaperScale={watchWallpaperScale}
        />
        {isProfileSettings && (
          <Controller
            control={form.control}
            name="profileWallpaperScale"
            render={({ field }) => (
              <div
                className="mt-2 flex flex-col gap-2 rounded-lg border border-border/80 bg-card/70 p-3 sm:flex-row sm:items-center"
                data-testid="profile-wallpaper-scale-control"
              >
                <input
                  {...field}
                  id="profile-wallpaper-scale"
                  type="range"
                  min={50}
                  max={200}
                  step={5}
                  value={field.value ?? 100}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  aria-label="Wallpaper size"
                  className="mt-3 h-2 w-full cursor-pointer accent-primary"
                  data-testid="input-profile-wallpaper-scale"
                />
                <div className="flex items-center justify-between gap-3 sm:order-2 sm:min-w-36">
                  <div>
                    <label
                      htmlFor="profile-wallpaper-scale"
                      className="text-sm font-medium"
                    >
                      Wallpaper Size
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Resize inside the frame
                    </p>
                  </div>
                  <output
                    htmlFor="profile-wallpaper-scale"
                    className="min-w-14 rounded-md bg-muted px-2 py-1 text-right text-sm font-mono"
                    data-testid="text-profile-wallpaper-scale"
                  >
                    {field.value ?? 100}%
                  </output>
                </div>
              </div>
            )}
          />
        )}
        {isProfileSettings && (
          <div className="mt-4 flex flex-wrap gap-2 justify-end">
            <input
              ref={profileImageInput}
              className="hidden"
              type="file"
              accept="image/*"
              data-testid="input-profile-picture"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadProfileImage.mutate({ data: { image: file } });
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => profileImageInput.current?.click()}
              disabled={uploadProfileImage.isPending}
              data-testid="button-upload-profile-picture"
            >
              {uploadProfileImage.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ImagePlus className="mr-2 h-4 w-4" />
              )}
              Update Photo
            </Button>
            <input
              ref={wallpaperImageInput}
              className="hidden"
              type="file"
              accept="image/jpeg,image/png"
              data-testid="input-profile-wallpaper"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setWallpaperFile(file);
                  setRemoveWallpaper(false);
                }
              }}
            />
            <Button variant="outline" size="sm" onClick={() => wallpaperImageInput.current?.click()} data-testid="button-upload-wallpaper">
              <ImagePlus className="mr-2 h-4 w-4" />
              Upload Wallpaper
            </Button>
            {wallpaperUrlForPreview && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setWallpaperFile(null);
                  setRemoveWallpaper(true);
                }}
                data-testid="button-remove-wallpaper"
              >
                Remove
              </Button>
            )}
          </div>
        )}
      </div>

      <div
        className={`grid grid-cols-1 gap-8 ${isProfileSettings ? "md:grid-cols-3" : "xl:grid-cols-4"}`}
      >
        <aside
          className={`${isProfileSettings ? "md:col-span-1" : "xl:col-span-1"} space-y-6`}
          aria-label={isProfileSettings ? "Profile details" : "Profile details and top news"}
        >
          <Card>
            <CardContent className="p-6 flex flex-col items-center text-center">
              <div className="w-full pt-2 flex flex-col gap-2 text-sm text-left">
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

          {!isProfileSettings && (
            <ProfileNewsSidebar variant="primary" />
          )}

          {isProfileSettings && (
            <Card data-testid="security-section">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Security
                </CardTitle>
                <CardDescription>
                  Change your password to keep your account protected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordChangeForm}>
                  <form
                    onSubmit={passwordChangeForm.handleSubmit(onPasswordChange)}
                    className="space-y-4"
                  >
                    <FormField
                      control={passwordChangeForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              autoComplete="current-password"
                              onChange={(event) => {
                                field.onChange(event);
                                setPasswordChangeSuccess(false);
                                setPasswordChangeError(null);
                              }}
                              data-testid="input-current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordChangeForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              autoComplete="new-password"
                              onChange={(event) => {
                                field.onChange(event);
                                setPasswordChangeSuccess(false);
                                setPasswordChangeError(null);
                              }}
                              data-testid="input-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div
                      className="space-y-3 rounded-lg border border-border/80 bg-muted/20 p-3"
                      aria-live="polite"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium">Password strength</span>
                        <span
                          className="text-muted-foreground"
                          data-testid="password-strength-label"
                        >
                          {passwordStrengthLabel}
                        </span>
                      </div>
                      <div
                        className="h-2 overflow-hidden rounded-full bg-muted"
                        role="progressbar"
                        aria-label="Password strength"
                        aria-valuemin={0}
                        aria-valuemax={passwordRequirements.length}
                        aria-valuenow={passwordStrength}
                        aria-valuetext={passwordStrengthLabel}
                        data-testid="password-strength-meter"
                      >
                        <div
                          className={`h-full rounded-full transition-all ${
                            passwordStrength <= 2
                              ? "bg-destructive"
                              : passwordStrength <= 4
                                ? "bg-amber-500"
                                : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${
                              (passwordStrength / passwordRequirements.length) *
                              100
                            }%`,
                          }}
                        />
                      </div>
                      <ul className="space-y-1.5 text-xs">
                        {passwordRequirementResults.map((requirement) => (
                          <li
                            key={requirement.label}
                            className={`flex items-center gap-2 ${
                              requirement.met
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            <CheckCircle2
                              className={`h-3.5 w-3.5 ${
                                requirement.met ? "" : "opacity-35"
                              }`}
                              aria-hidden="true"
                            />
                            {requirement.label}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <FormField
                      control={passwordChangeForm.control}
                      name="confirmNewPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="password"
                              autoComplete="new-password"
                              onChange={(event) => {
                                field.onChange(event);
                                setPasswordChangeSuccess(false);
                                setPasswordChangeError(null);
                              }}
                              data-testid="input-confirm-new-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {passwordChangeError && (
                      <p
                        className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                        role="alert"
                        data-testid="password-change-error"
                      >
                        {passwordChangeError}
                      </p>
                    )}

                    {passwordChangeSuccess && (
                      <p
                        className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300"
                        role="status"
                        data-testid="password-change-success"
                      >
                        Password changed successfully
                      </p>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={
                        changePasswordMutation.isPending ||
                        !passwordChangeForm.formState.isValid
                      }
                      data-testid="button-change-password"
                    >
                      {changePasswordMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Change Password
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          )}

          {!isProfileSettings && (
            <Card data-testid="chapter-members-section">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5 text-primary" />
                  Chapter Members
                </CardTitle>
                <CardDescription>
                  Connect with members in {member?.chapter}.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {chapterMembersLoading ? (
                  <div
                    className="grid grid-cols-3 gap-2"
                    data-testid="chapter-members-loading"
                  >
                    {Array.from({ length: 9 }).map((_, index) => (
                      <Skeleton
                        key={index}
                        className="h-28 w-full rounded-lg"
                      />
                    ))}
                  </div>
                ) : chapterMembersError ? (
                  <p
                    className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                    data-testid="chapter-members-error"
                  >
                    Chapter members could not be loaded. Please refresh and try
                    again.
                  </p>
                ) : chapterMembers.length === 0 ? (
                  <p
                    className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground"
                    data-testid="chapter-members-empty"
                  >
                    You are currently the only active member in this chapter.
                  </p>
                ) : (
                  <>
                    <div
                      className="grid grid-cols-3 gap-2"
                      data-testid="chapter-members-grid"
                    >
                      {visibleChapterMembers.map((chapterMember) => (
                        <Link
                          key={chapterMember.id}
                          href={`/members/${chapterMember.id}`}
                          aria-label={`View ${chapterMember.name}'s profile`}
                          data-testid={`chapter-member-card-${chapterMember.id}`}
                          className="group min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        >
                          <Card className="h-full overflow-hidden border-border/80 bg-card/70 transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/60 group-hover:bg-card group-hover:shadow-md group-hover:ring-1 group-hover:ring-primary/40">
                            <CardContent className="flex h-full min-h-28 flex-col items-center justify-center gap-1.5 p-2 text-center">
                              <Avatar className="h-10 w-10 border border-border transition-transform duration-200 group-hover:scale-105">
                                <AvatarImage
                                  src={chapterMember.profilePictureUrl ?? ""}
                                  alt=""
                                />
                                <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                                  {chapterMember.name.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="w-full min-w-0">
                                <p className="truncate text-xs font-semibold">
                                  {chapterMember.name}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {chapterMember.title}
                                </p>
                                <p className="truncate text-[11px] text-muted-foreground/80">
                                  {chapterMember.company}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                    {visibleChapterMemberCount < chapterMembers.length && (
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() =>
                          setVisibleChapterMemberCount(
                            (count) => count + 9,
                          )
                        }
                        data-testid="button-show-more-chapter-members"
                      >
                        Show More
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </aside>

        <div
          className={`${isProfileSettings ? "md:col-span-2" : "xl:col-span-2"} space-y-6`}
        >
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              {!isProfileSettings && (
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
                          Connect your accounts, then choose where future shares can be published.
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
                            {SOCIAL_PLATFORMS.filter(
                              (platform) => platform.canAutoPost,
                            ).map((platform) => {
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
                            Connect a publishing-ready account before selecting it. Facebook requires a Page; Instagram requires a Business or Creator account connected to a Page.
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
                          connectingPlatform === platform.value ||
                          disconnectSocialMutation.isPending;
                        return (
                          <div
                            key={platform.value}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background/60 px-3 py-2.5"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{platform.label}</span>
                              {account ? (
                                <>
                                  <Badge
                                    variant={
                                      account.isActive && account.isPublishingEligible
                                        ? "secondary"
                                        : "destructive"
                                    }
                                    className={
                                      account.isActive && account.isPublishingEligible
                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                                        : ""
                                    }
                                  >
                                    {account.isActive && account.isPublishingEligible
                                      ? "Publishing ready"
                                      : "Reconnect needed"}
                                  </Badge>
                                  {account.publishingError && (
                                    <span className="max-w-xs text-xs text-muted-foreground">
                                      {account.publishingError}
                                    </span>
                                  )}
                                </>
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
                                onClick={() => startSocialConnection(platform.value)}
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
              )}

              {isProfileSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5 text-primary" />
                    Appearance & Customization
                  </CardTitle>
                  <CardDescription>
                    Set the look of your profile and the interface you use to manage it.
                  </CardDescription>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="primaryColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Identity Color</FormLabel>
                          <FormDescription>Your main identity color.</FormDescription>
                          <FormControl>
                            <div className="flex flex-col gap-3 mt-2">
                              <div className="flex flex-wrap gap-2">
                                {COLOR_PRESETS.map((color) => (
                                  <button
                                    key={color.value}
                                    type="button"
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${field.value === color.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: color.value }}
                                    onClick={() => field.onChange(color.value)}
                                    title={color.name}
                                    data-testid={`button-profile-identity-color-${color.value.slice(1)}`}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="color"
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-profile-identity-color-picker"
                                  {...field}
                                />
                                <Input
                                  type="text"
                                  className="flex-1 uppercase font-mono text-sm"
                                  data-testid="input-profile-identity-color"
                                  {...field}
                                  onChange={(e) => {
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

                    <FormField
                      control={form.control}
                      name="accentColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Accent Color</FormLabel>
                          <FormDescription>Secondary glow and highlights.</FormDescription>
                          <FormControl>
                            <div className="flex flex-col gap-3 mt-2">
                              <div className="flex flex-wrap gap-2">
                                {COLOR_PRESETS.map((color) => (
                                  <button
                                    key={color.value}
                                    type="button"
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${field.value === color.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: color.value }}
                                    onClick={() => field.onChange(color.value)}
                                    title={color.name}
                                    data-testid={`button-profile-accent-color-${color.value.slice(1)}`}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="color"
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-profile-accent-color-picker"
                                  {...field}
                                />
                                <Input
                                  type="text"
                                  className="flex-1 uppercase font-mono text-sm"
                                  data-testid="input-profile-accent-color"
                                  {...field}
                                  onChange={(e) => {
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

                    <FormField
                      control={form.control}
                      name="profileBackgroundColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Profile Background</FormLabel>
                          <FormDescription>Base background color for your hero.</FormDescription>
                          <FormControl>
                            <div className="flex flex-col gap-3 mt-2">
                              <div className="flex flex-wrap gap-2">
                                {BACKGROUND_PRESETS.map((color) => (
                                  <button
                                    key={color.value}
                                    type="button"
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${field.value === color.value ? 'border-foreground scale-110' : 'border-transparent hover:scale-110'}`}
                                    style={{ backgroundColor: color.value }}
                                    onClick={() => field.onChange(color.value)}
                                    title={color.name}
                                    data-testid={`button-profile-background-color-${color.value.slice(1)}`}
                                  />
                                ))}
                              </div>
                              <div className="flex items-center gap-3">
                                <Input
                                  type="color"
                                  className="w-12 h-10 p-1 cursor-pointer"
                                  data-testid="input-profile-background-color-picker"
                                  {...field}
                                />
                                <Input
                                  type="text"
                                  className="flex-1 uppercase font-mono text-sm"
                                  data-testid="input-profile-background-color"
                                  {...field}
                                  onChange={(e) => {
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
                  </div>
                </CardContent>
              </Card>
              )}

              {isProfileSettings && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Newspaper className="h-5 w-5 text-primary" />
                    News Preferences
                  </CardTitle>
                  <CardDescription>
                    Select up to 14 topics to personalize your news feed on your profile.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="newsInterests"
                    render={() => (
                      <FormItem>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {newsInterestValues.map((interest) => (
                            <FormField
                              key={interest}
                              control={form.control}
                              name="newsInterests"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={interest}
                                    className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3 shadow-sm bg-card hover:bg-muted/50 transition-colors"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(interest)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...(field.value || []), interest])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== interest
                                                )
                                              )
                                        }}
                                        data-testid={`checkbox-news-interest-${interest}`}
                                      />
                                    </FormControl>
                                    <FormLabel className="font-normal cursor-pointer w-full text-sm leading-snug">
                                      {interest.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                                    </FormLabel>
                                  </FormItem>
                                )
                              }}
                            />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              )}

              <div className="flex justify-end pt-4">
                <Button 
                  type="submit" 
                  size="lg" 
                  disabled={updateMutation.isPending || uploadWallpaperMutation.isPending || (!form.formState.isDirty && !wallpaperFile && !removeWallpaper)}
                  data-testid="button-save-profile"
                  className={isSaved ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                >
                  {(updateMutation.isPending || uploadWallpaperMutation.isPending) ? (
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
        {!isProfileSettings && (
          <aside
            className="space-y-6 xl:col-span-1"
            aria-label="Alternative personalized news"
          >
            <ProfileNewsSidebar variant="alternative" />
          </aside>
        )}
      </div>
      {!isProfileSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" />My recent posts</CardTitle>
            <CardDescription>Your latest contributions to the chapter feed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {posts.slice(0, 5).map((post) => <div key={post.id} className="rounded-md border border-border p-3"><p className="whitespace-pre-wrap">{post.caption}</p><PostGallery images={post.images} legacyImageUrl={post.imageUrl} /><p className="mt-2 text-xs text-muted-foreground">{post.shareCount} {post.shareCount === 1 ? "share" : "shares"}</p></div>)}
            {!posts.length && <p className="text-sm text-muted-foreground">You have not shared a post with the chapter yet.</p>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
