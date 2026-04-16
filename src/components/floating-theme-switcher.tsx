"use client";

import { ThemeSwitcher } from "./theme-switcher";

export const FloatingThemeSwitcher = () => {
  return (
    <div className="fixed bottom-6 right-6 z-50">
      <div className="rounded-full shadow-xl border bg-background/95 backdrop-blur-sm">
        <ThemeSwitcher />
      </div>
    </div>
  );
};
