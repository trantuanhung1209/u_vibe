"use client";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { useScroll } from "@/hooks/use-scroll";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export const Navbar = () => {
    const isScrolled = useScroll();

    return (
        <>
            <nav className={cn(
                "px-6 py-4 fixed top-0 left-0 right-0 z-50 transition-all duration-200 border-b border-transparent",
                isScrolled && "backdrop-blur-md bg-background/70 border-border"
            )}>
                <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
                    <Link href="/" className="flex items-center gap-3">
                        <Logo size={60} withGlow />
                        <span className="text-lg font-semibold">Uside Vibe</span>
                    </Link>

                    <div className="flex items-center gap-4">
                        <SignedOut>
                            <div className="flex gap-2">
                                <SignUpButton>
                                    <Button variant="outline" size="sm">Sign up</Button>
                                </SignUpButton>
                                <SignInButton>
                                    <Button size="sm">Sign in</Button>
                                </SignInButton>
                            </div>
                        </SignedOut>
                        <SignedIn>
                            <UserControl showName />
                        </SignedIn>
                    </div>
                </div>
            </nav>
        </>
    );
};