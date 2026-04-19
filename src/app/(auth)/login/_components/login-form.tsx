"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, User, Lock, ArrowRight, ShoppingBag } from "lucide-react";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }

      if (data.must_change_password) {
        router.push("/change-password");
      } else {
        toast.success("Welcome back!");
        router.push("/");
      }
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-border/50 shadow-2xl shadow-black/20">
        <form onSubmit={handleLogin}>
          <CardContent className="px-8 pt-8 pb-8 space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-bold text-foreground">Welcome Back</h2>
                <p className="text-sm text-muted-foreground">
                  Sign in to continue to your account
                </p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="font-medium text-sm">
                  Username
                </Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="h-12 pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="font-medium text-sm">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12 pl-10 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 w-9 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="space-y-4">
              <Button
                type="submit"
                className="w-full h-12 font-semibold"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Use an admin-created account to sign in.
              </p>
            </div>
          </CardContent>
        </form>
      </Card>
    </div>
  );
}
