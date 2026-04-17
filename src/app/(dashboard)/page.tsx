"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useHasMounted } from "@/lib/use-has-mounted";
import { StatsCard } from "@/components/stats-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  Loader2,
  Activity,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,

} from "recharts";

const CHART_COLORS = [
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#ec4899", // pink
];

interface DashboardData {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalCostValue: number;
  pendingOrdersCount: number;
  expiringCount: number;
  expiredCount: number;
  categories: { name: string; count: number }[];
  movements: { date: string; incoming: number; outgoing: number }[];
  movementTypes: { type: string; count: number; quantity: number }[];
  activity: { id: number; action: string; entity_type: string; details: string | null; created_at: string; user_name?: string }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalCostValue: 0,
    pendingOrdersCount: 0,
    expiringCount: 0,
    expiredCount: 0,
    categories: [],
    movements: [],
    movementTypes: [],
    activity: [],
  });
  const hasMounted = useHasMounted();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      }
    };

    fetchDashboard();
  }, []);

  const movementData = data.movements.length > 0 ? data.movements : [];
  const categoryData = data.categories.length > 0 ? data.categories : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Inventory management overview"
        icon={LayoutDashboard}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Products"
          value={data.totalProducts || 0}
          icon={Package}
          iconColor="emerald"
        />
        <StatsCard
          title="Low Stock Alerts"
          value={data.lowStockCount || 0}
          icon={AlertTriangle}
          iconColor="amber"
          className="cursor-pointer hover:ring-2 hover:ring-amber-500/50"
          onClick={() => router.push("/alerts")}
        />
        <StatsCard
          title="Pending Orders"
          value={data.pendingOrdersCount || 0}
          icon={ShoppingCart}
          iconColor="purple"
          className="cursor-pointer hover:ring-2 hover:ring-purple-500/50"
          onClick={() => router.push("/purchase-orders")}
        />
        <StatsCard
          title="Out of Stock"
          value={data.outOfStockCount || 0}
          icon={AlertCircle}
          iconColor="red"
        />
      </div>

      {/* Alert Cards */}
      {(data.expiredCount > 0 || data.expiringCount > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {data.expiredCount > 0 && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expired Products</p>
                    <p className="text-2xl font-bold text-red-500">{data.expiredCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          {data.expiringCount > 0 && (
            <Card className="border-orange-500/50 bg-orange-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Expiring Soon</p>
                    <p className="text-2xl font-bold text-orange-500">{data.expiringCount}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Stock Movement Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Stock Movements</CardTitle>
            <CardDescription>Incoming vs Outgoing activity (last 30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "#94a3b8" }} />
                  <YAxis className="text-xs" tick={{ fill: "#94a3b8" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="incoming" fill="#10b981" radius={[4, 4, 0, 0]} name="Incoming" />
                  <Bar dataKey="outgoing" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Outgoing" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Distribution</CardTitle>
            <CardDescription>Products by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="name"
                  >
                    {categoryData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="flex flex-wrap gap-3 justify-center mt-2">
              {categoryData.slice(0, 5).map((cat, i) => (
                <div key={cat.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{cat.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movement Types & Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Movement Types */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Movement Types (Last 7 Days)</CardTitle>
            <CardDescription>Breakdown by movement category</CardDescription>
          </CardHeader>
          <CardContent>
            {data.movementTypes.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No recent movements
              </div>
            ) : (
              <div className="space-y-3">
                {data.movementTypes.map((item) => {
                  const isIncoming = ["restock", "transfer_in", "initial"].includes(item.type);
                  const color = isIncoming ? "text-emerald-500" : 
                    ["damage", "expired", "loss"].includes(item.type) ? "text-red-500" : 
                    "text-amber-500";
                  return (
                    <div key={item.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-3 w-3 rounded-full ${color.replace('text-', 'bg-')}`} />
                        <span className="font-medium capitalize">{item.type.replace("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{item.count} movements</span>
                        <span className="font-medium">{item.quantity} units</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            {!hasMounted ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground"><Loader2 className="h-6 w-6 animate-spin" /></div>
            ) : data.activity.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <Activity className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.activity.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      {item.entity_type === "product" && <Package className="h-3.5 w-3.5 text-primary" />}
                      {item.entity_type === "stock_movement" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
                      {item.entity_type === "purchase_order" && <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />}
                      {item.entity_type === "alert" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                      {item.entity_type === "category" && <TrendingUp className="h-3.5 w-3.5 text-purple-500" />}
                      {!["product", "stock_movement", "purchase_order", "alert", "category"].includes(item.entity_type) && 
                        <Activity className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium capitalize">{item.action.replace("_", " ")}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.details}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(item.created_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
