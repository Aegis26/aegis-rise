import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Loader2, Search, MessageSquarePlus, Clock, Circle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

import { 
  useListDirectConversations, 
  getListDirectConversationsQueryKey,
  useListMembers,
  getListMembersQueryKey,
  useGetCurrentMember,
  getGetCurrentMemberQueryKey
} from "@workspace/api-client-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";

export function ConversationList({ activeConversationId }: { activeConversationId?: string }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useLocation();

  const { data: memberData } = useGetCurrentMember({
    query: {
      queryKey: getGetCurrentMemberQueryKey(),
    }
  });

  const { data: convData, isLoading: convLoading } = useListDirectConversations({
    query: {
      queryKey: getListDirectConversationsQueryKey(),
      refetchInterval: 10000,
    }
  });

  const { data: membersData, isLoading: membersLoading } = useListMembers({
    query: {
      queryKey: getListMembersQueryKey(),
      enabled: searchQuery.length > 1,
    }
  });

  const conversations = convData?.conversations || [];
  
  // Search results logic
  const searchResults = useMemo(() => {
    if (searchQuery.length < 2 || !membersData?.members) return null;
    const lowerQuery = searchQuery.toLowerCase();
    
    return membersData.members.filter(m => 
      m.id !== memberData?.member?.id && 
      (m.name.toLowerCase().includes(lowerQuery) || 
       m.title.toLowerCase().includes(lowerQuery) || 
       m.company.toLowerCase().includes(lowerQuery))
    );
  }, [searchQuery, membersData, memberData]);

  return (
    <div className="flex h-full flex-col">
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-display font-bold">Messages</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search messages or members..." 
            className="pl-9 bg-muted/50 border-border/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        {searchQuery.length > 1 ? (
          <div className="p-2 space-y-1">
            <h3 className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Directory
            </h3>
            {membersLoading ? (
              <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : searchResults && searchResults.length > 0 ? (
              searchResults.map((member) => (
                <Link key={member.id} href={`/messages/new/${member.id}`} onClick={() => setSearchQuery("")}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors cursor-pointer group">
                    <Avatar className="h-10 w-10 border border-border/50">
                      <AvatarImage src={member.profilePictureUrl || ""} alt={member.name} />
                      <AvatarFallback className="bg-primary/5 text-primary text-xs font-semibold">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{member.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{member.company}</p>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">No members found.</div>
            )}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {convLoading ? (
               <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : conversations.length > 0 ? (
              conversations.map((conv) => {
                const isUnread = conv.unreadCount > 0;
                const isActive = activeConversationId === conv.id;
                
                return (
                  <Link key={conv.id} href={`/messages/${conv.id}`}>
                    <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer group ${
                      isActive ? 'bg-primary/10 border border-primary/20' : 'hover:bg-accent border border-transparent'
                    }`}>
                      <div className="relative">
                        <Avatar className="h-12 w-12 border border-border/50">
                          <AvatarImage src={conv.peer.profilePictureUrl || ""} alt={conv.peer.name} />
                          <AvatarFallback className="bg-primary/5 text-primary text-sm font-semibold">
                            {conv.peer.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        {conv.peer.online && (
                          <div className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-background" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex justify-between items-baseline mb-0.5">
                          <p className={`text-sm truncate ${isUnread ? 'font-bold text-foreground' : 'font-medium text-foreground/90'}`}>
                            {conv.peer.name}
                          </p>
                          <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                            {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: false })}
                          </span>
                        </div>
                        
                        <div className="flex justify-between items-center gap-2">
                          <p className={`text-xs truncate ${isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                            {conv.peer.typing ? (
                              <span className="text-primary animate-pulse font-medium">typing...</span>
                            ) : conv.lastMessage ? (
                              <>
                                {conv.lastMessage.isOwn && <span className="mr-1 opacity-70">You:</span>}
                                {conv.lastMessage.body}
                              </>
                            ) : (
                              "No messages yet"
                            )}
                          </p>
                          
                          {isUnread && (
                            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="p-8 text-center flex flex-col items-center">
                <div className="rounded-full bg-muted/50 p-4 mb-3">
                  <MessageSquarePlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium mb-1">No conversations yet</p>
                <p className="text-xs text-muted-foreground text-center">
                  Search above to find chapter members and start connecting.
                </p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
