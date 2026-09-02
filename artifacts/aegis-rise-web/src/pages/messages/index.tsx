import { useLocation } from "wouter";
import { ConversationList } from "./conversation-list";
import { Thread } from "./thread";

type MessagesProps = {
  conversationId?: string;
  newMemberId?: string;
};

export default function Messages({ conversationId, newMemberId }: MessagesProps) {
  // Mobile single-column behavior:
  // If we have a conversationId or newMemberId, we show the Thread view on mobile, hiding the list.
  // Otherwise, we show the List view on mobile, hiding the thread.
  // On desktop, we always show both side-by-side.

  const showThreadMobile = !!conversationId || !!newMemberId;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden bg-background md:h-[calc(100vh)]">
      {/* Left Column: Conversation List */}
      <div
        className={`flex-col border-r border-border bg-card w-full md:w-80 lg:w-96 md:flex ${
          showThreadMobile ? "hidden" : "flex"
        }`}
      >
        <ConversationList
          activeConversationId={conversationId}
        />
      </div>

      {/* Right Column: Thread */}
      <div
        className={`flex-1 flex-col bg-background ${
          showThreadMobile ? "flex" : "hidden md:flex"
        }`}
      >
        {(conversationId || newMemberId) ? (
          <Thread
            conversationId={conversationId}
            newMemberId={newMemberId}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-muted-foreground bg-muted/5">
            <div className="rounded-full bg-muted p-6 mb-4">
              <svg
                className="h-12 w-12 text-muted-foreground/50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <p className="text-lg font-medium text-foreground">Your Messages</p>
            <p className="text-sm">Select a conversation or start a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
}
