import { auth } from "@clerk/nextjs/server";
import { UserRole, ROLE_PERMISSIONS, RolePermissions, ClerkSessionClaims } from "@/types/roles";

/**
 * Lấy role của user hiện tại từ Clerk metadata
 */
export async function getUserRole(): Promise<UserRole> {
  const { sessionClaims } = await auth();
  
  // Lấy role từ publicMetadata trong Clerk
  const role = (sessionClaims as ClerkSessionClaims)?.metadata?.role;
  
  return role || "user"; // Mặc định là user nếu không có role
}

/**
 * Kiểm tra xem user có phải admin không
 */
export async function isAdmin(): Promise<boolean> {
  const role = await getUserRole();
  return role === "admin";
}

/**
 * Kiểm tra xem user có phải user thường không
 */
export async function isUser(): Promise<boolean> {
  const role = await getUserRole();
  return role === "user";
}

/**
 * Lấy permissions của user hiện tại
 */
export async function getUserPermissions(): Promise<RolePermissions> {
  const role = await getUserRole();
  return ROLE_PERMISSIONS[role];
}

/**
 * Kiểm tra xem user có permission cụ thể không
 */
export async function hasPermission(
  permission: keyof RolePermissions
): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions[permission];
}

/**
 * Throw error nếu user không phải admin
 */
export async function requireAdmin(): Promise<void> {
  const isAdminUser = await isAdmin();
  if (!isAdminUser) {
    throw new Error("Unauthorized: Admin access required");
  }
}

/**
 * Kiểm tra role từ session claims (client-side compatible)
 */
export function getRoleFromClaims(
  sessionClaims: ClerkSessionClaims
): UserRole {
  const role = sessionClaims?.metadata?.role;
  return role || "user";
}
