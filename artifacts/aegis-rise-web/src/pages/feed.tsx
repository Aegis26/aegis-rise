import { useState, useRef } from "react";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { 
  useGetFeed, 
  useCreatePost, 
  useDeleteOwnPost, 
  useSharePost,
  useUploadImage,
  useGetPostSharePreview,
  useGetCurrentMember,
  useListSocialAccounts,
  getGetPostSharePreviewQueryKey,
  getGetFeedQueryKey,
  getGetCurrentMemberQueryKey,
  getListSocialAccountsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Image as ImageIcon, Send, Trash2, Share2, MoreVertical, X, CheckCircle2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export default function Feed() {
  const { member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [caption, setCaption] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sharingPostId, setSharingPostId] = useState<string>("");
  const [sharePlatform, setSharePlatform] = useState<"LinkedIn" | "Instagram" | "Facebook" | "TikTok" | "Direct Link">("LinkedIn");
  const [autoPost, setAutoPost] = useState<boolean | null>(null);
  const [autoPostResults, setAutoPostResults] = useState<Record<string, { status: string; error?: string; externalUrl?: string }> | null>(null);

  // Queries
  const { data: feedData, isLoading } = useGetFeed(undefined, {
    query: {
      queryKey: getGetFeedQueryKey(),
    }
  });
  const { data: currentMemberData } = useGetCurrentMember({
    query: { queryKey: getGetCurrentMemberQueryKey() },
  });
  const { data: socialAccountsData } = useListSocialAccounts({
    query: { queryKey: getListSocialAccountsQueryKey() },
  });

  // Mutations
  const createPostMutation = useCreatePost({
    mutation: {
      onSuccess: () => {
        setCaption("");
        setSelectedFile(null);
        setPreviewUrl(null);
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        toast({ title: "Post created successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Failed to create post", description: err.message, variant: "destructive" });
      }
    }
  });

  const deletePostMutation = useDeleteOwnPost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        toast({ title: "Post deleted" });
      }
    }
  });

  const sharePostMutation = useSharePost({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      },
      onError: (err: Error) => {
        toast({ title: "Could not share post", description: err.message, variant: "destructive" });
      }
    }
  });

  const uploadImageMutation = useUploadImage({
    mutation: {
      onError: (error: Error) => {
        toast({
          title: "Image upload failed",
          description: error.message,
          variant: "destructive",
        });
      },
    },
  });
  const { data: sharePreview } = useGetPostSharePreview(
    sharingPostId,
    { platform: sharePlatform },
    { query: { enabled: Boolean(sharingPostId), queryKey: getGetPostSharePreviewQueryKey(sharingPostId, { platform: sharePlatform }) } },
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreatePost = async () => {
    if (!caption.trim() && !selectedFile) return;

    let imageUrl = null;

    if (selectedFile) {
      try {
        const uploadRes = await uploadImageMutation.mutateAsync({
          data: { image: selectedFile },
        });
        imageUrl = uploadRes.url;
      } catch {
        return;
      }
    }

    createPostMutation.mutate({
      data: {
        caption,
        imageUrl,
      }
    });
  };

  const handleDeletePost = (postId: string) => {
    deletePostMutation.mutate({ postId });
  };

  const handleSharePost = async (postId: string, platform: typeof sharePlatform) => {
    if (platform === "Direct Link" && sharePreview?.caption) {
      await navigator.clipboard?.writeText(sharePreview.caption);
    }
    try {
      const result = await sharePostMutation.mutateAsync({
        postId,
        data: {
          platform,
          ...(autoPost === null ? {} : { autoPost }),
        },
      });
      setAutoPostResults(result.autoPosted ?? {});
      const outcomes = Object.values(result.autoPosted ?? {});
      const failures = outcomes.filter((outcome) => outcome.status === "error").length;
      toast({
        title:
          failures > 0
            ? "Shared with some social posting issues"
            : "Post shared",
        description:
          outcomes.length > 0
            ? `${outcomes.length - failures} external post${outcomes.length - failures === 1 ? "" : "s"} completed.`
            : platform === "Direct Link"
              ? "Share text copied to your clipboard."
              : undefined,
        variant: failures > 0 ? "destructive" : "default",
      });
    } catch {
      // The mutation-level handler provides the member-facing error message.
    }
  };

  const activeConnectedPlatforms = new Set(
    (socialAccountsData?.accounts ?? [])
      .filter((account) => account.isActive)
      .map((account) => account.platform),
  );
  const selectedAutoPlatforms = (
    currentMemberData?.member.preferredPostPlatforms ?? []
  ).filter(
    (platform) =>
      platform !== "facebook" && activeConnectedPlatforms.has(platform),
  );

  return (
    <div className="max-w-3xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold">Chapter Feed</h1>
      </div>

      {/* Create Post */}
      <Card className="border-primary/20 shadow-md">
        <CardContent className="p-4 pt-6">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarFallback className="bg-primary/10 text-primary">{member?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="Share something with your chapter..."
                className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 text-lg bg-transparent"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                data-testid="input-post-caption"
              />
              
              {previewUrl && (
                <div className="relative rounded-md overflow-hidden border border-border">
                  <img src={previewUrl} alt="Preview" className="w-full max-h-[300px] object-cover" />
                  <Button 
                    variant="destructive" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 rounded-full"
                    onClick={handleClearImage}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-4 border-t border-border flex justify-between">
          <div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileChange}
              data-testid="input-post-image"
            />
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-primary hover:text-primary hover:bg-primary/10"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-attach-image"
            >
              <ImageIcon className="h-5 w-5 mr-2" />
              Attach Image
            </Button>
          </div>
          <Button 
            onClick={handleCreatePost} 
            disabled={(!caption.trim() && !selectedFile) || createPostMutation.isPending || uploadImageMutation.isPending}
            data-testid="button-create-post"
          >
            {createPostMutation.isPending || uploadImageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Post
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Feed List */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : feedData?.posts && feedData.posts.length > 0 ? (
          feedData.posts.map((post) => (
            <Card key={post.id} className="overflow-hidden" data-testid={`card-post-${post.id}`}>
              <CardHeader className="p-4 flex flex-row items-start space-y-0 gap-4">
                <Link href={`/members/${post.author.id}`}>
                  <Avatar className="h-10 w-10 cursor-pointer border border-border hover:border-primary transition-colors" data-testid={`link-author-${post.author.id}`}>
                    <AvatarImage src={post.author.profilePictureUrl || ""} alt={post.author.name} />
                    <AvatarFallback className="bg-primary/10 text-primary">{post.author.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start">
                    <div>
                      <Link href={`/members/${post.author.id}`} className="font-semibold hover:underline">
                        {post.author.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{post.author.title} at {post.author.company}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.isFeatured && (
                        <Badge variant="secondary" className="bg-primary/20 text-primary hover:bg-primary/30 border-none">
                          Featured
                        </Badge>
                      )}
                      
                      {post.author.id === member?.id && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDeletePost(post.id)}
                              data-testid={`button-delete-post-${post.id}`}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="whitespace-pre-wrap">{post.caption}</p>
                {post.imageUrl && (
                  <div className="mt-4 rounded-md overflow-hidden border border-border">
                    <img src={post.imageUrl} alt="Post attachment" className="w-full max-h-[500px] object-cover" />
                  </div>
                )}
              </CardContent>
              <CardFooter className="p-4 border-t border-border bg-muted/20">
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm text-muted-foreground">
                    {post.shareCount} {post.shareCount === 1 ? 'share' : 'shares'}
                  </span>
                  
                  <Dialog onOpenChange={(open) => {
                    if (open) {
                      setSharingPostId(post.id);
                      setSharePlatform("LinkedIn");
                       setAutoPost(
                         currentMemberData
                           ? currentMemberData.member.autoPostShares
                           : null,
                       );
                       setAutoPostResults(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="gap-2" data-testid={`button-share-post-${post.id}`}>
                        <Share2 className="h-4 w-4" />
                        Share
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Share this post</DialogTitle>
                        <DialogDescription>
                          Share this post to your network to increase its reach.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-3">
                          {(["LinkedIn", "Instagram", "Facebook", "TikTok", "Direct Link"] as const).map((platform) => (
                            <Button key={platform} variant={sharePlatform === platform ? "default" : "outline"} onClick={() => setSharePlatform(platform)} data-testid={`button-share-platform-${platform}`}>
                              {platform === "Direct Link" ? "Copy Link" : platform}
                            </Button>
                          ))}
                        </div>
                        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap" data-testid={`share-preview-${post.id}`}>
                          {sharePreview?.caption ?? "Preparing your platform-ready share text…"}
                        </div>
                         <div className="rounded-md border border-primary/20 bg-primary/5 p-3 space-y-3">
                           <div className="flex items-center justify-between gap-4">
                             <div>
                               <p className="text-sm font-medium">Auto-post connected accounts</p>
                               <p className="text-xs text-muted-foreground">
                                 You can change your saved platform selection from your profile.
                               </p>
                             </div>
                             <button
                               type="button"
                               role="switch"
                               aria-checked={Boolean(autoPost)}
                               disabled={selectedAutoPlatforms.length === 0}
                               onClick={() => setAutoPost(!autoPost)}
                               data-testid={`switch-auto-post-${post.id}`}
                               className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                 autoPost ? "bg-primary" : "bg-muted"
                               }`}
                             />
                           </div>
                           {selectedAutoPlatforms.length > 0 ? (
                             <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                               <span>{autoPost ? "Will also publish to:" : "Connected selections:"}</span>
                               {selectedAutoPlatforms.map((platform) => (
                                 <Badge key={platform} variant="secondary" className="capitalize">
                                   {platform}
                                 </Badge>
                               ))}
                             </div>
                           ) : (
                             <p className="text-xs text-muted-foreground">
                               Connect and select Facebook, LinkedIn, or Instagram in your profile to auto-post.
                             </p>
                           )}
                         </div>
                         {autoPostResults && Object.keys(autoPostResults).length > 0 && (
                           <div className="space-y-2 rounded-md border border-border p-3 text-sm">
                             <p className="font-medium">External posting results</p>
                             {Object.entries(autoPostResults).map(([platform, outcome]) => (
                               <div key={platform} className="flex items-start gap-2">
                                 {outcome.status === "success" ? (
                                   <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                 ) : (
                                   <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                                 )}
                                 <span className="capitalize font-medium">{platform}</span>
                                 <span className="text-muted-foreground">
                                   {outcome.status === "success"
                                     ? "published"
                                     : outcome.error ?? "could not be published"}
                                 </span>
                               </div>
                             ))}
                           </div>
                         )}
                         <Button
                           className="w-full"
                           onClick={() => handleSharePost(post.id, sharePlatform)}
                           disabled={sharePostMutation.isPending}
                           data-testid={`button-confirm-share-${post.id}`}
                         >
                           {sharePostMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                           Share to {sharePlatform === "Direct Link" ? "clipboard" : sharePlatform}
                         </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardFooter>
            </Card>
          ))
        ) : (
          <div className="text-center py-16 px-4 border border-dashed border-border rounded-lg bg-card/50">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Share2 className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
            <p className="text-muted-foreground">Be the first to share something with your chapter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
