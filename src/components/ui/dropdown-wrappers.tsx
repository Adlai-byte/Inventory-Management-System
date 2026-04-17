"use client";

import { useHasMounted } from "@/lib/use-has-mounted";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, LogOut, Settings, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { Profile, Notification } from "@/lib/types";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";


export function NotificationsDropdown({
  notifications,
  onNotificationsChange,
}: {
  notifications: Notification[];
  onNotificationsChange: (notifications: Notification[]) => void;
}) {
  const hasMounted = useHasMounted();

  if (!hasMounted) {
    return (
      <div className="relative h-9 w-9 rounded-lg inline-flex items-center justify-center hover:bg-accent">
        <Bell className="h-4 w-4" />
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="relative h-9 w-9 rounded-lg inline-flex items-center justify-center hover:bg-accent">
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="font-semibold text-sm">Notifications</span>
          {unreadCount > 0 && (
            <button
              className="text-xs text-primary hover:underline"
              onClick={async () => {
                await fetch("/api/notifications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "mark_read" }),
                });
                onNotificationsChange(
                  notifications.map((n) => ({ ...n, is_read: true }))
                );
              }}
            >
              Mark all read
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 || notifications.every((n) => n.is_read) ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            No new notifications
          </div>
        ) : (
          notifications
            .filter((n) => !n.is_read)
            .map((notif) => (
              <DropdownMenuItem
                key={notif.id}
                className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                onClick={async () => {
                  await fetch("/api/notifications", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      action: "mark_read",
                      notification_id: notif.id,
                    }),
                  });
                  onNotificationsChange(
                    notifications.map((n) =>
                      n.id === notif.id ? { ...n, is_read: true } : n
                    )
                  );
                }}
              >
                <div className="flex items-center gap-2 w-full">
                  <span className="font-medium text-sm flex-1">
                    {notif.title}
                  </span>
                  <span
                    className={`h-2 w-2 rounded-full ${
                      notif.type === "warning"
                        ? "bg-amber-500"
                        : notif.type === "error"
                          ? "bg-red-500"
                          : notif.type === "success"
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                    }`}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {notif.message}
                </span>
                {notif.created_at && (
                  <span className="text-[10px] text-muted-foreground/70">
                    {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                  </span>
                )}
              </DropdownMenuItem>
            ))
        )}
        <DropdownMenuSeparator />
        <div className="px-3 py-2 flex justify-center">
          <button
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
            onClick={async () => {
              await fetch("/api/notifications", { method: "DELETE" });
              onNotificationsChange([]);
            }}
          >
            <Trash2 className="h-3 w-3" />
            Clear all
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserDropdown({
  profile,
  onSignOut,
}: {
  profile: Profile | null;
  onSignOut: () => void;
}) {
  const hasMounted = useHasMounted();
  const router = useRouter();

  const getInitials = (name: string | null) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!hasMounted) {
    return (
      <div className="gap-2 px-2 h-9 inline-flex items-center rounded-lg hover:bg-accent">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="bg-gradient-to-br from-primary to-chart-3 text-white text-xs font-bold">
            U
          </AvatarFallback>
        </Avatar>
        <span className="hidden md:inline text-sm font-medium">User</span>
      </div>
    );
  }

  return (
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
          <p className="text-sm font-medium">{profile?.full_name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {profile?.role || "staff"}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => router.push("/settings")}>
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onSignOut}
          variant="destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
