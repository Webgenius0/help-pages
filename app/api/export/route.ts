import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-config";
import prisma from "@/lib/prisma";

// GET /api/export?format=markdown|html|pdf&pageId=...
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get("format") || "markdown";
    const pageId = searchParams.get("pageId");

    if (!pageId) {
      return NextResponse.json(
        { error: "Missing pageId parameter" },
        { status: 400 }
      );
    }

    const page = (await (prisma as any).page.findUnique({
      where: { id: pageId },
      include: {
        user: {
          select: {
            username: true,
            fullName: true,
          },
        },
        navHeader: {
          select: {
            label: true,
          },
        },
        doc: {
          select: {
            id: true,
            userId: true,
            isPublic: true,
          },
        },
      },
    })) as any;

    if (!page) {
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }

    // Check permissions - Pages inherit visibility from their parent Doc
    // Only allow export of published pages, or drafts if user owns the page/doc
    if (page.status === "draft") {
      if (!session?.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });

      // Check if user owns the page or the doc that contains it
      let canExport = false;
      if (
        user &&
        (user.id === page.userId ||
          user.role === "admin" ||
          user.role === "editor")
      ) {
        canExport = true;
      } else if (page.doc?.id) {
        // Use doc relation that was already fetched
        if (page.doc && user && page.doc.userId === user.id) {
          canExport = true;
        }
      }

      if (!canExport) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    let content: string;
    let contentType: string;
    let filename: string;

    switch (format) {
      case "markdown":
        content = exportAsMarkdown(page);
        contentType = "text/markdown";
        filename = `${page.slug}.md`;
        break;

      case "html":
        content = exportAsHTML(page);
        contentType = "text/html";
        filename = `${page.slug}.html`;
        break;

      case "pdf":
        return NextResponse.json(
          {
            error:
              "PDF export not yet implemented. Please use HTML export and print to PDF.",
          },
          { status: 501 }
        );

      default:
        return NextResponse.json(
          { error: "Invalid format. Use: markdown, html, or pdf" },
          { status: 400 }
        );
    }

    return new NextResponse(content, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export page" },
      { status: 500 }
    );
  }
}

function exportAsMarkdown(page: any): string {
  const author = page.user.fullName || page.user.username;
  const category = page.navHeader?.label || "Uncategorized";
  const date = new Date(page.updatedAt).toLocaleDateString();

  return `---
title: ${page.title}
author: ${author}
category: ${category}
date: ${date}
status: ${page.status}
---

# ${page.title}

${page.summary ? `> ${page.summary}\n\n` : ""}

${page.content}

---

*Last updated: ${date}*
*Status: ${page.status}*
*Category: ${category}*
`;
}

function exportAsHTML(page: any): string {
  const author = page.user.fullName || page.user.username;
  const category = page.navHeader?.label || "Uncategorized";
  const date = new Date(page.updatedAt).toLocaleDateString();

  // Simple markdown to HTML conversion
  let htmlContent = page.content
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*)\*\*/gim, "<strong>$1</strong>")
    .replace(/\*(.*)\*/gim, "<em>$1</em>")
    .replace(/\`(.*?)\`/gim, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
      color: #333;
    }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; color: #111; }
    h2 { font-size: 2rem; margin-top: 2rem; margin-bottom: 0.75rem; color: #222; }
    h3 { font-size: 1.5rem; margin-top: 1.5rem; margin-bottom: 0.5rem; color: #333; }
    p { margin-bottom: 1rem; }
    code {
      background: #f4f4f4;
      padding: 0.2rem 0.4rem;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
    }
    .summary {
      background: #f8f9fa;
      border-left: 4px solid #3ecf8e;
      padding: 1rem;
      margin: 1.5rem 0;
      font-size: 1.1rem;
      color: #555;
    }
    .meta {
      color: #666;
      font-size: 0.9rem;
      border-top: 1px solid #eee;
      margin-top: 3rem;
      padding-top: 1rem;
    }
    .meta span {
      display: inline-block;
      margin-right: 1rem;
    }
  </style>
</head>
<body>
  <h1>${page.title}</h1>
  
  ${page.summary ? `<div class="summary">${page.summary}</div>` : ""}
  
  <p>${htmlContent}</p>
  
  <div class="meta">
    <span><strong>Author:</strong> ${author}</span>
    <span><strong>Category:</strong> ${category}</span>
    <span><strong>Last Updated:</strong> ${date}</span>
    <span><strong>Status:</strong> ${page.status}</span>
  </div>
</body>
</html>`;
}
