import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";

// POST /api/analytics/track - Track page view
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pageId, eventType } = body;

    if (!pageId) {
      return NextResponse.json({ error: "Missing pageId" }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    let userId = null;

    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      userId = user?.id || null;
    }

    // Track page view (will be enabled after migration)
    if (eventType === "pageview") {
      // const ipAddress = request.headers.get('x-forwarded-for') ||
      //                   request.headers.get('x-real-ip') ||
      //                   'unknown';
      // const userAgent = request.headers.get('user-agent') || 'unknown';
      // const referrer = request.headers.get('referer') || null;

      // await prisma.pageView.create({
      //   data: {
      //     pageId,
      //     userId,
      //     ipAddress,
      //     userAgent,
      //     referrer,
      //   },
      // });

      // Increment view count on the page
      await (prisma as any).page.update({
        where: { id: pageId },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}
