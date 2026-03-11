"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, Search, Loader2, Package, ShoppingCart, Users, Tags, Warehouse, ArrowLeftRight } from "lucide-react";
import type { ActivityLog } from "@/lib/types";

const entityIcons: Record<string, typeof Package> = {
  product: Package,
  category: Tags,
  supplier: Users,
  warehouse: Warehouse,
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
  const [search, setSearch] = useState("");
  const [filterEntity, setFilterEntity] = useState<string>("all");
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(100);
      if (data) setActivities(data as ActivityLog[]);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const filtered = activities.filter((a) => {
    const matchSearch = search === "" || a.action.toLowerCase().includes(search.toLowerCase()) || a.details?.toLowerCase().includes(search.toLowerCase());
    const matchEntity = filterEntity === "all" || a.entity_type === filterEntity;
    return matchSearch && matchEntity;
  });

  const demoActivities: ActivityLog[] = [
    { id: "1", user_id: null, action: "created", entity_type: "product", entity_id: null, details: "Added new product 'Wireless Keyboard'", created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
    { id: "2", user_id: null, action: "updated", entity_type: "product", entity_id: null, details: "Updated stock for 'USB-C Cable'", created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: "3", user_id: null, action: "created", entity_type: "purchase_order", entity_id: null, details: "Created PO-2024-001 for TechSupply Co.", created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
    { id: "4", user_id: null, action: "created", entity_type: "stock_movement", entity_id: null, details: "Inbound: +50 units of Monitor Stand", created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
    { id: "5", user_id: null, action: "updated", entity_type: "category", entity_id: null, details: "Renamed category to 'Electronics'", created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
    { id: "6", user_id: null, action: "deleted", entity_type: "supplier", entity_id: null, details: "Removed inactive supplier 'OldParts Inc.'", created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() },
    { id: "7", user_id: null, action: "created", entity_type: "warehouse", entity_id: null, details: "Added new warehouse 'Branch 2'", created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString() },
    { id: "8", user_id: null, action: "created", entity_type: "stock_movement", entity_id: null, details: "Outbound: -20 units of Laptop Stand", created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() },
  ];

  const displayActivities = filtered.length > 0 ? filtered : demoActivities;

  return (
    <div className="space-y-6">
      <PageHeader title="Activity Log" description="Audit trail of all system events" icon={Activity} />

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search activities..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={filterEntity} onValueChange={(v) => setFilterEntity(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Entity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="product">Products</SelectItem>
              <SelectItem value="category">Categories</SelectItem>
              <SelectItem value="supplier">Suppliers</SelectItem>
              <SelectItem value="warehouse">Warehouses</SelectItem>
              <SelectItem value="stock_movement">Stock Movements</SelectItem>
              <SelectItem value="purchase_order">Purchase Orders</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
            <div className="space-y-6">
              {displayActivities.map((activity) => {
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
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`${actionClass} text-[10px] capitalize`}>{activity.action}</Badge>
                            <Badge variant="outline" className="text-[10px] capitalize">{activity.entity_type.replace("_", " ")}</Badge>
                          </div>
                          <p className="text-sm">{activity.details}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">{formatRelativeTime(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}
