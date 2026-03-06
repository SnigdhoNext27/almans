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

export function LiveChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatStarted, setChatStarted] = useState(false);
  const [handedOver, setHandedOver] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Load existing open conversation
  useEffect(() => {
    const loadConversation = async () => {
      if (!user) return;
      const { data: conversations } = await supabase
        .from('chat_conversations')
        .select('id, handled_by')
        .eq('customer_id', user.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(1);

      if (conversations && conversations.length > 0) {
        setConversationId(conversations[0].id);
        setChatStarted(true);
        setHandedOver(conversations[0].handled_by === 'agent');
        loadMessages(conversations[0].id);
      }
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
        // If we receive a bot/admin message and were AI processing, stop the indicator
        if (newMsg.sender_type !== 'customer') {
          setAiProcessing(false);
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Also subscribe to conversation changes (to detect agent handover)
  useEffect(() => {
    if (!conversationId) return;
    const channel = supabase
      .channel(`conv-${conversationId}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'chat_conversations',
        filter: `id=eq.${conversationId}`
      }, (payload) => {
        const updated = payload.new as { handled_by: string };
        if (updated.handled_by === 'agent') {
          setHandedOver(true);
        }
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

  const startChat = async () => {
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
          handled_by: 'bot',
          bot_turn_count: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setConversationId(conversation.id);
      setChatStarted(true);
      setHandedOver(false);

      // Send greeting via edge function (server-side, bypasses RLS)
      await supabase.functions.invoke('chat-triage', {
        body: { type: 'greet', conversation_id: conversation.id },
      });

      await loadMessages(conversation.id);
    } catch (error) {
      console.error('Error starting chat:', error);
      toast({ title: 'Failed to start chat', variant: 'destructive' });
    }
  };

  const startNewAIChat = async () => {
    if (conversationId) {
      await supabase.from('chat_conversations')
        .update({ status: 'closed', updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    }
    setConversationId(null);
    setMessages([]);
    setChatStarted(false);
    setHandedOver(false);
    await startChat();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user) return;
    const msgText = newMessage.trim();
    setSending(true);
    setNewMessage('');

    try {
      // Save customer message to DB
      const { error } = await supabase.from('chat_messages').insert({
        conversation_id: conversationId,
        sender_type: 'customer',
        sender_id: user.id,
        message: msgText,
      });
      if (error) throw error;

      // If already handed over to agent, no AI needed
      if (handedOver) { setSending(false); return; }

      setAiProcessing(true);

      // Call AI triage — edge function saves bot reply server-side, bypassing RLS
      const { data, error: fnError } = await supabase.functions.invoke('chat-triage', {
        body: { conversation_id: conversationId, message: msgText },
      });

      if (fnError) {
        console.error('Triage function error:', fnError);
        // Edge function will have saved an error message server-side
        // Realtime subscription will pick it up
        setAiProcessing(false);
        setSending(false);
        return;
      }

      if (data?.handover) {
        setHandedOver(true);
      }

      // No client-side bot message saving needed —
      // edge function saves messages server-side, realtime subscription shows them
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
                  {user
                    ? "Chat with Almans Assistant — our AI support. It handles most queries instantly and can connect you to a human agent when needed."
                    : "Please sign in to start a chat with Almans Assistant."
                  }
                </p>
                <Button onClick={startChat} className="w-full">
                  {user ? 'Start Chat' : 'Sign In to Chat'}
                </Button>
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
