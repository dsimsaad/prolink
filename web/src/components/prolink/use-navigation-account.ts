"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import type { ProfessionalState } from "@/utils/professional";

export interface NavigationAccountProps {
  initialIsLoggedIn?: boolean;
  initialProState?: ProfessionalState;
  initialUserName?: string;
  initialReviewNote?: string | null;
}

export function useNavigationAccount({ initialIsLoggedIn = false, initialProState = "logged_out", initialUserName = "User", initialReviewNote = null }: NavigationAccountProps) {
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn);
  const [proState, setProState] = useState<ProfessionalState>(initialProState);
  const [userName, setUserName] = useState(initialUserName);
  const [reviewNote, setReviewNote] = useState(initialReviewNote);
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const loggedIn = !!session?.user;
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        setProState("logged_out");
        setUserName("User");
        setReviewNote(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setProState("logged_out");
    setUserName("User");
    setReviewNote(null);
    router.refresh();
  };

  return { isLoggedIn, proState, userName, reviewNote, handleSignOut };
}
