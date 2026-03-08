import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Bot, User, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ChatMessage {
  id: string;
  sender_type: 'customer' | 'admin' | 'bot';
  message: string;
  created_at: string;
}

/** Returns a stable guest session ID from localStorage (created once per browser) */
function getGuestSessionId(): string {
  const key = 'almans_guest_session_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [handedOver, setHandedOver] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load existing open conversation on mount
  useEffect(() => {
    const loadConversation = async () => {
      if (user) {
        // Authenticated: look up by customer_id
        const { data } = await supabase
          .from('chat_conversations')
          .select('id, handled_by')
          .eq('customer_id', user.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1);
        if (data && data.length > 0) {
          setConversationId(data[0].id);
          setChatStarted(true);
          setHandedOver(data[0].handled_by === 'agent');
          loadMessages(data[0].id);
        }
      }
      // Note: Guest conversations are fetched by edge function on start,
      // we don't need to pre-load since we can't query by guest_session_id via RLS easily
    };
    loadConversation();
  }, [user]);

  // Subscribe to new messages in real-time
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const newMsg = payload.new as ChatMessage;
        setMessages((prev) => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_type !== 'customer') setAiProcessing(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Subscribe to conversation updates (detect agent handover)
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        const updated = payload.new as { handled_by: string };
        if (updated.handled_by === 'agent') setHandedOver(true);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  };

  // Start chat — works for both logged-in users AND guests
  const startChat = async () => {
    setStarting(true);
    try {
      const payload: Record<string, string> = { type: 'start' };

      if (user) {
        payload.user_id = user.id;
        payload.user_name = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Customer';
        payload.user_email = user.email || '';
      } else {
        // Guest: use localStorage session ID
        payload.guest_session_id = getGuestSessionId();
        payload.user_name = 'Guest';
      }

      const { data, error } = await supabase.functions.invoke('chat-triage', { body: payload });

      if (error) throw error;
      if (!data?.conversation_id) throw new Error('No conversation ID returned');

      setConversationId(data.conversation_id);
      setChatStarted(true);
      setHandedOver(false);

      if (user) {
        // Authenticated users can query messages directly via RLS
        await loadMessages(data.conversation_id);
      } else {
        // Guests: set greeting directly from the edge function response (client RLS can't read back)
        if (data.reply) {
          setMessages([{
            id: `greeting_${data.conversation_id}`,
            sender_type: 'bot',
            message: data.reply,
            created_at: new Date().toISOString(),
          }]);
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({ title: 'Failed to start chat. Please try again.', variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const startNewAIChat = async () => {
    setConversationId(null);
    setMessages([]);
    setChatStarted(false);
    setHandedOver(false);
    await startChat();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;
    const msgText = newMessage.trim();
    setSending(true);
    setNewMessage('');

    // Optimistically show the customer message immediately
    const optimisticId = `temp_${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      sender_type: 'customer',
      message: msgText,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      // Always route through edge function (service role bypasses RLS for all user types)
      const payload: Record<string, string> = {
        type: 'message',
        conversation_id: conversationId,
        message: msgText,
      };
      if (user) {
        payload.user_id = user.id;
      } else {
        payload.guest_session_id = getGuestSessionId();
      }

      if (handedOver) {
        // For handed-over chats: just save the message, don't call AI
        await supabase.functions.invoke('chat-triage', {
          body: { ...payload, type: 'message' },
        });
        setSending(false);
        return;
      }

      setAiProcessing(true);

      const { data, error: fnError } = await supabase.functions.invoke('chat-triage', { body: payload });

      if (fnError) {
        console.error('Triage function error:', fnError);
        toast({ title: 'Failed to get a reply. Please try again.', variant: 'destructive' });
        return;
      }

      if (data?.handover) {
        setHandedOver(true);
      }

      if (data?.reply) {
        // Always add bot reply directly from response — realtime is a bonus but not relied upon
        setMessages(prev => {
          // Remove optimistic temp message
          const withoutTemp = prev.filter(m => !m.id.startsWith('temp_'));
          // Add confirmed customer message (dedup by message text + sender)
          const alreadyHasCustomer = withoutTemp.some(m => m.sender_type === 'customer' && m.message === msgText);
          const confirmed: ChatMessage[] = alreadyHasCustomer ? withoutTemp : [
            ...withoutTemp,
            { id: `cust_${Date.now()}`, sender_type: 'customer', message: msgText, created_at: new Date().toISOString() }
          ];
          // Add bot reply (dedup by message text)
          const alreadyHasReply = confirmed.some(m => m.message === data.reply);
          if (alreadyHasReply) return confirmed;
          return [...confirmed, { id: `bot_${Date.now() + 1}`, sender_type: 'bot', message: data.reply, created_at: new Date().toISOString() }];
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally {
      setAiProcessing(false);
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const getMsgStyle = (msg: ChatMessage) => {
    if (msg.sender_type === 'customer') return {
      bubble: 'bg-primary text-primary-foreground',
      align: 'flex-row-reverse',
      avatar: 'bg-primary/20 text-primary',
      icon: User
    };
    return {
      bubble: 'bg-secondary',
      align: '',
      avatar: 'bg-muted text-muted-foreground',
      icon: Bot
    };
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-[8rem] right-3 z-50 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors md:bottom-36 md:right-6"
        aria-label="Open live chat"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

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
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Almans Assistant</h3>
                    {chatStarted && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                        {handedOver ? '👤 Agent' : '🤖 AI'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs opacity-80">
                    {handedOver ? 'Human agent assigned' : 'AI-powered support'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-primary-foreground/20 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!chatStarted ? (
              <div className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Chat with Almans Assistant — our AI support. It handles most queries instantly and can connect you to a human agent when needed.
                </p>
                <Button onClick={startChat} className="w-full" disabled={starting}>
                  {starting ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" />Starting chat…</>
                  ) : 'Start Chat'}
                </Button>
                {!user && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    Chatting as guest · <a href="/auth" className="text-primary hover:underline">Sign in</a> to track your orders
                  </p>
                )}
              </div>
            ) : (
              <>
                <ScrollArea className="h-80 p-4" ref={scrollRef}>
                  <div className="space-y-4">
                    {messages.length === 0 && (
                      <p className="text-center text-sm text-muted-foreground py-8">Loading messages…</p>
                    )}
                    {messages.map((msg) => {
                      const style = getMsgStyle(msg);
                      const Icon = style.icon;
                      return (
                        <div key={msg.id} className={`flex gap-2 ${style.align}`}>
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarFallback className={style.avatar}>
                              <Icon className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className={`rounded-2xl px-4 py-2 max-w-[75%] ${style.bubble}`}>
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p className="text-[10px] opacity-60 mt-1">
                              {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                    {aiProcessing && (
                      <div className="flex gap-2">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarFallback className="bg-muted text-muted-foreground">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="rounded-2xl px-4 py-3 bg-secondary flex items-center gap-2">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span className="text-xs text-muted-foreground">Almans Assistant is typing…</span>
                        </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>

                <div className="p-4 border-t border-border space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder={handedOver ? 'Message agent…' : 'Ask Almans Assistant…'}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sending || aiProcessing}
                    />
                    <Button
                      size="icon"
                      onClick={sendMessage}
                      disabled={sending || aiProcessing || !newMessage.trim()}
                    >
                      {(sending || aiProcessing)
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Send className="h-4 w-4" />
                      }
                    </Button>
                  </div>

                  {handedOver ? (
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-muted-foreground">Connected to a human agent</p>
                      <button
                        onClick={startNewAIChat}
                        className="flex items-center gap-1 text-[10px] text-primary hover:underline font-medium"
                      >
                        <RefreshCw className="h-2.5 w-2.5" />
                        Start new AI chat
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center">
                      Type <span className="font-medium">"human"</span> to talk to an agent
                    </p>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
