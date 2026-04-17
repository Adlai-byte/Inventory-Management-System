"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, User, Lock, ArrowRight } from "lucide-react";

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
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

      toast.success("Welcome back!");
      router.push("/");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Card className="border-slate-200/60 bg-white shadow-xl shadow-slate-200/30 rounded-3xl overflow-hidden">
        <form onSubmit={handleLogin}>
          <CardHeader className="space-y-1 pb-6 pt-8">
            <CardTitle className="text-2xl font-bold text-slate-900 text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-slate-500 text-center text-base">
              Sign in to continue to your account
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 px-8">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-slate-700 font-medium text-sm">
                Username
              </Label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === "username" ? "text-slate-700" : "text-slate-400"}`}>
                  <User className="h-5 w-5" />
                </div>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onFocus={() => setFocusedField("username")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className={`h-14 pl-12 pr-4 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl transition-all ${
                    focusedField === "username" ? "border-slate-500 bg-white ring-2 ring-slate-500/20" : ""
                  }`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium text-sm">
                Password
              </Label>
              <div className="relative">
                <div className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${focusedField === "password" ? "text-slate-700" : "text-slate-400"}`}>
                  <Lock className="h-5 w-5" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                  required
                  className={`h-14 pl-12 pr-14 border-slate-200 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-xl transition-all ${
                    focusedField === "password" ? "border-slate-500 bg-white ring-2 ring-slate-500/20" : ""
                  }`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 hover:bg-slate-100 rounded-lg"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 px-8 pb-8 pt-4">
            <Button 
              type="submit" 
              className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-lg shadow-slate-900/20 transition-all hover:shadow-xl active:scale-[0.98]" 
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
            <p className="text-sm text-slate-500 text-center">
              Use an admin-created account to sign in.
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
