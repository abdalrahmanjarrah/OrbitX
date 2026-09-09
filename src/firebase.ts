import {
  auth,
  db,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
} from "./supabaseAdapter";
import { Debugger } from "./firebaseDebug";

export * from "./supabaseAdapter";

export { auth, db };

export const signInWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, new GoogleAuthProvider());
  } catch (error: any) {
    if (
      error.code !== "auth/popup-closed-by-user" &&
      error.code !== "auth/cancelled-popup-request"
    ) {
      console.error("Error signing in with Google", error);
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

export const signInAsGuest = async () => {
  try {
    const result = await signInAnonymously(auth);
    return result?.user;
  } catch (error: any) {
    console.error("Error signing in as guest", error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result?.user;
  } catch (error: any) {
    console.error("Error signing in with Email/Password", error);
    throw error;
  }
};

export const registerWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    return result?.user;
  } catch (error: any) {
    console.error("Error registering with Email/Password", error);
    throw error;
  }
};

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code;

  const isOffline =
    errMsg.toLowerCase().includes("unavailable") ||
    errMsg.toLowerCase().includes("offline") ||
    errMsg.toLowerCase().includes("could not reach cloud firestore") ||
    errCode === "unavailable" ||
    errCode === "failed-precondition";

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map((provider: any) => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL,
      })) || [],
    },
    operationType,
    path,
  };

  if (isOffline) {
    console.warn(
      `[Firestore Status] Offline/temporarily unreachable. Operation '${operationType}' is queued locally and will resume when online. Status: ${errMsg}`,
    );
    Debugger.logError(
      `firestore_offline_${operationType}`,
      `Path: ${path} | Status: ${errMsg}`,
    );
    return;
  }

  console.error("Firestore Error: ", JSON.stringify(errInfo));

  const isQuota =
    errMsg.toLowerCase().includes("quota") ||
    errMsg.toLowerCase().includes("resource-exhausted") ||
    errMsg.toLowerCase().includes("exhausted");
  if (isQuota) {
    if (typeof window !== "undefined") {
      (window as any).__firestoreQuotaExceeded = true;
      try {
        window.dispatchEvent(
          new CustomEvent("firestore_quota_exceeded", { detail: errInfo }),
        );
      } catch {}
    }
    Debugger.logError(
      "firestore_quota",
      "Quota Exceeded on " + path + ": " + errMsg,
    );
    return;
  }

  Debugger.logError(
    `firestore_op_${operationType}`,
    `Path: ${path} | Err: ${errMsg}`,
  );
}
