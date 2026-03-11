"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Warehouse, Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, AlertTriangle, MapPin } from "lucide-react";
import type { Warehouse as WarehouseType } from "@/lib/types";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WarehouseType | null>(null);
  const [deleting, setDeleting] = useState<WarehouseType | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", address: "" });
  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("warehouses").select("*").order("name");
    if (data) setWarehouses(data as WarehouseType[]);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, address: form.address || null };
      if (editing) {
        const { error } = await supabase.from("warehouses").update(payload).eq("id", editing.id);
        if (error) throw error;
        toast.success("Warehouse updated");
      } else {
        const { error } = await supabase.from("warehouses").insert(payload);
        if (error) throw error;
        toast.success("Warehouse created");
      }
      setDialogOpen(false); setForm({ name: "", address: "" }); setEditing(null); fetchData();
    } catch (error: any) { toast.error(error.message); } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const { error } = await supabase.from("warehouses").delete().eq("id", deleting.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Warehouse deleted"); setDeleteDialogOpen(false); setDeleting(null); fetchData();
  };

  const filtered = warehouses.filter((w) => w.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader title="Warehouses" description={`${warehouses.length} locations`} icon={Warehouse}>
        <Button onClick={() => { setEditing(null); setForm({ name: "", address: "" }); setDialogOpen(true); }} className="gap-2"><Plus className="h-4 w-4" /> Add Warehouse</Button>
      </PageHeader>

      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search warehouses..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm" /></div></CardContent></Card>

      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>Name</TableHead><TableHead>Address</TableHead><TableHead>Created</TableHead><TableHead className="w-[50px]"></TableHead>
      </TableRow></TableHeader><TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={4} className="text-center h-32"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
        ) : filtered.length === 0 ? (
          <TableRow><TableCell colSpan={4} className="text-center h-32 text-muted-foreground">No warehouses found</TableCell></TableRow>
        ) : filtered.map((w) => (
          <TableRow key={w.id}>
            <TableCell><div className="flex items-center gap-3"><div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/10 to-chart-3/10 flex items-center justify-center"><Warehouse className="h-4 w-4 text-primary" /></div><span className="font-medium">{w.name}</span></div></TableCell>
            <TableCell className="text-sm text-muted-foreground">{w.address ? (<span className="flex items-center gap-1.5"><MapPin className="h-3 w-3" />{w.address}</span>) : "—"}</TableCell>
            <TableCell className="text-sm text-muted-foreground">{formatDate(w.created_at)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => { setEditing(w); setForm({ name: w.name, address: w.address || "" }); setDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => { setDeleting(w); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}</TableBody></Table></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle><DialogDescription>{editing ? "Update details" : "Add a new warehouse location"}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Warehouse name" /></div>
          <div className="space-y-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update" : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete Warehouse</DialogTitle>
        <DialogDescription>Are you sure you want to delete &quot;{deleting?.name}&quot;?</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
