"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  BarChart3,
  Activity,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
  Bell,
} from "lucide-react";
import type { Profile, Notification } from "@/lib/types";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Categories", href: "/categories", icon: Tags },
  { name: "Suppliers", href: "/suppliers", icon: Users },
  { name: "Warehouses", href: "/warehouses", icon: Warehouse },
  { name: "Stock Movements", href: "/stock-movements", icon: ArrowLeftRight },
  { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingCart },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Activity Log", href: "/activity-log", icon: Activity },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarNav({
  pathname,
  collapsed,
  onLinkClick,
}: {
  pathname: string;
  collapsed: boolean;
  onLinkClick?: () => void;
}) {
  return (
    <nav className="space-y-1">
      {navigation.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={onLinkClick}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-accent",
              collapsed && "justify-center px-2"
            )}
          >
            <item.icon
              className={cn(
                "h-4 w-4 shrink-0",
                isActive && "text-primary-foreground"
              )}
            />
            {!collapsed && <span>{item.name}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dateString, setDateString] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    setDateString(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();
        if (data) setProfile(data);

        const { data: notifs } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .eq("read", false)
          .order("created_at", { ascending: false })
          .limit(5);
        if (notifs) setNotifications(notifs);
      }
    };
    fetchProfile();
  }, [supabase]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const sidebarBrand = (
    <div
      className={cn(
        "flex items-center gap-2 px-4 h-16 border-b border-border/50 shrink-0",
        collapsed && "justify-center px-2"
      )}
    >
      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-chart-3 flex items-center justify-center shrink-0">
        <span className="text-white font-bold text-sm">I</span>
      </div>
      {!collapsed && (
        <span className="font-bold text-lg bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          InvenPro
        </span>
      )}
    </div>
  );

  const collapseButton = (
    <div className="hidden lg:flex border-t border-border/50 p-3">
      <Button
        variant="ghost"
        size="sm"
        className="w-full justify-center"
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronLeft
          className={cn(
            "h-4 w-4 transition-transform",
            collapsed && "rotate-180"
          )}
        />
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border/50 transform transition-transform duration-300 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {sidebarBrand}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav
              pathname={pathname}
              collapsed={collapsed}
              onLinkClick={() => setMobileOpen(false)}
            />
          </div>
        </div>
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden lg:block bg-card/80 backdrop-blur-sm border-r border-border/50 transition-all duration-300",
          collapsed ? "w-16" : "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {sidebarBrand}
          <div className="flex-1 overflow-y-auto px-3 py-4">
            <SidebarNav pathname={pathname} collapsed={collapsed} />
          </div>
          {collapseButton}
        </div>
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "transition-all duration-300",
          collapsed ? "lg:pl-16" : "lg:pl-64"
        )}
      >
        <header className="sticky top-0 z-20 h-16 border-b border-border/50 bg-background/80 backdrop-blur-md">
          <div className="flex items-center justify-between h-full px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div className="hidden sm:block">
                <h2 className="text-sm font-medium text-muted-foreground">
                  {dateString}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger className="relative h-9 w-9 rounded-lg inline-flex items-center justify-center hover:bg-accent">
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
                      {notifications.length}
                    </span>
                  )}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="px-3 py-2 font-semibold text-sm">
                    Notifications
                  </div>
                  <DropdownMenuSeparator />
                  {notifications.length === 0 ? (
                    <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                      No new notifications
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <DropdownMenuItem
                        key={notif.id}
                        className="flex flex-col items-start gap-1 p-3"
                      >
                        <span className="font-medium text-sm">
                          {notif.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {notif.message}
                        </span>
                      </DropdownMenuItem>
                    ))
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="gap-2 px-2 h-9 inline-flex items-center rounded-lg hover:bg-accent">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-chart-3 text-white text-xs font-bold">
                      {getInitials(profile?.full_name ?? null)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:inline text-sm font-medium">
                    {profile?.full_name || "User"}
                  </span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-3 py-2">
                    <p className="text-sm font-medium">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {profile?.role || "staff"}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => router.push("/settings")}
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleSignOut}
                    variant="destructive"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
