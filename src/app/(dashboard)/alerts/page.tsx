"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertTriangle, Package, Loader2, ArrowRight, CalendarClock, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";

interface AlertProduct {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  min_stock_level: number;
  barcode: string | null;
  unit_price: number;
  cost_price: number;
  category_name: string | null;
  supplier_name: string | null;
  expiry_date?: string | null;
}

interface AlertsData {
  lowStock: AlertProduct[];
  outOfStock: AlertProduct[];
  expired: AlertProduct[];
  expiring: AlertProduct[];
  summary: {
    lowStockCount: number;
    outOfStockCount: number;
    expiredCount: number;
    expiringCount: number;
  };
}

export default function AlertsPage() {
  const [data, setData] = useState<AlertsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  // Bulk selection state
  const [selectedProductIds, setSelectedProductIds] = useState<Set<number>>(new Set());
  const [poDialogOpen, setPoDialogOpen] = useState(false);
  const [poSupplierId, setPoSupplierId] = useState<string>("");
  const [creatingPo, setCreatingPo] = useState(false);
  const [suppliers, setSuppliers] = useState<{id: number; name: string}[]>([]);

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    fetch("/api/suppliers?limit=1000").then(r => r.json()).then(d => {
      if (d.data) setSuppliers(d.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setError(null);
        const res = await fetch("/api/alerts");
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ error: "Failed to load alerts" }));
          throw new Error(errorData.error || "Failed to load alerts");
        }
        const json = await res.json();
        setData(json);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load alerts";
        setError(message);
        console.error("Alerts fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
  }, []);

  const toggleProductSelection = (id: number) => {
    const newSet = new Set(selectedProductIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedProductIds(newSet);
  };

  const getAllLowStockProducts = (): AlertProduct[] => {
    if (!data) return [];
    return [...data.outOfStock, ...data.lowStock];
  };

  const selectAllLowStock = () => {
    const products = getAllLowStockProducts();
    if (selectedProductIds.size === products.length) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(products.map(p => p.id)));
    }
  };

  const createPurchaseOrder = async () => {
    const products = getAllLowStockProducts().filter(p => selectedProductIds.has(p.id));
    if (products.length === 0 || !poSupplierId) {
      toast.error("Select products and a supplier");
      return;
    }
    
    setCreatingPo(true);
    try {
      const items = products.map(p => ({
        product_id: p.id,
        quantity: p.min_stock_level - p.quantity > 0 ? p.min_stock_level - p.quantity : p.min_stock_level,
        unit_price: p.unit_price
      }));
      
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: parseInt(poSupplierId),
          items,
          notes: "Created from low stock alerts"
        })
      });
      
      if (!res.ok) throw new Error("Failed to create purchase order");
      
      toast.success(`Created purchase order for ${products.length} products`);
      setPoDialogOpen(false);
      setSelectedProductIds(new Set());
      router.push("/purchase-orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create PO");
    } finally {
      setCreatingPo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Alerts"
          description="Inventory alerts and notifications"
          icon={AlertTriangle}
        />
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Failed to Load Alerts</h3>
            <p className="text-muted-foreground text-sm mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasStockAlerts = (data?.outOfStock.length ?? 0) > 0 || (data?.lowStock.length ?? 0) > 0;
  const hasExpiryAlerts = (data?.expired.length ?? 0) > 0 || (data?.expiring.length ?? 0) > 0;

  if (!hasMounted) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Inventory alerts and notifications"
        helpText="Monitor critical inventory notifications here. This page highlights low stock levels, out-of-stock items, and upcoming product expirations. You can select multiple low-stock items and click 'Create Purchase Order' to quickly start a restocking request with a supplier."
        icon={AlertTriangle}
      />

      {hasStockAlerts && (
        <div className="bg-muted/50 rounded-lg p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Checkbox 
              checked={getAllLowStockProducts().length > 0 && selectedProductIds.size === getAllLowStockProducts().length}
              onCheckedChange={selectAllLowStock}
            />
            <span className="text-sm">
              {selectedProductIds.size > 0 
                ? `${selectedProductIds.size} products selected` 
                : "Select products to create purchase order"}
            </span>
          </div>
          <Button 
            size="sm" 
            onClick={() => setPoDialogOpen(true)}
            disabled={selectedProductIds.size === 0}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            Create Purchase Order
          </Button>
        </div>
      )}

      <Tabs defaultValue="stock" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="stock" className="gap-2">
            <Package className="h-4 w-4" />
            Stock Alerts
            {hasStockAlerts && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                {(data?.outOfStock.length ?? 0) + (data?.lowStock.length ?? 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="expiry" className="gap-2">
            <CalendarClock className="h-4 w-4" />
            Expiry Alerts
            {hasExpiryAlerts && (
              <Badge variant="outline" className="ml-1 h-5 px-1.5 text-[10px] border-amber-500 text-amber-600">
                {(data?.expired.length ?? 0) + (data?.expiring.length ?? 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-4">
          {hasStockAlerts ? (
            <>
              {data?.outOfStock.length ? (
                <Card className="border-destructive/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Out of Stock ({data.outOfStock.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">Current Qty</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.outOfStock.map((product) => (
                            <TableRow key={product.id} className="bg-destructive/5">
                              <TableCell>
                                <Checkbox 
                                  checked={selectedProductIds.has(product.id)}
                                  onCheckedChange={() => toggleProductSelection(product.id)}
                                />
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-destructive" />
                                  </div>
                                  <span className="font-medium text-sm">{product.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                              <TableCell className="text-sm">{product.category_name || "—"}</TableCell>
                              <TableCell className="text-sm">{product.supplier_name || "—"}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant="destructive" className="text-[10px]">{product.quantity}</Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                                  onClick={() => router.push(`/stock-movements?product=${product.id}`)}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {data?.lowStock.length ? (
                <Card className="border-amber-500/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      Low Stock ({data.lowStock.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Supplier</TableHead>
                            <TableHead className="text-right">Price</TableHead>
                            <TableHead className="text-right">Current</TableHead>
                            <TableHead className="text-right">Min</TableHead>
                            <TableHead className="text-right">Status</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.lowStock.map((product) => {
                            const stockPercent = product.min_stock_level > 0 
                              ? Math.round((product.quantity / product.min_stock_level) * 100) 
                              : 0;
                            return (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <Checkbox 
                                    checked={selectedProductIds.has(product.id)}
                                    onCheckedChange={() => toggleProductSelection(product.id)}
                                  />
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                      <Package className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <span className="font-medium text-sm">{product.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                                <TableCell className="text-sm">{product.category_name || "—"}</TableCell>
                                <TableCell className="text-sm">{product.supplier_name || "—"}</TableCell>
                                <TableCell className="text-right text-sm font-medium">{formatCurrency(product.unit_price)}</TableCell>
                                <TableCell className="text-right text-sm font-medium">{product.quantity}</TableCell>
                                <TableCell className="text-right text-sm text-muted-foreground">{product.min_stock_level}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">
                                    {stockPercent}%
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                                    onClick={() => router.push(`/stock-movements?product=${product.id}`)}
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Package className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">All Stock Levels Healthy</h3>
                <p className="text-muted-foreground text-sm">No products are below minimum stock levels</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="expiry" className="space-y-4">
          {hasExpiryAlerts ? (
            <>
              {data?.expired.length ? (
                <Card className="border-destructive/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                      Expired ({data.expired.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.expired.map((product) => (
                            <TableRow key={product.id} className="bg-destructive/5">
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                                    <Package className="h-4 w-4 text-destructive" />
                                  </div>
                                  <span className="font-medium text-sm">{product.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                              <TableCell className="text-sm">{product.category_name || "—"}</TableCell>
                              <TableCell className="text-sm">{product.quantity}</TableCell>
                              <TableCell className="text-sm">
                                <Badge variant="destructive" className="text-[10px]">
                                  {product.expiry_date ? formatDate(product.expiry_date) : "—"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                                  onClick={() => router.push(`/products?id=${product.id}`)}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {data?.expiring.length ? (
                <Card className="border-amber-500/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <CalendarClock className="h-4 w-4" />
                      Expiring Soon ({data.expiring.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Expiry Date</TableHead>
                            <TableHead>Days Left</TableHead>
                            <TableHead className="w-[80px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.expiring.map((product) => {
                            const daysLeft = product.expiry_date 
                              ? Math.ceil((new Date(product.expiry_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                              : 0;
                            return (
                              <TableRow key={product.id}>
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                      <CalendarClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <span className="font-medium text-sm">{product.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
                                <TableCell className="text-sm">{product.category_name || "—"}</TableCell>
                                <TableCell className="text-sm">{product.quantity}</TableCell>
                                <TableCell className="text-sm">{product.expiry_date ? formatDate(product.expiry_date) : "—"}</TableCell>
                                <TableCell className="text-right">
                                  <Badge className={daysLeft <= 7 ? "bg-red-500/10 text-red-600 border-red-500/20 text-[10px]" : "bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]"}>
                                    {daysLeft} days
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-10 w-10 sm:h-8 sm:w-8 p-0"
                                    onClick={() => router.push(`/products?id=${product.id}`)}
                                  >
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
            </>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                  <CalendarClock className="h-8 w-8 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold mb-1">No Expiry Alerts</h3>
                <p className="text-muted-foreground text-sm">All products are within their expiration window</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={poDialogOpen} onOpenChange={setPoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a purchase order for {selectedProductIds.size} selected product(s)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select value={poSupplierId} onValueChange={(v: string | null) => setPoSupplierId(v || "")}>
                <SelectTrigger className="w-full h-11">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(s => (
                    <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              The PO will include the minimum stock level quantity for each selected product.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPoDialogOpen(false)}>Cancel</Button>
            <Button onClick={createPurchaseOrder} disabled={creatingPo || !poSupplierId}>
              {creatingPo && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create PO
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}