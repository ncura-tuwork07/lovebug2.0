"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";

const displayNames: Record<string, string> = {
  "nazacura95@gmail.com": "Nazareno",
  "jazmin.sorrentino2020@gmail.com": "Jazmín",
};

export function Header() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);

  if (pathname === "/login") return null;

  return (
    <div className="flex items-center justify-between px-4 pt-4">
      <span className="text-sm font-semibold text-rose-400">Lovebug 💕</span>
      {email && (
        <button
          type="button"
          onClick={async () => {
            await createClient().auth.signOut();
            window.location.href = "/login";
          }}
          className="flex items-center gap-1 text-xs text-slate-400"
        >
          {displayNames[email] ?? email}
          <LogOut size={14} />
        </button>
      )}
    </div>
  );
}
