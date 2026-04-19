"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Pagination } from "@/components/ui/pagination";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { ArrowLeftRight, Plus, Search, Loader2, ArrowUpRight, ArrowDownRight, RefreshCw, Check, Tag } from "lucide-react";

interface ProductOption { id: number; name: string; sku: string; quantity?: number; }
interface ProductApiRow { id: number; name: string; sku: string; }
interface MovementRow { id: number; product_id: number; type: string; quantity: number; reference: string | null; notes: string | null; created_by: number | null; created_at: string; product_name?: string; product_sku?: string; created_by_name?: string; batch_number?: string | null; }

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => { setHasMounted(true); }, []);
  
  // Pagination & Filtering state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 25 });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ 
    product_id: "", 
    type: "restock", 
    quantity: "", 
    reference: "", 
    notes: "",
    batch_number: "",
    manufacture_date: "",
    expiry_date: ""
  });
  
  // Confirm dialog state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: string; quantity: number; action: () => void } | null>(null);
  
  // Product search state
  const [productSearchOpen, setProductSearchOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<ProductOption[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: "25",
        search: debouncedSearch,
        type: filterType
      });

      const [movementsRes, productsRes] = await Promise.all([
        fetch(`/api/stock-movements?${queryParams}`),
        fetch("/api/products?limit=1000"), // Simple fetch for the dropdown, maybe improve later with an autocomplete
      ]);

      if (movementsRes.ok) {
        const result = await movementsRes.json();
        setMovements(result.data);
        setPagination(result.pagination);
      }
      
      if (productsRes.ok) {
        const prodsResult = await productsRes.json();
        // The /api/products returns paginated too now, so we need to handle that or use a dedicated search endpoint
        setProducts((prodsResult.data as ProductApiRow[]).map((p) => ({ id: p.id, name: p.name, sku: p.sku })));
      }
    } catch (error: unknown) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, filterType]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchedProducts([]);
      return;
    }
    setSearchingProducts(true);
    try {
      const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=20`);
      const data = await res.json();
      setSearchedProducts(data.data || []);
    } catch {
      setSearchedProducts([]);
    } finally {
      setSearchingProducts(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (productSearchQuery) searchProducts(productSearchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [productSearchQuery, searchProducts]);

  const selectedProduct = products.find(p => p.id.toString() === form.product_id) || searchedProducts.find(p => p.id.toString() === form.product_id);

  const handleSave = async () => {
    if (!form.product_id || !form.quantity) { toast.error("Product and quantity are required"); return; }
    
    const qty = parseInt(form.quantity);
    const action = () => {
      setSaving(true);
      fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product_id: parseInt(form.product_id), 
          type: form.type, 
          quantity: qty, 
          reference: form.reference || null, 
          notes: form.notes || null,
          batch_number: form.batch_number || null,
          manufacture_date: form.manufacture_date || null,
          expiry_date: form.expiry_date || null,
        }),
      }).then(response => {
        if (!response.ok) return response.json().then(err => { throw new Error(err.error || "Failed"); });
        return response.json();
      }).then(() => {
        toast.success(`Stock ${form.type} recorded`);
        setDialogOpen(false);
        setForm({ 
          product_id: "", 
          type: "restock", 
          quantity: "", 
          reference: "", 
          notes: "",
          batch_number: "",
          manufacture_date: "",
          expiry_date: ""
        });
        fetchData();
      }).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : "Failed to record stock movement";
        toast.error(errorMessage);
      }).finally(() => { setSaving(false); });
    };

    setConfirmAction({ type: form.type, quantity: qty, action });
    setConfirmOpen(true);
  };

  const getTypeBadge = (type: string) => {
    if (type === "transfer_out") return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1"><ArrowUpRight className="h-3 w-3" />Dispatch</Badge>;
    if (type === "adjustment") return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 gap-1"><RefreshCw className="h-3 w-3" />Adjustment</Badge>;
    if (["restock", "transfer_in", "initial"].includes(type)) return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 gap-1"><ArrowDownRight className="h-3 w-3" />Inbound</Badge>;
    return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20 gap-1"><ArrowUpRight className="h-3 w-3" />Outbound</Badge>;
  };

  if (!hasMounted) return null;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Stock Movements" 
        description={`${pagination.total} total movements`} 
        helpText="Record and track every change in your inventory levels. 'Inbound' movements add stock (e.g., restocking), 'Dispatch' records items sent out for sale or transfer, and 'Adjustments' are for manual corrections (e.g., after a physical count). Each entry tracks who performed the action to maintain a clear audit trail."
        icon={ArrowLeftRight}
      >
        <Button onClick={() => { setForm({ product_id: "", type: "restock", quantity: "", reference: "", notes: "", batch_number: "", manufacture_date: "", expiry_date: "" }); setDialogOpen(true); }} className="gap-2 h-11 text-base px-6"><Plus className="h-5 w-5" /> Record Movement</Button>
      </PageHeader>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search by product or reference..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-11" /></div>
          <Select value={filterType} onValueChange={(v: string | null) => { setFilterType(v ?? "all"); setPage(1); }}>
            <SelectTrigger className="w-full sm:w-[160px] h-11"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Types</SelectItem><SelectItem value="restock">Restock</SelectItem><SelectItem value="transfer_out">Dispatch</SelectItem><SelectItem value="adjustment">Adjustment</SelectItem><SelectItem value="damage">Damage</SelectItem><SelectItem value="expired">Expired</SelectItem><SelectItem value="loss">Loss</SelectItem></SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Performed By</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-48"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : movements.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-48 text-muted-foreground">No movements found</TableCell></TableRow>
                ) : movements.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell><div><p className="font-medium text-sm">{m.product_name || "Unknown"}</p><p className="text-xs text-muted-foreground font-mono">{m.product_sku ?? ""}</p></div></TableCell>
                    <TableCell><Badge variant="outline" className="font-mono text-[10px]">{m.batch_number || "—"}</Badge></TableCell>
                    <TableCell>{getTypeBadge(m.type)}</TableCell>
                    <TableCell className="text-right font-semibold">{["restock", "transfer_in", "initial", "adjustment"].includes(m.type) ? `+${m.quantity}` : `-${m.quantity}`}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.reference || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">{m.notes || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.created_by_name || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{hasMounted ? formatRelativeTime(m.created_at) : "..."}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center py-4">
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl w-[90vw]">
        <DialogHeader><DialogTitle>Record Stock Movement</DialogTitle><DialogDescription>Record an inbound, outbound, or adjustment movement</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Product *</Label>
            <Popover open={productSearchOpen} onOpenChange={setProductSearchOpen}>
              <PopoverTrigger>
                <Button variant="outline" className="w-full h-11 justify-between font-normal">
                  {selectedProduct ? (
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{selectedProduct.name}</span>
                      <span className="text-muted-foreground text-sm">({selectedProduct.sku})</span>
                    </span>
                  ) : (
                    "Search for a product..."
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-[400px]" align="start">
                <Command>
                  <CommandInput 
                    placeholder="Search products..." 
                    value={productSearchQuery}
                    onValueChange={setProductSearchQuery}
                  />
                  <CommandList>
                    {searchingProducts ? (
                      <div className="py-6 text-center text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : searchedProducts.length === 0 && productSearchQuery.length >= 2 ? (
                      <CommandEmpty>No products found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {searchedProducts.map((p) => (
                          <CommandItem
                            key={p.id}
                            value={`${p.name} ${p.sku}`}
                            onSelect={() => {
                              setForm({ ...form, product_id: p.id.toString() });
                              setProductSearchOpen(false);
                              setProductSearchQuery("");
                            }}
                            className="flex items-center justify-between"
                          >
                            <div>
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-muted-foreground font-mono">{p.sku}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">Stock: {p.quantity}</div>
                            {form.product_id === p.id.toString() && <Check className="h-4 w-4" />}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Type *</Label>
              <Select value={form.type} onValueChange={(v: string | null) => setForm({ ...form, type: v ?? "restock" })}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="restock">Restock (Inbound)</SelectItem><SelectItem value="transfer_out">Dispatch (Outbound)</SelectItem><SelectItem value="adjustment">Stock Adjustment</SelectItem></SelectContent>
              </Select></div>
            <div className="space-y-2"><Label>Quantity *</Label><Input type="number" min="1" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" className="h-11" /></div>
            <div className="space-y-2"><Label>Reference</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="PO-001" className="h-11" /></div>
          </div>

          {form.type === "restock" && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <div className="col-span-full font-semibold text-sm flex items-center gap-2 text-primary">
                <Tag className="h-4 w-4" /> Batch & Expiry Details
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider">Batch #</Label>
                <Input
                  placeholder="LOT-2024-001"
                  value={form.batch_number}
                  onChange={(e) => setForm({ ...form, batch_number: e.target.value })}
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider">Expiry Date</Label>
                <Input
                  type="date"
                  value={form.expiry_date}
                  onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  className="h-10 bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-wider">Mfg Date</Label>
                <Input
                  type="date"
                  value={form.manufacture_date}
                  onChange={(e) => setForm({ ...form, manufacture_date: e.target.value })}
                  className="h-10 bg-background"
                />
              </div>
            </div>
          )}

          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Additional notes (optional)" className="resize-none" rows={3} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11 px-6">Cancel</Button><Button onClick={handleSave} disabled={saving} className="h-11 px-6">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Record Movement</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Stock Movement</DialogTitle>
            <DialogDescription>
              {confirmAction?.type === "transfer_out" && `Record dispatch of ${confirmAction.quantity} units? This will deduct from inventory.`}
              {confirmAction?.type === "adjustment" && `Set stock to ${confirmAction.quantity} units? This will replace current quantity.`}
              {confirmAction?.type === "restock" && `Add ${confirmAction.quantity} units to inventory?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (confirmAction?.action) confirmAction.action();
                setConfirmOpen(false);
              }}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
