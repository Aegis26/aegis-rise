import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  useSendDirectMessage,
  useUpdateDirectMessageTyping
} from "@workspace/api-client-react";

interface ComposerProps {
  recipientId: string;
  conversationId?: string;
  disabled?: boolean;
  onSendSuccess?: (response: any) => void;
}

export function Composer({ recipientId, conversationId, disabled, onSendSuccess }: ComposerProps) {
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);
  const lastTypingHeartbeatRef = useRef(0);

  const sendMessageMutation = useSendDirectMessage();
  const updateTypingMutation = useUpdateDirectMessageTyping();
  const updateTypingRef = useRef(updateTypingMutation.mutate);
  updateTypingRef.current = updateTypingMutation.mutate;

  const handleTyping = useCallback((isTyping: boolean) => {
    const now = Date.now();
    const shouldSend =
      isTypingRef.current !== isTyping ||
      (isTyping && now - lastTypingHeartbeatRef.current >= 2_000);

    if (shouldSend) {
      isTypingRef.current = isTyping;
      lastTypingHeartbeatRef.current = now;
      updateTypingRef.current({ data: { recipientId, isTyping } });
    }
  }, [recipientId]);

  // Send typing=false on unmount
  useEffect(() => {
    return () => {
      if (isTypingRef.current) {
        updateTypingRef.current({ data: { recipientId, isTyping: false } });
      }
    };
  }, [recipientId]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length <= 4000) {
      setBody(val);
      setError(null);
    }
    
    // Heartbeat for typing
    handleTyping(true);
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      handleTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    handleTyping(false);

    const clientMessageId = crypto.randomUUID();
    
    sendMessageMutation.mutate({
      data: {
        recipientId,
        body: trimmed,
        clientMessageId,
        conversationId,
      }
    }, {
      onSuccess: (data) => {
        setBody("");
        setError(null);
        if (onSendSuccess) onSendSuccess(data);
      },
      onError: (err: any) => {
        setError(err.message || "Failed to send message. Please try again.");
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-card">
      {error && (
        <div className="mb-2 flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
      <div className="flex items-end gap-2 relative">
        <Textarea
          placeholder="Type a message..."
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled || sendMessageMutation.isPending}
          className="min-h-[52px] max-h-32 resize-none pr-12 py-3 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary scrollbar-thin rounded-xl"
          rows={1}
        />
        <Button 
          size="icon" 
          onClick={handleSend} 
          disabled={!body.trim() || disabled || sendMessageMutation.isPending}
          className={`absolute right-2 bottom-1.5 h-10 w-10 rounded-lg transition-all duration-200 ${
            body.trim() ? "bg-primary text-primary-foreground opacity-100 scale-100" : "bg-muted text-muted-foreground opacity-50 scale-95"
          }`}
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 ml-0.5" />
          )}
        </Button>
      </div>
      <div className="mt-2 flex justify-between px-1 text-[10px] text-muted-foreground">
        <span>Shift + Enter for new line</span>
        <span className={body.length > 3900 ? "text-destructive font-medium" : ""}>
          {body.length} / 4000
        </span>
      </div>
    </div>
  );
}
