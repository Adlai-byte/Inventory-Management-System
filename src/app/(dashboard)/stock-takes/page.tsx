"use client";

import { useEffect, useState, useCallback } from "react";
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
import { ClipboardCheck, Plus, Search, Loader2, Eye, CheckCircle, XCircle, ChevronLeft } from "lucide-react";
import { generateStockTakeName } from "@/lib/stock-take-utils";

interface StockTakeSummary {
  id: number;
  name: string;
  warehouse_id: number | null;
  status: "draft" | "in_progress" | "completed" | "cancelled";
  notes: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: number;
  created_at: string;
  warehouse_name?: string;
  created_by_name?: string;
  total_items?: number;
  matched_count?: number;
  variance_count?: number;
}

interface StockTakeItem {
  id: number;
  stock_take_id: number;
  product_id: number;
  system_quantity: number;
  counted_quantity: number;
  difference: number;
  notes: string | null;
  product_name?: string;
  product_sku?: string;
  unit?: string;
  cost_price?: number;
}

export default function StockTakesPage() {
  const [stockTakes, setStockTakes] = useState<StockTakeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, page: 1, limit: 25 });
  const [currentPage, setCurrentPage] = useState(1);

  // Detail view state
  const [selectedTake, setSelectedTake] = useState<{ id: number; name: string; status: string } | null>(null);
  const [takeItems, setTakeItems] = useState<StockTakeItem[]>([]);
  const [takeLoading, setTakeLoading] = useState(false);
  const [itemSearch, setItemSearch] = useState("");

  // Dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: generateStockTakeName(), notes: "" });

  // Complete dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchStockTakes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/stock-takes?search=${encodeURIComponent(debouncedSearch)}&status=${filterStatus}&page=${currentPage}&limit=25`
      );
      if (res.ok) {
        const result = await res.json();
        setStockTakes(result.data);
        setPagination(result.pagination);
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [debouncedSearch, filterStatus, currentPage]);

  useEffect(() => { fetchStockTakes(); }, [fetchStockTakes]);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filterStatus]);

  const openStockTake = async (take: StockTakeSummary) => {
    setSelectedTake({ id: take.id, name: take.name, status: take.status });
    setTakeLoading(true);
    try {
      const res = await fetch(`/api/stock-takes/${take.id}`);
      if (res.ok) {
        const result = await res.json();
        setTakeItems(result.data.items || []);
      }
    } catch (error) { console.error(error); }
    finally { setTakeLoading(false); }
  };

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setCreating(true);
    try {
      const res = await fetch("/api/stock-takes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, notes: form.notes || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Stock take created");
      setCreateDialogOpen(false);
      setForm({ name: generateStockTakeName(), notes: "" });
      fetchStockTakes();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to create");
    } finally { setCreating(false); }
  };

  const handleUpdateCount = async (itemId: number, countedQty: number) => {
    try {
      const res = await fetch(`/api/stock-takes/${selectedTake!.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_counts", items: [{ id: itemId, counted_quantity: countedQty }] }),
      });
      if (!res.ok) throw new Error("Failed to update");
      // Update local state
      setTakeItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, counted_quantity: countedQty } : item
      ));
    } catch {
      toast.error("Failed to update count");
    }
  };

  const handleComplete = async () => {
    if (!selectedTake) return;
    try {
      const res = await fetch(`/api/stock-takes/${selectedTake.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message);
      setCompleteDialogOpen(false);
      setSelectedTake(null);
      fetchStockTakes();
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to complete");
    }
  };

  const handleCancel = async () => {
    if (!selectedTake) return;
    try {
      const res = await fetch(`/api/stock-takes/${selectedTake.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error("Failed to cancel");
      toast.success("Stock take cancelled");
      setSelectedTake(null);
      fetchStockTakes();
    } catch {
      toast.error("Failed to cancel");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft": return <Badge variant="secondary">Draft</Badge>;
      case "in_progress": return <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">In Progress</Badge>;
      case "completed": return <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Completed</Badge>;
      case "cancelled": return <Badge variant="destructive">Cancelled</Badge>;
      default: return null;
    }
  };

  const filteredItems = takeItems.filter(item =>
    !itemSearch || item.product_name?.toLowerCase().includes(itemSearch.toLowerCase()) || item.product_sku?.toLowerCase().includes(itemSearch.toLowerCase())
  );

  // =============================================
  // Detail View: Counting items for a stock take
  // =============================================
  if (selectedTake) {
    const varianceItems = takeItems.filter(i => i.difference !== 0);
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => setSelectedTake(null)}>
            <ChevronLeft className="h-4 w-4 mr-1" /> Back
          </Button>
          <div className="flex-1">
            <h2 className="text-lg font-semibold">{selectedTake.name}</h2>
            <p className="text-sm text-muted-foreground">{takeItems.length} items · {varianceItems.length} variances</p>
          </div>
          <div className="flex gap-2">
            {selectedTake.status === "in_progress" && (
              <>
                <Button variant="outline" onClick={handleCancel}><XCircle className="h-4 w-4 mr-1" /> Cancel</Button>
                <Button onClick={() => setCompleteDialogOpen(true)}><CheckCircle className="h-4 w-4 mr-1" /> Complete</Button>
              </>
            )}
          </div>
        </div>

        <Card><CardContent className="p-4">
          <Input placeholder="Search items..." value={itemSearch} onChange={(e) => setItemSearch(e.target.value)} className="max-w-sm" />
        </CardContent></Card>

        {takeLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
        ) : (
          <Card><CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Product</TableHead><TableHead>SKU</TableHead>
                <TableHead className="text-right">System Qty</TableHead>
                <TableHead className="text-right">Counted Qty</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Cost Impact</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">No items</TableCell></TableRow>
                ) : filteredItems.map((item) => (
                  <TableRow key={item.id} className={item.difference !== 0 ? "bg-amber-50/50 dark:bg-amber-950/20" : ""}>
                    <TableCell className="font-medium text-sm">{item.product_name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{item.product_sku}</TableCell>
                    <TableCell className="text-right">{item.system_quantity}</TableCell>
                    <TableCell className="text-right">
                      {selectedTake.status === "in_progress" ? (
                        <Input
                          type="number"
                          min="0"
                          value={item.counted_quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            handleUpdateCount(item.id, val);
                          }}
                          className="w-20 h-8 text-right inline-block"
                        />
                      ) : item.counted_quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-semibold ${item.difference > 0 ? "text-emerald-600" : item.difference < 0 ? "text-destructive" : ""}`}>
                        {item.difference > 0 ? "+" : ""}{item.difference}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {item.cost_price ? formatCostImpact(item.difference, item.cost_price) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        )}

        <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}><DialogContent>
          <DialogHeader><DialogTitle>Complete Stock Take</DialogTitle>
          <DialogDescription>
            This will adjust stock levels for {varianceItems.length} items with variances. All adjustments will be recorded as stock movements with a reference number. This cannot be undone.
          </DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleComplete}><CheckCircle className="h-4 w-4 mr-1" /> Confirm & Adjust Stock</Button>
          </DialogFooter>
        </DialogContent></Dialog>
      </div>
    );
  }

  // =============================================
  // List View: All stock takes
  // =============================================
  return (
    <div className="space-y-6">
      <PageHeader title="Stock Takes" description="Physical inventory counts" icon={ClipboardCheck}>
        <Button onClick={() => { setForm({ name: generateStockTakeName(), notes: "" }); setCreateDialogOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> New Stock Take
        </Button>
      </PageHeader>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search stock takes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={filterStatus} onValueChange={(v: string | null) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        <Table><TableHeader><TableRow>
          <TableHead>Name</TableHead><TableHead>Status</TableHead>
          <TableHead className="text-right">Items</TableHead><TableHead className="text-right">Matched</TableHead>
          <TableHead className="text-right">Variances</TableHead><TableHead>Created By</TableHead><TableHead>Started</TableHead><TableHead className="w-[50px]"></TableHead>
        </TableRow></TableHeader><TableBody>
          {loading ? (
            <TableRow><TableCell colSpan={8} className="text-center h-32"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
          ) : stockTakes.length === 0 ? (
            <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground">No stock takes found</TableCell></TableRow>
          ) : stockTakes.map((take) => (
            <TableRow key={take.id} className="cursor-pointer hover:bg-accent/50" onClick={() => openStockTake(take)}>
              <TableCell className="font-medium">{take.name}</TableCell>
              <TableCell>{getStatusBadge(take.status)}</TableCell>
              <TableCell className="text-right">{take.total_items || 0}</TableCell>
              <TableCell className="text-right text-emerald-600">{take.matched_count || 0}</TableCell>
              <TableCell className="text-right">
                {(take.variance_count || 0) > 0 ? (
                  <span className="text-destructive font-semibold">{take.variance_count}</span>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{take.created_by_name || "—"}</TableCell>
              <TableCell className="text-sm text-muted-foreground">{take.started_at ? new Date(take.started_at).toLocaleDateString() : "—"}</TableCell>
              <TableCell><Button variant="ghost" size="sm"><Eye className="h-4 w-4" /></Button></TableCell>
            </TableRow>
          ))}
        </TableBody></Table>
      </CardContent></Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center py-4">
          <Pagination currentPage={currentPage} totalPages={pagination.totalPages} onPageChange={setCurrentPage} />
        </div>
      )}

      {/* Create Stock Take Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle>New Stock Take</DialogTitle>
        <DialogDescription>Start a physical inventory count. All active products will be listed for counting.</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" /></div>
          <div className="space-y-2"><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes..." rows={3} className="resize-none" /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} disabled={creating}>{creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Create Stock Take</Button>
        </DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}

function formatCostImpact(difference: number, costPrice: number): string {
  const impact = difference * costPrice;
  const prefix = impact >= 0 ? "+" : "";
  return `${prefix}₱${impact.toFixed(2)}`;
}
