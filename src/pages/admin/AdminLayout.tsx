import { useEffect, useMemo, useState } from 'react';
import { Outlet, useNavigate, NavLink, Link } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  Settings, 
  Tag,
  Image,
  LogOut,
  Menu,
  X,
  Shield,
  Grid3X3,
  Home,
  MessageCircle,
  Mail,
  Bell
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { hasPermission, Permission } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrdersDropdown } from '@/components/admin/OrdersDropdown';
import { useOrderNotificationSound } from '@/hooks/useOrderNotificationSound';
import { WolfLogoIcon } from '@/components/WolfLogoIcon';
import { supabase } from '@/integrations/supabase/client';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  end?: boolean;
  permission: Permission;
}

const allNavItems: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true, permission: 'dashboard' },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders', permission: 'orders' },
  { to: '/admin/products', icon: Package, label: 'Products', permission: 'products' },
  { to: '/admin/categories', icon: Grid3X3, label: 'Categories', permission: 'products' },
  { to: '/admin/customers', icon: Users, label: 'Customers', permission: 'customers' },
  { to: '/admin/coupons', icon: Tag, label: 'Coupons', permission: 'coupons' },
  { to: '/admin/banners', icon: Image, label: 'Banners', permission: 'banners' },
  { to: '/admin/newsletter', icon: Mail, label: 'Newsletter', permission: 'customers' },
  { to: '/admin/notifications', icon: Bell, label: 'Notifications', permission: 'settings' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', permission: 'settings' },
  { to: '/admin/team', icon: Shield, label: 'Team', permission: 'team' },
  { to: '/admin/chats', icon: MessageCircle, label: 'Live Chats', permission: 'orders' },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  officer: 'Officer',
};

export default function AdminLayout() {
  const { user, isAdmin, loading, signOut, userRole } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);
  const { requestPermission } = useOrderNotificationSound();

  // Request notification permission on first render
  useEffect(() => {
    requestPermission();
  }, []);

  // Load and subscribe to unread agent chat count
  useEffect(() => {
    const loadUnreadChats = async () => {
      const { count } = await supabase
        .from('chat_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .eq('handled_by', 'agent');
      setUnreadChats(count || 0);
    };
    loadUnreadChats();

    const channel = supabase
      .channel('admin-chat-badge')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'chat_conversations',
      }, () => { loadUnreadChats(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Filter nav items based on user's role permissions
  const navItems = useMemo(() => {
    return allNavItems.filter(item => hasPermission(userRole, item.permission));
  }, [userRole]);

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      navigate('/auth');
    }
  }, [user, isAdmin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-card/90 backdrop-blur-sm rounded-xl shadow-lg border border-border hover:bg-card transition-colors"
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-72 bg-card/50 backdrop-blur-xl border-r border-border flex flex-col z-40 transform transition-transform lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Sidebar gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
        
        <div className="relative p-6 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
              <WolfLogoIcon className="h-11 w-11 relative z-10" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">Admin</h1>
              {userRole && (
                <Badge variant="secondary" className="mt-1 text-[10px] px-2">
                  {ROLE_LABELS[userRole] || userRole}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <nav className="relative flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isChats = item.to === '/admin/chats';
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className={`p-1.5 rounded-lg transition-colors ${
                      isActive ? 'bg-primary-foreground/20' : 'bg-muted/50 group-hover:bg-muted'
                    }`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    <span className="font-medium">{item.label}</span>
                    <div className="ml-auto flex items-center gap-1">
                      {isChats && unreadChats > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none ${
                          isActive ? 'bg-primary-foreground text-primary' : 'bg-destructive text-destructive-foreground'
                        }`}>
                          {unreadChats > 99 ? '99+' : unreadChats}
                        </span>
                      )}
                      {isActive && !isChats && (
                        <div className="w-1.5 h-1.5 bg-primary-foreground rounded-full" />
                      )}
                    </div>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="relative p-4 border-t border-border/50">
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl py-3"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-8 lg:ml-0 relative">
        {/* Background pattern */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: '32px 32px',
        }} />
        
        {/* Top Bar */}
        <div className="relative flex items-center justify-between mb-8 pl-14 lg:pl-0">
          <Button variant="outline" size="sm" asChild className="gap-2 rounded-xl hover:bg-primary/10 hover:text-primary hover:border-primary/30">
            <Link to="/">
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Visit Site</span>
            </Link>
          </Button>
          
          {/* Orders Dropdown with Notification */}
          <OrdersDropdown />
        </div>
        <div className="relative">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
