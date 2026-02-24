import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, User, Menu, X, LogOut, Settings, Package, Heart } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { MobileMenuOverlay } from '@/components/MobileMenuOverlay';
import { NotificationBell } from '@/components/NotificationBell';
import { useLanguage } from '@/hooks/useLanguage';
import { cn } from '@/lib/utils';
import { useSiteSettings } from '@/hooks/useSiteSettings';
import { Facebook, Instagram, ChevronDown, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { SettingsPanel } from '@/components/SettingsPanel';
import { useWishlist } from '@/hooks/useWishlist';

const navLinks = [
  { name: 'Home', key: 'home', href: '/' },
  { name: 'Shop', key: 'shop', href: '/shop' },
  { name: 'Sales', key: 'sales', href: '/sales', highlight: true },
  { name: 'About Us', key: 'aboutUs', href: '/shop#about' },
  { name: 'Contact', key: 'contact', href: '/shop#contact' },
];

export function Header() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, isAdmin, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const { settings } = useSiteSettings();
  const { getTotalItems, openCart } = useCartStore();
  const totalItems = getTotalItems();
  const { wishlistIds } = useWishlist();
  const wishlistCount = wishlistIds.length;
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Fetch user avatar
  useEffect(() => {
    if (!user) { setAvatarUrl(null); return; }
    supabase.from('profiles').select('avatar_url').eq('id', user.id).maybeSingle()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url); });
  }, [user]);

  // Track scroll position for header effects
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const socialLinks = [
    { name: 'Facebook', icon: Facebook, href: settings.social_facebook || 'https://www.facebook.com/profile.php?id=61584375982557' },
    { name: 'Instagram', icon: Instagram, href: settings.social_instagram || 'https://www.instagram.com/almans.bd' },
    { name: 'WhatsApp', href: `https://wa.me/${settings.social_whatsapp || '8801930278877'}`, isWhatsApp: true },
  ];

  const handleNavClick = (href: string) => {
    setIsMobileMenuOpen(false);
    
    if (href.includes('#')) {
      const [path, hash] = href.split('#');
      if (location.pathname !== path && path) {
        navigate(href);
      } else {
        const element = document.querySelector(`#${hash}`);
        element?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(href);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSignOutClick = () => {
    setShowSignOutDialog(true);
  };

  const handleSignOutConfirm = async () => {
    await signOut();
    setShowSignOutDialog(false);
    toast({
      title: "Signed out successfully",
      description: "You have been logged out of your account.",
    });
    navigate('/');
  };

  return (
    <>
      {/* Search Overlay */}
      <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <motion.header 
        className={cn(
          "sticky top-0 z-50 w-full transition-all duration-300 bg-background backdrop-blur-sm",
          isScrolled 
            ? "border-b border-border shadow-sm" 
            : "border-b border-border/60"
        )}
        animate={{
          height: isScrolled ? 56 : 64,
        }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className={cn(
          "container flex items-center justify-between px-4 md:px-8 transition-all duration-300",
          isScrolled ? "h-14" : "h-16"
        )}>
          {/* Logo - Clean and Minimal */}
          <motion.div
            animate={{ scale: isScrolled ? 0.9 : 1 }}
            transition={{ duration: 0.3 }}
          >
            <Logo size={isScrolled ? 'sm' : 'md'} animate={false} showText={false} />
          </motion.div>

          {/* Desktop Navigation - Hidden on mobile */}
          <nav className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.key}
                onClick={() => handleNavClick(link.href)}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary",
                  link.highlight 
                    ? "text-destructive font-semibold animate-pulse" 
                    : "text-muted-foreground"
                )}
              >
                {link.highlight && <span className="mr-1">🔥</span>}
                {t(link.key)}
              </button>
            ))}
            
            {/* Follow Us Section */}
            <div className="flex items-center gap-2 border-l border-border pl-6">
              <span className="text-xs text-muted-foreground">{t('followUs')}</span>
              <div className="flex items-center gap-1">
                {socialLinks.map((social) => (
                  <a
                    key={social.name}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary hover:bg-primary/10"
                    aria-label={social.name}
                  >
                    {social.isWhatsApp ? (
                      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                    ) : (
                      <social.icon className="h-4 w-4" />
                    )}
                  </a>
                ))}
              </div>
            </div>
          </nav>

          {/* Right Actions - Minimal Icons */}
          <div className="flex items-center gap-0.5 md:gap-1">
            {/* Notification Bell */}
            <NotificationBell />

            {/* Search Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsSearchOpen(true)}
              className="h-10 w-10"
            >
              <Search className="h-5 w-5" />
              <span className="sr-only">Search</span>
            </Button>

            {/* User Menu */}
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    {avatarUrl ? (
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={avatarUrl} alt="Profile" />
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <User className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 p-2">
                  <div className="px-2 py-3 border-b border-border mb-2">
                    <p className="text-sm font-medium">{t('welcomeBack')}</p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <DropdownMenuItem onClick={() => navigate('/account')} className="py-2.5">
                    <User className="h-4 w-4 mr-3" />
                    {t('myAccount')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/account?tab=orders')} className="py-2.5">
                    <Package className="h-4 w-4 mr-3" />
                    {t('myOrders')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wishlist')} className="py-2.5">
                    <Heart className="h-4 w-4 mr-3" />
                    {t('myWishlist')}
                  </DropdownMenuItem>
                  {isAdmin && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate('/admin')} className="py-2.5">
                        <Settings className="h-4 w-4 mr-3" />
                        Admin Dashboard
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleSignOutClick} 
                    className="py-2.5 text-destructive focus:text-destructive"
                  >
                    <LogOut className="h-4 w-4 mr-3" />
                    {t('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => navigate('/auth')}
                className="h-10 w-10"
              >
                <User className="h-5 w-5" />
              </Button>
            )}

            {/* Wishlist - Desktop only */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/wishlist')}
              className="hidden md:flex relative h-10 w-10"
            >
              <Heart className="h-5 w-5" />
              {wishlistCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  {wishlistCount > 9 ? '9+' : wishlistCount}
                </span>
              )}
            </Button>

            {/* Cart - Desktop only */}
            <Button
              variant="ghost"
              size="icon"
              className="relative hidden md:flex h-10 w-10"
              onClick={openCart}
            >
              <ShoppingBag className="h-5 w-5" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                  {totalItems}
                </span>
              )}
            </Button>

            {/* Settings Panel - Desktop only */}
            <div className="hidden md:block">
              <SettingsPanel />
            </div>

            {/* Mobile Menu Toggle - Hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-10 w-10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>
      </motion.header>

      <MobileMenuOverlay
        open={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        navLinks={navLinks}
        onNavigate={handleNavClick}
        socialLinks={socialLinks}
        isAuthenticated={!!user}
        isAdmin={!!isAdmin}
        userEmail={user?.email}
        onAdmin={() => {
          navigate('/admin');
          setIsMobileMenuOpen(false);
        }}
        onLogin={() => {
          navigate('/auth?mode=login');
          setIsMobileMenuOpen(false);
        }}
        onSignup={() => {
          navigate('/auth?mode=signup');
          setIsMobileMenuOpen(false);
        }}
        onSignOut={() => {
          setIsMobileMenuOpen(false);
          handleSignOutClick();
        }}
      />

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of your account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out? You'll need to log in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOutConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}