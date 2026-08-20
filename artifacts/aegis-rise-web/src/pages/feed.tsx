import React, { useRef, useState } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import {
  useGetFeed, useCreatePost, useDeleteOwnPost, useSharePost, useUploadImage,
  useGetPostSharePreview, useGetCurrentMember, useListSocialAccounts,
  getGetPostSharePreviewQueryKey, getGetFeedQueryKey, getGetCurrentMemberQueryKey,
  getListSocialAccountsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Image as ImageIcon, Send, Trash2, Share2, MoreVertical, X, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ImageUploadPreview, type ImageFile } from "@/components/feed/image-upload-preview";
import { PostGallery } from "@/components/feed/post-gallery";

const PLATFORMS = ["LinkedIn", "Instagram", "Facebook", "TikTok", "Direct Link"] as const;
type Platform = typeof PLATFORMS[number];

export default function Feed() {
  const { member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState<ImageFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sharingPostId, setSharingPostId] = useState("");
  const [sharePlatform, setSharePlatform] = useState<Platform>("LinkedIn");
  const [autoPost, setAutoPost] = useState<boolean | null>(null);
  const [autoPostResults, setAutoPostResults] = useState<Record<string, { status: string; error?: string }> | null>(null);

  const { data: feedData, isLoading, isError, refetch } = useGetFeed(undefined, { query: { queryKey: getGetFeedQueryKey() } });
  const { data: currentMemberData } = useGetCurrentMember({ query: { queryKey: getGetCurrentMemberQueryKey() } });
  const { data: socialAccountsData } = useListSocialAccounts({ query: { queryKey: getListSocialAccountsQueryKey() } });

  const createPostMutation = useCreatePost({ mutation: {
    onSuccess: () => {
      setCaption("");
      images.forEach((image) => URL.revokeObjectURL(image.preview));
      setImages([]); setUploadProgress(0); setUploadError(null);
      queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      toast({ title: "Post created successfully" });
    },
    onError: (err: Error) => toast({ title: "Failed to create post", description: err.message, variant: "destructive" }),
  }});
  const deletePostMutation = useDeleteOwnPost({ mutation: {
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() }); toast({ title: "Post deleted" }); },
    onError: (err: Error) => toast({ title: "Could not delete post", description: err.message, variant: "destructive" }),
  }});
  const sharePostMutation = useSharePost({ mutation: {
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() }),
    onError: (err: Error) => toast({ title: "Could not share post", description: err.message, variant: "destructive" }),
  }});
  const uploadImageMutation = useUploadImage();
  const { data: sharePreview } = useGetPostSharePreview(sharingPostId, { platform: sharePlatform }, {
    query: { enabled: Boolean(sharingPostId), queryKey: getGetPostSharePreviewQueryKey(sharingPostId, { platform: sharePlatform }) },
  });

  const chooseFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(event.target.files ?? []);
    const available = Math.max(0, 10 - images.length);
    const accepted = incoming
      .slice(0, available)
      .filter((file) => ["image/jpeg", "image/png", "image/gif"].includes(file.type));
    setImages((current) => [...current, ...accepted.map((file) => ({ file, preview: URL.createObjectURL(file), id: `${file.name}-${file.lastModified}-${Math.random()}` }))]);
    if (incoming.length > available) toast({ title: "Ten images maximum", description: "Only the first ten images were added." });
    event.target.value = "";
  };

  const createPost = async () => {
    if (!caption.trim()) {
      setUploadError("Write a caption before publishing.");
      return;
    }
    setUploadError(null);
    const uploaded: string[] = [];
    try {
      for (let index = 0; index < images.length; index += 1) {
        const result = await uploadImageMutation.mutateAsync({ data: { image: images[index].file } });
        uploaded.push(result.url);
        setUploadProgress(Math.round(((index + 1) / images.length) * 100));
      }
      createPostMutation.mutate({ data: { caption: caption.trim(), ...(uploaded.length ? { imageUrls: uploaded } : { imageUrl: null }) } });
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "An image could not be uploaded.");
      setUploadProgress(0);
    }
  };

  const activeConnectedPlatforms = new Set(
    (socialAccountsData?.accounts ?? [])
      .filter((account) => account.isActive && account.isPublishingEligible)
      .map((account) => account.platform),
  );
  const selectedAutoPlatforms = (
    currentMemberData?.member.preferredPostPlatforms ?? []
  ).filter((platform) => activeConnectedPlatforms.has(platform));

  const sharePost = async (postId: string) => {
    if (sharePlatform === "Direct Link" && sharePreview?.caption) await navigator.clipboard?.writeText(sharePreview.caption);
    try {
      const result = await sharePostMutation.mutateAsync({ postId, data: { platform: sharePlatform, ...(autoPost === null ? {} : { autoPost }) } });
      setAutoPostResults(result.autoPosted ?? {});
      const outcomes = Object.values(result.autoPosted ?? {});
      const failures = outcomes.filter((outcome) => outcome.status === "error").length;
      toast({ title: failures ? "Shared with some social posting issues" : "Post shared", description: outcomes.length ? `${outcomes.length - failures} external post${outcomes.length - failures === 1 ? "" : "s"} completed.` : sharePlatform === "Direct Link" ? "Share text copied to your clipboard." : undefined, variant: failures ? "destructive" : "default" });
    } catch { /* mutation handler owns the error toast */ }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-8 p-4 md:p-6 lg:p-8">
      <header className="flex items-end justify-between border-b border-border/70 pb-5">
        <div><p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Aegis Rise / Chapter</p><h1 className="mt-2 text-3xl font-display font-bold tracking-tight">Chapter Feed</h1></div>
        <span className="hidden text-xs text-muted-foreground sm:block">Thoughts worth carrying forward</span>
      </header>
      <Card className="border-primary/25 bg-card/80 shadow-lg shadow-primary/5">
        <CardContent className="p-4 pt-6">
          <div className="flex gap-4"><Avatar className="h-10 w-10 border border-primary/30"><AvatarImage src={currentMemberData?.member.profilePictureUrl || ""} /><AvatarFallback className="bg-primary/15 text-primary">{member?.name?.charAt(0) ?? "A"}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1 space-y-4"><Textarea placeholder="Share something with your chapter..." className="min-h-[100px] resize-none border-none bg-transparent p-0 text-lg focus-visible:ring-0" value={caption} onChange={(e) => setCaption(e.target.value)} data-testid="input-post-caption" />
              <ImageUploadPreview images={images} onImagesChange={setImages} disabled={createPostMutation.isPending || uploadImageMutation.isPending} />
              {uploadError && <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{uploadError}</div>}
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between gap-3 border-t border-border p-4">
          <div><input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif" multiple className="hidden" onChange={chooseFiles} data-testid="input-post-image" /><Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10" onClick={() => fileInputRef.current?.click()} disabled={images.length >= 10} data-testid="button-attach-image"><ImageIcon className="mr-2 h-5 w-5" />Add images <span className="ml-1 text-xs text-muted-foreground">{images.length}/10</span></Button></div>
          <div className="flex items-center gap-3">{uploadProgress > 0 && uploadProgress < 100 && <span className="text-xs text-muted-foreground">Uploading {uploadProgress}%</span>}<Button onClick={createPost} disabled={!caption.trim() || createPostMutation.isPending || uploadImageMutation.isPending} data-testid="button-create-post">{createPostMutation.isPending || uploadImageMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Send className="mr-2 h-4 w-4" />Post</>}</Button></div>
        </CardFooter>
      </Card>
      <div className="space-y-6">
        {isLoading ? <FeedSkeleton /> : isError ? <div className="rounded-lg border border-destructive/30 bg-card p-8 text-center"><AlertCircle className="mx-auto mb-3 h-8 w-8 text-destructive" /><p className="font-medium">The chapter feed could not load.</p><Button variant="outline" className="mt-4" onClick={() => refetch()}>Try again</Button></div> : feedData?.posts?.length ? feedData.posts.map((post) => <Card key={post.id} className="overflow-hidden border-border/80" data-testid={`card-post-${post.id}`}><CardHeader className="flex flex-row items-start gap-4 space-y-0 p-4"><Link href={`/members/${post.author.id}`} data-testid={`link-author-${post.author.id}`}><Avatar className="h-10 w-10 border border-border transition-colors hover:border-primary"><AvatarImage src={post.author.profilePictureUrl || ""} alt={post.author.name} /><AvatarFallback className="bg-primary/10 text-primary">{post.author.name.charAt(0)}</AvatarFallback></Avatar></Link><div className="flex min-w-0 flex-1 flex-col"><div className="flex items-start justify-between gap-3"><div><Link href={`/members/${post.author.id}`} className="font-semibold hover:text-primary">{post.author.name}</Link><p className="text-xs text-muted-foreground">{post.author.title} at {post.author.company}</p></div><div className="flex items-center gap-2">{post.isFeatured && <Badge variant="secondary" className="border-none bg-primary/20 text-primary">Featured</Badge>}{post.author.id === member?.id && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive" onClick={() => deletePostMutation.mutate({ postId: post.id })} data-testid={`button-delete-post-${post.id}`}><Trash2 className="mr-2 h-4 w-4" />Delete Post</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div></div><span className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span></div></CardHeader><CardContent className="p-4 pt-0"><p className="whitespace-pre-wrap">{post.caption}</p><PostGallery images={post.images} legacyImageUrl={post.imageUrl} /></CardContent><CardFooter className="border-t border-border bg-muted/20 p-4"><div className="flex w-full items-center justify-between"><span className="text-sm text-muted-foreground">{post.shareCount} {post.shareCount === 1 ? "share" : "shares"}</span><Dialog onOpenChange={(open) => { if (open) { setSharingPostId(post.id); setSharePlatform("LinkedIn"); setAutoPost(currentMemberData?.member.autoPostShares ?? null); setAutoPostResults(null); } }}><DialogTrigger asChild><Button variant="ghost" size="sm" className="gap-2" data-testid={`button-share-post-${post.id}`}><Share2 className="h-4 w-4" />Share</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Share this post</DialogTitle><DialogDescription>Share this post to your network to increase its reach.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="grid grid-cols-2 gap-3">{PLATFORMS.map((platform) => <Button key={platform} variant={sharePlatform === platform ? "default" : "outline"} onClick={() => setSharePlatform(platform)}>{platform === "Direct Link" ? "Copy Link" : platform}</Button>)}</div><div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{sharePreview?.caption ?? "Preparing your platform-ready share text..."}</div><div className="rounded-md border border-primary/20 bg-primary/5 p-3"><div className="flex items-center justify-between"><div><p className="text-sm font-medium">Auto-post connected accounts</p><p className="text-xs text-muted-foreground">Use your saved platform selection.</p></div><button type="button" role="switch" aria-checked={Boolean(autoPost)} disabled={!selectedAutoPlatforms.length} onClick={() => setAutoPost(!autoPost)} className={`relative h-6 w-11 rounded-full transition-colors ${autoPost ? "bg-primary" : "bg-muted"}`}><span className="sr-only">Toggle auto-post</span><span className={`absolute top-1 h-4 w-4 rounded-full bg-background transition-transform ${autoPost ? "translate-x-6" : "translate-x-1"}`} /></button></div>{selectedAutoPlatforms.length ? <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">{selectedAutoPlatforms.map((platform) => <Badge key={platform} variant="secondary" className="capitalize">{platform}</Badge>)}</div> : <p className="mt-3 text-xs text-muted-foreground">Connect and select social accounts in your profile to auto-post.</p>}</div>{autoPostResults && Object.keys(autoPostResults).length > 0 && <div className="space-y-2 rounded-md border border-border p-3 text-sm"><p className="font-medium">External posting results</p>{Object.entries(autoPostResults).map(([platform, outcome]) => <div key={platform} className="flex items-start gap-2">{outcome.status === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}<span className="capitalize font-medium">{platform}</span><span className="text-muted-foreground">{outcome.status === "success" ? "published" : outcome.error ?? "could not be published"}</span></div>)}</div>}</div><DialogFooter><Button className="w-full" onClick={() => sharePost(post.id)} disabled={sharePostMutation.isPending}>{sharePostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Share to {sharePlatform === "Direct Link" ? "clipboard" : sharePlatform}</Button></DialogFooter></DialogContent></Dialog></div></CardFooter></Card>) : <div className="rounded-lg border border-dashed border-border bg-card/50 px-4 py-16 text-center"><Share2 className="mx-auto mb-4 h-7 w-7 text-primary" /><h3 className="text-lg font-semibold">No posts yet</h3><p className="mt-2 text-muted-foreground">Be the first to share something with your chapter.</p></div>}
      </div>
    </div>
  );
}

function FeedSkeleton() { return <div className="space-y-6" aria-label="Loading feed"><div className="h-48 animate-pulse rounded-lg bg-muted/60" /><div className="h-72 animate-pulse rounded-lg bg-muted/60" /></div>; }
