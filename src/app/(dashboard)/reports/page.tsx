"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  Download,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  Package,
  PieChart,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";
import { useReportsData } from "@/components/reports/use-reports-data";
import {
  exportCategoryPDF,
  exportInventoryPDF,
  exportLowStockCSV,
  exportLowStockPDF,
  exportDispatchCSV,
  exportDispatchPDF,
} from "@/components/reports/exporters";

const CATEGORY_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f97316",
  "#14b8a6",
];

export default function ReportsPage() {
  const {
    summary,
    loading,
    activeTab,
    setActiveTab,
    outboundData,
    outboundSummary,
    topDispatchedProducts,
    outboundLoading,
    topProducts,
    lowStockProducts,
    categoryData,
    tabLoading,
    selectedPeriod,
    setSelectedPeriod,
    selectedDate,
    setSelectedDate,
    selectedMonth,
    setSelectedMonth,
  } = useReportsData();

  const [showCostValue, setShowCostValue] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("reports_show_cost") === "true";
    }
    return false;
  });

  const toggleCostValue = () => {
    setShowCostValue((prev) => {
      const next = !prev;
      localStorage.setItem("reports_show_cost", String(next));
      return next;
    });
  };

  const outboundChartData = outboundData.map((d) => ({
    name:
      selectedPeriod === "daily"
        ? `${d.hour}:00`
        : selectedPeriod === "monthly"
          ? `Day ${d.day}`
          : d.period?.slice(5) || d.period,
    items: d.total_items || 0,
    transfers: d.transfer_count || 0,
  }));

  const topDispatchedChartData = topDispatchedProducts.slice(0, 5).map((p) => ({
    name: p.name.length > 15 ? `${p.name.substring(0, 15)}...` : p.name,
    value: p.quantity_dispatched,
  }));

  const categoryChartData = categoryData.slice(0, 10).map((c) => ({
    name: c.category.length > 12 ? `${c.category.substring(0, 12)}...` : c.category,
    value: c.total_value,
    count: c.product_count,
  }));

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
        description="Inventory insights and analytics" 
        helpText="Generate and export audit-ready inventory reports. This module provides insights into your inventory valuation (based on purchase cost), low stock identification, and outbound movement trends. All reports are designed to assist with BIR compliance and internal inventory reconciliation. You can export data to PDF or CSV using the download icons in each section."
        icon={BarChart3} 
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Cost Value</p>
                <p className="text-xl font-bold tracking-tight">
                  {showCostValue ? formatCurrency(summary?.totalCostValue || 0) : "••••••"}
                </p>
              </div>
              <button
                onClick={toggleCostValue}
                className="ml-auto h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                title={showCostValue ? "Hide cost value" : "Show cost value"}
              >
                {showCostValue ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
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
                <p className="text-xs text-muted-foreground">Products</p>
                <p className="text-xl font-bold">{summary?.totalProducts || 0}</p>
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
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold">{summary?.lowStockCount || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="h-12">
          <TabsTrigger value="outbound" className="h-10 px-5">
            Outbound Activity
          </TabsTrigger>
          <TabsTrigger value="valuation" className="h-10 px-5">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="lowstock" className="h-10 px-5">
            Low Stock
          </TabsTrigger>
          <TabsTrigger value="category" className="h-10 px-5">
            Category
          </TabsTrigger>
        </TabsList>

        <TabsContent value="outbound">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Dispatch Report</CardTitle>
                    <CardDescription>Track outbound movement trends</CardDescription>
                  </div>
                  <div className="flex gap-2 items-center flex-wrap">
                    <Select value={selectedPeriod} onValueChange={(v: string | null) => setSelectedPeriod(v ?? "daily")}>
                      <SelectTrigger className="w-[130px] h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    {selectedPeriod === "daily" && (
                      <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-[140px] h-11" />
                    )}
                    {selectedPeriod === "monthly" && (
                      <Input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="w-[140px] h-11" />
                    )}
                    <Button variant="outline" onClick={() => exportDispatchCSV(outboundData, selectedPeriod)} className="gap-2 h-11 px-4">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => exportDispatchPDF(outboundData, outboundSummary, topDispatchedProducts, selectedPeriod)}
                      className="gap-2 h-11 px-4"
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <div className="grid gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Items Dispatched</p>
                      <p className="text-xl font-bold">{outboundSummary.total_items_dispatched.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 text-purple-500" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Transfer Operations</p>
                      <p className="text-xl font-bold">{outboundSummary.total_transfers.toLocaleString()}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Dispatch Trend (Items)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {outboundLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={outboundChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Line type="monotone" dataKey="items" stroke="#3b82f6" strokeWidth={2} dot={{ fill: "#3b82f6", strokeWidth: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Top Dispatched Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px]">
                    {outboundLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : topDispatchedProducts.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={topDispatchedChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis type="number" tick={{ fill: "#94a3b8" }} />
                          <YAxis type="category" dataKey="name" width={80} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <PieChart className="h-10 w-10 mb-2 opacity-50" />
                        <p className="text-sm">No dispatch data</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Highest Volume Dispatches</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty Dispatched</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topDispatchedProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center h-24 text-muted-foreground">
                          No dispatch data for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      topDispatchedProducts.map((p, i) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.category_name || "-"}</TableCell>
                          <TableCell className="text-right font-semibold">{p.quantity_dispatched}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="valuation">
          {tabLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Top Products by Value</CardTitle>
                <Button variant="outline" onClick={() => exportInventoryPDF(topProducts, summary)} className="gap-2 h-10">
                  <FileText className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Cost Price</TableHead>
                      <TableHead className="text-right">Total Cost Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.category_name || "-"}</TableCell>
                        <TableCell className="text-right">{p.quantity}</TableCell>
                        <TableCell className="text-right">{formatCurrency(p.unit_price)}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(p.total_value)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="lowstock">
          {tabLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Low Stock Alert</CardTitle>
                  <CardDescription>{lowStockProducts.length} items need restocking</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => exportLowStockCSV(lowStockProducts)} className="gap-2 h-10">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => exportLowStockPDF(lowStockProducts)} className="gap-2 h-10">
                    <FileText className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">Min Level</TableHead>
                      <TableHead className="text-right">Deficit</TableHead>
                      <TableHead>Supplier</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                          All products are above minimum stock levels
                        </TableCell>
                      </TableRow>
                    ) : (
                      lowStockProducts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={p.quantity === 0 ? "destructive" : "secondary"}>{p.quantity}</Badge>
                          </TableCell>
                          <TableCell className="text-right">{p.min_stock_level}</TableCell>
                          <TableCell className="text-right text-destructive font-semibold">-{p.min_stock_level - p.quantity}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{p.supplier_name || "-"}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="category">
          {tabLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => exportCategoryPDF(categoryData)} className="gap-2 h-10">
                  <FileText className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Value by Category</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[350px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={categoryChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                          <XAxis type="number" tick={{ fill: "#94a3b8" }} tickFormatter={(v) => `PHP ${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="name" width={100} tick={{ fill: "#94a3b8", fontSize: 10 }} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                            formatter={(value: number) => formatCurrency(value)}
                          />
                          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {categoryChartData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-3 justify-center mt-4">
                      {categoryData.slice(0, 6).map((cat, i) => (
                        <div key={cat.category} className="flex items-center gap-1.5 text-xs">
                          <div className="h-3 w-3 rounded" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                          <span className="text-slate-400 dark:text-slate-400">{cat.category}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Category Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Products</TableHead>
                          <TableHead className="text-right">Value</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categoryData.map((c, i) => (
                          <TableRow key={c.category}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <div className="h-3 w-3 rounded" style={{ backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }} />
                                {c.category}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">{c.product_count}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(c.total_value)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
