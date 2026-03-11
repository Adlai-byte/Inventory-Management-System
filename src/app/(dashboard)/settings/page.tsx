"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Settings, Loader2, User, Shield } from "lucide-react";
import type { Profile } from "@/lib/types";

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "" });
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        if (data) {
          setProfile(data);
          setForm({ full_name: data.full_name || "" });
        }
      }
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: form.full_name })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success("Profile updated successfully");
      setProfile({ ...profile, full_name: form.full_name });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
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
              <span className="text-white font-bold">I</span>
            </div>
            <div>
              <p className="font-semibold">InvenPro</p>
              <p className="text-xs text-muted-foreground">Advanced Inventory Management System v1.0</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
