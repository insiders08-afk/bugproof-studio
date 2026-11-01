import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from '@tanstack/react-router';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
const AccountContext = createContext<{ user: User | null; ready: boolean }>({ user: null, ready: false });
export const useAccount = () => useContext(AccountContext);
export function AccountSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { queryClient } = router.options.context;
  const [account, setAccount] = useState<{user: User | null; ready: boolean}>({ user: null, ready: false });
  useEffect(() => {
    let active = true;
    let generation = 0;
    const verify = async () => {
      const version = ++generation;
      const { data } = await supabase.auth.getUser();
      if (active && version === generation) setAccount({ user: data.user, ready: true });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (!['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) return;
      if (event === 'SIGNED_OUT') { generation++; setAccount({ user: null, ready: true }); }
      else { void verify(); queryClient.invalidateQueries(); }
      router.invalidate();
    });
    void verify();
    return () => { active = false; subscription.unsubscribe(); };
  }, [router, queryClient]);
  return <AccountContext.Provider value={account}>{children}</AccountContext.Provider>;
}
