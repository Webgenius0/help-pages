import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-config";

// Initialize NextAuth handler - NextAuth v4 with App Router pattern
const handler = NextAuth(authOptions);

// Export handler functions - NextAuth handles the request/response properly
export { handler as GET, handler as POST };
