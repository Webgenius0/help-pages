import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { email, password, username, fullName } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate username format
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username can only contain letters, numbers, hyphens, and underscores",
        },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 30) {
      return NextResponse.json(
        { error: "Username must be between 3 and 30 characters" },
        { status: 400 }
      );
    }

    // Check if user already exists
    let existingUser: any = null;

    try {
      existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });
    } catch (checkError: any) {
      // If createdBy column doesn't exist yet, use raw SQL query
      if (
        checkError.message?.includes("created_by") ||
        checkError.message?.includes("does not exist")
      ) {
        const existingUsers = await (prisma as any).$queryRaw`
          SELECT id, email, username 
          FROM users 
          WHERE email = ${email} OR username = ${username}
          LIMIT 1
        `;

        if (existingUsers.length > 0) {
          existingUser = existingUsers[0];
        }
      } else {
        // Re-throw other errors
        throw checkError;
      }
    }

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
      if (existingUser.username === username) {
        return NextResponse.json(
          { error: "Username already taken" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await hash(password, 10);

    // Check if this is the first user (should be admin)
    // If there are no users yet, make this user an admin
    // Otherwise, new signups are also admins (like WordPress - first admin creates more admins)
    const userCount = await prisma.user.count();

    // Create user with admin role by default (like WordPress)
    // Signups don't have createdBy (they're self-registered)
    let user: any;

    try {
      user = await prisma.user.create({
        data: {
          email,
          username,
          password: hashedPassword,
          fullName: fullName || null,
          role: "admin", // All new signups are admins by default
          // createdBy is null for self-registered users
        },
      });
    } catch (createError: any) {
      // If createdBy column doesn't exist yet, check if we should use raw SQL or skip it
      if (
        createError.message?.includes("created_by") ||
        createError.message?.includes("does not exist")
      ) {
        // Check if column exists first
        const columnExists = await (prisma as any).$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'created_by'
        `;

        // Generate a CUID-like ID (Prisma uses cuid by default)
        const generateId = () => {
          const timestamp = Date.now().toString(36);
          const random = Math.random().toString(36).substring(2, 15);
          return `c${timestamp}${random}`;
        };
        const newId = generateId();

        if (columnExists.length === 0) {
          // Column doesn't exist yet - use raw SQL to create user without createdBy
          const result = await (prisma as any).$queryRaw`
            INSERT INTO users (id, email, username, password, full_name, role, is_public, created_at, updated_at)
            VALUES (${newId}, ${email}, ${username}, ${hashedPassword}, ${
            fullName || null
          }, 'admin', true, NOW(), NOW())
            RETURNING id, email, username
          `;

          user = result[0];
        } else {
          // Column exists, use raw SQL query with created_by set to NULL
          const result = await (prisma as any).$queryRaw`
            INSERT INTO users (id, email, username, password, full_name, role, is_public, created_by, created_at, updated_at)
            VALUES (${newId}, ${email}, ${username}, ${hashedPassword}, ${
            fullName || null
          }, 'admin', true, NULL, NOW(), NOW())
            RETURNING id, email, username
          `;

          user = result[0];
        }
      } else {
        // Re-throw other errors
        throw createError;
      }
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
      },
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });
    return NextResponse.json(
      { error: error?.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
