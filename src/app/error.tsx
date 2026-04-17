"use client";

import { useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { useRouter } from "next/navigation";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log error to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      console.error("Global error caught:", error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle>Something went wrong</CardTitle>
              <CardDescription>An unexpected error occurred</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground font-mono bg-muted p-3 rounded-md break-all">
            {error.message || "Unknown error"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => reset()}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex-1"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </button>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent transition-colors flex-1"
            >
              <Home className="h-4 w-4" />
              Go Home
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
