import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  useGetAdminOverview,
  useListAdminChapters,
  useListAdminMembers,
  useListPendingMembers,
  useApproveMember,
  useDenyMember,
  useBanMember,
  useDeleteMember,
  useUpdateMemberRole,
  useUpdateMemberChapter,
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
  getListAdminChaptersQueryKey,
  getListAdminMembersQueryKey,
  getListPendingMembersQueryKey,
  getGetMemberActivityQueryKey,
  getGetPostAnalyticsQueryKey,
  getGetMemberAnalyticsQueryKey,
  getGetShareAnalyticsQueryKey,
  getGetPlatformAnalyticsQueryKey,
  getGetShareTimelineQueryKey,
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
  const [selectedChapter, setSelectedChapter] = useState("");

  const isAdmin = member?.role === "admin" || member?.role === "super_admin";
  const isSuperAdmin = member?.role === "super_admin";
  const chapter = selectedChapter || undefined;

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
        <h1 className="text-3xl font-display font-bold">
          {isSuperAdmin ? "Program Administration" : "Chapter Administration"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {isSuperAdmin
            ? "Manage applications, chapter administrators, and activity across the entire program."
            : "Manage members, monitor activity, and configure settings for your chapter."}
        </p>
      </div>

      {isSuperAdmin && (
        <MasterAdminScope
          selectedChapter={selectedChapter}
          onChapterChange={setSelectedChapter}
        />
      )}

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
            <OverviewTab chapter={chapter} />
          </TabsContent>

          <TabsContent value="approvals">
            <ApprovalsTab chapter={chapter} isSuperAdmin={isSuperAdmin} />
          </TabsContent>

          <TabsContent value="members">
            <MembersTab chapter={chapter} isSuperAdmin={isSuperAdmin} />
          </TabsContent>
          <TabsContent value="posts"><PostsTab chapter={chapter} /></TabsContent>
          <TabsContent value="analytics"><AnalyticsTab chapter={chapter} /></TabsContent>

          <TabsContent value="settings">
            <SettingsTab chapter={chapter} isSuperAdmin={isSuperAdmin} />
          </TabsContent>
          <TabsContent value="guidelines"><GuidelinesTab chapter={chapter} isSuperAdmin={isSuperAdmin} /></TabsContent>
          <TabsContent value="activity"><ActivityTab chapter={chapter} /></TabsContent>
        </div>
      </Tabs>
    </div>
  );
}

function MasterAdminScope({
  selectedChapter,
  onChapterChange,
}: {
  selectedChapter: string;
  onChapterChange: (chapter: string) => void;
}) {
  const { data, isLoading, isError } = useListAdminChapters();

  return (
    <Card className="border-primary/40 bg-primary/5" data-testid="master-admin-scope">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <CardTitle className="text-lg">Master admin scope</CardTitle>
            <CardDescription className="mt-1">
              {selectedChapter
                ? `Viewing and managing ${selectedChapter}.`
                : "Viewing applications and activity across every chapter."}
            </CardDescription>
          </div>
          <div className="w-full space-y-1.5 sm:w-72">
            <label htmlFor="admin-chapter-scope" className="text-sm font-medium">
              Chapter
            </label>
            <select
              id="admin-chapter-scope"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedChapter}
              onChange={(event) => onChapterChange(event.target.value)}
              disabled={isLoading || isError}
              data-testid="select-admin-chapter"
            >
              <option value="">All chapters</option>
              {(data?.chapters ?? []).map((chapter) => (
                <option key={chapter.name} value={chapter.name}>
                  {chapter.name} ({chapter.pendingCount} pending)
                </option>
              ))}
            </select>
            {isError && (
              <p className="text-xs text-destructive">
                Chapter choices could not be loaded.
              </p>
            )}
          </div>
        </div>
      </CardHeader>
    </Card>
  );
}

function OverviewTab({ chapter }: { chapter?: string }) {
  const params = chapter ? { chapter } : undefined;
  const { data: overviewData, isLoading } = useGetAdminOverview(params, {
    query: { queryKey: getGetAdminOverviewQueryKey(params) }
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

function ApprovalsTab({
  chapter,
  isSuperAdmin,
}: {
  chapter?: string;
  isSuperAdmin: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = chapter ? { chapter } : undefined;

  const { data: pendingData, isLoading } = useListPendingMembers(params, {
    query: { queryKey: getListPendingMembersQueryKey(params) }
  });

  const approveMutation = useApproveMember({
    mutation: {
      onSuccess: () => {
        toast({ title: "Member approved" });
        queryClient.invalidateQueries({ queryKey: getListPendingMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAdminMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAdminChaptersQueryKey() });
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
        queryClient.invalidateQueries({ queryKey: getListAdminChaptersQueryKey() });
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
        <CardDescription>
          {isSuperAdmin && !chapter
            ? "Review and approve new member applications across every chapter."
            : `Review and approve new member applications${chapter ? ` for ${chapter}` : " for your chapter"}.`}
        </CardDescription>
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
                   {isSuperAdmin && (
                     <Badge variant="outline" className="mb-2">
                       {member.chapter}
                     </Badge>
                   )}
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

function MembersTab({
  chapter,
  isSuperAdmin,
}: {
  chapter?: string;
  isSuperAdmin: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [memberPendingDeletion, setMemberPendingDeletion] = useState<{ id: string; name: string } | null>(null);
  const [memberPendingRoleChange, setMemberPendingRoleChange] = useState<{
    id: string;
    name: string;
    chapter: string;
    role: "member" | "admin";
  } | null>(null);
  const [memberPendingChapterChange, setMemberPendingChapterChange] = useState<{
    id: string;
    name: string;
    currentChapter: string;
    nextChapter: string;
    role: "member" | "admin";
  } | null>(null);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const params = chapter ? { chapter } : undefined;

  const { data: membersData, isLoading } = useListAdminMembers(params, {
    query: { queryKey: getListAdminMembersQueryKey(params) }
  });
  const { data: chaptersData, isLoading: chaptersLoading } =
    useListAdminChapters({
      query: {
        queryKey: getListAdminChaptersQueryKey(),
        enabled: isSuperAdmin,
      },
    });

  const banMutation = useBanMember({
    mutation: {
      onSuccess: () => {
        toast({ title: "Member banned" });
        queryClient.invalidateQueries({ queryKey: getListAdminMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetAdminOverviewQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAdminChaptersQueryKey() });
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
        queryClient.invalidateQueries({ queryKey: getListAdminChaptersQueryKey() });
        setMemberPendingDeletion(null);
        setDeleteConfirmationText("");
      },
      onError: (err: any) => toast({ title: "Failed to delete member", description: err.message, variant: "destructive" })
    }
  });

  const roleMutation = useUpdateMemberRole({
    mutation: {
      onSuccess: (result) => {
        const isAdmin = result.member.role === "admin";
        toast({
          title: isAdmin ? "Chapter admin assigned" : "Chapter admin removed",
          description: `${result.member.name} is now ${isAdmin ? `an admin for ${result.member.chapter}` : "a regular member"}.`,
        });
        queryClient.invalidateQueries({ queryKey: getListAdminMembersQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListModerationLogsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAdminChaptersQueryKey() });
        setMemberPendingRoleChange(null);
      },
      onError: (err: any) =>
        toast({
          title: "Failed to update permissions",
          description: err.message,
          variant: "destructive",
        }),
    },
  });

  const chapterMutation = useUpdateMemberChapter({
    mutation: {
      onSuccess: (result) => {
        const previousChapter =
          memberPendingChapterChange?.currentChapter ?? "their previous chapter";
        toast({
          title: "Member chapter updated",
          description: `${result.member.name} moved from ${previousChapter} to ${result.member.chapter}.`,
        });
        queryClient.invalidateQueries({
          queryKey: getListAdminMembersQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListPendingMembersQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListAdminChaptersQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetAdminOverviewQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListModerationLogsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getListAdminPostsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetPostAnalyticsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetMemberAnalyticsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetShareAnalyticsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetPlatformAnalyticsQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetShareTimelineQueryKey(),
        });
        queryClient.invalidateQueries({
          queryKey: getGetMemberActivityQueryKey(result.member.id),
        });
        setMemberPendingChapterChange(null);
      },
      onError: (err: any) =>
        toast({
          title: "Failed to update chapter",
          description: err.message,
          variant: "destructive",
        }),
    },
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

  const handleConfirmRoleChange = () => {
    if (!memberPendingRoleChange) return;
    roleMutation.mutate({
      memberId: memberPendingRoleChange.id,
      data: {
        role: memberPendingRoleChange.role === "admin" ? "member" : "admin",
      },
    });
  };

  const handleConfirmChapterChange = () => {
    if (!memberPendingChapterChange) return;
    chapterMutation.mutate({
      memberId: memberPendingChapterChange.id,
      data: { chapter: memberPendingChapterChange.nextChapter },
    });
  };

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const members = membersData?.members || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isSuperAdmin && !chapter ? "Program Directory" : "Directory"}</CardTitle>
        <CardDescription>
          {isSuperAdmin && !chapter
            ? "Manage members and chapter administrators across the entire program."
            : `Manage active and banned members${chapter ? ` in ${chapter}` : " in your chapter"}.`}
        </CardDescription>
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
                   {isSuperAdmin && <th className="px-4 py-3 font-medium">Chapter</th>}
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
                    {isSuperAdmin && (
                      <td className="px-4 py-3">
                        {member.role === "super_admin" ? (
                          <span>{member.chapter}</span>
                        ) : (
                          <select
                            aria-label={`Chapter for ${member.name}`}
                            className="flex h-9 min-w-44 rounded-md border border-input bg-background px-3 py-1 text-sm"
                            value={member.chapter}
                            onChange={(event) => {
                              const nextChapter = event.target.value;
                              if (nextChapter === member.chapter) return;
                              setMemberPendingChapterChange({
                                id: member.id,
                                name: member.name,
                                currentChapter: member.chapter,
                                nextChapter,
                                role:
                                  member.role === "admin" ? "admin" : "member",
                              });
                            }}
                            disabled={
                              chaptersLoading || chapterMutation.isPending
                            }
                            data-testid={`select-member-chapter-${member.id}`}
                          >
                            {(chaptersData?.chapters ?? []).map(
                              (chapterOption) => (
                                <option
                                  key={chapterOption.name}
                                  value={chapterOption.name}
                                >
                                  {chapterOption.name}
                                </option>
                              ),
                            )}
                          </select>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <Badge variant={member.role === "super_admin" ? "default" : "outline"}>
                        {member.role === "super_admin"
                          ? "Master admin"
                          : member.role === "admin"
                            ? "Chapter admin"
                            : "Member"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={member.status === "active" ? "default" : member.status === "banned" ? "destructive" : "secondary"}>
                        {member.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                         {isSuperAdmin &&
                           member.status === "active" &&
                           member.role !== "super_admin" && (
                             <Button
                               variant="outline"
                               size="sm"
                               className="h-8"
                               onClick={() =>
                                 setMemberPendingRoleChange({
                                   id: member.id,
                                   name: member.name,
                                   chapter: member.chapter,
                                   role: member.role === "admin" ? "admin" : "member",
                                 })
                               }
                               disabled={roleMutation.isPending}
                               data-testid={`button-role-${member.id}`}
                             >
                               {member.role === "admin"
                                 ? "Remove admin"
                                 : "Make chapter admin"}
                             </Button>
                           )}
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

      {memberPendingRoleChange && (
      <AlertDialog
        open
        onOpenChange={(open) => {
          if (!open) setMemberPendingRoleChange(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {memberPendingRoleChange.role === "admin"
                ? `Remove ${memberPendingRoleChange.name}'s admin permissions?`
                : `Make ${memberPendingRoleChange.name} a chapter admin?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {memberPendingRoleChange.role === "admin"
                ? `${memberPendingRoleChange.name} will no longer be able to approve members or manage ${memberPendingRoleChange.chapter}.`
                : `${memberPendingRoleChange.name} will be able to approve members and manage content, settings, and activity only for ${memberPendingRoleChange.chapter}. This does not grant program-wide master-admin access.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-role">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                handleConfirmRoleChange();
              }}
              disabled={roleMutation.isPending}
              data-testid="button-confirm-role"
            >
              {roleMutation.isPending
                ? "Saving..."
                : memberPendingRoleChange.role === "admin"
                  ? "Remove admin permissions"
                  : "Assign chapter admin"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      )}

      {memberPendingChapterChange && (
        <AlertDialog
          open
          onOpenChange={(open) => {
            if (!open) setMemberPendingChapterChange(null);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Move {memberPendingChapterChange.name} to{" "}
                {memberPendingChapterChange.nextChapter}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This changes the chapter directory, feed, settings, and
                administration scope available to{" "}
                {memberPendingChapterChange.name}. Their account status, posts,
                shares, social connections, and{" "}
                {memberPendingChapterChange.role === "admin"
                  ? "chapter-admin role"
                  : "member role"}{" "}
                will stay the same.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="rounded-md border border-border bg-muted/30 px-4 py-3 text-sm">
              <span className="font-medium">
                {memberPendingChapterChange.currentChapter}
              </span>{" "}
              <span className="text-muted-foreground">→</span>{" "}
              <span className="font-medium">
                {memberPendingChapterChange.nextChapter}
              </span>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-chapter">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  handleConfirmChapterChange();
                }}
                disabled={chapterMutation.isPending}
                data-testid="button-confirm-chapter"
              >
                {chapterMutation.isPending ? "Moving..." : "Move member"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Card>
  );
}

function SettingsTab({
  chapter,
  isSuperAdmin,
}: {
  chapter?: string;
  isSuperAdmin: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const params = chapter ? { chapter } : undefined;
  const [chapterName, setChapterName] = useState("");
  const [description, setDescription] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#0EA5E9");
  const [secondaryColor, setSecondaryColor] = useState("#0F172A");
  const [chapterLogoUrl, setChapterLogoUrl] = useState("");
  const {
    data: settingsData,
    isLoading,
    isError,
  } = useGetChapterSettings(params, {
    query: { queryKey: getGetChapterSettingsQueryKey(params) },
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
        queryClient.setQueryData(getGetChapterSettingsQueryKey(params), result);
        void queryClient.invalidateQueries({
          queryKey: getGetChapterSettingsQueryKey(params),
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
      params,
    });
  };

  if (isSuperAdmin && !chapter) {
    return <ChapterSelectionRequired area="chapter settings" />;
  }

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

function PostsTab({ chapter }: { chapter?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = chapter ? { limit: 50, chapter } : { limit: 50 };
  const { data, isLoading } = useListAdminPosts(params);
  const refresh = () => queryClient.invalidateQueries({ queryKey: getListAdminPostsQueryKey(params) });
  const feature = useFeaturePost({ mutation: { onSuccess: refresh } });
  const unfeature = useUnfeaturePost({ mutation: { onSuccess: refresh } });
  const remove = useDeleteAdminPost({ mutation: { onSuccess: () => { refresh(); toast({ title: "Post removed" }); } } });
  if (isLoading) return <LoadingCard />;
  return <Card><CardHeader><CardTitle>Post moderation</CardTitle><CardDescription>{chapter ? `Feature or remove content in ${chapter}.` : "Feature or remove content across the program."}</CardDescription></CardHeader><CardContent className="space-y-3">
    {(data?.posts ?? []).map((post) => <div key={post.postId} className="rounded-md border border-border p-4 flex gap-4 justify-between"><div><p className="font-medium">{post.author.name} <span className="font-normal text-muted-foreground">· {post.author.chapter}</span></p><p className="text-sm text-muted-foreground line-clamp-2">{post.caption}</p></div><div className="flex gap-2 shrink-0"><Button size="sm" variant="outline" onClick={() => post.status === "featured" ? unfeature.mutate({ postId: post.postId }) : feature.mutate({ postId: post.postId })}>{post.status === "featured" ? "Unfeature" : "Feature"}</Button><Button size="sm" variant="destructive" onClick={() => remove.mutate({ postId: post.postId, data: { reason: "Removed by administrator" } })}>Remove</Button></div></div>)}
    {!data?.posts.length && <p className="text-muted-foreground">No posts to moderate.</p>}
  </CardContent></Card>;
}

function AnalyticsTab({ chapter }: { chapter?: string }) {
  const params = chapter ? { chapter } : undefined;
  const { data: posts } = useGetPostAnalytics(params);
  const { data: members } = useGetMemberAnalytics(params);
  const { data: shares } = useGetShareAnalytics(params);
  const { data: platforms } = useGetPlatformAnalytics(params);
  const { data: timeline } = useGetShareTimeline(params);
  const platformEntries = Object.entries(platforms ?? {}).filter(([key]) => key !== "totalShares");
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3"><Metric label="Total shares" value={shares?.totalShares ?? 0} /><Metric label="Shares this month" value={shares?.sharesThisMonth ?? 0} /><Metric label="Tracked posts" value={posts?.posts.length ?? 0} /></div>
    <Card><CardHeader><CardTitle>Platform breakdown</CardTitle></CardHeader><CardContent className="space-y-3">{platformEntries.map(([platform, count]) => <div key={platform}><div className="flex justify-between text-sm"><span>{platform}</span><span>{String(count)}</span></div><div className="h-2 rounded bg-muted overflow-hidden"><div className="h-full bg-primary" style={{ width: `${Math.min(100, Number(count) / Math.max(1, Number(platforms?.totalShares ?? 1)) * 100)}%` }} /></div></div>)}</CardContent></Card>
    <div className="grid gap-6 lg:grid-cols-2"><Card><CardHeader><CardTitle>Top member activity</CardTitle></CardHeader><CardContent className="space-y-2">{(members?.members ?? []).slice(0, 8).map((m) => <div key={m.memberId} className="flex justify-between text-sm"><span>{m.name}</span><span>{m.postsCreated} posts · {m.sharesGiven} shares</span></div>)}</CardContent></Card><Card><CardHeader><CardTitle>Share trend</CardTitle></CardHeader><CardContent className="flex items-end gap-1 h-40">{(timeline ?? []).slice(-30).map((point) => <div title={`${point.date}: ${point.shares}`} key={point.date} className="flex-1 bg-primary/70 rounded-t" style={{ height: `${Math.max(4, point.shares * 16)}px` }} />)}</CardContent></Card></div>
  </div>;
}

function GuidelinesTab({
  chapter,
  isSuperAdmin,
}: {
  chapter?: string;
  isSuperAdmin: boolean;
}) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const params = chapter ? { chapter } : undefined;
  const { data, isLoading } = useGetChapterGuidelines(params);
  const [guidelines, setGuidelines] = useState("");
  useEffect(() => { setGuidelines(data?.guidelinesText ?? ""); }, [data?.guidelinesText]);
  const update = useUpdateChapterGuidelines({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetChapterGuidelinesQueryKey(params) }); toast({ title: "Guidelines saved" }); } } });
  if (isSuperAdmin && !chapter) return <ChapterSelectionRequired area="chapter guidelines" />;
  if (isLoading) return <LoadingCard />;
  return <Card><CardHeader><CardTitle>Chapter guidelines</CardTitle><CardDescription>Publish the expectations members see before participating.</CardDescription></CardHeader><CardContent className="space-y-4"><Textarea value={guidelines} onChange={(event) => setGuidelines(event.target.value)} className="min-h-64" data-testid="input-chapter-guidelines" /><Button onClick={() => update.mutate({ data: { guidelinesText: guidelines }, params })} disabled={update.isPending} data-testid="button-save-guidelines">{update.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Save guidelines</Button></CardContent></Card>;
}

function ActivityTab({ chapter }: { chapter?: string }) {
  const params = chapter ? { limit: 50, chapter } : { limit: 50 };
  const { data, isLoading } = useListModerationLogs(params);
  if (isLoading) return <LoadingCard />;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent admin activity</CardTitle>
        <CardDescription>
          {chapter
            ? `Moderation and membership actions in ${chapter}.`
            : "Moderation and membership actions across every chapter."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {(data?.logs ?? []).map((log) => (
          <div key={log.id} className="border-l-2 border-primary pl-3">
            <p className="font-medium capitalize">
              {log.action.replaceAll("_", " ")}
            </p>
            <p className="text-sm">{log.target}</p>
            {log.reason && (
              <p className="text-sm text-muted-foreground">{log.reason}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {log.chapter} · {new Date(log.date).toLocaleString()}
            </p>
          </div>
        ))}
        {!data?.logs.length && (
          <p className="text-muted-foreground">No activity recorded yet.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ChapterSelectionRequired({ area }: { area: string }) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="font-medium">Select a chapter to manage {area}.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Use the master admin scope menu above. These settings cannot be changed
          across all chapters at once.
        </p>
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-display font-bold mt-1">{value}</p></CardContent></Card>;
}

function LoadingCard() {
  return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
}
