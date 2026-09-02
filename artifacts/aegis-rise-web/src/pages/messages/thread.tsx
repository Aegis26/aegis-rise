import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  MoreVertical, 
  ShieldBan, 
  Loader2, 
  User as UserIcon,
  Check,
  CheckCheck
} from "lucide-react";

import {
  useGetDirectConversation,
  getGetDirectConversationQueryKey,
  useGetMember,
  getGetMemberQueryKey,
  useMarkDirectMessagesRead,
  useBlockDirectMember,
  useUnblockDirectMember,
  getListDirectConversationsQueryKey,
  getGetDirectUnreadCountQueryKey,
  DirectConversationThread
} from "@workspace/api-client-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Composer } from "./composer";

interface ThreadProps {
  conversationId?: string;
  newMemberId?: string;
}

export function Thread({ conversationId, newMemberId }: ThreadProps) {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Queries
  const { data: convData, isLoading: convLoading } = useGetDirectConversation(
    conversationId || "",
    {},
    {
      query: {
        queryKey: getGetDirectConversationQueryKey(conversationId || ""),
        enabled: !!conversationId,
        refetchInterval: 3000, // Poll every 3 seconds for active thread
        refetchOnWindowFocus: true,
      }
    }
  );

  const { data: newMemberData, isLoading: newMemberLoading } = useGetMember(
    newMemberId || "",
    {
      query: {
        queryKey: getGetMemberQueryKey(newMemberId || ""),
        enabled: !!newMemberId && !conversationId,
      }
    }
  );

  const markReadMutation = useMarkDirectMessagesRead();
  const blockMutation = useBlockDirectMember();
  const unblockMutation = useUnblockDirectMember();

  // Derived state
  const thread: DirectConversationThread | undefined = convData;
  const messages = thread?.messages || [];
  const peer = thread?.conversation.peer || (newMemberData?.member ? {
    id: newMemberData.member.id,
    name: newMemberData.member.name,
    title: newMemberData.member.title,
    company: newMemberData.member.company,
    profilePictureUrl: newMemberData.member.profilePictureUrl || null,
    online: false,
    typing: false,
    isBlocked: false,
    hasBlockedYou: false
  } : undefined);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Mark read
  useEffect(() => {
    if (thread && thread.conversation.unreadCount > 0 && messages.length > 0) {
      // Find newest received unread message by comparing createdAt
      const receivedUnread = messages.filter(m => !m.isOwn && !m.readAt);
      if (receivedUnread.length > 0) {
        const newestMsg = receivedUnread.reduce((newest, current) => {
          return new Date(current.createdAt) > new Date(newest.createdAt) ? current : newest;
        });
        
        markReadMutation.mutate({
          conversationId: thread.conversation.id,
          data: { messageId: newestMsg.id }
        }, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListDirectConversationsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDirectUnreadCountQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetDirectConversationQueryKey(thread.conversation.id) });
          }
        });
      }
    }
  }, [thread?.conversation.unreadCount, messages.length, thread?.conversation.id]); // only re-run if unreadCount or message length changes

  // Handlers
  const handleBlock = () => {
    if (!peer) return;
    if (window.confirm(`Are you sure you want to block ${peer.name}? You will no longer receive messages from them.`)) {
      blockMutation.mutate({ memberId: peer.id }, {
        onSuccess: () => {
          if (conversationId) {
            queryClient.invalidateQueries({ queryKey: getGetDirectConversationQueryKey(conversationId) });
          }
          queryClient.invalidateQueries({ queryKey: getListDirectConversationsQueryKey() });
        }
      });
    }
  };

  const handleUnblock = () => {
    if (!peer) return;
    unblockMutation.mutate({ memberId: peer.id }, {
      onSuccess: () => {
        if (conversationId) {
          queryClient.invalidateQueries({ queryKey: getGetDirectConversationQueryKey(conversationId) });
        }
        queryClient.invalidateQueries({ queryKey: getListDirectConversationsQueryKey() });
      }
    });
  };

  const handleSendSuccess = (data: any) => {
    queryClient.invalidateQueries({ queryKey: getListDirectConversationsQueryKey() });
    
    if (conversationId) {
      queryClient.invalidateQueries({ queryKey: getGetDirectConversationQueryKey(conversationId) });
    } else if (data?.conversationId) {
      setLocation(`/messages/${data.conversationId}`);
    }
  };

  if (convLoading || newMemberLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!peer) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground">
        <p className="text-lg">Conversation not found</p>
        <Button variant="link" onClick={() => setLocation("/messages")}>Go back</Button>
      </div>
    );
  }

  const isBlockedByBoth = peer.isBlocked && peer.hasBlockedYou;
  const isMessagingDisabled = peer.isBlocked || peer.hasBlockedYou;

  return (
    <div className="flex flex-col h-full bg-background relative">
      {/* Header */}
      <div className="h-16 border-b border-border flex items-center px-4 justify-between bg-card/50 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setLocation("/messages")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div className="relative">
            <Avatar className="h-10 w-10 border border-border">
              <AvatarImage src={peer.profilePictureUrl || ""} alt={peer.name} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {peer.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            {peer.online && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
            )}
          </div>
          
          <div className="flex flex-col">
            <span className="font-semibold text-sm leading-tight flex items-center gap-2">
              {peer.name}
              {peer.hasBlockedYou && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-sm">Cannot receive messages</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground leading-tight truncate max-w-[200px]">
              {peer.typing ? (
                <span className="text-primary font-medium">typing...</span>
              ) : peer.online ? (
                <span className="text-green-600 font-medium">Online</span>
              ) : (
                <span className="opacity-80">{peer.title}</span>
              )}
            </span>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/members/${peer.id}`} className="cursor-pointer flex items-center">
                <UserIcon className="h-4 w-4 mr-2" />
                View Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {peer.isBlocked ? (
              <DropdownMenuItem onClick={handleUnblock} className="cursor-pointer">
                <ShieldBan className="h-4 w-4 mr-2" />
                Unblock Member
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={handleBlock} className="text-destructive cursor-pointer">
                <ShieldBan className="h-4 w-4 mr-2" />
                Block Member
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin flex flex-col"
      >
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
            <Avatar className="h-20 w-20 mb-4 opacity-50 grayscale">
              <AvatarImage src={peer.profilePictureUrl || ""} />
              <AvatarFallback>{peer.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <h3 className="font-semibold text-foreground">Start the conversation</h3>
            <p className="text-sm mt-1 max-w-xs">
              Messages are private and discreet. Say hello to {peer.name}.
            </p>
          </div>
        ) : (
          <div className="flex flex-col justify-end min-h-full space-y-4 pt-4">
            {messages.map((msg, idx) => {
              const showDate = idx === 0 || new Date(messages[idx-1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString();
              
              return (
                <div key={msg.id} className="flex flex-col">
                  {showDate && (
                    <div className="flex justify-center my-6">
                      <span className="text-xs font-medium text-muted-foreground bg-muted/30 px-3 py-1 rounded-full backdrop-blur-sm">
                        {format(new Date(msg.createdAt), "MMMM d, yyyy")}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex w-full ${msg.isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`flex flex-col max-w-[75%] md:max-w-[65%] ${msg.isOwn ? "items-end" : "items-start"}`}>
                      <div 
                        className={`px-4 py-2.5 rounded-2xl relative group ${
                          msg.isOwn 
                            ? "bg-primary text-primary-foreground rounded-br-sm" 
                            : "bg-muted text-foreground rounded-bl-sm"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{msg.body}</p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 mt-1 px-1">
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(msg.createdAt), "h:mm a")}
                        </span>
                        {msg.isOwn && (
                          <span className="text-muted-foreground/70">
                            {msg.readAt ? (
                              <CheckCheck className="h-3.5 w-3.5 text-primary" />
                            ) : (
                              <Check className="h-3 w-3" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Notice overlays for blocks */}
      {isMessagingDisabled && (
        <div className="bg-muted/80 backdrop-blur-sm p-3 text-center border-t border-border shrink-0">
          <p className="text-sm text-muted-foreground font-medium">
            {isBlockedByBoth 
              ? "You both have blocked each other." 
              : peer.isBlocked 
                ? `You blocked ${peer.name}. Unblock to send messages.` 
                : `${peer.name} is not receiving messages right now.`}
          </p>
          {peer.isBlocked && (
            <Button variant="link" size="sm" onClick={handleUnblock} className="h-auto py-1 px-0 mt-1">
              Unblock
            </Button>
          )}
        </div>
      )}

      {/* Composer */}
      {!isMessagingDisabled && (
        <div className="shrink-0 z-10">
          <Composer 
            recipientId={peer.id} 
            conversationId={conversationId} 
            onSendSuccess={handleSendSuccess} 
          />
        </div>
      )}
    </div>
  );
}
