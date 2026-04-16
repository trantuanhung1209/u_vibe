"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { useThemeColor } from "@/contexts/theme-context";
import { useMemo } from "react";

export function ClerkProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { theme, themeColor } = useThemeColor();

  const primaryColor = useMemo(() => {
    // Đối với dark theme, primary thường là màu sáng
    // Đối với light theme, primary thường là màu tối
    if (theme === "dark") {
      return "#ffffff";
    } else if (theme === "light") {
      // Lấy màu primary dựa trên themeColor
      switch (themeColor) {
        case "gray":
          return "hsl(27, 79%, 50%)"; // Màu primary của gray theme
        case "amethyst":
          return "hsl(270, 80%, 60%)"; // Màu primary của amethyst
        case "bubblegum":
          return "hsl(340, 82%, 52%)"; // Màu primary của bubblegum
        case "claude":
          return "hsl(24, 85%, 53%)"; // Màu primary của claude
        default:
          return "#000000"; // Default theme
      }
    }
    return "#000000";
  }, [theme, themeColor]);

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: primaryColor,
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
