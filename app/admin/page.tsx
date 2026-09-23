import { cookies } from "next/headers";
import AdminDashboard from "@/components/AdminDashboard";
import AdminLogin from "@/components/AdminLogin";
import { ADMIN_COOKIE_NAME, isAdminCookieValid } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const store = await cookies();
  const authed = isAdminCookieValid(store.get(ADMIN_COOKIE_NAME)?.value);
  return (
    <main className="min-h-screen bg-white">
      {authed ? <AdminDashboard /> : <AdminLogin />}
    </main>
  );
}
