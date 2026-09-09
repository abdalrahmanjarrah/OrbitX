import { useEffect, useState } from "react";
import { onAuthStateChanged } from "./supabaseAdapter";

export function useAuthState(_auth: any): any[] {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const unsub = onAuthStateChanged(_auth, (u: any) => {
      if (!active) return;
      setUser(u);
      setLoading(false);
    });
    return () => {
      active = false;
      try {
        if (typeof unsub === "function") unsub();
      } catch (e) {
        console.warn("Failed to unsubscribe auth listener:", e);
      }
    };
  }, [_auth]);

  return [user, loading, undefined];
}
