"use client";

import { ReactNode } from "react";
import { useUserRole } from "@/hooks/use-user-role";


interface RequireAdminProps {
    children: ReactNode;
    fallback?: ReactNode;
}


/**
 * Component chỉ hiển thị nội dung cho admin
 */
export function RequireAdmin({ children, fallback = null }: RequireAdminProps) {
    const { isAdmin } = useUserRole();

    if (!isAdmin) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

interface RequireRoleProps {
    children: ReactNode;
    role: "admin" | "user";
    fallback?: ReactNode;
}

/**
 * Component chỉ hiển thị nội dung cho role cụ thể
 */
export function RequireRole({ children, role, fallback = null }: RequireRoleProps) {
    const { role: userRole } = useUserRole();

    if (userRole !== role) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: Array<"admin" | "user">;
    fallback?: ReactNode;
}

/**
 * Component hiển thị nội dung nếu user có một trong các role được phép
 */
export function RoleGuard({ children, allowedRoles, fallback = null }: RoleGuardProps) {
    const { role } = useUserRole();

    if (!allowedRoles.includes(role)) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}
