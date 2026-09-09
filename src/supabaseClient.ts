import { createClient } from "@supabase/supabase-js";

// Retrieve configuration safely from environment variables or use fallback placeholders for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://your-project-id.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "your-anon-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const getRedirectUrl = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin.startsWith("http://10.")) {
    return "https://ais-dev-h7znwe7lpee7pk7vyclbkj-6254332619.europe-west2.run.app";
  }
  return origin || "https://ais-dev-h7znwe7lpee7pk7vyclbkj-6254332619.europe-west2.run.app";
};

/**
 * Signs in a user using Google OAuth via Supabase
 */
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
      },
    });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Supabase Google login failed:", error);
    throw error;
  }
};

/**
 * Signs out the current authenticated user
 */
export const logout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error) {
    console.error("Supabase signout failed:", error);
    throw error;
  }
};
