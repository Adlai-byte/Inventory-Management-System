"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import { Plus, Search, Loader2, Eye, CheckCircle, XCircle, Truck, Clock, PackageCheck, PackageMinus } from "lucide-react";
import type { Supplier } from "@/lib/types";

interface ProductOption { id: number; name: string; sku: string; unit_price: number; cost_price?: number; }
interface OrderRow { id: number; supplier_id: number; status: string; total_cost: number; total_amount: number; notes: string | null; created_at: string; supplier_name?: string; po_number?: string; }
interface OrderItemRow { id: number; order_id: number; product_id: number; quantity_ordered: number; quantity_received: number; unit_cost: number; product_name?: string; product_sku?: string; }
interface ProductApiRow { id: number; name: string; sku: string; unit_price: number; cost_price?: number; }

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [receiveDialogOpen, setReceiveDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow & { items?: OrderItemRow[] } | null>(null);
  const [receiveOrder, setReceiveOrder] = useState<OrderRow & { items?: OrderItemRow[] } | null>(null);
  const [receiveQtys, setReceiveQtys] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [receiving, setReceiving] = useState(false);
  const [form, setForm] = useState({ supplier_id: "", notes: "", items: [{ product_id: "", quantity: "1", unit_cost: "0" }] });

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 25 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({ page: page.toString(), limit: "25", search });
      const [ordersRes, suppliersRes, productsRes] = await Promise.all([
        fetch(`/api/purchase-orders?${queryParams}`),
        fetch("/api/suppliers"),
        fetch("/api/products?limit=500"),
      ]);
      if (ordersRes.ok) {
        const result = await ordersRes.json();
        setOrders(result.data);
        setPagination(result.pagination);
      }
      if (suppliersRes.ok) {
        const result = await suppliersRes.json();
        setSuppliers(result.data || result);
      }
      if (productsRes.ok) {
        const result = await productsRes.json();
        const items = result.data || result;
        setProducts((items as ProductApiRow[]).map((p) => ({ id: p.id, name: p.name, sku: p.sku, unit_price: p.cost_price ?? p.unit_price ?? 0, cost_price: p.cost_price })));
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.supplier_id) { toast.error("Supplier is required"); return; }
    if (form.items.some((i) => !i.product_id || !i.quantity)) { toast.error("All items need product and quantity"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: parseInt(form.supplier_id),
          notes: form.notes || null,
          items: form.items.map(i => ({ product_id: parseInt(i.product_id), quantity: i.quantity, unit_cost: i.unit_cost }))
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Purchase order created successfully");
      setDialogOpen(false);
      setForm({ supplier_id: "", notes: "", items: [{ product_id: "", quantity: "1", unit_cost: "0" }] });
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create order");
    } finally { setSaving(false); }
  };

  const viewOrderDetail = async (order: OrderRow) => {
    const res = await fetch(`/api/purchase-orders/${order.id}`);
    if (res.ok) {
      const result = await res.json();
      setSelectedOrder({ ...order, items: result.data?.items ?? [] });
    } else {
      setSelectedOrder({ ...order, items: [] });
    }
    setDetailDialogOpen(true);
  };

  const openReceiveDialog = async (order: OrderRow) => {
    const res = await fetch(`/api/purchase-orders/${order.id}`);
    if (res.ok) {
      const result = await res.json();
      const fullOrder = { ...order, items: result.data?.items ?? [] };
      setReceiveOrder(fullOrder);
      // Default receive qty = remaining for each item
      const defaults: Record<number, string> = {};
      for (const item of fullOrder.items ?? []) {
        const remaining = item.quantity_ordered - item.quantity_received;
        defaults[item.id] = remaining > 0 ? String(remaining) : "0";
      }
      setReceiveQtys(defaults);
    }
    setReceiveDialogOpen(true);
  };

  const handleReceive = async () => {
    if (!receiveOrder) return;
    const receiveItems = (receiveOrder.items ?? [])
      .map(item => ({
        item_id: item.id,
        quantity_to_receive: parseInt(receiveQtys[item.id] || "0", 10),
      }))
      .filter(ri => ri.quantity_to_receive > 0);

    if (receiveItems.length === 0) {
      toast.error("Enter at least one quantity to receive");
      return;
    }

    setReceiving(true);
    try {
      const res = await fetch(`/api/purchase-orders/${receiveOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receive_items: receiveItems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Items received and stock updated");
      setReceiveDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to receive items");
    } finally { setReceiving(false); }
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { product_id: "", quantity: "1", unit_cost: "0" }] });
  const removeItem = (index: number) => { if (form.items.length > 1) setForm({ ...form, items: form.items.filter((_, i) => i !== index) }); };
  const updateItem = (index: number, field: string, value: string) => {
    const items = [...form.items];
    (items[index] as Record<string, string>)[field] = value;
    if (field === "product_id") {
      const product = products.find((p) => p.id.toString() === value);
      if (product) items[index].unit_cost = (product.cost_price ?? product.unit_price).toString();
    }
    setForm({ ...form, items });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { cls: string; Icon: typeof CheckCircle; label: string }> = {
      received:  { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", Icon: CheckCircle, label: "Received" },
      partial:   { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",   Icon: PackageMinus,  label: "Partial"  },
      pending:   { cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",       Icon: Clock,         label: "Pending"  },
      cancelled: { cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",           Icon: XCircle,       label: "Cancelled"},
    };
    const b = config[status] ?? config.pending;
    return <Badge className={`${b.cls} gap-1`}><b.Icon className="h-3 w-3" />{b.label}</Badge>;
  };

  const canReceive = (status: string) => ["pending", "partial", "approved", "ordered"].includes(status);

  const filtered = orders.filter((o) =>
    search === "" || o.supplier_name?.toLowerCase().includes(search.toLowerCase()) || o.po_number?.toLowerCase().includes(search.toLowerCase())
  );

  const orderTotal = (o: OrderRow) => o.total_cost ?? o.total_amount ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Supplier Deliveries" description={`${pagination.total} recorded deliveries`} icon={Truck}>
        <Button id="btn-record-delivery" onClick={() => { setForm({ supplier_id: "", notes: "", items: [{ product_id: "", quantity: "1", unit_cost: "0" }] }); setDialogOpen(true); }} className="gap-2 h-11 text-base px-6">
          <Plus className="h-5 w-5" /> New Purchase Order
        </Button>
      </PageHeader>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input id="search-orders" placeholder="Search by supplier or PO number..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" /></div>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0"><div className="overflow-x-auto"><Table><TableHeader><TableRow>
        <TableHead>PO Number</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total Cost</TableHead><TableHead>Created</TableHead><TableHead className="w-[90px]"></TableHead>
      </TableRow></TableHeader><TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={6} className="text-center h-32"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
        ) : filtered.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No orders found</TableCell></TableRow>
        ) : filtered.map((o) => (
          <TableRow key={o.id} data-order-id={o.id} data-status={o.status}>
            <TableCell className="font-mono text-xs">{o.po_number ?? `PO-${String(o.id).padStart(5, "0")}`}</TableCell>
            <TableCell className="font-medium">{o.supplier_name ?? "—"}</TableCell>
            <TableCell>{getStatusBadge(o.status)}</TableCell>
            <TableCell className="text-right font-semibold">{formatCurrency(orderTotal(o))}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(o.created_at)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1">
                {canReceive(o.status) && (
                  <Button id={`btn-receive-${o.id}`} variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10" title="Receive Items" onClick={() => openReceiveDialog(o)}>
                    <PackageCheck className="h-4 w-4" />
                  </Button>
                )}
                <Button id={`btn-view-${o.id}`} variant="ghost" size="icon" className="h-8 w-8" title="View Details" onClick={() => viewOrderDetail(o)}>
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody></Table></div></CardContent></Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center py-4">
          <Pagination currentPage={page} totalPages={pagination.totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* ── Create PO Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle className="text-xl">New Purchase Order</DialogTitle>
            <DialogDescription>Create a purchase order. Use &ldquo;Receive Items&rdquo; on the list to mark delivery.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Supplier *</Label>
                <Select value={form.supplier_id} onValueChange={(v: string | null) => setForm({ ...form, supplier_id: v ?? "" })}>
                  <SelectTrigger className="w-full h-12">
                    {form.supplier_id ? (
                      <span className="truncate">{suppliers.find(s => s.id.toString() === form.supplier_id)?.name || "Select a supplier"}</span>
                    ) : (
                      <SelectValue placeholder="Select a supplier" />
                    )}
                  </SelectTrigger>
                  <SelectContent>{suppliers.map((s) => (<SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <div className="text-right">
                  <span className="text-sm text-muted-foreground">Order Total</span>
                  <p className="text-2xl font-bold">{formatCurrency(form.items.reduce((sum, i) => sum + parseFloat(i.unit_cost || "0") * parseInt(i.quantity || "0"), 0))}</p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem} className="h-9">+ Add Item</Button>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-[50%]">Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Select value={item.product_id} onValueChange={(v: string | null) => updateItem(index, "product_id", v ?? "")}>
                            <SelectTrigger className="w-full h-10">
                              {item.product_id ? (
                                <span className="truncate">{products.find(p => p.id.toString() === item.product_id)?.name || "Select product"}</span>
                              ) : (
                                <SelectValue placeholder="Select product" />
                              )}
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px] overflow-y-auto">
                              {products.map((p) => (<SelectItem key={p.id} value={p.id.toString()} className="truncate">{p.name}</SelectItem>))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell><Input type="number" placeholder="0" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} className="w-full h-10 text-right" /></TableCell>
                        <TableCell><Input type="number" step="0.01" placeholder="0.00" value={item.unit_cost} onChange={(e) => updateItem(index, "unit_cost", e.target.value)} className="w-full h-10 text-right" /></TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(parseFloat(item.unit_cost || "0") * parseInt(item.quantity || "0"))}</TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:bg-destructive/10" onClick={() => removeItem(index)}>
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes (Optional)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add notes, invoice number, or delivery references..." rows={3} className="resize-none w-full" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11 px-6">Cancel</Button>
            <Button id="btn-submit-po" onClick={handleSave} disabled={saving} className="h-11 px-6">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Order</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Receive Items Dialog ── */}
      <Dialog open={receiveDialogOpen} onOpenChange={setReceiveDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" />Receive Items</DialogTitle>
            <DialogDescription>
              {receiveOrder?.po_number ?? `PO #${receiveOrder?.id}`} — enter the quantity received for each item. Leave at 0 to skip.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Received</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="text-right w-[120px]">Receive Now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(receiveOrder?.items ?? []).map((item) => {
                    const remaining = item.quantity_ordered - item.quantity_received;
                    return (
                      <TableRow key={item.id} data-item-id={item.id}>
                        <TableCell className="font-medium">{item.product_name ?? "—"}</TableCell>
                        <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.quantity_received}</TableCell>
                        <TableCell className="text-right">
                          <span className={remaining > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-emerald-600 dark:text-emerald-400"}>
                            {remaining}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Input
                            id={`receive-qty-${item.id}`}
                            type="number"
                            min={0}
                            max={remaining}
                            value={receiveQtys[item.id] ?? "0"}
                            onChange={(e) => setReceiveQtys(prev => ({ ...prev, [item.id]: e.target.value }))}
                            disabled={remaining <= 0}
                            className="h-9 text-right w-full"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            <p className="text-sm text-muted-foreground">
              Stock will be updated immediately. The PO status becomes <strong>Received</strong> when all items are fully received, otherwise <strong>Partial</strong>.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceiveDialogOpen(false)} className="h-11 px-6">Cancel</Button>
            <Button id="btn-confirm-receive" onClick={handleReceive} disabled={receiving} className="h-11 px-6">
              {receiving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail Dialog ── */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Order Details</DialogTitle>
            <DialogDescription>{selectedOrder?.po_number ?? `PO #${selectedOrder?.id}`}</DialogDescription>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground block mb-1">Status</span>
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground block mb-1">Supplier</span>
                  <span className="font-medium">{selectedOrder.supplier_name ?? "—"}</span>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Ordered</TableHead>
                      <TableHead className="text-right">Received</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOrder.items ?? []).map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product_name ?? "—"}</TableCell>
                        <TableCell className="text-right">{item.quantity_ordered}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{item.quantity_received}</TableCell>
                        <TableCell className="text-right">{formatCurrency(item.unit_cost)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.quantity_ordered * item.unit_cost)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold text-lg">Total Cost</span>
                <span className="font-bold text-2xl text-primary">{formatCurrency(orderTotal(selectedOrder))}</span>
              </div>
              {selectedOrder.notes && (
                <div className="p-4 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">Notes: </span>
                  <span className="text-sm">{selectedOrder.notes}</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
