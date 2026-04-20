import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { UserControl } from "@/components/user-control";
import { requireAdmin } from "@/lib/auth";
import { SignedIn, SignedOut, SignInButton, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  try {
    await requireAdmin();
  } catch {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <Logo size={60} withGlow />
              <span className="text-lg font-semibold">Uside Vibe</span>
            </Link>
            <div className="text-center">
              <h1 className="text-2xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">
                Manage users and view analytics
              </p>
            </div>
            <div>
              <SignedOut>
                <div className="flex gap-2">
                  <SignUpButton>
                    <Button variant="outline" size="sm">
                      Sign up
                    </Button>
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
        </div>
      </div>
      
      {/* Content */}
      <div className="container mx-auto px-4 py-8">{children}</div>
    </div>
  );
}
