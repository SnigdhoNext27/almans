import { useState, useEffect, useRef } from 'react';
import { MessageCircle, Send, Loader2, Clock, Bot, Sparkles, CheckSquare, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PanelRight } from 'lucide-react';

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
  sender_type: 'customer' | 'admin' | 'bot';
  message: string;
  created_at: string;
}

interface CopilotData {
  summary: string;
  reply_drafts: string[];
  action_checklist: string[];
}

const RESOLUTION_TAGS = [
  { value: 'resolved', label: '✅ Resolved' },
  { value: 'escalated', label: '🔺 Escalated' },
  { value: 'spam', label: '🚫 Spam' },
];

const CSAT_MESSAGE = 'Quick feedback: How would you rate this chat today? (1-5)';

export default function AdminChats() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copilot, setCopilot] = useState<CopilotData | null>(null);
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [checklist, setChecklist] = useState<boolean[]>([]);
  const [closing, setClosing] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchConversations();
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
      .channel(`admin-chat-${selectedConversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedConversation.id}` }, (payload) => {
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

  const loadMessages = async (conv: Conversation) => {
    setSelectedConversation(conv);
    setCopilot(null);
    setChecklist([]);
    const { data } = await supabase.from('chat_messages').select('*').eq('conversation_id', conv.id).order('created_at', { ascending: true });
    if (data) {
      setMessages(data as ChatMessage[]);
      // Auto-trigger co-pilot when agent picks up
      if (data.length > 0) loadCopilot(conv.id, data as ChatMessage[]);
    }
  };

  const loadCopilot = async (convId: string, msgs: ChatMessage[]) => {
    setCopilotLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('agent-copilot', {
        body: { conversation_id: convId, messages: msgs },
      });
      if (!error && data) {
        setCopilot(data);
        setChecklist(new Array(data.action_checklist?.length || 0).fill(false));
      }
    } catch (e) {
      console.error('Copilot error:', e);
    } finally {
      setCopilotLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;
    setSending(true);
    try {
      await supabase.from('chat_messages').insert({
        conversation_id: selectedConversation.id,
        sender_type: 'admin',
        sender_id: user?.id,
        message: newMessage.trim(),
      });
      await supabase.from('chat_conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConversation.id);
      setNewMessage('');
    } catch {
      toast({ title: 'Failed to send message', variant: 'destructive' });
    } finally { setSending(false); }
  };

  const closeConversation = async (tag: string) => {
    if (!selectedConversation) return;
    setClosing(true);
    try {
      // Update conversation status
      await supabase.from('chat_conversations').update({
        status: 'closed',
        escalation_reason: selectedConversation.escalation_reason || tag,
        updated_at: new Date().toISOString(),
      }).eq('id', selectedConversation.id);

      // Send CSAT survey message
      await supabase.from('chat_messages').insert({
        conversation_id: selectedConversation.id,
        sender_type: 'admin',
        sender_id: null,
        message: CSAT_MESSAGE,
      });

      toast({ title: `Conversation closed as "${tag}"` });
      setSelectedConversation(prev => prev ? { ...prev, status: 'closed' } : null);
      fetchConversations();
    } catch {
      toast({ title: 'Failed to close conversation', variant: 'destructive' });
    } finally { setClosing(false); }
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
      <div className={`grid gap-4 h-[680px] ${copilotOpen ? 'lg:grid-cols-3 xl:grid-cols-4' : 'lg:grid-cols-3'}`}>

        {/* Conversations List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h2 className="font-semibold">Conversations</h2>
            <Badge variant="secondary">{conversations.filter(c => c.status === 'open').length} open</Badge>
          </div>
          <ScrollArea className="flex-1">
            {conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => loadMessages(conv)}
                  className={`w-full p-4 text-left border-b border-border hover:bg-secondary/50 transition-colors ${selectedConversation?.id === conv.id ? 'bg-secondary' : ''} ${conv.status === 'closed' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium truncate text-sm">{conv.customer_name || 'Guest'}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={conv.handled_by === 'agent' ? 'default' : 'secondary'} className="text-[10px] px-1.5 py-0 h-4">
                        {conv.handled_by === 'agent' ? '👤' : '🤖'}
                      </Badge>
                      <Badge variant={conv.status === 'open' ? 'default' : 'outline'} className="text-[10px] px-1.5 py-0 h-4">{conv.status}</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.customer_email}</p>
                  {conv.escalation_reason && (
                    <p className="text-xs text-destructive truncate mt-0.5">⚠ {conv.escalation_reason.replace(/_/g, ' ')}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />{getTimeAgo(conv.updated_at)}
                  </div>
                </button>
              ))
            )}
          </ScrollArea>
        </div>

        {/* Chat Window */}
        <div className="lg:col-span-2 bg-card rounded-xl border border-border flex flex-col overflow-hidden">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-2">
              <MessageCircle className="h-10 w-10 opacity-30" />
              <p>Select a conversation to start chatting</p>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div className="p-3 border-b border-border flex items-center justify-between bg-secondary/30">
                <div>
                  <p className="font-semibold text-sm">{selectedConversation.customer_name || 'Guest'}</p>
                  <p className="text-xs text-muted-foreground">{selectedConversation.customer_email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedConversation.handled_by === 'agent' ? 'default' : 'secondary'} className="text-xs">
                    {selectedConversation.handled_by === 'agent' ? '👤 Agent' : '🤖 Bot'}
                  </Badge>
                  <Button
                    variant={copilotOpen ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => setCopilotOpen(o => !o)}
                    title="Toggle Co-Pilot"
                  >
                    <PanelRight className="h-3 w-3" />
                    <span className="hidden sm:inline">Co-Pilot</span>
                  </Button>
                  {selectedConversation.status === 'open' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" disabled={closing} className="h-7 text-xs gap-1">
                          {closing ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                          Close
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {RESOLUTION_TAGS.map(tag => (
                          <DropdownMenuItem key={tag.value} onClick={() => closeConversation(tag.value)}>
                            {tag.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {selectedConversation.status === 'closed' && (
                    <Badge variant="outline" className="text-xs">Closed</Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex gap-2 ${msg.sender_type === 'admin' ? 'flex-row-reverse' : ''}`}>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className={msg.sender_type === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                          {msg.sender_type === 'admin' ? 'A' : 'C'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`rounded-2xl px-4 py-2 max-w-[70%] ${msg.sender_type === 'admin' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}`}>
                        <p className="text-sm">{msg.message}</p>
                        <p className="text-[10px] opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {selectedConversation.status === 'open' && (
                <div className="p-4 border-t border-border">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                      disabled={sending}
                    />
                    <Button size="icon" onClick={sendMessage} disabled={sending || !newMessage.trim()}>
                      {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Agent Co-Pilot Panel */}
        {copilotOpen && (
        <div className="hidden lg:flex flex-col bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-sm">Agent Co-Pilot</h2>
          </div>

          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground text-xs">
              <p>Select a conversation to see AI assistance</p>
            </div>
          ) : copilotLoading ? (
            <div className="flex-1 flex items-center justify-center flex-col gap-2 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <p className="text-xs">Analysing conversation…</p>
            </div>
          ) : copilot ? (
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-5">
                {/* Summary */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Summary</p>
                  <div className="bg-secondary/60 rounded-lg p-3">
                    <p className="text-xs leading-relaxed">{copilot.summary}</p>
                  </div>
                </div>

                {/* Reply Drafts */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Reply Drafts</p>
                  <div className="space-y-2">
                    {copilot.reply_drafts.map((draft, i) => (
                      <div key={i} className="border border-border rounded-lg overflow-hidden">
                        <div className="bg-secondary/40 px-3 py-1 flex items-center justify-between">
                          <span className="text-[10px] font-medium text-muted-foreground">Draft {i + 1}</span>
                          <button
                            onClick={() => setNewMessage(draft)}
                            className="text-[10px] text-primary hover:underline font-medium"
                          >
                            Use
                          </button>
                        </div>
                        <Textarea
                          value={draft}
                          onChange={() => {}}
                          className="text-xs border-0 resize-none min-h-0 bg-transparent focus-visible:ring-0 p-3"
                          rows={3}
                          readOnly
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Checklist */}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Action Checklist</p>
                  <div className="space-y-2">
                    {copilot.action_checklist.map((item, i) => (
                      <button
                        key={i}
                        onClick={() => setChecklist(prev => { const n = [...prev]; n[i] = !n[i]; return n; })}
                        className="w-full flex items-start gap-2 text-left group"
                      >
                        <CheckSquare className={`h-4 w-4 mt-0.5 shrink-0 transition-colors ${checklist[i] ? 'text-primary' : 'text-muted-foreground/50 group-hover:text-muted-foreground'}`} />
                        <span className={`text-xs leading-relaxed transition-colors ${checklist[i] ? 'line-through text-muted-foreground' : ''}`}>
                          {item}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Refresh */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-7 gap-1"
                  onClick={() => loadCopilot(selectedConversation.id, messages)}
                  disabled={copilotLoading}
                >
                  <Bot className="h-3 w-3" />
                  Refresh Analysis
                </Button>
              </div>
            </ScrollArea>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-muted-foreground text-xs">
              <p>No messages to analyse yet</p>
            </div>
          )}
        </div>
        )}

      </div>
    </div>
  );
}
