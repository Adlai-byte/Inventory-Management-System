"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  iconColor?: string;
  onClick?: () => void;
}

export function StatsCard({ title, value, description, icon: Icon, trend, className, iconColor = "emerald", onClick }: StatsCardProps) {
  const colorClasses: Record<string, { bg: string; text: string }> = {
    emerald: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400" },
    amber: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400" },
    purple: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400" },
    red: { bg: "bg-red-500/10", text: "text-red-600 dark:text-red-400" },
  };

  const colors = colorClasses[iconColor] || colorClasses.emerald;

  return (
    <Card 
      className={cn(
        "relative overflow-hidden group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300", 
        onClick && "cursor-pointer",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {trend && (
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-semibold px-1.5 py-0.5 rounded-md",
                    trend.value >= 0
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                  )}
                >
                  {trend.value >= 0 ? "+" : ""}
                  {trend.value}%
                </span>
                <span className="text-xs text-muted-foreground">{trend.label}</span>
              </div>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={cn("h-12 w-12 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300", colors.bg, colors.text)}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500/50 via-teal-500/50 to-emerald-500/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </Card>
  );
}
