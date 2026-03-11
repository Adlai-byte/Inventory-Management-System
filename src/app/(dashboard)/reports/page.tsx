"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Download,
  Package,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Product } from "@/lib/types";

export default function ReportsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from("products")
        .select("*, category:categories(name), supplier:suppliers(name)")
        .order("name");
      if (data) setProducts(data);
      setLoading(false);
    };
    fetchData();
  }, [supabase]);

  const lowStockProducts = products.filter(
    (p) => p.quantity <= p.min_stock_level && p.status === "active"
  );

  const totalValue = products.reduce(
    (sum, p) => sum + p.quantity * p.unit_price,
    0
  );

  const totalCostValue = products.reduce(
    (sum, p) => sum + p.quantity * p.cost_price,
    0
  );

  const topProducts = [...products]
    .sort((a, b) => b.quantity * b.unit_price - a.quantity * a.unit_price)
    .slice(0, 10);

  const categoryValues = products.reduce((acc, p) => {
    const cat = p.category?.name || "Uncategorized";
    acc[cat] = (acc[cat] || 0) + p.quantity * p.unit_price;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryValues)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(","),
      ...data.map((row) => headers.map((h) => `"${row[h] ?? ""}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportInventoryCSV = () => {
    exportToCSV(
      products.map((p) => ({
        Name: p.name,
        SKU: p.sku,
        Category: p.category?.name || "",
        Quantity: p.quantity,
        "Unit Price": p.unit_price,
        "Cost Price": p.cost_price,
        "Total Value": p.quantity * p.unit_price,
        Status: p.status,
      })),
      "inventory-report"
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive inventory insights"
        icon={BarChart3}
      >
        <Button onClick={exportInventoryCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Retail Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Cost Value</p>
                <p className="text-xl font-bold">{formatCurrency(totalCostValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Products</p>
                <p className="text-xl font-bold">{products.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Low Stock Items</p>
                <p className="text-xl font-bold">{lowStockProducts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="valuation" className="space-y-4">
        <TabsList>
          <TabsTrigger value="valuation">Inventory Valuation</TabsTrigger>
          <TabsTrigger value="lowstock">Low Stock</TabsTrigger>
          <TabsTrigger value="top">Top Products</TabsTrigger>
          <TabsTrigger value="category">By Category</TabsTrigger>
        </TabsList>

        {/* Inventory Valuation */}
        <TabsContent value="valuation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Inventory Valuation Report</CardTitle>
              <CardDescription>Complete inventory with values</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Cost Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                    <TableHead className="text-right">Profit Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((p) => {
                    const margin = p.unit_price > 0 ? ((p.unit_price - p.cost_price) / p.unit_price) * 100 : 0;
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="text-sm">{p.category?.name || "—"}</TableCell>
                        <TableCell className="text-right">{p.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.unit_price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.cost_price)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.quantity * p.unit_price)}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={margin > 30 ? "bg-emerald-500/10 text-emerald-600" : margin > 15 ? "bg-amber-500/10 text-amber-600" : "bg-red-500/10 text-red-600"}>
                            {margin.toFixed(1)}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Low Stock */}
        <TabsContent value="lowstock">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Low Stock Alert Report</CardTitle>
              <CardDescription>Products at or below minimum stock level</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Current Qty</TableHead>
                    <TableHead className="text-right">Min Level</TableHead>
                    <TableHead className="text-right">Deficit</TableHead>
                    <TableHead>Supplier</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center h-32 text-muted-foreground">
                        All products are above minimum stock levels 🎉
                      </TableCell>
                    </TableRow>
                  ) : (
                    lowStockProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={p.quantity === 0 ? "destructive" : "secondary"}>
                            {p.quantity}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{p.min_stock_level}</TableCell>
                        <TableCell className="text-right text-destructive font-semibold">
                          -{p.min_stock_level - p.quantity}
                        </TableCell>
                        <TableCell className="text-sm">{p.supplier?.name || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products */}
        <TabsContent value="top">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Products by Value</CardTitle>
              <CardDescription>Highest value products in inventory</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p, i) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-sm">{p.category?.name || "—"}</TableCell>
                      <TableCell className="text-right">{p.quantity}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.unit_price)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(p.quantity * p.unit_price)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Category */}
        <TabsContent value="category">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Value by Category</CardTitle>
              <CardDescription>Inventory value breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
