"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { Activity, Search, Loader2, Package, ShoppingCart, Users, Tags, ArrowLeftRight } from "lucide-react";
import type { ActivityLog } from "@/lib/types";

const entityIcons: Record<string, typeof Package> = {
  product: Package,
  category: Tags,
  supplier: Users,
  stock_movement: ArrowLeftRight,
  purchase_order: ShoppingCart,
};

const actionColors: Record<string, string> = {
  created: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  updated: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  deleted: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
};

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
  
  useEffect(() => { setHasMounted(true); }, []);
  
  // Pagination & Filtering state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 25 });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        search: debouncedSearch,
        entity: filterEntity
      });

      const res = await fetch(`/api/activity-log?${queryParams}`);
      if (res.ok) {
        const result = await res.json();
        setActivities(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterEntity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Activity Log" 
        description={`${pagination.total} audit events recorded`} 
        helpText="The system audit trail records every significant action performed by users. This includes product creation, stock movements, and system configuration changes. Each log entry includes the timestamp and the user who performed the action for full accountability and security auditing."
        icon={Activity} 
      />

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" />
          </div>
          <Select value={filterEntity} onValueChange={(v: string | null) => { setFilterEntity(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-80 h-11"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="category">Categories</SelectItem>
              <SelectItem value="supplier">Suppliers</SelectItem>
              <SelectItem value="stock_movement">Stock Movements</SelectItem>
              <SelectItem value="purchase_order">Deliveries</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground opacity-50">
            <Activity className="h-10 w-10 mb-2" />
            <p>No activity records found</p>
          </div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {activities.map((activity) => {
                const Icon = entityIcons[activity.entity_type] || Activity;
                const actionClass = actionColors[activity.action] || actionColors.updated;
                return (
                  <div key={activity.id} className="flex items-start gap-4 relative">
                    <div className="h-10 w-10 rounded-full bg-card border-2 border-border flex items-center justify-center z-10 shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 bg-accent/30 rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge className={`${actionClass} text-[10px] capitalize`}>{activity.action}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{activity.entity_type.replace(/_/g, " ")}</Badge>
                            {activity.user_name && (
                              <Badge variant="secondary" className="text-[10px] bg-primary/5 text-primary border-primary/10">
                                {activity.user_name}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm">{activity.details}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {hasMounted ? formatRelativeTime(activity.created_at) : "..."}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent></Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center py-4">
          <Pagination
            currentPage={page}
            totalPages={pagination.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
    </div>
  );
}
