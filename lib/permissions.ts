import type { Prisma } from "@prisma/client";

// Define User type based on Prisma's generated types
type User = Prisma.UserGetPayload<{}>;

export type UserRole = "admin" | "editor" | "viewer";

export interface Permission {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canViewAnalytics: boolean;
}

/**
 * Get permissions for a user based on their role
 */
export function getPermissions(role: UserRole): Permission {
  switch (role) {
    case "admin":
      return {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canPublish: true,
        canManageUsers: true,
        canManageSettings: true,
        canViewAnalytics: true,
      };
    case "editor":
      return {
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canPublish: true,
        canManageUsers: false,
        canManageSettings: false,
        canViewAnalytics: true,
      };
    case "viewer":
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canManageUsers: false,
        canManageSettings: false,
        canViewAnalytics: false,
      };
    default:
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canPublish: false,
        canManageUsers: false,
        canManageSettings: false,
        canViewAnalytics: false,
      };
  }
}

/**
 * Check if a user can perform an action
 */
export function canPerformAction(
  user: Pick<User, "role"> | null,
  action: keyof Permission
): boolean {
  if (!user) return false;

  const permissions = getPermissions(user.role as UserRole);
  return permissions[action];
}

/**
 * Check if a user can edit a specific page
 */
export function canEditPage(
  user: Pick<User, "id" | "role"> | null,
  pageUserId: string
): boolean {
  if (!user) return false;

  // Admins and editors can edit any page
  if (user.role === "admin" || user.role === "editor") {
    return true;
  }

  // Users can edit their own pages
  return user.id === pageUserId;
}

/**
 * Check if a user can delete a specific page
 */
export function canDeletePage(
  user: Pick<User, "id" | "role"> | null,
  pageUserId: string
): boolean {
  if (!user) return false;

  // Only admins can delete pages
  if (user.role === "admin") {
    return true;
  }

  return false;
}

/**
 * Check if a user can view a page based on its visibility
 * Note: Pages inherit visibility from their parent Doc
 */
export function canViewPage(
  user: Pick<User, "id" | "role"> | null,
  page: { userId: string; status: string },
  doc?: { isPublic: boolean } | null
): boolean {
  // Public published pages from public docs are visible to everyone
  if (doc?.isPublic && page.status === "published") {
    return true;
  }

  // If no user, they can only see public pages from public docs
  if (!user) {
    return false;
  }

  // Admins and editors can see all pages
  if (user.role === "admin" || user.role === "editor") {
    return true;
  }

  // Users can see their own pages
  return user.id === page.userId;
}

/**
 * Require a specific role to perform an action
 * Throws an error if the user doesn't have permission
 */
export function requireRole(
  user: Pick<User, "role"> | null,
  requiredRole: UserRole | UserRole[]
): void {
  if (!user) {
    throw new Error("Unauthorized: User not authenticated");
  }

  const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

  if (!roles.includes(user.role as UserRole)) {
    throw new Error(
      `Unauthorized: Requires ${roles.join(" or ")} role, but user has ${
        user.role
      } role`
    );
  }
}

/**
 * Check if user has any of the specified roles
 */
export function hasRole(
  user: Pick<User, "role"> | null,
  role: UserRole | UserRole[]
): boolean {
  if (!user) return false;

  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role as UserRole);
}
