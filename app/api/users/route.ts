import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser, getProfile } from "@/lib/auth";
import { hash } from "bcryptjs";

// GET /api/users - List all users (admin only)
export async function GET(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    // Only show users created by this admin (their editors)
    // Check if created_by column exists first, then use appropriate query method
    let users: any[];

    // Check if column exists first
    const columnExists = await (prisma as any).$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'created_by'
    `;

    if (columnExists.length === 0) {
      // Column doesn't exist yet - return empty array to prevent showing other admins' editors
      // The migration must be run for proper filtering to work
      console.warn(
        "created_by column doesn't exist yet. Returning empty list. Please run: npx prisma migrate dev --name add_created_by_to_user"
      );
      users = [];
    } else {
      // Column exists - use raw SQL query to ensure we get the correct results
      // This works even if Prisma client hasn't been regenerated
      users = await (prisma as any).$queryRaw`
        SELECT 
          u.id,
          u.email,
          u.username,
          u.full_name as "fullName",
          u.role,
          u.is_public as "isPublic",
          u.created_at as "createdAt",
          (
            SELECT COUNT(*)::int 
            FROM pages p 
            WHERE p.user_id = u.id
          ) as pages_count,
          (
            SELECT COUNT(*)::int 
            FROM docs d 
            WHERE d.user_id = u.id
          ) as docs_count
        FROM users u
        WHERE u.created_by = ${profile.id}
        ORDER BY u.created_at DESC
      `;

      // Transform the result to match the expected format
      users = users.map((user: any) => ({
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.fullName,
        role: user.role,
        isPublic: user.isPublic,
        createdAt: user.createdAt,
        _count: {
          pages: user.pages_count || 0,
          docs: user.docs_count || 0,
        },
      }));
    }

    return NextResponse.json({ users });
  } catch (error: any) {
    console.error("Error fetching users:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    // Provide more specific error messages
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Database constraint violation" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to fetch users",
        details:
          process.env.NODE_ENV === "development" ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user (admin only)
export async function POST(request: NextRequest) {
  try {
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, password, username, fullName, role } = body;

    // Validate required fields
    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Email, password, and username are required" },
        { status: 400 }
      );
    }

    // Validate role
    if (role && !["admin", "editor", "viewer"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be admin, editor, or viewer" },
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

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
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
        const columnExists = await (prisma as any).$queryRaw`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'created_by'
        `;

        if (columnExists.length === 0) {
          // Column doesn't exist yet - use raw SQL to check for existing user
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
          // Column exists but Prisma client hasn't been regenerated
          const existingUsers = await (prisma as any).$queryRaw`
            SELECT id, email, username 
            FROM users 
            WHERE email = ${email} OR username = ${username}
            LIMIT 1
          `;

          if (existingUsers.length > 0) {
            existingUser = existingUsers[0];
          }
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

    // Create user with specified role (default to 'editor' for admin-created users)
    // Set createdBy to the current admin's ID
    let newUser: any;

    try {
      // Try to create user with createdBy field
      newUser = await (prisma.user.create as any)({
        data: {
          email,
          username,
          password: hashedPassword,
          fullName: fullName || null,
          role: role || "editor", // Default to editor for admin-created users
          createdBy: profile.id, // Track who created this user
        },
        select: {
          id: true,
          email: true,
          username: true,
          fullName: true,
          role: true,
          createdAt: true,
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

        if (columnExists.length === 0) {
          // Column doesn't exist yet - create user without createdBy (temporary workaround)
          console.warn(
            "created_by column doesn't exist yet. Creating user without createdBy. Please run: npx prisma migrate dev"
          );
          newUser = await prisma.user.create({
            data: {
              email,
              username,
              password: hashedPassword,
              fullName: fullName || null,
              role: role || "editor",
              // createdBy will be set when migration is run
            },
            select: {
              id: true,
              email: true,
              username: true,
              fullName: true,
              role: true,
              createdAt: true,
            },
          });
        } else {
          // Column exists, use raw SQL query to ensure createdBy is set correctly
          const result = await (prisma as any).$queryRaw`
            INSERT INTO users (email, username, password, full_name, role, is_public, created_by, created_at, updated_at)
            VALUES (${email}, ${username}, ${hashedPassword}, ${
            fullName || null
          }, ${role || "editor"}, true, ${profile.id}, NOW(), NOW())
            RETURNING id, email, username, full_name as "fullName", role, created_at as "createdAt"
          `;

          newUser = result[0];
        }
      } else {
        // Re-throw other errors
        throw createError;
      }
    }

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error: any) {
    console.error("Error creating user:", error);
    console.error("Error details:", {
      message: error?.message,
      code: error?.code,
      stack: error?.stack,
    });

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Email or username already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Failed to create user" },
      { status: 500 }
    );
  }
}
