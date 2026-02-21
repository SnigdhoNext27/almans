import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'officer' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userRole: AdminRole;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<AdminRole>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Defer role check to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            checkAdminRole(session.user.id);
          }, 0);
          // Sync OAuth avatar on sign-in
          if (event === 'SIGNED_IN') {
            syncOAuthAvatar(session.user);
          }
        } else {
          setIsAdmin(false);
          setUserRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        checkAdminRole(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (userId: string) => {
    try {
      // Check for any admin-level role
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .in('role', ['super_admin', 'admin', 'moderator', 'officer'])
        .maybeSingle();

      if (!error && data) {
        setIsAdmin(true);
        setUserRole(data.role as AdminRole);
      } else {
        setIsAdmin(false);
        setUserRole(null);
      }
    } catch {
      setIsAdmin(false);
      setUserRole(null);
    }
  };

  const syncOAuthAvatar = async (authUser: User) => {
    const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture;
    if (!avatarUrl) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', authUser.id)
        .maybeSingle();

      // Only set if profile has no avatar yet
      if (profile && !profile.avatar_url) {
        await supabase
          .from('profiles')
          .update({ avatar_url: avatarUrl })
          .eq('id', authUser.id);
      }
    } catch {
      // Silent fail - avatar sync is non-critical
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });
    
    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setUserRole(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAdmin,
      userRole,
      signUp,
      signIn,
      signInWithGoogle,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
