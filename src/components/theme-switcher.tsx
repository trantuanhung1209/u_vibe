"use client";

import { useThemeColor } from "@/contexts/theme-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { MoonIcon, PaletteIcon, SunIcon, SunMoonIcon } from "lucide-react";

export const ThemeSwitcher = () => {
  const { theme, setTheme, themeColor, setThemeColor } = useThemeColor();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <SunMoonIcon className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Theme Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* Color Theme */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <PaletteIcon className="size-4 mr-2" />
            <span>Color Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={themeColor} onValueChange={(value) => setThemeColor(value as "default" | "gray" | "amethyst" | "bubblegum" | "claude")}>
                <DropdownMenuRadioItem value="default">
                  <span>Default</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="gray">
                  <span>Gray</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="amethyst">
                  <span>Amethyst Haze</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="bubblegum">
                  <span>Bubblegum</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="claude">
                  <span>Claude</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        {/* Dark/Light Mode */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <SunMoonIcon className="size-4 mr-2" />
            <span>Appearance</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
                <DropdownMenuRadioItem value="light">
                  <SunIcon className="size-4 mr-2" />
                  <span>Light</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="dark">
                  <MoonIcon className="size-4 mr-2" />
                  <span>Dark</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="system">
                  <span>System</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
