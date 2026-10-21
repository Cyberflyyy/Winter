import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { USER_EMAIL_HEADER, USER_ID_HEADER } from "@/lib/supabase/headers";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Użytkownika zweryfikował już middleware — tu tylko odczytujemy wynik
  const h = await headers();
  const userId = h.get(USER_ID_HEADER);
  if (!userId) redirect("/login");

  return (
    <AppShell userId={userId} email={decodeURIComponent(h.get(USER_EMAIL_HEADER) ?? "")}>
      {children}
    </AppShell>
  );
}
