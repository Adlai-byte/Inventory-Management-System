"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import { Users, Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, AlertTriangle, Mail, Phone, MapPin, Download } from "lucide-react";
import type { Supplier } from "@/lib/types";

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 50 });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "" });

  const exportToCSV = () => {
    const headers = ["Name", "Email", "Phone", "Address"];
    const rows = suppliers.map(s => [s.name, s.email || "", s.phone || "", s.address || ""]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `suppliers-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Suppliers exported");
  };

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
        limit: pagination.limit.toString(),
        search: debouncedSearch,
      });

      const res = await fetch(`/api/suppliers?${queryParams}`);
      if (res.ok) {
        const result = await res.json();
        setSuppliers(result.data);
        setPagination(result.pagination);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, pagination.limit]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const url = editing ? `/api/suppliers/${editing.id}` : "/api/suppliers";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "Supplier updated" : "Supplier created");
      setDialogOpen(false); setForm({ name: "", email: "", phone: "", address: "" }); setEditing(null); fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save supplier";
      toast.error(errorMessage);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/suppliers/${deleting.id}`, { method: "DELETE" });
    if (!res.ok) { const data = await res.json(); toast.error(data.error); return; }
    toast.success("Supplier deleted"); setDeleteDialogOpen(false); setDeleting(null); fetchData();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Suppliers" description={`${pagination.total} suppliers`} icon={Users}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <Button onClick={() => { setEditing(null); setForm({ name: "", email: "", phone: "", address: "" }); setDialogOpen(true); }} className="gap-2 h-11 text-base px-6"><Plus className="h-5 w-5" /> Add Supplier</Button>
        </div>
      </PageHeader>

      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search suppliers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm h-11" /></div></CardContent></Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-48"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-48 text-muted-foreground">No suppliers found</TableCell></TableRow>
                ) : suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><div className="font-medium">{s.name}</div></TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {s.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3 w-3" />{s.email}</div>}
                        {s.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="h-3 w-3" />{s.phone}</div>}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate text-sm text-muted-foreground">
                      {s.address ? <div className="flex items-center gap-2"><MapPin className="h-3 w-3 shrink-0" />{s.address}</div> : "—"}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-10 w-10 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"><MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(s); setForm({ name: s.name, email: s.email || "", phone: s.phone || "", address: s.address || "" }); setDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => { setDeleting(s); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-lg sm:max-w-md w-[90vw]">
        <DialogHeader><DialogTitle>{editing ? "Edit Supplier" : "Add Supplier"}</DialogTitle><DialogDescription>{editing ? "Update supplier details" : "Create a new supplier profile"}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Supplier name" className="w-full h-11" /></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" className="w-full h-11" /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone number" className="w-full h-11" /></div>
          </div>
          <div className="space-y-2"><Label>Address</Label><Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Full address" rows={2} className="resize-none w-full" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11 px-6">Cancel</Button><Button onClick={handleSave} disabled={saving} className="h-11 px-6">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update" : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete Supplier</DialogTitle>
        <DialogDescription>Are you sure you want to delete &quot;{deleting?.name}&quot;?</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="h-11 px-6">Cancel</Button><Button variant="destructive" onClick={handleDelete} className="h-11 px-6">Delete</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
