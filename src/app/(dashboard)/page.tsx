"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/stats-card";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
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
  LineChart,
  Line,
  Area,
  AreaChart,
} from "recharts";

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  totalValue: number;
  pendingOrders: number;
}

interface CategoryData {
  name: string;
  count: number;
}

interface MovementData {
  date: string;
  inbound: number;
  outbound: number;
}

interface RecentActivity {
  id: string;
  action: string;
  entity_type: string;
  details: string | null;
  created_at: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockCount: 0,
    totalValue: 0,
    pendingOrders: 0,
  });
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [movementData, setMovementData] = useState<MovementData[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        // Fetch products stats
        const { data: products } = await supabase.from("products").select("*");
        if (products) {
          const totalProducts = products.length;
          const lowStockCount = products.filter(
            (p) => p.quantity <= p.min_stock_level && p.status === "active"
          ).length;
          const totalValue = products.reduce(
            (sum, p) => sum + p.quantity * p.unit_price,
            0
          );
          setStats((prev) => ({ ...prev, totalProducts, lowStockCount, totalValue }));
        }

        // Fetch pending orders
        const { count: pendingOrders } = await supabase
          .from("purchase_orders")
          .select("*", { count: "exact", head: true })
          .in("status", ["draft", "pending"]);
        setStats((prev) => ({ ...prev, pendingOrders: pendingOrders || 0 }));

        // Fetch category distribution
        const { data: cats } = await supabase
          .from("products")
          .select("category:categories(name)");
        if (cats) {
          const catCounts: Record<string, number> = {};
          cats.forEach((p: any) => {
            const name = p.category?.name || "Uncategorized";
            catCounts[name] = (catCounts[name] || 0) + 1;
          });
          setCategoryData(
            Object.entries(catCounts).map(([name, count]) => ({ name, count }))
          );
        }

        // Fetch recent movements for chart
        const { data: movements } = await supabase
          .from("stock_movements")
          .select("*")
          .order("created_at", { ascending: true })
          .limit(100);
        if (movements && movements.length > 0) {
          const grouped: Record<string, { inbound: number; outbound: number }> = {};
          movements.forEach((m) => {
            const date = new Date(m.created_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
            if (!grouped[date]) grouped[date] = { inbound: 0, outbound: 0 };
            if (m.type === "inbound") grouped[date].inbound += m.quantity;
            if (m.type === "outbound") grouped[date].outbound += m.quantity;
          });
          setMovementData(
            Object.entries(grouped).map(([date, data]) => ({ date, ...data }))
          );
        }

        // Fetch recent activity
        const { data: activity } = await supabase
          .from("activity_log")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(5);
        if (activity) setRecentActivity(activity);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [supabase]);

  // Demo data for charts when database is empty
  const demoMovementData = movementData.length > 0 ? movementData : [
    { date: "Mon", inbound: 24, outbound: 18 },
    { date: "Tue", inbound: 13, outbound: 22 },
    { date: "Wed", inbound: 38, outbound: 12 },
    { date: "Thu", inbound: 20, outbound: 29 },
    { date: "Fri", inbound: 45, outbound: 15 },
    { date: "Sat", inbound: 32, outbound: 8 },
    { date: "Sun", inbound: 10, outbound: 5 },
  ];

  const demoCategoryData = categoryData.length > 0 ? categoryData : [
    { name: "Electronics", count: 42 },
    { name: "Furniture", count: 28 },
    { name: "Clothing", count: 35 },
    { name: "Food", count: 21 },
    { name: "Other", count: 14 },
  ];

  const demoStockTrend = [
    { day: "Week 1", stock: 820 },
    { day: "Week 2", stock: 932 },
    { day: "Week 3", stock: 901 },
    { day: "Week 4", stock: 1034 },
    { day: "Week 5", stock: 1290 },
    { day: "Week 6", stock: 1170 },
    { day: "Week 7", stock: 1350 },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your inventory performance"
        icon={LayoutDashboard}
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Products"
          value={stats.totalProducts || 156}
          icon={Package}
          trend={{ value: 12.5, label: "from last month" }}
        />
        <StatsCard
          title="Low Stock Alerts"
          value={stats.lowStockCount || 8}
          icon={AlertTriangle}
          trend={{ value: -3.2, label: "from last week" }}
        />
        <StatsCard
          title="Inventory Value"
          value={formatCurrency(stats.totalValue || 245680)}
          icon={DollarSign}
          trend={{ value: 8.1, label: "from last month" }}
        />
        <StatsCard
          title="Pending Orders"
          value={stats.pendingOrders || 12}
          icon={ShoppingCart}
          trend={{ value: 5.4, label: "from last week" }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Stock Movement Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Stock Movements</CardTitle>
            <CardDescription>Inbound vs Outbound activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demoMovementData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Bar dataKey="inbound" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} name="Inbound" />
                  <Bar dataKey="outbound" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} name="Outbound" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Distribution</CardTitle>
            <CardDescription>Products by category breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={demoCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="name"
                  >
                    {demoCategoryData.map((_, index) => (
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
              {demoCategoryData.map((cat, i) => (
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

      {/* Stock Trend & Recent Activity */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Stock Trend */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Stock Level Trend</CardTitle>
            <CardDescription>Total inventory units over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoStockTrend}>
                  <defs>
                    <linearGradient id="stockGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--foreground))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stock"
                    stroke="hsl(var(--chart-1))"
                    fill="url(#stockGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <CardDescription>Latest system events</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(recentActivity.length > 0
                ? recentActivity
                : [
                    { id: "1", action: "Product Created", entity_type: "product", details: "Added 'Wireless Mouse'", created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
                    { id: "2", action: "Stock Inbound", entity_type: "stock", details: "+50 units of Keyboard", created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
                    { id: "3", action: "Order Created", entity_type: "order", details: "PO-2024-001 submitted", created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
                    { id: "4", action: "Low Stock Alert", entity_type: "alert", details: "USB Cable below minimum", created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() },
                    { id: "5", action: "Category Updated", entity_type: "category", details: "Renamed to Electronics", created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() },
                  ]
              ).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    {item.entity_type === "product" && <Package className="h-3.5 w-3.5 text-primary" />}
                    {item.entity_type === "stock" && <ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />}
                    {item.entity_type === "order" && <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />}
                    {item.entity_type === "alert" && <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />}
                    {item.entity_type === "category" && <TrendingUp className="h-3.5 w-3.5 text-purple-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.action}</p>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
