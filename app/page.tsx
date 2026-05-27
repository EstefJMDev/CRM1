"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/users/me", { cache: "no-store" });
        router.push(response.ok ? "/dashboard" : "/auth/login");
      } catch {
        router.push("/auth/login");
      }
    })();
  }, [router]);

  return (
    <div className="app-shell app-main flex items-center justify-center">
      <div className="app-card w-full max-w-sm p-6 text-center fade-in">
        <div className="skeleton h-3 w-24 mx-auto mb-4" />
        <p className="text-gray-600">Redirigiendo...</p>
      </div>
    </div>
  );
}


