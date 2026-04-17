"use client";

import Link from "next/link";

export const ErrorPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
      {" "}
      <h1 className="text-4xl font-bold mb-4 text-primary">Oops!</h1>
      <p className="text-lg text-muted-foreground mb-8 text-center">
        Something went wrong while loading this page.
      </p>
      <Link href="/" className="text-sm text-primary underline">
        Go back to Home
      </Link>
    </div>
  );
};

export default ErrorPage;
