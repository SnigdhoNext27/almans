import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Package, User, MapPin, Lock, ChevronRight, Loader2, Plus, Trash2, Edit, Calendar, Shield, FileText, Camera, X } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartSlide } from '@/components/CartSlide';
import { AvatarUpload } from '@/components/account/AvatarUpload';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { TwoFactorAuth } from '@/components/account/TwoFactorAuth';
import { DeleteAccount } from '@/components/account/DeleteAccount';
import { NotificationPreferencesCard } from '@/components/account/NotificationPreferencesCard';
import { LoyaltyPointsCard } from '@/components/account/LoyaltyPointsCard';
import { ReferralProgram } from '@/components/ReferralProgram';
import { SavedPaymentMethods } from '@/components/SavedPaymentMethods';
import { OrderHistoryExport } from '@/components/OrderHistoryExport';
import { OrderFilters, OrderFiltersState, defaultFilters } from '@/components/OrderFilters';
import { InvoiceDownloadButton } from '@/components/InvoiceDownloadButton';

interface OrderItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
  size?: string | null;
  color?: string | null;
}

interface Order {
  id: string;
  order_number: string;
  status: string;
  total: number;
  subtotal?: number;
  delivery_fee?: number;
  created_at: string;
  shipping_address: {
    full_name?: string;
    address?: string;
    area?: string;
  };
  order_items?: OrderItem[];
}

interface Address {
  id: string;
  label: string;
  full_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  district: string | null;
  postal_code: string | null;
  is_default: boolean;
}

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  gender: string | null;
  date_of_birth: string | null;
}

const profileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  phone: z.string().min(10, 'Valid phone required').max(15).optional().or(z.literal('')),
});

const addressSchema = z.object({
  label: z.string().min(1, 'Label required'),
  full_name: z.string().min(2, 'Name required'),
  phone: z.string().min(10, 'Valid phone required'),
  address_line1: z.string().min(5, 'Address required'),
  city: z.string().min(2, 'City required'),
});

const passwordSchema = z.object({
  newPassword: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const days = Array.from({ length: 31 }, (_, i) => i + 1);
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

export default function Account() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('profile');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [orderFilters, setOrderFilters] = useState<OrderFiltersState>(defaultFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 5;
  const [saving, setSaving] = useState(false);
  const [profileForm, setProfileForm] = useState({ 
    full_name: '', 
    phone: '',
    gender: '',
    birth_day: '',
    birth_month: '',
    birth_year: '',
  });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [addressForm, setAddressForm] = useState({
    label: 'Home',
    full_name: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    district: '',
    postal_code: '',
    is_default: false,
  });
  const [editingAddress, setEditingAddress] = useState<string | null>(null);
  const [addressDialogOpen, setAddressDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: ordersData } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            product_name,
            quantity,
            price,
            size,
            color
          )
        `)
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      const { data: addressesData } = await supabase
        .from('addresses')
        .select('*')
        .eq('user_id', user?.id)
        .order('is_default', { ascending: false });

      if (ordersData) setOrders(ordersData as Order[]);
      if (profileData) {
        setProfile(profileData as Profile);
        
        // Parse date of birth
        let birthDay = '', birthMonth = '', birthYear = '';
        if (profileData.date_of_birth) {
          const dob = new Date(profileData.date_of_birth);
          birthDay = dob.getDate().toString();
          birthMonth = (dob.getMonth() + 1).toString();
          birthYear = dob.getFullYear().toString();
        }
        
        setProfileForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          gender: profileData.gender || '',
          birth_day: birthDay,
          birth_month: birthMonth,
          birth_year: birthYear,
        });
      }
      if (addressesData) setAddresses(addressesData as Address[]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    const result = profileSchema.safeParse(profileForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      // Build date of birth
      let dateOfBirth: string | null = null;
      if (profileForm.birth_year && profileForm.birth_month && profileForm.birth_day) {
        dateOfBirth = `${profileForm.birth_year}-${profileForm.birth_month.padStart(2, '0')}-${profileForm.birth_day.padStart(2, '0')}`;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: profileForm.full_name,
          phone: profileForm.phone || null,
          gender: profileForm.gender || null,
          date_of_birth: dateOfBirth,
        })
        .eq('id', user?.id);

      if (error) throw error;
      toast({ title: 'Profile updated successfully!' });
      fetchData();
    } catch (error) {
      toast({ title: 'Failed to update profile', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    const result = passwordSchema.safeParse(passwordForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;
      toast({ title: 'Password changed successfully!' });
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast({ title: 'Failed to change password', description: (error as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAddress = async () => {
    const result = addressSchema.safeParse(addressForm);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      if (editingAddress) {
        const { error } = await supabase
          .from('addresses')
          .update({
            ...addressForm,
            address_line2: addressForm.address_line2 || null,
            district: addressForm.district || null,
            postal_code: addressForm.postal_code || null,
          })
          .eq('id', editingAddress);

        if (error) throw error;
        toast({ title: 'Address updated!' });
      } else {
        const { error } = await supabase
          .from('addresses')
          .insert({
            user_id: user?.id,
            ...addressForm,
            address_line2: addressForm.address_line2 || null,
            district: addressForm.district || null,
            postal_code: addressForm.postal_code || null,
          });

        if (error) throw error;
        toast({ title: 'Address added!' });
      }

      setAddressDialogOpen(false);
      setEditingAddress(null);
      setAddressForm({
        label: 'Home',
        full_name: '',
        phone: '',
        address_line1: '',
        address_line2: '',
        city: '',
        district: '',
        postal_code: '',
        is_default: false,
      });
      fetchData();
    } catch (error) {
      toast({ title: 'Failed to save address', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      const { error } = await supabase.from('addresses').delete().eq('id', id);
      if (error) throw error;
      toast({ title: 'Address deleted' });
      fetchData();
    } catch (error) {
      toast({ title: 'Failed to delete address', variant: 'destructive' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-500';
      case 'shipped': return 'bg-blue-500';
      case 'processing': return 'bg-yellow-500';
      case 'cancelled': return 'bg-destructive';
      default: return 'bg-muted-foreground';
    }
  };

  const handleAvatarChange = (url: string) => {
    if (profile) {
      setProfile({ ...profile, avatar_url: url });
    }
  };

  // Filter orders based on search and filters
  const filteredOrders = orders.filter(order => {
    // Search filter
    if (orderFilters.search) {
      const searchLower = orderFilters.search.toLowerCase();
      if (!order.order_number.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    // Status filter
    if (orderFilters.status !== 'all' && order.status !== orderFilters.status) {
      return false;
    }
    
    // Date from filter
    if (orderFilters.dateFrom) {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      const fromDate = new Date(orderFilters.dateFrom);
      fromDate.setHours(0, 0, 0, 0);
      if (orderDate < fromDate) {
        return false;
      }
    }
    
    // Date to filter
    if (orderFilters.dateTo) {
      const orderDate = new Date(order.created_at);
      orderDate.setHours(23, 59, 59, 999);
      const toDate = new Date(orderFilters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      if (orderDate > toDate) {
        return false;
      }
    }
    
    return true;
  });

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * ordersPerPage,
    currentPage * ordersPerPage
  );
  
  // Reset to page 1 when filters change
  const handleFiltersChange = (newFilters: OrderFiltersState) => {
    setOrderFilters(newFilters);
    setCurrentPage(1);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Account | Almans</title>
      </Helmet>

      <Header />
      <CartSlide />

      <main className="min-h-screen bg-secondary/30 pt-20 pb-12">
        <div className="container px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col lg:flex-row gap-6"
          >
            {/* Sidebar */}
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <AccountSidebar
                avatarUrl={profile?.avatar_url || null}
                fullName={profile?.full_name || null}
                activeTab={activeTab}
                onTabChange={setActiveTab}
              />
            </div>

            {/* Main Content */}
            <div className="flex-1">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="mb-6">
                    <h1 className="font-display text-2xl font-bold">My Profile</h1>
                    <p className="text-muted-foreground">Manage and protect your account</p>
                  </div>

                  {/* Avatar Upload Banner */}
                  {!profile?.avatar_url && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-6 rounded-xl bg-gradient-to-r from-primary/10 via-almans-gold/5 to-accent p-4 sm:p-5 border border-primary/15"
                    >
                      <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center avatar-prompt-pulse">
                          <Camera className="w-6 h-6 text-primary" />
                        </div>
                        <div className="text-center sm:text-left flex-1">
                          <h3 className="font-display font-semibold text-foreground text-sm sm:text-base">Complete your profile</h3>
                          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">Add a profile photo to personalize your account</p>
                        </div>
                        <Button
                          size="sm"
                          className="gap-2 whitespace-nowrap"
                          onClick={() => {
                            const fileInput = document.querySelector<HTMLInputElement>('input[type="file"][accept="image/jpeg,image/png"]');
                            fileInput?.click();
                          }}
                        >
                          <Camera className="w-4 h-4" />
                          Upload Photo
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  <div className="flex flex-col lg:flex-row gap-8">
                    {/* Profile Form */}
                    <div className="flex-1 space-y-6">
                      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Email</Label>
                        <div>
                          <Input value={user?.email || ''} disabled className="bg-muted max-w-md" />
                        </div>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Full Name</Label>
                        <div>
                          <Input
                            value={profileForm.full_name}
                            onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                            placeholder="Your full name"
                            className="max-w-md"
                          />
                          {errors.full_name && <p className="text-destructive text-sm mt-1">{errors.full_name}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Phone</Label>
                        <div>
                          <Input
                            value={profileForm.phone}
                            onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                            placeholder="+880 1XXX XXXXXX"
                            className="max-w-md"
                          />
                          {errors.phone && <p className="text-destructive text-sm mt-1">{errors.phone}</p>}
                        </div>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Gender</Label>
                        <RadioGroup
                          value={profileForm.gender}
                          onValueChange={(value) => setProfileForm({ ...profileForm, gender: value })}
                          className="flex gap-6"
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="male" id="male" />
                            <Label htmlFor="male" className="font-normal cursor-pointer">Male</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="female" id="female" />
                            <Label htmlFor="female" className="font-normal cursor-pointer">Female</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="other" id="other" />
                            <Label htmlFor="other" className="font-normal cursor-pointer">Other</Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <Label className="text-right text-muted-foreground">Date of Birth</Label>
                        <div className="flex gap-2 max-w-md">
                          <Select
                            value={profileForm.birth_day}
                            onValueChange={(value) => setProfileForm({ ...profileForm, birth_day: value })}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue placeholder="Day" />
                            </SelectTrigger>
                            <SelectContent>
                              {days.map((d) => (
                                <SelectItem key={d} value={d.toString()}>{d}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={profileForm.birth_month}
                            onValueChange={(value) => setProfileForm({ ...profileForm, birth_month: value })}
                          >
                            <SelectTrigger className="flex-1">
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {months.map((m, i) => (
                                <SelectItem key={m} value={(i + 1).toString()}>{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <Select
                            value={profileForm.birth_year}
                            onValueChange={(value) => setProfileForm({ ...profileForm, birth_year: value })}
                          >
                            <SelectTrigger className="w-28">
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {years.map((y) => (
                                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="grid grid-cols-[120px_1fr] items-center gap-4">
                        <div />
                        <Button onClick={handleUpdateProfile} disabled={saving}>
                          {saving ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </div>

                    {/* Avatar Upload */}
                    <div className="lg:border-l lg:border-border lg:pl-8">
                      {user && (
                        <AvatarUpload
                          avatarUrl={profile?.avatar_url || null}
                          userId={user.id}
                          fullName={profile?.full_name || null}
                          onAvatarChange={handleAvatarChange}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Orders Tab */}
              {activeTab === 'orders' && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h1 className="font-display text-2xl font-bold">My Orders</h1>
                    <OrderHistoryExport orders={filteredOrders} />
                  </div>
                  
                  {/* Filters */}
                  {orders.length > 0 && (
                    <div className="mb-6">
                      <OrderFilters filters={orderFilters} onFiltersChange={handleFiltersChange} />
                    </div>
                  )}
                  
                  {orders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders yet</p>
                      <Button onClick={() => navigate('/shop')} className="mt-4">
                        Start Shopping
                      </Button>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No orders match your filters</p>
                      <Button variant="outline" onClick={() => handleFiltersChange(defaultFilters)} className="mt-4">
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Showing {(currentPage - 1) * ordersPerPage + 1}-{Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length} orders
                        {filteredOrders.length !== orders.length && ` (filtered from ${orders.length})`}
                      </p>
                      {paginatedOrders.map((order) => (
                        <div
                          key={order.id}
                          className="bg-secondary/50 rounded-xl p-4 hover:bg-secondary transition-colors"
                        >
                          <div 
                            className="cursor-pointer"
                            onClick={() => navigate(`/orders/${order.order_number}`)}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="font-medium">{order.order_number}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(order.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge className={`${getStatusColor(order.status)} text-white capitalize`}>
                                  {order.status}
                                </Badge>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                            {order.order_items && order.order_items.length > 0 && (
                              <div className="text-sm text-muted-foreground mb-2">
                                {order.order_items.slice(0, 2).map((item, idx) => (
                                  <span key={item.id}>
                                    {item.product_name} × {item.quantity}
                                    {idx < Math.min(order.order_items!.length - 1, 1) ? ', ' : ''}
                                  </span>
                                ))}
                                {order.order_items.length > 2 && (
                                  <span> +{order.order_items.length - 2} more</span>
                                )}
                              </div>
                            )}
                            <div className="flex justify-between items-center">
                              <p className="text-sm text-muted-foreground">
                                {order.shipping_address?.address?.substring(0, 40)}...
                              </p>
                              <p className="font-bold">৳{order.total.toFixed(0)}</p>
                            </div>
                          </div>
                          {/* Invoice Download Button */}
                          <div className="mt-3 pt-3 border-t border-border flex justify-end">
                            <InvoiceDownloadButton 
                              order={{
                                id: order.id,
                                order_number: order.order_number,
                                created_at: order.created_at,
                                status: order.status,
                                subtotal: order.subtotal || order.total,
                                delivery_fee: order.delivery_fee || 0,
                                discount: null,
                                total: order.total,
                                shipping_address: order.shipping_address,
                                items: order.order_items?.map(item => ({
                                  product_name: item.product_name,
                                  quantity: item.quantity,
                                  price: item.price,
                                  size: item.size
                                }))
                              }}
                              size="sm"
                            />
                          </div>
                        </div>
                      ))}
                      
                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 pt-4 border-t border-border">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(1)}
                            disabled={currentPage === 1}
                          >
                            First
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </Button>
                          
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                              let pageNum: number;
                              if (totalPages <= 5) {
                                pageNum = i + 1;
                              } else if (currentPage <= 3) {
                                pageNum = i + 1;
                              } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                              } else {
                                pageNum = currentPage - 2 + i;
                              }
                              return (
                                <Button
                                  key={pageNum}
                                  variant={currentPage === pageNum ? 'default' : 'outline'}
                                  size="sm"
                                  className="w-9"
                                  onClick={() => setCurrentPage(pageNum)}
                                >
                                  {pageNum}
                                </Button>
                              );
                            })}
                          </div>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(totalPages)}
                            disabled={currentPage === totalPages}
                          >
                            Last
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Addresses Tab */}
              {activeTab === 'addresses' && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="flex justify-between items-center mb-6">
                    <h1 className="font-display text-2xl font-bold">My Addresses</h1>
                    <Dialog open={addressDialogOpen} onOpenChange={setAddressDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => {
                          setEditingAddress(null);
                          setAddressForm({
                            label: 'Home',
                            full_name: '',
                            phone: '',
                            address_line1: '',
                            address_line2: '',
                            city: '',
                            district: '',
                            postal_code: '',
                            is_default: false,
                          });
                        }}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Address
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{editingAddress ? 'Edit Address' : 'Add New Address'}</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Label</Label>
                              <Input
                                value={addressForm.label}
                                onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })}
                                placeholder="Home, Office, etc."
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Full Name</Label>
                              <Input
                                value={addressForm.full_name}
                                onChange={(e) => setAddressForm({ ...addressForm, full_name: e.target.value })}
                              />
                              {errors.full_name && <p className="text-destructive text-sm">{errors.full_name}</p>}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                              value={addressForm.phone}
                              onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                            />
                            {errors.phone && <p className="text-destructive text-sm">{errors.phone}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label>Address Line 1</Label>
                            <Input
                              value={addressForm.address_line1}
                              onChange={(e) => setAddressForm({ ...addressForm, address_line1: e.target.value })}
                              placeholder="House, Street, Area"
                            />
                            {errors.address_line1 && <p className="text-destructive text-sm">{errors.address_line1}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label>Address Line 2 (Optional)</Label>
                            <Input
                              value={addressForm.address_line2}
                              onChange={(e) => setAddressForm({ ...addressForm, address_line2: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>City</Label>
                              <Input
                                value={addressForm.city}
                                onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                              />
                              {errors.city && <p className="text-destructive text-sm">{errors.city}</p>}
                            </div>
                            <div className="space-y-2">
                              <Label>District (Optional)</Label>
                              <Input
                                value={addressForm.district}
                                onChange={(e) => setAddressForm({ ...addressForm, district: e.target.value })}
                              />
                            </div>
                          </div>
                          <Button onClick={handleSaveAddress} className="w-full" disabled={saving}>
                            {saving ? 'Saving...' : editingAddress ? 'Update Address' : 'Save Address'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {addresses.length === 0 ? (
                    <div className="text-center py-12">
                      <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No saved addresses</p>
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {addresses.map((address) => (
                        <div key={address.id} className="bg-secondary/50 rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{address.label}</Badge>
                              {address.is_default && <Badge>Default</Badge>}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingAddress(address.id);
                                  setAddressForm({
                                    label: address.label,
                                    full_name: address.full_name,
                                    phone: address.phone,
                                    address_line1: address.address_line1,
                                    address_line2: address.address_line2 || '',
                                    city: address.city,
                                    district: address.district || '',
                                    postal_code: address.postal_code || '',
                                    is_default: address.is_default,
                                  });
                                  setAddressDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive"
                                onClick={() => handleDeleteAddress(address.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <p className="font-medium">{address.full_name}</p>
                          <p className="text-sm text-muted-foreground">{address.phone}</p>
                          <p className="text-sm text-muted-foreground">
                            {address.address_line1}
                            {address.address_line2 && `, ${address.address_line2}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {address.city}{address.district && `, ${address.district}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <NotificationPreferencesCard />
              )}

              {/* Loyalty Points Tab */}
              {activeTab === 'loyalty' && (
                <LoyaltyPointsCard />
              )}

              {/* Referral Program Tab */}
              {activeTab === 'referrals' && (
                <ReferralProgram />
              )}

              {/* Payment Methods Tab */}
              {activeTab === 'payments' && (
                <div className="bg-card rounded-xl border border-border p-6">
                  <div className="mb-6">
                    <h1 className="font-display text-2xl font-bold">Payment Methods</h1>
                    <p className="text-muted-foreground">Manage your saved payment methods for faster checkout</p>
                  </div>
                  <SavedPaymentMethods />
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  {/* Two-Factor Authentication */}
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h1 className="font-display text-2xl font-bold mb-6">Security Settings</h1>
                    <TwoFactorAuth />
                  </div>

                  {/* Change Password */}
                  <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="font-display text-xl font-bold mb-6 flex items-center gap-2">
                      <Lock className="h-5 w-5" />
                      Change Password
                    </h2>
                    
                    <div className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          placeholder="Enter new password"
                          autoComplete="new-password"
                        />
                        {errors.newPassword && <p className="text-destructive text-sm">{errors.newPassword}</p>}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="Confirm new password"
                          autoComplete="new-password"
                        />
                        {errors.confirmPassword && <p className="text-destructive text-sm">{errors.confirmPassword}</p>}
                      </div>

                      <Button onClick={handleChangePassword} disabled={saving}>
                        {saving ? 'Changing...' : 'Change Password'}
                      </Button>
                    </div>
                  </div>

                  {/* Delete Account */}
                  <DeleteAccount />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  );
}
