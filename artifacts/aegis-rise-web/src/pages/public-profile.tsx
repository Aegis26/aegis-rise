import { Link } from "wouter";
import { 
  useGetMember, 
  useListMemberPosts,
  getGetMemberQueryKey,
  getListMemberPostsQueryKey,
  useGetCurrentMember,
  getGetCurrentMemberQueryKey
} from "@workspace/api-client-react";
import { Loader2, CalendarDays, Share2, MapPin, ArrowLeft, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PostGallery } from "@/components/feed/post-gallery";
import { ProfileHero } from "./components/profile-hero";

export default function PublicProfile({ memberId }: { memberId: string }) {
  const { data: currentMemberData } = useGetCurrentMember({
    query: {
      queryKey: getGetCurrentMemberQueryKey(),
    }
  });

  const { data: memberData, isLoading: memberLoading } = useGetMember(memberId, {
    query: {
      queryKey: getGetMemberQueryKey(memberId),
      enabled: !!memberId,
    }
  });

  const { data: postsData, isLoading: postsLoading } = useListMemberPosts(memberId, {}, {
    query: {
      queryKey: getListMemberPostsQueryKey(memberId, {}),
      enabled: !!memberId,
    }
  });

  if (memberLoading) {
    return (
      <div className="flex justify-center items-center py-24 w-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!memberData?.member) {
    return (
      <div className="max-w-4xl mx-auto w-full p-4 md:p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Member Not Found</h2>
        <p className="text-muted-foreground mb-6">The member you are looking for does not exist or has been removed.</p>
        <Button asChild>
          <Link href="/feed">Back to Feed</Link>
        </Button>
      </div>
    );
  }

  const member = memberData.member;

  const customColor = member.primaryColor;
  const bgColor = member.profileBackgroundColor;
  const wallpaperUrl = member.profileWallpaperUrl;
  const wallpaperScale = Math.min(
    200,
    Math.max(50, member.profileWallpaperScale || 100),
  );

  return (
    <div
      className="min-h-[calc(100vh-4rem)] w-full relative overflow-hidden"
      style={{ backgroundColor: bgColor }}
    >
      {/* Optional full-page wallpaper with parallax / fixed attachment */}
      {wallpaperUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-fixed opacity-15 pointer-events-none mix-blend-luminosity"
          style={{
            backgroundImage: `url(${wallpaperUrl})`,
            transform: `scale(${wallpaperScale / 100})`,
            transformOrigin: "center",
          }}
        />
      )}

      <div className="max-w-4xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-8 relative z-10">
        <div className="flex justify-between items-center mb-4">
          <Button variant="ghost" asChild className="-ml-4" data-testid="button-back-feed">
            <Link href="/feed">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Feed
            </Link>
          </Button>

          {currentMemberData?.member?.id !== member.id && (
            <Button asChild>
              <Link href={`/messages/new/${member.id}`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Link>
            </Button>
          )}
        </div>

        <ProfileHero
          member={{
            name: member.name,
            title: member.title,
            company: member.company,
            bio: member.bio,
            profilePictureUrl: member.profilePictureUrl,
          }}
          primaryColor={member.primaryColor}
          accentColor={member.accentColor || member.primaryColor}
          backgroundColor={member.profileBackgroundColor}
          wallpaperUrl={member.profileWallpaperUrl}
          wallpaperScale={member.profileWallpaperScale}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-2 space-y-6">
          <h2 className="text-2xl font-display font-bold border-b border-border pb-2">Recent Posts</h2>

          {postsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : postsData?.posts && postsData.posts.length > 0 ? (
            postsData.posts.map((post) => (
              <Card key={post.id} className="overflow-hidden bg-card/90 backdrop-blur-sm border-border shadow-sm">
                <CardHeader className="p-4 flex flex-row items-start space-y-0 gap-4">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={member.profilePictureUrl || ""} alt={member.name} />
                    <AvatarFallback style={{ backgroundColor: `${customColor}20`, color: customColor }}>
                      {member.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 flex flex-col">
                    <div className="font-semibold">{member.name}</div>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="whitespace-pre-wrap">{post.caption}</p>
                  <PostGallery
                    images={post.images}
                    legacyImageUrl={post.imageUrl}
                  />
                </CardContent>
                <div className="px-4 py-3 border-t border-border bg-muted/20 flex items-center gap-2 text-sm text-muted-foreground">
                  <Share2 className="h-4 w-4" />
                  {post.shareCount} {post.shareCount === 1 ? 'share' : 'shares'}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center py-16 px-4 border border-dashed border-border rounded-lg bg-card/50">
              <p className="text-muted-foreground">{member.name} hasn't shared any posts yet.</p>
            </div>
          )}
        </div>
        
        <div className="md:col-span-1 space-y-6">
           <Card className="bg-card/90 backdrop-blur-sm border-border shadow-sm sticky top-24">
            <CardHeader className="pb-3 border-b border-border">
              <h3 className="font-display font-semibold">About</h3>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
               <div className="flex items-start gap-3">
                 <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                 <div>
                   <p className="text-sm font-medium">Chapter</p>
                    <p className="text-sm text-muted-foreground">{member.chapter}</p>
                 </div>
               </div>
               
               <div className="flex items-start gap-3">
                 <CalendarDays className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                 <div>
                   <p className="text-sm font-medium">Joined</p>
                   <p className="text-sm text-muted-foreground">
                     {(member as any).createdAt ? new Date((member as any).createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : "Recently"}
                   </p>
                 </div>
               </div>
            </CardContent>
           </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
