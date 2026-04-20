import JSZip from "jszip";

export interface ProjectFile {
  path: string;
  content: string;
}

/**
 * Template for package.json with all required dependencies
 */
const PACKAGE_JSON_TEMPLATE = {
  name: "uside-vibe-project",
  version: "0.1.0",
  private: true,
  scripts: {
    dev: "next dev",
    build: "next build",
    start: "next start",
    lint: "next lint",
  },
  dependencies: {
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    next: "^15.3.3",
    sonner: "^1.7.2",
    "next-themes": "^0.4.4",
    "@radix-ui/react-accordion": "^1.2.2",
    "@radix-ui/react-alert-dialog": "^1.1.4",
    "@radix-ui/react-aspect-ratio": "^1.1.1",
    "@radix-ui/react-avatar": "^1.1.2",
    "@radix-ui/react-checkbox": "^1.1.3",
    "@radix-ui/react-collapsible": "^1.1.2",
    "@radix-ui/react-context-menu": "^2.2.4",
    "@radix-ui/react-dialog": "^1.1.4",
    "@radix-ui/react-dropdown-menu": "^2.1.4",
    "@radix-ui/react-hover-card": "^1.1.4",
    "@radix-ui/react-label": "^2.1.1",
    "@radix-ui/react-menubar": "^1.1.4",
    "@radix-ui/react-navigation-menu": "^1.2.3",
    "@radix-ui/react-popover": "^1.1.4",
    "@radix-ui/react-progress": "^1.1.1",
    "@radix-ui/react-radio-group": "^1.2.2",
    "@radix-ui/react-scroll-area": "^1.2.2",
    "@radix-ui/react-select": "^2.1.4",
    "@radix-ui/react-separator": "^1.1.1",
    "@radix-ui/react-slider": "^1.2.2",
    "@radix-ui/react-slot": "^1.1.1",
    "@radix-ui/react-switch": "^1.1.2",
    "@radix-ui/react-tabs": "^1.1.2",
    "@radix-ui/react-toast": "^1.2.4",
    "@radix-ui/react-toggle": "^1.1.1",
    "@radix-ui/react-toggle-group": "^1.1.1",
    "@radix-ui/react-tooltip": "^1.1.6",
    "class-variance-authority": "^0.7.1",
    clsx: "^2.1.1",
    "lucide-react": "^0.469.0",
    "tailwind-merge": "^2.6.0",
    "tailwindcss-animate": "^1.0.7",
    recharts: "^2.15.0",
    "embla-carousel-react": "^8.5.2",
    vaul: "^1.1.1",
    "cmdk": "^1.0.4",
    "input-otp": "^1.4.1",
    "react-day-picker": "^9.4.3",
    "date-fns": "^4.1.0",
    "react-resizable-panels": "^2.1.7",
  },
  devDependencies: {
    typescript: "^5",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    postcss: "^8",
    tailwindcss: "^3.4.1",
    eslint: "^9",
    "eslint-config-next": "15.3.3",
  },
};

/**
 * Template for next.config.ts
 */
const NEXT_CONFIG_TEMPLATE = `import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
`;

/**
 * Template for tsconfig.json
 */
const TSCONFIG_TEMPLATE = {
  compilerOptions: {
    target: "ES2017",
    lib: ["dom", "dom.iterable", "esnext"],
    allowJs: true,
    skipLibCheck: true,
    strict: true,
    noEmit: true,
    esModuleInterop: true,
    module: "esnext",
    moduleResolution: "bundler",
    resolveJsonModule: true,
    isolatedModules: true,
    jsx: "preserve",
    incremental: true,
    plugins: [
      {
        name: "next",
      },
    ],
    paths: {
      "@/*": ["./src/*"],
    },
  },
  include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  exclude: ["node_modules"],
};

/**
 * Template for tailwind.config.ts
 */
const TAILWIND_CONFIG_TEMPLATE = `import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
`;

/**
 * Template for postcss.config.mjs
 */
const POSTCSS_CONFIG_TEMPLATE = `/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
  },
};

export default config;
`;

/**
 * Template for globals.css
 */
const GLOBALS_CSS_TEMPLATE = `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 240 10% 3.9%;
    --primary: 240 5.9% 10%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 240 5.9% 10%;
    --radius: 0.5rem;
    --chart-1: 12 76% 61%;
    --chart-2: 173 58% 39%;
    --chart-3: 197 37% 24%;
    --chart-4: 43 74% 66%;
    --chart-5: 27 87% 67%;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover: 240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary: 0 0% 98%;
    --primary-foreground: 240 5.9% 10%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 240 4.9% 83.9%;
    --chart-1: 220 70% 50%;
    --chart-2: 160 60% 45%;
    --chart-3: 30 80% 55%;
    --chart-4: 280 65% 60%;
    --chart-5: 340 75% 55%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
`;

/**
 * Template for layout.tsx
 */
const LAYOUT_TEMPLATE = `import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Uside Vibe Project",
  description: "Generated by Uside Vibe",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={\`\${geistSans.variable} \${geistMono.variable} antialiased\`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
`;

/**
 * Template for lib/utils.ts
 */
const UTILS_TEMPLATE = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

/**
 * Template for README.md
 */
const README_TEMPLATE = `# Uside Vibe Project

This project was generated by Uside Vibe.

## Getting Started

First, install the dependencies:

\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new).

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
`;

/**
 * Template for .gitignore
 */
const GITIGNORE_TEMPLATE = `# See https://help.github.com/articles/ignoring-files/ for more about ignoring files.

# dependencies
/node_modules
/.pnp
.pnp.js
.yarn/install-state.gz

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`;

/**
 * Create a downloadable ZIP file from sandbox files
 */
export async function createProjectZip(
  files: { [path: string]: string },
  uiComponents?: { [path: string]: string }
): Promise<Blob> {
  const zip = new JSZip();

  // Create src directory structure
  const srcFolder = zip.folder("src");
  if (!srcFolder) throw new Error("Failed to create src folder");

  // Add all user files to src/
  for (const [path, content] of Object.entries(files)) {
    // Remove leading slash if present
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    srcFolder.file(cleanPath, content);
  }

  // Add UI components if provided
  if (uiComponents) {
    const componentsFolder = srcFolder.folder("components");
    if (componentsFolder) {
      const uiFolder = componentsFolder.folder("ui");
      if (uiFolder) {
        for (const [componentName, content] of Object.entries(uiComponents)) {
          uiFolder.file(componentName, content);
        }
      }
    }
  }

  // Add configuration files
  zip.file("package.json", JSON.stringify(PACKAGE_JSON_TEMPLATE, null, 2));
  zip.file("next.config.ts", NEXT_CONFIG_TEMPLATE);
  zip.file("tsconfig.json", JSON.stringify(TSCONFIG_TEMPLATE, null, 2));
  zip.file("tailwind.config.ts", TAILWIND_CONFIG_TEMPLATE);
  zip.file("postcss.config.mjs", POSTCSS_CONFIG_TEMPLATE);
  zip.file("README.md", README_TEMPLATE);
  zip.file(".gitignore", GITIGNORE_TEMPLATE);

  // Add essential app files if not present
  const appFolder = srcFolder.folder("app");
  if (appFolder && !files["app/globals.css"]) {
    appFolder.file("globals.css", GLOBALS_CSS_TEMPLATE);
  }
  if (appFolder && !files["app/layout.tsx"]) {
    appFolder.file("layout.tsx", LAYOUT_TEMPLATE);
  }

  // Add lib/utils.ts if not present
  const libFolder = srcFolder.folder("lib");
  if (libFolder && !files["lib/utils.ts"]) {
    libFolder.file("utils.ts", UTILS_TEMPLATE);
  }

  // Generate ZIP file
  return await zip.generateAsync({ type: "blob" });
}

/**
 * Trigger browser download of the ZIP file
 */
export function downloadZipFile(blob: Blob, filename: string = "project.zip") {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
