import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';

interface Conversation {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  status: string;
  handled_by: string;
  escalation_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  sender_type: 'customer' | 'admin';
  message: string;
  created_at: string;
}

export default function AdminChats() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to new conversations
    const channel = supabase
      .channel('admin-chat-conversations')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversations' }, () => {
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`admin-chat-${selectedConversation}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedConversation}` }, (payload) => {
        setMessages((prev) => [...prev, payload.new as ChatMessage]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchConversations = async () => {
    const { data } = await supabase.from('chat_conversations').select('*').order('updated_at', { ascending: false });
    if (data) setConversations(data);
    setLoading(false);
  };

  const loadMessages = async (convId: string) => {
    setSelectedConversation(convId);
    const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', convId).order('created_at', { ascending: true });
    if (data) setMessages(data as ChatMessage[]);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    setSending(true);
    try {
      await supabase.from('chat_messages').insert({ conversation_id: selectedConversation, sender_type: 'admin', sender_id: user?.id, message: newMessage.trim() });
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConversation);
      setNewMessage('');
    } catch (error) {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally { setSending(false); }
  };

  const getTimeAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffMs / 86400000)}d ago`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Live Chats</h1>
      <div className="grid lg:grid-cols-3 gap-6 h-[600px]">
        {/* Conversations List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border"><h2 className="font-semibold">Conversations</h2></div>
          <ScrollArea className="h-[calc(100%-60px)]">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground"><MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" /><p>No conversations yet</p></div>
            ) : (
              conversations.map((conv) => (
                <button key={conv.id} onClick={() => loadMessages(conv.id)} className={`w-full p-4 text-left border-b border-border hover:bg-secondary/50 transition-colors ${selectedConversation === conv.id ? 'bg-secondary' : ''}`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate">{conv.customer_name || 'Guest'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={conv.handled_by === 'agent' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
                        {conv.handled_by === 'agent' ? '👤' : '🤖'}
                      </Badge>
                      <Badge variant={conv.status === 'open' ? 'default' : 'secondary'} className="text-xs">{conv.status}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.customer_email}</p>
                  {conv.escalation_reason && (
                    <p className="text-xs text-destructive truncate mt-0.5">⚠ {conv.escalation_reason.replace(/_/g, ' ')}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{getTimeAgo(conv.updated_at)}</div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border flex flex-col overflow-hidden">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground"><p>Select a conversation to start chatting</p></div>
          ) : (
            <>
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.sender_type === 'admin' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8 shrink-0"><AvatarFallback className={msg.sender_type === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>{msg.sender_type === 'admin' ? 'A' : 'C'}</AvatarFallback></Avatar>
                      <div className={`rounded-2xl px-4 py-2 max-w-[70%] ${msg.sender_type === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-[10px] opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-border">
                <div className="flex gap-2">
                  <Input placeholder="Type a message..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} disabled={sending} />
                  <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
