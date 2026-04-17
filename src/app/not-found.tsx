"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Home, ArrowLeft } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
              <span className="text-2xl">?</span>
            </div>
            <div>
              <CardTitle>Page Not Found</CardTitle>
              <CardDescription>The page you&apos;re looking for doesn&apos;t exist</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors flex-1"
            >
              <Home className="h-4 w-4" />
              Go Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 h-10 px-4 py-2 border rounded-md text-sm font-medium hover:bg-accent transition-colors flex-1"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Back
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
