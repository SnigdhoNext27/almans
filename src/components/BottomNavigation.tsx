import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Heart, User, Grid3X3, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { useWishlist } from '@/hooks/useWishlist';
import { useAuth } from '@/lib/auth';

const navItems = [
  { icon: Home, label: 'Home', path: '/' },
  { icon: Grid3X3, label: 'Shop', path: '/shop' },
  { icon: ShoppingBag, label: 'Bag', path: 'cart' },
  { icon: Heart, label: 'Wishlist', path: '/wishlist' },
  { icon: User, label: 'Account', path: '/account' },
];

export function BottomNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toggleCart, items } = useCartStore();
  const { wishlistIds } = useWishlist();
  const { user } = useAuth();

  const cartCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const wishlistCount = wishlistIds.length;

  const handleNavigation = (item: typeof navItems[0]) => {
    if (item.path === 'cart') {
      toggleCart();
    } else if (item.path === '/account' && !user) {
      navigate('/auth');
    } else {
      navigate(item.path);
    }
  };

  const isActive = (path: string) => {
    if (path === 'cart') return false;
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Don't show on admin pages
  if (location.pathname.startsWith('/admin')) return null;

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/98 backdrop-blur-md border-t border-border/40"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="flex items-center justify-around h-[64px] px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const showBadge = 
            (item.path === 'cart' && cartCount > 0) || 
            (item.path === '/wishlist' && wishlistCount > 0);
          const badgeCount = item.path === 'cart' ? cartCount : wishlistCount;

          return (
            <button
              key={item.label}
              onClick={() => handleNavigation(item)}
              className="relative flex flex-col items-center justify-center flex-1 h-full py-1 transition-all active:scale-95"
            >
              <motion.div
                className={`relative p-2 rounded-xl transition-all duration-200 ${
                  active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground'
                }`}
                whileTap={{ scale: 0.9 }}
              >
                <item.icon className={`h-5 w-5 transition-all ${active ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
                
                {/* Badge */}
                {showBadge && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 min-w-[16px] h-[16px] flex items-center justify-center px-1 text-[9px] font-bold bg-primary text-primary-foreground rounded-full"
                  >
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </motion.span>
                )}
              </motion.div>
              
              <span className={`text-[10px] mt-0.5 font-medium transition-all ${
                active ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}>
                {item.label}
              </span>

              {/* Active indicator line */}
              {active && (
                <motion.div
                  layoutId="bottomNavActive"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-full"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
}