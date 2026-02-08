import { useState, useEffect, useMemo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/lib/auth";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { LiveChatWidget } from "@/components/chat/LiveChatWidget";
import { LoadingScreen } from "@/components/LoadingScreen";
import { BackToTop } from "@/components/BackToTop";
import { ScrollToTop } from "@/components/ScrollToTop";
import { BottomNavigation } from "@/components/BottomNavigation";
import { AnimatedRoutes } from "@/components/AnimatedRoutes";
import { SwipeNavigationWrapper } from "@/components/SwipeNavigationWrapper";
// CartQuickView removed - users access cart via icon only
import { ProductComparisonBar } from "@/components/ProductComparisonBar";
import { ProductComparisonModal } from "@/components/ProductComparisonModal";
import { AbandonedCartTracker } from "@/components/AbandonedCartTracker";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { fetchAndUpdateRates } from "@/hooks/useCurrency";
import { usePerformance } from "@/hooks/usePerformance";
import Index from "./pages/Index";
import Shop from "./pages/Shop";
import Sales from "./pages/Sales";
import Auth from "./pages/Auth";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Wishlist from "./pages/Wishlist";
import Account from "./pages/Account";
import OrderTracking from "./pages/OrderTracking";
import Category from "./pages/Category";
import AdminLayout from "./pages/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Orders from "./pages/admin/Orders";
import Products from "./pages/admin/Products";
import Categories from "./pages/admin/Categories";
import Customers from "./pages/admin/Customers";
import Coupons from "./pages/admin/Coupons";
import Banners from "./pages/admin/Banners";
import Settings from "./pages/admin/Settings";
import Team from "./pages/admin/Team";
import AdminChats from "./pages/admin/Chats";
import Newsletter from "./pages/admin/Newsletter";
import AdminNotifications from "./pages/admin/Notifications";
import NotFound from "./pages/NotFound";

// Optimized QueryClient with better caching for performance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Inner component to use performance hook
function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
  const { loadingDuration, shouldReduceAnimations } = usePerformance();

  useEffect(() => {
    // Dynamic loading duration based on device performance
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, loadingDuration);

    return () => clearTimeout(timer);
  }, [loadingDuration]);

  // Fetch currency rates on app load
  useEffect(() => {
    fetchAndUpdateRates();
    // Refresh rates every 24 hours
    const interval = setInterval(fetchAndUpdateRates, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <AuthProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
            
            <AnimatePresence mode="wait">
              {isLoading && <LoadingScreen />}
            </AnimatePresence>
            
            <AnimatePresence>
              {!isLoading && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                >
                  <WhatsAppButton />
                  <LiveChatWidget />
                  <BackToTop />
                  <BrowserRouter>
                    <ScrollToTop />
                    <OfflineIndicator />
                    <AbandonedCartTracker />
                    <ProductComparisonBar />
                    <ProductComparisonModal />
                    <BottomNavigation />
                    {/* Cart accessed via icon only, no floating bar */}
                    <SwipeNavigationWrapper>
                    <AnimatedRoutes>
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/shop" element={<Shop />} />
                        <Route path="/sales" element={<Sales />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/product/:id" element={<ProductDetail />} />
                        <Route path="/category/:slug" element={<Category />} />
                        <Route path="/checkout" element={<Checkout />} />
                        <Route path="/wishlist" element={<Wishlist />} />
                        <Route path="/account" element={<Account />} />
                        <Route path="/orders/:orderNumber" element={<OrderTracking />} />
                        
                        {/* Admin Routes */}
                        <Route path="/admin" element={<AdminLayout />}>
                          <Route index element={<Dashboard />} />
                          <Route path="orders" element={<Orders />} />
                          <Route path="products" element={<Products />} />
                          <Route path="categories" element={<Categories />} />
                          <Route path="customers" element={<Customers />} />
                          <Route path="coupons" element={<Coupons />} />
                          <Route path="banners" element={<Banners />} />
                          <Route path="settings" element={<Settings />} />
                          <Route path="team" element={<Team />} />
                          <Route path="chats" element={<AdminChats />} />
                          <Route path="newsletter" element={<Newsletter />} />
                          <Route path="notifications" element={<AdminNotifications />} />
                        </Route>
                        
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </AnimatedRoutes>
                    </SwipeNavigationWrapper>
                  </BrowserRouter>
                </motion.div>
              )}
            </AnimatePresence>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </HelmetProvider>
  );
}

// Main App wrapper that provides QueryClient before performance hook
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
};

export default App;
