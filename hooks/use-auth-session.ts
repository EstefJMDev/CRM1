"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type AuthUser = {
  id: string;
  name: string;
  lastName?: string | null;
  email: string;
  role: "SUPER_ADMIN" | "TENANT_ADMIN" | "USER";
  mustChangePassword?: boolean;
  isActive?: boolean;
};

type UseAuthSessionOptions = {
  redirectTo?: string;
  requirePasswordChangeRedirect?: string;
};

export function useAuthSession(options?: UseAuthSessionOptions) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        if (!response.ok) {
          router.push(options?.redirectTo || "/auth/login");
          return;
        }

        const currentUser = (await response.json()) as AuthUser;
        if (currentUser.mustChangePassword && options?.requirePasswordChangeRedirect) {
          router.push(options.requirePasswordChangeRedirect);
          return;
        }

        setUser(currentUser);
      } catch {
        router.push(options?.redirectTo || "/auth/login");
      } finally {
        setLoading(false);
      }
    })();
  }, [options?.redirectTo, options?.requirePasswordChangeRedirect, router]);

  return { user, loading, setUser };
}

export async function logoutAndRedirect(router: ReturnType<typeof useRouter>) {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } finally {
    router.push("/auth/login");
  }
}
