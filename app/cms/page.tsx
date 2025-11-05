import { redirect } from "next/navigation";
import { getUser, getProfile } from "@/lib/auth";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  try {
    const user = await getUser();

    if (!user) {
      redirect("/auth/login");
    }

    const profile = await getProfile();

    return <DashboardClient email={user.email || ""} profile={profile} />;
  } catch (error: any) {
    console.error("Dashboard page error:", error);

    // If it's a database/Prisma error, show migration message
    if (
      error?.message?.includes("does not exist") ||
      error?.code === "P2021" ||
      error?.code === "P2009" || // Prisma validation error
      error?.message?.includes("Unknown argument") || // Prisma field doesn't exist (needs regenerate)
      error?.message?.includes("docItemId")
    ) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-6">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Database Migration Required
            </h1>
            <p className="text-muted-foreground mb-4">
              The database schema has been updated, but the migration hasn't
              been run yet.
            </p>
            <div className="bg-muted p-4 rounded-lg mb-4">
              <p className="text-sm font-mono text-foreground">
                Run these commands in your terminal:
              </p>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                <li>Stop your dev server (Ctrl+C)</li>
                <li>
                  <code className="bg-background px-2 py-1 rounded">
                    npx prisma generate
                  </code>
                </li>
                <li>
                  <code className="bg-background px-2 py-1 rounded">
                    npx prisma migrate dev --name add_doc_items
                  </code>
                </li>
                <li>Restart your dev server</li>
              </ol>
            </div>
            <p className="text-xs text-muted-foreground">
              Error: {error?.message || "Unknown error"}
            </p>
          </div>
        </div>
      );
    }

    // Re-throw other errors
    throw error;
  }
}
