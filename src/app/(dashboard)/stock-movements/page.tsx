"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils";
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
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Search, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react";

interface ProductOption {
  id: string;
  name: string;
  sku: string;
}

interface MovementRow {
  id: string;
  product_id: string;
  type: string;
  quantity: number;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  product?: { name: string; sku: string } | null;
}

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ product_id: "", type: "inbound", quantity: "", reference: "", notes: "" });
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [movementsRes, productsRes] = await Promise.all([
      supabase.from("stock_movements").select("*, product:products(name, sku)").order("created_at", { ascending: false }),
      supabase.from("products").select("id, name, sku").order("name"),
    ]);
    if (movementsRes.data) setMovements(movementsRes.data as unknown as MovementRow[]);
    if (productsRes.data) setProducts(productsRes.data as ProductOption[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.product_id || !form.quantity) { toast.error("Product and quantity are required"); return; }
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("stock_movements").insert({
        product_id: form.product_id,
        type: form.type,
        quantity: parseInt(form.quantity),
        reference: form.reference || null,
        notes: form.notes || null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      toast.success(`Stock ${form.type} recorded`);
      setDialogOpen(false);
      setForm({ product_id: "", type: "inbound", quantity: "", reference: "", notes: "" });
      fetchData();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  const getTypeBadge = (type: string) => {
    if (type === "inbound") return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1"><ArrowDownRight className="h-3 w-3" />Inbound</Badge>;
    if (type === "outbound") return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 gap-1"><ArrowUpRight className="h-3 w-3" />Outbound</Badge>;
    return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1"><RefreshCw className="h-3 w-3" />Adjustment</Badge>;
  };

  const filtered = movements.filter((m) => {
    const matchSearch = search === "" || m.product?.name?.toLowerCase().includes(search.toLowerCase()) || m.reference?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || m.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Stock Movements" description={`${movements.length} total movements`} icon={ArrowLeftRight}>
        <Button onClick={() => { setForm({ product_id: "", type: "inbound", quantity: "", reference: "", notes: "" }); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Record Movement</Button>
      </PageHeader>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by product or reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={filterType} onValueChange={(v) => setFilterType(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="inbound">Inbound</SelectItem><SelectItem value="outbound">Outbound</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>Product</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Reference</TableHead><TableHead>Notes</TableHead><TableHead>Date</TableHead>
      </TableRow></TableHeader><TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={6} className="text-center h-32"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
        ) : filtered.length === 0 ? (
          <TableRow><TableCell colSpan={6} className="text-center h-32 text-muted-foreground">No movements found</TableCell></TableRow>
        ) : filtered.map((m) => (
          <TableRow key={m.id}>
            <TableCell><div><p className="font-medium text-sm">{m.product?.name || "Unknown"}</p><p className="text-xs text-muted-foreground font-mono">{m.product?.sku ?? ""}</p></div></TableCell>
            <TableCell>{getTypeBadge(m.type)}</TableCell>
            <TableCell className="text-right font-semibold">{m.type === "outbound" ? `-${m.quantity}` : `+${m.quantity}`}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{m.reference || "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.notes || "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatRelativeTime(m.created_at)}</TableCell>
          </TableRow>
        ))}</TableBody></Table></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle><DialogDescription>Record an inbound, outbound, or adjustment movement</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Product *</Label>
            <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v ?? "" })}>
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>{products.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} ({p.sku})</SelectItem>))}</SelectContent>
            </Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Type *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v ?? "inbound" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="inbound">Inbound (Receiving)</SelectItem><SelectItem value="outbound">Outbound (Shipping)</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem></SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="Enter quantity" /></div>
          </div>
          <div className="space-y-2"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="PO number, delivery note, etc." /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes" rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record Movement</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
