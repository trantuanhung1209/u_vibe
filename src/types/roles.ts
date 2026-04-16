export type UserRole = "admin" | "user";

export interface RolePermissions {
  canAccessAdminPanel: boolean;
  canManageUsers: boolean;
  canViewAnalytics: boolean;
  canDeleteProjects: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  admin: {
    canAccessAdminPanel: true,
    canManageUsers: true,
    canViewAnalytics: true,
    canDeleteProjects: true,
  },
  user: {
    canAccessAdminPanel: false,
    canManageUsers: false,
    canViewAnalytics: false,
    canDeleteProjects: false,
  },
};

// Type definition cho Clerk session claims
export interface ClerkSessionClaims {
  metadata?: {
    role?: UserRole;
  };
  [key: string]: unknown;
}
