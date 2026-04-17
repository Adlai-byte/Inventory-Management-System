"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { getExpiryStatus, formatDaysUntilExpiry } from "@/lib/expiry";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Package, Loader2, CalendarClock } from "lucide-react";

interface ExpiryProduct {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  expiry_date: string | null;
  manufacture_date: string | null;
  lot_number: string | null;
  unit_price: number;
  cost_price: number;
  category_name: string | null;
  days_until_expiry: number | null;
}

interface ExpiryData {
  expired: ExpiryProduct[];
  expiring: ExpiryProduct[];
  summary: {
    expired_count: number;
    expiring_count: number;
    expired_value: number;
    expiring_value: number;
  };
  filters: {
    days: number;
    category: string;
  };
}

export function ExpiryAlertsContent() {
  const [data, setData] = useState<ExpiryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [daysFilter, setDaysFilter] = useState("30");

  useEffect(() => {
    const fetchExpiryAlerts = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/expiry?days=${daysFilter}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchExpiryAlerts();
  }, [daysFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasAlerts = (data?.expired.length ?? 0) > 0 || (data?.expiring.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiry Alerts"
        description="Products approaching expiration"
        icon={CalendarClock}
      />

      <div className="flex items-center gap-4">
        <div className="w-[200px]">
          <label className="sr-only">Expiry filter</label>
          <select
            value={daysFilter}
            onChange={(e) => setDaysFilter(e.target.value)}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>

      {!hasAlerts ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <Package className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Expiry Alerts</h3>
            <p className="text-muted-foreground text-sm">No products are expiring within {daysFilter} days</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-destructive/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-destructive">Expired</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{data?.summary.expired_count || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(data?.summary.expired_value || 0)} value
                </p>
              </CardContent>
            </Card>
            <Card className="border-orange-500/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-600">Expiring Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{data?.summary.expiring_count || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Within {daysFilter} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Expiring Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(data?.summary.expiring_value || 0)}</div>
                <p className="text-xs text-muted-foreground">At cost price</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total at Risk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency((data?.summary.expired_value || 0) + (data?.summary.expiring_value || 0))}
                </div>
                <p className="text-xs text-muted-foreground">Expired + Expiring</p>
              </CardContent>
            </Card>
          </div>

          {data?.expired.length ? (
            <Card className="border-destructive/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  Expired Products ({data.expired.length})
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
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Expired</TableHead>
                      <TableHead>Value at Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expired.map((product) => (
                      <TableRow key={product.id} className="bg-destructive/5">
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell>{product.category_name || "—"}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {formatDaysUntilExpiry(product.expiry_date)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.quantity * product.cost_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {data?.expiring.length ? (
            <Card className="border-orange-500/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-orange-600">
                  <CalendarClock className="h-4 w-4" />
                  Expiring Within {daysFilter} Days ({data.expiring.length})
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
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Days Left</TableHead>
                      <TableHead>Value at Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.expiring.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="font-mono text-xs">{product.sku}</TableCell>
                        <TableCell>{product.category_name || "—"}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell>{product.expiry_date}</TableCell>
                        <TableCell>
                          <Badge variant={getExpiryStatus(product.expiry_date) === "critical" ? "outline" : "secondary"}>
                            {formatDaysUntilExpiry(product.expiry_date)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.quantity * product.cost_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
