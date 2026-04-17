"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Settings, Loader2, User, Shield, Lock } from "lucide-react";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "" });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm_password: "" });
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const res = await fetch("/api/auth/me");
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setProfile(data.user);
          setForm({ full_name: data.user.full_name || "" });
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    if (!confirm("Save changes to your profile?")) return;
    
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: form.full_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Profile updated successfully");
      setProfile({ ...profile, full_name: form.full_name });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile";
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwForm.current_password || !pwForm.new_password) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }
    if (!confirm("Change your password?")) return;

    setPwSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Password changed successfully");
      setPwForm({ current_password: "", new_password: "", confirm_password: "" });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to change password";
      toast.error(errorMessage);
    } finally {
      setPwSaving(false);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Settings" description="Manage your account and preferences" icon={Settings} />

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </CardTitle>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-gradient-to-br from-primary to-chart-3 text-white text-xl font-bold">
                {getInitials(profile?.full_name ?? null)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-lg">{profile?.full_name || "User"}</p>
              <p className="text-sm text-muted-foreground capitalize">{profile?.role || "staff"} account</p>
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <Button onClick={handleUpdateProfile} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Change Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="h-4 w-4" /> Change Password
          </CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={pwForm.current_password}
              onChange={(e) => setPwForm({ ...pwForm, current_password: e.target.value })}
              placeholder="Enter current password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              placeholder="At least 6 characters"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
              placeholder="Re-enter new password"
            />
          </div>
          <Button onClick={handleChangePassword} disabled={pwSaving} variant="outline">
            {pwSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Lock className="mr-2 h-4 w-4" />
            )}
            Change Password
          </Button>
        </CardContent>
      </Card>

      {/* Role Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4" /> Role & Permissions
          </CardTitle>
          <CardDescription>Your current access level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
            <div>
              <p className="font-medium capitalize">{profile?.role || "Staff"}</p>
              <p className="text-sm text-muted-foreground">
                {profile?.role === "admin"
                  ? "Full access to all features and settings"
                  : profile?.role === "manager"
                  ? "Can manage inventory, orders, and view reports"
                  : "Can view inventory and record stock movements"}
              </p>
            </div>
            <div className={`h-3 w-3 rounded-full ${
              profile?.role === "admin" ? "bg-emerald-500" : profile?.role === "manager" ? "bg-blue-500" : "bg-amber-500"
            }`} />
          </div>
        </CardContent>
      </Card>

      {/* App Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center">
              <span className="text-white font-bold">B</span>
            </div>
            <div>
              <p className="font-semibold">BASTISTIL Minimart</p>
              <p className="text-xs text-muted-foreground">Inventory Management System v1.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
