// Lightweight auth-only layer built on @supabase/auth-js (GoTrueClient).
// Keeping this separate from the full Supabase SDK means the landing page
// only ships the auth client (~100KB) instead of the entire supabase-js
// stack (auth + postgrest + realtime + storage) which is lazy-loaded on the
// first data call in supabaseAdapter.ts. Both clients share the same
// localStorage session token, so a login here is immediately visible there.
import { GoTrueClient, type Session, type User } from "@supabase/auth-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project-id.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const authClient = new GoTrueClient({
  url: `${supabaseUrl}/auth/v1`,
  headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${supabaseAnonKey}` },
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
});

let cachedUser: any = null;

export const mapSupabaseUser = (sbUser: User | null) => {
  if (!sbUser) {
    cachedUser = null;
    return null;
  }
  const isAnonymous = !!sbUser.is_anonymous || sbUser.app_metadata?.provider === "anonymous";
  const mapped = {
    uid: sbUser.id,
    id: sbUser.id,
    email: isAnonymous ? null : sbUser.email,
    displayName: isAnonymous
      ? (sbUser.user_metadata?.name || "زائر")
      : (sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || "رائد فضاء"),
    photoURL: isAnonymous
      ? `https://api.dicebear.com/7.x/bottts/svg?seed=${sbUser.id}`
      : (sbUser.user_metadata?.avatar_url || ""),
    emailVerified: !!sbUser.email_confirmed_at,
    isAnonymous,
    providerData: isAnonymous
      ? []
      : [
          {
            providerId: "google",
            uid: sbUser.id,
            displayName: sbUser.user_metadata?.full_name || sbUser.user_metadata?.name || "رائد فضاء",
            email: sbUser.email,
            photoURL: sbUser.user_metadata?.avatar_url || "",
          },
        ],
    getIdToken: async () => {
      const { data } = await authClient.getSession();
      return data.session?.access_token || "";
    },
  };
  cachedUser = mapped;
  return mapped;
};

// Eagerly populate cachedUser from the current session.
if (typeof window !== "undefined") {
  authClient.getSession().then(({ data: { session } }) => {
    if (session?.user) mapSupabaseUser(session.user);
  }).catch(() => {});

  authClient.onAuthStateChange((_event, session) => {
    if (session?.user) mapSupabaseUser(session.user);
    else cachedUser = null;
  });
}

// Helper to get the correct redirect URL for the OAuth popup.
// Must stay on the SAME origin as the app so the PKCE code_verifier (stored in
// that origin's localStorage) can complete the session exchange inside the popup.
const getRedirectUrl = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = import.meta.env.BASE_URL || "/";
  const basePath = base.startsWith("/") ? base : "/" + base;
  return (origin + basePath).replace(/\/+$/, "") || "https://orbitx.study";
};

// Google sign in via OAuth popup or redirection
export const signInWithPopup = async (authInstance: any, providerInstance: any) => {
  const { data, error } = await authClient.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: getRedirectUrl(),
      skipBrowserRedirect: true,
    },
  });
  if (error) throw error;

  if (data?.url) {
    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      data.url,
      "supabase-oauth",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes,scrollbars=yes`,
    );
    if (popup) {
      popup.focus();

      // Poll to detect when the popup is closed (by user or automatic closing) and force a state check
      const pollTimer = setInterval(() => {
        if (!popup || popup.closed) {
          clearInterval(pollTimer);
          // Refresh session immediately
          authClient.getSession().then(({ data: { session } }) => {
            if (session?.user) {
              // Fire storage/auth events to trigger immediate state refresh in UI
              window.dispatchEvent(new Event("storage"));
            }
          });
        }
      }, 500);
    }
  }

  return { user: null }; // OAuth redirects, callback handles user state
};

export const signOut = async (authInstance: any) => {
  const { error } = await authClient.signOut();
  if (error) throw error;
};

// Anonymous (guest) sign in — creates a throwaway account with no email/provider.
export const signInAnonymously = async (authInstance: any) => {
  const { data, error } = await authClient.signInAnonymously();
  if (error) throw error;
  const mapped = data?.user ? mapSupabaseUser(data.user) : null;
  if (mapped) {
    window.dispatchEvent(new Event("storage"));
  }
  return { user: mapped };
};

export const onAuthStateChanged = (authInstance: any, callback: (user: any) => void) => {
  // Try to resolve user synchronously from cachedUser or localStorage first to avoid flash of loading
  let resolvedSync = false;
  if (cachedUser) {
    callback(cachedUser);
    resolvedSync = true;
  } else {
    try {
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage);
        const supabaseKey = keys.find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (supabaseKey) {
          const raw = localStorage.getItem(supabaseKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.user) {
              const mapped = mapSupabaseUser(parsed.user);
              callback(mapped);
              resolvedSync = true;
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed sync check in onAuthStateChanged:", e);
    }
  }

  // Trigger initial auth check
  authClient.getSession().then(({ data: { session } }) => {
    callback(session?.user ? mapSupabaseUser(session.user) : null);
  }).catch(() => {
    if (!resolvedSync) callback(null);
  });

  // Wire up state listener
  const { data: { subscription } } = authClient.onAuthStateChange((_event, session) => {
    callback(session?.user ? mapSupabaseUser(session.user) : null);
  });

  // Additional check when the window gains focus to guarantee instantaneous session synchronization
  const handleFocus = () => {
    authClient.getSession().then(({ data: { session } }) => {
      callback(session?.user ? mapSupabaseUser(session.user) : null);
    });
  };
  window.addEventListener("focus", handleFocus);

  // Set up storage event listener for instant state sync across popups, tabs and iframes
  const handleStorage = (e: StorageEvent) => {
    if (e.key && e.key.startsWith("sb-") && e.key.endsWith("-auth-token")) {
      authClient.getSession().then(({ data: { session } }) => {
        callback(session?.user ? mapSupabaseUser(session.user) : null);
      });
    }
  };
  window.addEventListener("storage", handleStorage);

  // Set up a BroadcastChannel to receive auth updates from popup
  let channel: BroadcastChannel | null = null;
  try {
    channel = new BroadcastChannel("supabase-auth-channel");
    channel.onmessage = (event) => {
      if (event.data?.type === "OAUTH_SUCCESS") {
        authClient.getSession().then(({ data: { session } }) => {
          callback(session?.user ? mapSupabaseUser(session.user) : null);
        });
      }
    };
  } catch (e) {
    console.error("Failed to initialize BroadcastChannel in listener:", e);
  }

  // Set up message listener for postMessage
  const handleMessage = (event: MessageEvent) => {
    if (event.data?.type === "supabase-oauth-success") {
      authClient.getSession().then(({ data: { session } }) => {
        callback(session?.user ? mapSupabaseUser(session.user) : null);
      });
    }
  };
  window.addEventListener("message", handleMessage);

  return () => {
    subscription.unsubscribe();
    window.removeEventListener("focus", handleFocus);
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("message", handleMessage);
    if (channel) {
      try {
        channel.close();
      } catch (e) {
        console.error("Error closing channel:", e);
      }
    }
  };
};

export const onIdTokenChanged = (authInstance: any, callback: (user: any) => void) => {
  return onAuthStateChanged(authInstance, callback);
};

export const signInWithRedirect = async (authInstance: any, providerInstance: any) => {
  return signInWithPopup(authInstance, providerInstance);
};

export const getRedirectResult = async () => {
  const { data: { session } } = await authClient.getSession();
  return session?.user ? { user: mapSupabaseUser(session.user) } : null;
};

export const createUserWithEmailAndPassword = async (authInstance: any, email: string, password: string) => {
  const { data, error } = await authClient.signUp({ email, password });
  if (error) throw error;
  return { user: data.user ? mapSupabaseUser(data.user) : null };
};

export const signInWithEmailAndPassword = async (authInstance: any, email: string, password: string) => {
  const { data, error } = await authClient.signInWithPassword({ email, password });
  if (error) throw error;
  return { user: data.user ? mapSupabaseUser(data.user) : null };
};

export const sendPasswordResetEmail = async (authInstance: any, email: string) => {
  const { error } = await authClient.resetPasswordForEmail(email, {
    redirectTo: getRedirectUrl() + "/reset-password",
  });
  if (error) throw error;
};

export const sendEmailVerification = async (userInstance: any) => {
  console.log("sendEmailVerification is managed by Supabase flow on signup.");
};

export const sendSignInLinkToEmail = async (authInstance: any, email: string, actionCodeSettings: any) => {
  const { error } = await authClient.signInWithOtp({
    email,
    options: {
      emailRedirectTo: actionCodeSettings?.url || getRedirectUrl(),
    },
  });
  if (error) throw error;
};

export const signInWithEmailLink = async (authInstance: any, email: string, link: string) => {
  const { data: { session } } = await authClient.getSession();
  return { user: session?.user ? mapSupabaseUser(session.user) : null };
};

export const updateEmail = async (userInstance: any, newEmail: string) => {
  const { data, error } = await authClient.updateUser({ email: newEmail });
  if (error) throw error;
  return { user: data.user ? mapSupabaseUser(data.user) : null };
};

export const updatePassword = async (userInstance: any, newPassword: string) => {
  const { data, error } = await authClient.updateUser({ password: newPassword });
  if (error) throw error;
  return { user: data.user ? mapSupabaseUser(data.user) : null };
};

export const updateProfile = async (userInstance: any, profile: { displayName?: string; photoURL?: string }) => {
  const metadata: any = {};
  if (profile.displayName !== undefined) metadata.full_name = profile.displayName;
  if (profile.photoURL !== undefined) metadata.avatar_url = profile.photoURL;
  const { data, error } = await authClient.updateUser({
    data: metadata,
  });
  if (error) throw error;
  return { user: data.user ? mapSupabaseUser(data.user) : null };
};

export const verifyBeforeUpdateEmail = async (userInstance: any, newEmail: string) => {
  const { data, error } = await authClient.updateUser({ email: newEmail });
  if (error) throw error;
  return { user: data.user ? mapSupabaseUser(data.user) : null };
};

// Dummy provider instances (Firebase-compatible API surface)
export class GoogleAuthProvider {}
export class FacebookAuthProvider {}
export class GithubAuthProvider {}
export class TwitterAuthProvider {}
export class OAuthProvider {}
export class EmailAuthProvider {
  static credential(email: string, password: string) {
    return { providerId: "password", email, password };
  }
}
export class PhoneAuthProvider {}
export class RecaptchaVerifier {}

// Mock Auth wrapper exposing a Firebase-shaped `currentUser`
// (kept synchronous so existing `auth.currentUser?.uid` reads keep working).
class MockAuth {
  get currentUser() {
    if (cachedUser) return cachedUser;
    try {
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage);
        const supabaseKey = keys.find((k) => k.startsWith("sb-") && k.endsWith("-auth-token"));
        if (supabaseKey) {
          const raw = localStorage.getItem(supabaseKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && parsed.user) {
              return mapSupabaseUser(parsed.user);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse synchronous user from localStorage:", e);
    }
    return null;
  }
}

// 7. Global Exports
export const auth = new MockAuth();
export const getAuth = (_app?: any) => auth;
