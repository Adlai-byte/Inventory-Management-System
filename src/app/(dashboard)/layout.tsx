"use client";

import dynamicImport from "next/dynamic";
import { useEffect, useState } from "react";

const HeaderDate = dynamicImport(
  () => import("@/components/header-date").then((m) => m.HeaderDate),
  { ssr: false }
);
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  NotificationsDropdown,
  UserDropdown,
} from "@/components/ui/dropdown-wrappers";
import {
  LayoutDashboard,
  Package,
  Tags,
  Users,
  ArrowLeftRight,
  ShoppingCart,
  BarChart3,
  Activity,
  Settings,
  ChevronLeft,
  Menu,
  ScanLine,
  AlertTriangle,
  ClipboardCheck,
} from "lucide-react";
import type { Profile, Notification } from "@/lib/types";

export const dynamic = "force-dynamic";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Scanner", href: "/scanner", icon: ScanLine },
  { name: "Products", href: "/products", icon: Package },
  { name: "Stock Movements", href: "/stock-movements", icon: ArrowLeftRight },
  { name: "Alerts", href: "/alerts", icon: AlertTriangle },
  { name: "Deliveries", href: "/purchase-orders", icon: ShoppingCart, managerOnly: true },
  { name: "Stock Takes", href: "/stock-takes", icon: ClipboardCheck, managerOnly: true },
  { name: "Categories", href: "/categories", icon: Tags, managerOnly: true },
  { name: "Suppliers", href: "/suppliers", icon: Users, managerOnly: true },
  { name: "Reports", href: "/reports", icon: BarChart3, managerOnly: true },
  { name: "Activity Log", href: "/activity-log", icon: Activity, managerOnly: true },
  { name: "Users", href: "/users", icon: Users, adminOnly: true },
  { name: "Settings", href: "/settings", icon: Settings, adminOnly: true },
];

function SidebarNav({
  pathname,
  collapsed,
  userRole,
  onLinkClick,
}: {
  pathname: string;
  collapsed: boolean;
  userRole?: string;
  onLinkClick?: () => void;
}) {
  const filteredNav = navigation.filter(item => {
    if (item.adminOnly && userRole !== 'admin') return false;
    if (item.managerOnly && userRole !== 'admin' && userRole !== 'manager') return false;
    return true;
  });

  return (
    <nav className="space-y-1">
      {filteredNav.map((item) => {
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
  const pathname = usePathname();
  const router = useRouter();


  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            if (data.user.must_change_password) {
              router.replace("/change-password");
              return;
            }
            setProfile(data.user);
          }
        }
      } catch {}
    };

    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch {}
    };

    fetchProfile();
    fetchNotifications();
    const notifInterval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(notifInterval);
  }, []);

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const sidebarBrand = (
    <div
      className={cn(
        "flex items-center gap-2 px-4 h-16 border-b border-border/50 shrink-0",
        collapsed && "justify-center px-2"
      )}
    >
      {!collapsed && (
        <span className="font-bold text-base tracking-tight">
          BATISTIL MINI MART
        </span>
      )}
      {collapsed && (
        <span className="font-bold text-sm">BM</span>
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
              userRole={profile?.role}
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
            <SidebarNav 
              pathname={pathname} 
              collapsed={collapsed} 
              userRole={profile?.role}
            />
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
                <HeaderDate />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />

              <NotificationsDropdown
                notifications={notifications}
                onNotificationsChange={setNotifications}
              />

              <UserDropdown
                profile={profile}
                onSignOut={handleSignOut}
              />
            </div>
          </div>
        </header>

        <main className="p-4 lg:p-6">{children}</main>

      </div>
    </div>
  );
}
