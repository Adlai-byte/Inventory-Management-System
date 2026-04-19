"use client";

import { LucideIcon, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface PageHeaderProps {
  title: string;
  description?: string;
  helpText?: string;
  icon?: LucideIcon;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, helpText, icon: Icon, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-chart-3/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {helpText && (
              <Tooltip>
                <TooltipTrigger className="text-muted-foreground hover:text-primary transition-colors cursor-help inline-flex items-center justify-center p-0.5 rounded-full hover:bg-primary/10">
                  <Info className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-[300px] p-3 text-xs leading-relaxed bg-popover text-popover-foreground border shadow-md">
                  {helpText}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
