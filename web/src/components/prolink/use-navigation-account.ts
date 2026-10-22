"use client";

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import type { ProfessionalState } from '@/utils/professional';

interface Account {
  isLoggedIn: boolean;
  proState: ProfessionalState;
  userName: string;
  reviewNote: string | null;
}

const signedOut: Account = { isLoggedIn: false, proState: 'logged_out', userName: 'User', reviewNote: null };
const AccountContext = createContext<(Account & { handleSignOut: () => Promise<void>; refreshAccount: () => void }) | null>(null);

export function NavigationAccountProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account>(signedOut);
  const router = useRouter();
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) return;

    const supabase = createClient();
    let active = true;
    let revision = 0;
    let currentUserId: string | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;

    // Account requests run after the shell is visible and once per account change,
    // rather than blocking page navigation on server queries.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      const user = session?.user;
      if (user && user.id === currentUserId && event !== 'USER_UPDATED') return;
      currentUserId = user?.id || null;
      const requestRevision = ++revision;
      clearTimeout(timer);
      if (!user) {
        setAccount(signedOut);
        return;
      }
      const userName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
      setAccount({ isLoggedIn: true, proState: 'none', userName, reviewNote: null });

      // Leave the auth callback before making Supabase queries.
      timer = setTimeout(() => {
        void Promise.all([
          supabase.from('profiles').select('full_name').eq('id', user.id).maybeSingle(),
          supabase.from('professional_profiles').select('status, review_note').eq('profile_id', user.id).maybeSingle(),
        ]).then(([profile, professional]) => {
          if (!active || requestRevision !== revision) return;
          const status = professional.data?.status;
          const proState: ProfessionalState = status === 'pending' || status === 'approved' || status === 'rejected' || status === 'suspended' ? status : 'none';
          setAccount({ isLoggedIn: true, proState, userName: profile.data?.full_name || userName, reviewNote: professional.data?.review_note || null });
        }).catch(() => {
          // Keep the session's display name if account details are unavailable.
        });
      }, 0);
    });

    return () => { active = false; ++revision; clearTimeout(timer); subscription.unsubscribe(); };
  }, [refreshVersion]);

  const handleSignOut = async () => {
    const { error } = await createClient().auth.signOut();
    if (error) return;
    setAccount(signedOut);
    router.refresh();
  };

  return createElement(AccountContext.Provider, { value: { ...account, handleSignOut, refreshAccount: () => setRefreshVersion(version => version + 1) } }, children);
}

export function useNavigationAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error('Navigation requires NavigationAccountProvider');
  return account;
}
