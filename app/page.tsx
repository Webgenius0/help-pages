import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Always redirect to login if no user, or to dashboard if logged in
  // This prevents any errors from showing 404
  const user = await getUser().catch(() => null);

  if (user) {
    redirect("/dashboard");
  }

  redirect("/auth/login");
}
