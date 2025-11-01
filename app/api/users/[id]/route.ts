import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getUser, getProfile } from "@/lib/auth";
import { hash } from "bcryptjs";

// GET /api/users/[id] - Get a specific user (admin only, or own profile)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Users can view their own profile, or admins can view any profile
    if (profile.id !== id && profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isPublic: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            pages: true,
            docs: true,
          } as any,
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: targetUser });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PUT /api/users/[id] - Update user (admin can update anyone, users can update themselves)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getUser();

    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await getProfile();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      email,
      username,
      fullName,
      avatarUrl,
      bio,
      role,
      password,
      isPublic,
    } = body;

    // Check permissions
    const isAdmin = profile.role === "admin";
    const isOwnProfile = profile.id === id;

    if (!isAdmin && !isOwnProfile) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only admins can change roles
    if (role && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can change user roles" },
        { status: 403 }
      );
    }

    // Only admins can change email and username
    if ((email || username) && !isAdmin) {
      return NextResponse.json(
        { error: "Only admins can change email or username" },
        { status: 403 }
      );
    }

    // Build update data
    const updateData: any = {};

    if (isAdmin) {
      if (email !== undefined) updateData.email = email;
      if (username !== undefined) {
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
        updateData.username = username;
      }
      if (role !== undefined) {
        if (!["admin", "editor", "viewer"].includes(role)) {
          return NextResponse.json(
            { error: "Invalid role. Must be admin, editor, or viewer" },
            { status: 400 }
          );
        }
        updateData.role = role;
      }
    }

    // Users can update their own profile info
    if (fullName !== undefined) updateData.fullName = fullName;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (bio !== undefined) updateData.bio = bio;
    if (isPublic !== undefined && (isAdmin || isOwnProfile)) {
      updateData.isPublic = isPublic;
    }

    // Handle password update
    if (password) {
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.password = await hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        username: true,
        fullName: true,
        avatarUrl: true,
        bio: true,
        role: true,
        isPublic: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    console.error("Error updating user:", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "Email or username already exists" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/users/[id] - Delete user (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    // Prevent deleting yourself
    if (profile.id === id) {
      return NextResponse.json(
        { error: "Cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
