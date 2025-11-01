import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const error = searchParams.get("error");

  // Redirect to the error page with the error parameter
  const errorUrl = new URL("/auth/error", request.url);
  if (error) {
    errorUrl.searchParams.set("error", error);
  }

  return NextResponse.redirect(errorUrl);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
