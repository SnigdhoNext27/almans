import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender_type: 'customer' | 'admin';
  message: string;
  created_at: string;
}

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load existing conversation
  useEffect(() => {
    const loadConversation = async () => {
      if (!user) return;

      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('customer_id', user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        setConversationId(conversations[0].id);
        setChatStarted(true);
        loadMessages(conversations[0].id);
      }
    };

    loadConversation();
  }, [user]);

  // Subscribe to new messages
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages((prev) => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });

    if (data) {
      setMessages(data as ChatMessage[]);
    }
  };

  const startChat = async () => {
    // Require user login for chat (authenticated-only)
    if (!user) {
      toast({ title: 'Please sign in to start a chat', variant: 'destructive' });
      return;
    }

    try {
      const { data: conversation, error } = await supabase
        .from('chat_conversations')
        .insert({
          customer_id: user.id,
          customer_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer',
          customer_email: user.email,
          status: 'open',
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(conversation.id);
      setChatStarted(true);
      loadMessages(conversation.id);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({ title: 'Failed to start chat', variant: 'destructive' });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_type: 'customer',
        sender_id: user.id,
        message: newMessage.trim(),
      });

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {/* Chat Button - positioned above WhatsApp on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[6.5rem] right-3 z-50 flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors md:bottom-24 md:right-6 md:h-11 md:w-11"
        aria-label="Open live chat"
      >
        <MessageCircle className="h-4 w-4 md:h-5 md:w-5" />
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-3 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-card rounded-2xl shadow-2xl border border-border overflow-hidden md:right-6"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Live Chat</h3>
                  <p className="text-xs opacity-80">We typically reply instantly</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-primary-foreground/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Chat Content */}
            {!chatStarted ? (
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  {user 
                    ? "Start a conversation with our support team. We're here to help!"
                    : "Please sign in to start a live chat with our support team."
                  }
                </p>
                
                <Button onClick={startChat} className="w-full">
                  {user ? 'Start Chat' : 'Sign In to Chat'}
                </Button>
              </div>
            ) : (
              <>
                {/* Messages */}
                <ScrollArea className="h-80 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">
                        Send a message to start the conversation
                      </p>
                    )}
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${
                          msg.sender_type === 'customer' ? 'flex-row-reverse' : ''
                        }`}
                      >
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className={msg.sender_type === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                            {msg.sender_type === 'admin' ? 'A' : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`rounded-2xl px-4 py-2 max-w-[70%] ${
                            msg.sender_type === 'customer'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-secondary'
                          }`}
                        >
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-[10px] opacity-60 mt-1">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sending}
                    />
                    <Button
                      size="icon"
                      onClick={sendMessage}
                      disabled={sending || !newMessage.trim()}
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
