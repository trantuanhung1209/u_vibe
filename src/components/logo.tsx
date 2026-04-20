import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: number;
  className?: string;
  withGlow?: boolean;
}

export const Logo = ({ size = 40, className, withGlow = false }: LogoProps) => {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-2xl",
        "bg-linear-to-br from-background to-muted",
        "shadow-[8px_8px_16px_rgba(0,0,0,0.1),-8px_-8px_16px_rgba(255,255,255,0.7)]",
        "dark:shadow-[8px_8px_16px_rgba(0,0,0,0.4),-8px_-8px_16px_rgba(255,255,255,0.05)]",
        "border border-border/50",
        "transition-all duration-300 hover:scale-105",
        withGlow && "hover:shadow-[0_0_20px_rgba(var(--primary),0.5)]",
        className
      )}
      style={{
        width: size,
        height: size,
        padding: size * 0.15,
      }}
    >
      {/* Inner glow effect */}
      <div className="absolute inset-1 rounded-xl bg-linear-to-br from-primary/10 to-transparent opacity-60" />
      
      {/* Logo image */}
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        <Image
          src="/cloud_vibe.png"
          alt="Uside Vibe Logo"
          width={size * 0.8}
          height={size * 0.8}
          className="drop-shadow-md w-full h-full object-contain"
          priority
        />
      </div>

      {/* Animated glow effect on hover */}
      {withGlow && (
        <div className="absolute inset-0 rounded-2xl bg-primary/20 opacity-0 hover:opacity-100 transition-opacity duration-500 blur-xl" />
      )}
    </div>
  );
};
