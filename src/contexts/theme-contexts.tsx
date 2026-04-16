"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useTheme as useNextTheme } from "next-themes";

type ThemeColor = "default" | "gray" | "amethyst" | "bubblegum" | "claude";

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (theme: ThemeColor) => void;
  theme: string | undefined;
  setTheme: (theme: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useNextTheme();
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme-color") as ThemeColor) || "default";
    }
    return "default";
  });

  useEffect(() => {
    // Apply saved theme color on mount
    document.documentElement.setAttribute("data-theme", themeColor);
  }, [themeColor]);

  const setThemeColor = (newTheme: ThemeColor) => {
    setThemeColorState(newTheme);
    localStorage.setItem("theme-color", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor, theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeColor() {
    const context = useContext(ThemeContext);
    if(context === undefined){
        throw new Error("useThemeColor must be used within ThemeProvider")
    }
    return context;
}