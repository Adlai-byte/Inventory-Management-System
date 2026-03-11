"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { ShoppingCart, Plus, Search, MoreHorizontal, Loader2, Eye, CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import type { Supplier } from "@/lib/types";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
  unit_price: number;
}

interface OrderRow {
  id: string;
  supplier_id: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: { name: string } | null;
}

interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: { name: string; sku: string } | null;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow & { items?: OrderItemRow[] } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    notes: "",
    items: [{ product_id: "", quantity: "1", unit_price: "0" }],
  });
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [ordersRes, suppliersRes, productsRes] = await Promise.all([
      supabase.from("purchase_orders").select("*, supplier:suppliers(name)").order("created_at", { ascending: false }),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("products").select("id, name, sku, unit_price").order("name"),
    ]);
    if (ordersRes.data) setOrders(ordersRes.data as unknown as OrderRow[]);
    if (suppliersRes.data) setSuppliers(suppliersRes.data as Supplier[]);
    if (productsRes.data) setProducts(productsRes.data as ProductOption[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.supplier_id) { toast.error("Supplier is required"); return; }
    if (form.items.some((i) => !i.product_id || !i.quantity)) { toast.error("All items need product and quantity"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const totalAmount = form.items.reduce((sum, i) => sum + parseFloat(i.unit_price || "0") * parseInt(i.quantity || "0"), 0);
      const { data: order, error } = await supabase.from("purchase_orders").insert({
        supplier_id: form.supplier_id,
        status: "draft",
        total_amount: totalAmount,
        notes: form.notes || null,
        created_by: user?.id ?? null,
      }).select().single();
      if (error) throw error;
      const items = form.items.map((i) => ({
        order_id: order.id,
        product_id: i.product_id,
        quantity: parseInt(i.quantity),
        unit_price: parseFloat(i.unit_price),
      }));
      const { error: itemsError } = await supabase.from("purchase_order_items").insert(items);
      if (itemsError) throw itemsError;
      toast.success("Purchase order created");
      setDialogOpen(false);
      setForm({ supplier_id: "", notes: "", items: [{ product_id: "", quantity: "1", unit_price: "0" }] });
      fetchData();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase.from("purchase_orders").update({ status, updated_at: new Date().toISOString() }).eq("id", orderId);
      if (error) throw error;
      toast.success(`Order marked as ${status}`);
      fetchData();
    } catch (error: any) { toast.error(error.message); }
  };

  const viewOrderDetail = async (order: OrderRow) => {
    const { data: items } = await supabase.from("purchase_order_items").select("*, product:products(name, sku)").eq("order_id", order.id);
    setSelectedOrder({ ...order, items: (items as unknown as OrderItemRow[]) || [] });
    setDetailDialogOpen(true);
  };

  const addItem = () => { setForm({ ...form, items: [...form.items, { product_id: "", quantity: "1", unit_price: "0" }] }); };
  const removeItem = (index: number) => { if (form.items.length > 1) setForm({ ...form, items: form.items.filter((_, i) => i !== index) }); };
  const updateItem = (index: number, field: string, value: string) => {
    const items = [...form.items];
    (items[index] as Record<string, string>)[field] = value;
    if (field === "product_id") {
      const product = products.find((p) => p.id === value);
      if (product) items[index].unit_price = product.unit_price.toString();
    }
    setForm({ ...form, items });
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { cls: string; Icon: typeof FileText; label: string }> = {
      draft: { cls: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/20", Icon: FileText, label: "Draft" },
      pending: { cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20", Icon: Clock, label: "Pending" },
      approved: { cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20", Icon: CheckCircle, label: "Approved" },
      received: { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", Icon: CheckCircle, label: "Received" },
      cancelled: { cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20", Icon: XCircle, label: "Cancelled" },
    };
    const b = config[status] || config.draft;
    return <Badge className={`${b.cls} gap-1`}><b.Icon className="h-3 w-3" />{b.label}</Badge>;
  };

  const filtered = orders.filter((o) => {
    const matchSearch = search === "" || o.supplier?.name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || o.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Purchase Orders" description={`${orders.length} total orders`} icon={ShoppingCart}>
        <Button onClick={() => { setForm({ supplier_id: "", notes: "", items: [{ product_id: "", quantity: "1", unit_price: "0" }] }); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Create Order</Button>
      </PageHeader>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by supplier..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="draft">Draft</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="approved">Approved</SelectItem><SelectItem value="received">Received</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem></SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>Order ID</TableHead><TableHead>Supplier</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Created</TableHead><TableHead className="w-[50px]"></TableHead>
      </TableRow></TableHeader><TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={6} className="text-center h-32"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
        ) : filtered.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No orders found</TableCell></TableRow>
        ) : filtered.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="font-mono text-xs">{o.id.slice(0, 8).toUpperCase()}</TableCell>
            <TableCell className="font-medium">{o.supplier?.name ?? "—"}</TableCell>
            <TableCell>{getStatusBadge(o.status)}</TableCell>
            <TableCell className="text-right font-semibold">{formatCurrency(o.total_amount)}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(o.created_at)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => viewOrderDetail(o)}><Eye className="mr-2 h-4 w-4" />View Details</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {o.status === "draft" && <DropdownMenuItem onClick={() => updateStatus(o.id, "pending")}>Mark Pending</DropdownMenuItem>}
                  {o.status === "pending" && <DropdownMenuItem onClick={() => updateStatus(o.id, "approved")}>Approve</DropdownMenuItem>}
                  {o.status === "approved" && <DropdownMenuItem onClick={() => updateStatus(o.id, "received")}>Mark Received</DropdownMenuItem>}
                  {o.status !== "cancelled" && o.status !== "received" && <DropdownMenuItem variant="destructive" onClick={() => updateStatus(o.id, "cancelled")}>Cancel Order</DropdownMenuItem>}
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}</TableBody></Table></CardContent></Card>

      {/* Create Order Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create Purchase Order</DialogTitle><DialogDescription>Select a supplier and add line items</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Supplier *</Label>
            <Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v ?? "" })}>
              <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
              <SelectContent>{suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
            </Select></div>
          <div className="space-y-3">
            <div className="flex items-center justify-between"><Label>Line Items</Label><Button type="button" variant="outline" size="sm" onClick={addItem}>+ Add Item</Button></div>
            {form.items.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-5"><Select value={item.product_id} onValueChange={(v) => updateItem(index, "product_id", v ?? "")}>
                  <SelectTrigger><SelectValue placeholder="Product" /></SelectTrigger>
                  <SelectContent>{products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>))}</SelectContent>
                </Select></div>
                <div className="col-span-3"><Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} /></div>
                <div className="col-span-3"><Input type="number" step="0.01" placeholder="Price" value={item.unit_price} onChange={(e) => updateItem(index, "unit_price", e.target.value)} /></div>
                <div className="col-span-1"><Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-destructive" onClick={() => removeItem(index)}>×</Button></div>
              </div>
            ))}
            <div className="text-right font-semibold">Total: {formatCurrency(form.items.reduce((sum, i) => sum + parseFloat(i.unit_price || "0") * parseInt(i.quantity || "0"), 0))}</div>
          </div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Order notes" rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Order</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}><DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Order Details</DialogTitle><DialogDescription>Order {selectedOrder?.id.slice(0, 8).toUpperCase()}</DialogDescription></DialogHeader>
        {selectedOrder && (
          <div className="space-y-4">
            <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Status</span>{getStatusBadge(selectedOrder.status)}</div>
            <div className="flex justify-between items-center"><span className="text-sm text-muted-foreground">Supplier</span><span className="font-medium">{selectedOrder.supplier?.name ?? "—"}</span></div>
            <div className="border rounded-lg overflow-hidden">
              <Table><TableHeader><TableRow><TableHead>Product</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">Subtotal</TableHead></TableRow></TableHeader>
              <TableBody>{selectedOrder.items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm">{item.product?.name ?? "—"}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                </TableRow>
              ))}</TableBody></Table>
            </div>
            <div className="flex justify-between items-center pt-2 border-t"><span className="font-semibold">Total</span><span className="font-bold text-lg">{formatCurrency(selectedOrder.total_amount)}</span></div>
            {selectedOrder.notes && <div><span className="text-sm text-muted-foreground">Notes: </span><span className="text-sm">{selectedOrder.notes}</span></div>}
          </div>
        )}
      </DialogContent></Dialog>
    </div>
  );
}
