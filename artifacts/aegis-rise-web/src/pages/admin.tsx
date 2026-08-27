import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useGetAdminOverview,
  useListAdminMembers,
  useListPendingMembers,
  useApproveMember,
  useDenyMember,
  useBanMember,
  useDeleteMember,
  useGetChapterSettings,
  useUpdateChapterSettings,
  useListAdminPosts,
  useFeaturePost,
  useUnfeaturePost,
  useDeleteAdminPost,
  useGetPostAnalytics,
  useGetMemberAnalytics,
  useGetShareAnalytics,
  useGetPlatformAnalytics,
  useGetShareTimeline,
  useGetChapterGuidelines,
  useUpdateChapterGuidelines,
  useListModerationLogs,
  getGetAdminOverviewQueryKey,
  getGetChapterSettingsQueryKey,
  getListAdminPostsQueryKey,
  getGetChapterGuidelinesQueryKey,
  getListModerationLogsQueryKey,
  getListAdminMembersQueryKey,
  getListPendingMembersQueryKey,
  type ChapterSettingsInput,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, FileText, Check, X, ShieldAlert, BarChart3, Settings } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Admin() {
  const { member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isAdmin = member?.role === "admin" || member?.role === "super_admin";

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-4 text-center">
        <ShieldAlert className="h-16 w-16 text-destructive mb-4" />
        <h1 className="text-3xl font-display font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground">You do not have administrative privileges for this chapter.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-display font-bold">Chapter Administration</h1>
        <p className="text-muted-foreground mt-2">Manage members, monitor activity, and configure settings.</p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50 border border-border">
          <TabsTrigger value="overview" className="py-2 data-[state=active]:bg-background">Overview</TabsTrigger>
          <TabsTrigger value="approvals" className="py-2 data-[state=active]:bg-background">Approvals</TabsTrigger>
          <TabsTrigger value="members" className="py-2 data-[state=active]:bg-background">Members</TabsTrigger>
          <TabsTrigger value="posts" className="py-2 data-[state=active]:bg-background">Posts</TabsTrigger>
          <TabsTrigger value="analytics" className="py-2 data-[state=active]:bg-background">Analytics</TabsTrigger>
          <TabsTrigger value="settings" className="py-2 data-[state=active]:bg-background">Settings</TabsTrigger>
          <TabsTrigger value="guidelines" className="py-2 data-[state=active]:bg-background">Guidelines</TabsTrigger>
          <TabsTrigger value="activity" className="py-2 data-[state=active]:bg-background">Activity</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="overview">
            <OverviewTab />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab />
          </TabsContent>

          <TabsContent value="members">
            <MembersTab />
          </TabsContent>
          <TabsContent value="posts"><PostsTab /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab /></TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
          <TabsContent value="guidelines"><GuidelinesTab /></TabsContent>
          <TabsContent value="activity"><ActivityTab /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function OverviewTab() {
  const { data: overviewData, isLoading } = useGetAdminOverview(undefined, {
    query: { queryKey: getGetAdminOverviewQueryKey() }
  });

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const overview = overviewData;

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Members</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview?.totalMembers || 0}</div>
          <p className="text-xs text-muted-foreground mt-1">
            {overview?.activeMembers || 0} active, {overview?.pendingApprovals || 0} pending
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview?.totalPosts || 0}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Shares</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{overview?.totalShares || 0}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Banned</CardTitle>
          <ShieldAlert className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{overview?.bannedMembers || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}

function ApprovalsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: pendingData, isLoading } = useListPendingMembers(undefined, {
    query: { queryKey: getListPendingMembersQueryKey() }
  });

  const approveMutation = useApproveMember({
    mutation: {
      onSuccess: () => {
        toast({ title: "Member approved" });
        queryClient.invalidateQueries({ queryKey: getListPendingMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAdminMembersQueryKey() });
      },
      onError: (err: any) => toast({ title: "Failed to approve", description: err.message, variant: "destructive" })
    }
  });

  const denyMutation = useDenyMember({
    mutation: {
      onSuccess: () => {
        toast({ title: "Member denied" });
        queryClient.invalidateQueries({ queryKey: getListPendingMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
      },
      onError: (err: any) => toast({ title: "Failed to deny", description: err.message, variant: "destructive" })
    }
  });

  const handleApprove = (memberId: string) => {
    approveMutation.mutate({ memberId });
  };

  const handleDeny = (memberId: string) => {
    denyMutation.mutate({ memberId, data: { reason: "Did not meet chapter requirements." } });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const members = pendingData?.members || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pending Approvals</CardTitle>
        <CardDescription>Review and approve new member applications for this chapter.</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
            No pending applications at this time.
          </div>
        ) : (
          <div className="space-y-4">
            {members.map(member => (
              <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border border-border rounded-lg bg-card" data-testid={`approval-row-${member.id}`}>
                <div className="mb-4 sm:mb-0">
                  <h4 className="font-semibold text-lg">{member.name}</h4>
                  <div className="text-sm text-muted-foreground mb-1">{member.title} at {member.company}</div>
                  <div className="text-xs text-muted-foreground">Applied: {new Date(member.createdAt).toLocaleDateString()}</div>
                  {member.bio && (
                    <div className="text-sm mt-2 p-2 bg-muted/30 rounded-md border border-border/50">
                      "{member.bio}"
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => handleDeny(member.id)}
                    disabled={denyMutation.isPending || approveMutation.isPending}
                    data-testid={`button-deny-${member.id}`}
                  >
                    <X className="h-4 w-4 mr-2" /> Deny
                  </Button>
                  <Button 
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => handleApprove(member.id)}
                    disabled={approveMutation.isPending || denyMutation.isPending}
                    data-testid={`button-approve-${member.id}`}
                  >
                    <Check className="h-4 w-4 mr-2" /> Approve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MembersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [memberPendingDeletion, setMemberPendingDeletion] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  const { data: membersData, isLoading } = useListAdminMembers(undefined, {
    query: { queryKey: getListAdminMembersQueryKey() }
  });

  const banMutation = useBanMember({
    mutation: {
      onSuccess: () => {
        toast({ title: "Member banned" });
        queryClient.invalidateQueries({ queryKey: getListAdminMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
      },
      onError: (err: any) => toast({ title: "Failed to ban", description: err.message, variant: "destructive" })
    }
  });

  const deleteMutation = useDeleteMember({
    mutation: {
      onSuccess: (result) => {
        toast({ title: "Member deleted", description: result.message });
        queryClient.invalidateQueries({ queryKey: getListAdminMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
        setMemberPendingDeletion(null);
        setDeleteConfirmationText("");
      },
      onError: (err: any) => toast({ title: "Failed to delete member", description: err.message, variant: "destructive" })
    }
  });

  const handleBan = (memberId: string) => {
    if (confirm("Are you sure you want to ban this member? This action is not easily reversible.")) {
      banMutation.mutate({ memberId, data: { reason: "Admin discretion." } });
    }
  };

  const handleConfirmDelete = () => {
    if (!memberPendingDeletion) return;
    deleteMutation.mutate({ memberId: memberPendingDeletion.id, data: { reason: "Admin discretion." } });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const members = membersData?.members || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Directory</CardTitle>
        <CardDescription>Manage active and banned members in your chapter.</CardDescription>
      </CardHeader>
      <CardContent>
        {members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
            No members found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-4 py-3 font-medium">Member</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} className="border-b border-border hover:bg-muted/20" data-testid={`member-row-${member.id}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary">{member.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">{member.name}</div>
                          <div className="text-xs text-muted-foreground">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">{member.role.replace("_", " ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={member.status === "active" ? "default" : member.status === "banned" ? "destructive" : "secondary"}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {member.status !== "banned" && member.role !== "super_admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                            onClick={() => handleBan(member.id)}
                            disabled={banMutation.isPending}
                            data-testid={`button-ban-${member.id}`}
                          >
                            Ban
                          </Button>
                        )}
                        {member.role !== "super_admin" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive h-8"
                            onClick={() => {
                              setMemberPendingDeletion({ id: member.id, name: member.name });
                              setDeleteConfirmationText("");
                            }}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-${member.id}`}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={memberPendingDeletion !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMemberPendingDeletion(null);
            setDeleteConfirmationText("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete {memberPendingDeletion?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the member's account, along with every post, share, and connected
              social account they own. This cannot be undone. Type the member's name below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={deleteConfirmationText}
            onChange={(event) => setDeleteConfirmationText(event.target.value)}
            placeholder={memberPendingDeletion?.name}
            data-testid="input-delete-confirmation"
            autoFocus
          />
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={
                deleteConfirmationText.trim() !== memberPendingDeletion?.name ||
                deleteMutation.isPending
              }
              onClick={(event) => {
                event.preventDefault();
                handleConfirmDelete();
              }}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function SettingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [chapterName, setChapterName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0EA5E9");
  const [secondaryColor, setSecondaryColor] = useState("#0F172A");
  const [chapterLogoUrl, setChapterLogoUrl] = useState("");
  const {
    data: settingsData,
    isLoading,
    isError,
  } = useGetChapterSettings(undefined, {
    query: { queryKey: getGetChapterSettingsQueryKey() },
  });
  const settings = settingsData?.settings;

  useEffect(() => {
    if (!settings) return;

    setChapterName(settings.chapterName);
    setDescription(settings.chapterDescription ?? "");
    setPrimaryColor(settings.primaryColor);
    setSecondaryColor(settings.secondaryColor);
    setChapterLogoUrl(settings.chapterLogoUrl ?? "");
  }, [settings]);

  const updateMutation = useUpdateChapterSettings({
    mutation: {
      onSuccess: (result) => {
        queryClient.setQueryData(getGetChapterSettingsQueryKey(), result);
        void queryClient.invalidateQueries({
          queryKey: getGetChapterSettingsQueryKey(),
        });
        toast({ title: "Settings updated successfully" });
      },
      onError: (err: any) => {
        toast({ title: "Update failed", description: err.message, variant: "destructive" });
      }
    }
  });

  const handleSave = () => {
    if (!settings) return;

    const trimmedName = chapterName.trim();
    if (!trimmedName) {
      toast({
        title: "Chapter name is required",
        variant: "destructive",
      });
      return;
    }

    const trimmedDescription = description.trim();
    const trimmedLogoUrl = chapterLogoUrl.trim();
    const changes: ChapterSettingsInput = {};

    if (trimmedName !== settings.chapterName) changes.chapterName = trimmedName;
    if (trimmedDescription !== (settings.chapterDescription ?? "")) {
      changes.chapterDescription = trimmedDescription || null;
    }
    if (primaryColor !== settings.primaryColor) changes.primaryColor = primaryColor;
    if (secondaryColor !== settings.secondaryColor) changes.secondaryColor = secondaryColor;
    if (trimmedLogoUrl !== (settings.chapterLogoUrl ?? "")) {
      changes.chapterLogoUrl = trimmedLogoUrl || null;
    }

    if (Object.keys(changes).length === 0) {
      toast({ title: "No settings changes to save" });
      return;
    }

    updateMutation.mutate({
      data: changes,
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (isError || !settings) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Chapter settings could not be loaded. Refresh the page and try again.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Chapter Settings
        </CardTitle>
        <CardDescription>Configure branding and basic details for this chapter.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Chapter Name</label>
          <Input 
            value={chapterName} 
            onChange={(e) => setChapterName(e.target.value)} 
            placeholder="e.g. Aegis Rise New York"
            data-testid="input-settings-name"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Description</label>
          <Textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)} 
            placeholder="About this chapter..."
            className="min-h-[100px]"
            data-testid="input-settings-desc"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Primary Color</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer p-1"
                data-testid="input-settings-primary-color"
              />
              <Input
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                pattern="^#[0-9A-Fa-f]{6}$"
                data-testid="input-settings-primary-color-hex"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Secondary Color</label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer p-1"
                data-testid="input-settings-secondary-color"
              />
              <Input
                value={secondaryColor}
                onChange={(e) => setSecondaryColor(e.target.value)}
                pattern="^#[0-9A-Fa-f]{6}$"
                data-testid="input-settings-secondary-color-hex"
              />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Chapter Logo URL</label>
          <Input
            type="url"
            value={chapterLogoUrl}
            onChange={(e) => setChapterLogoUrl(e.target.value)}
            placeholder="https://example.com/chapter-logo.png"
            data-testid="input-settings-logo-url"
          />
        </div>
        <Button 
          onClick={handleSave} 
          disabled={updateMutation.isPending || !chapterName.trim()}
          className="mt-4"
          data-testid="button-save-settings"
        >
          {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}

function PostsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useListAdminPosts({ limit: 50 });
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey({ limit: 50 }) });
  const feature = useFeaturePost({ mutation: { onSuccess: refresh } });
  const unfeature = useUnfeaturePost({ mutation: { onSuccess: refresh } });
  const remove = useDeleteAdminPost({ mutation: { onSuccess: () => { refresh(); toast({ title: "Post removed" }); } } });
  if (isLoading) return <LoadingCard />;
  return <Card><CardHeader><CardTitle>Post moderation</CardTitle><CardDescription>Feature high-value chapter content or remove posts that violate guidelines.</CardDescription></CardHeader><CardContent className="space-y-3">
    {(data?.posts ?? []).map((post) => <div key={post.postId} className="rounded-md border border-border p-4 flex gap-4 justify-between"><div><p className="font-medium">{post.author.name}</p><p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p></div><div className="flex gap-2 shrink-0"><Button size="sm" variant="outline" onClick={() => post.status === "featured" ? unfeature.mutate({ postId: post.postId }) : feature.mutate({ postId: post.postId })}>{post.status === "featured" ? "Unfeature" : "Feature"}</Button><Button size="sm" variant="destructive" onClick={() => remove.mutate({ postId: post.postId, data: { reason: "Removed by chapter administrator" } })}>Remove</Button></div></div>)}
    {!data?.posts.length && <p className="text-muted-foreground">No posts to moderate.</p>}
  </CardContent></Card>;
}

function AnalyticsTab() {
  const { data: posts } = useGetPostAnalytics();
  const { data: members } = useGetMemberAnalytics();
  const { data: shares } = useGetShareAnalytics();
  const { data: platforms } = useGetPlatformAnalytics();
  const { data: timeline } = useGetShareTimeline();
  const platformEntries = Object.entries(platforms ?? {}).filter(([key]) => key !== "totalShares");
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Total shares" value={shares?.totalShares ?? 0} /><Metric label="Shares this month" value={shares?.sharesThisMonth ?? 0} /><Metric label="Tracked posts" value={posts?.posts.length ?? 0} /></div>
    <Card><CardHeader><CardTitle>Platform breakdown</CardTitle></CardHeader><CardContent className="space-y-3">{platformEntries.map(([platform, count]) => <div key={platform}><div className="flex justify-between text-sm"><span>{platform}</span><span>{String(count)}</span></div><div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Number(count) / Math.max(1, Number(platforms?.totalShares ?? 1)) * 100)}%` }} /></div></div>)}</CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Top member activity</CardTitle></CardHeader><CardContent className="space-y-2">{(members?.members ?? []).slice(0, 8).map((m) => <div key={m.memberId} className="flex justify-between text-sm"><span>{m.name}</span><span>{m.postsCreated} posts · {m.sharesGiven} shares</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Share trend</CardTitle></CardHeader><CardContent className="flex items-end gap-1 h-40">{(timeline ?? []).slice(-30).map((point) => <div title={`${point.date}: ${point.shares}`} key={point.date} className="flex-1 bg-primary/70 rounded-t" style={{ height: `${Math.max(4, point.shares * 16)}px` }} />)}</CardContent></Card></div>
  </div>;
}

function GuidelinesTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetChapterGuidelines();
  const [guidelines, setGuidelines] = useState("");
  useEffect(() => { setGuidelines(data?.guidelinesText ?? ""); }, [data?.guidelinesText]);
  const update = useUpdateChapterGuidelines({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetChapterGuidelinesQueryKey() }); toast({ title: "Guidelines saved" }); } } });
  if (isLoading) return <LoadingCard />;
  return <Card><CardHeader><CardTitle>Chapter guidelines</CardTitle><CardDescription>Publish the expectations members see before participating.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea value={guidelines} onChange={(event) => setGuidelines(event.target.value)} className="min-h-64" data-testid="input-chapter-guidelines" /><Button onClick={() => update.mutate({ data: { guidelinesText: guidelines } })} disabled={update.isPending} data-testid="button-save-guidelines">{update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save guidelines</Button></CardContent></Card>;
}

function ActivityTab() {
  const { data, isLoading } = useListModerationLogs({ limit: 50 });
  if (isLoading) return <LoadingCard />;
  return <Card><CardHeader><CardTitle>Recent admin activity</CardTitle><CardDescription>Moderation and membership actions in this chapter.</CardDescription></CardHeader><CardContent className="space-y-3">{(data?.logs ?? []).map((log) => <div key={log.id} className="border-l-2 border-primary pl-3"><p className="font-medium capitalize">{log.action.replaceAll("_", " ")}</p><p className="text-sm text-muted-foreground">{new Date(log.date).toLocaleString()}</p></div>)}{!data?.logs.length && <p className="text-muted-foreground">No activity recorded yet.</p>}</CardContent></Card>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-display font-bold mt-1">{value}</p></CardContent></Card>;
}

function LoadingCard() {
  return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}
