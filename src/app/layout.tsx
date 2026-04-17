import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TRPCReactProvider } from "@/trpc/client";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ThemeProvider } from "@/contexts/theme-context";
import { FloatingThemeSwitcher } from "@/components/floating-theme-switcher";
import { ClerkProviderWrapper } from "@/components/clerk-provider-wrapper";
import StructuredData from "@/components/structured-data";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://uside-vibe.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Uside Vibe - AI-Powered Design to Code Platform",
    template: "%s | Uside Vibe",
  },
  description:
    "Transform your Figma designs and images into production-ready React code instantly with AI. Build apps and websites by chatting with our intelligent code generation platform.",
  keywords: [
    "AI code generation",
    "image to code",
    "React code generator",
    "Next.js",
    "AI developer tool",
    "automated coding",
    "UI to code",
    "web development AI",
  ],
  authors: [{ name: "Uside Team" }],
  creator: "Uside Vibe",
  publisher: "Uside Vibe",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Uside Vibe - AI-Powered Design to Code Platform",
    description:
      "Transform your Figma designs and images into production-ready React code instantly with AI. Build apps and websites by chatting with our intelligent code generation platform.",
    siteName: "Uside Vibe",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Uside Vibe - AI Code Generation Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Uside Vibe - AI-Powered Design to Code Platform",
    description:
      "Transform your Figma designs and images into production-ready React code instantly with AI.",
    images: ["/og-image.png"],
    creator: "@usidevibe",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <StructuredData />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <TRPCReactProvider>
          <NextThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ThemeProvider>
              <ClerkProviderWrapper>
                <Toaster position="bottom-right" />
                <FloatingThemeSwitcher />
                {children}
              </ClerkProviderWrapper>
            </ThemeProvider>
          </NextThemeProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
