"use client";

import { useUser } from "@clerk/nextjs";
import { UserRole, ROLE_PERMISSIONS, RolePermissions } from "@/types/roles";
import { useMemo } from "react";

/**Hook để lấy role và permission của user hiện tại */
export function useUserRole() {
    const { user } = useUser();

    const role = useMemo<UserRole>(() => {
        if (!user) return "user";
        // Lấy role từ publicMetadata
        return (user.publicMetadata?.role as UserRole) || "user";
    }, [user]);

    const permissions = useMemo<RolePermissions>(() => {
        return ROLE_PERMISSIONS[role];
    }, [role]);

    const isAdmin = useMemo(() => role === "admin", [role]);
    const isUser = useMemo(() => role === "user", [role]);

    return {
        role,
        permissions,
        isAdmin,
        isUser,
        user,
    };
    }

    /**
     * Hook để kiểm tra một permission cụ thể
     */
    export function useHasPermission(permission: keyof RolePermissions): boolean {
    const { permissions } = useUserRole();
    return permissions[permission];
}
