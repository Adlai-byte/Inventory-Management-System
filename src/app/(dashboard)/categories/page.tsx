"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Pagination } from "@/components/ui/pagination";
import { toast } from "sonner";
import { Tags, Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, AlertTriangle, Download } from "lucide-react";
import type { Category } from "@/lib/types";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination & Filtering state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, limit: 10 });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const exportToCSV = () => {
    const headers = ["Name", "Description", "Created"];
    const rows = categories.map(c => [c.name, c.description || "", c.created_at]);
    const csvContent = [headers.join(","), ...rows.map(r => r.map(v => `"${v}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `categories-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Categories exported");
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

      const res = await fetch(`/api/categories?${queryParams}`);
      if (res.ok) {
        const result = await res.json();
        setCategories(result.data);
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
      const url = editing ? `/api/categories/${editing.id}` : "/api/categories";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(editing ? "Category updated" : "Category created");
      setDialogOpen(false); setForm({ name: "", description: "" }); setEditing(null); fetchData();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save category";
      toast.error(errorMessage);
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    const res = await fetch(`/api/categories/${deleting.id}`, { method: "DELETE" });
    if (!res.ok) { const data = await res.json(); toast.error(data.error); return; }
    toast.success("Category deleted"); setDeleteDialogOpen(false); setDeleting(null); fetchData();
  };

  if (!hasMounted) return null;

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Categories" 
        description={`${pagination.total} total categories`} 
        helpText="Organize your products into logical groups like 'Dairy', 'Canned Goods', or 'Household'. Categorization helps with reporting, filtering, and organizing your warehouse layout. You can add, edit, or remove categories as your inventory expands."
        icon={Tags}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} className="gap-2"><Download className="h-4 w-4" />Export</Button>
          <Button onClick={() => { setEditing(null); setForm({ name: "", description: "" }); setDialogOpen(true); }} className="gap-2 h-11 text-base px-6"><Plus className="h-5 w-5" /> Add Category</Button>
        </div>
      </PageHeader>

      <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search categories..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 max-w-sm h-11" /></div></CardContent></Card>

      <div className="space-y-4">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-48"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : categories.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center h-48 text-muted-foreground">No categories found</TableCell></TableRow>
                ) : categories.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell className="font-medium">{cat.name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{cat.description || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(cat.created_at)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="h-10 w-10 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"><MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" /></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditing(cat); setForm({ name: cat.name, description: cat.description || "" }); setDialogOpen(true); }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => { setDeleting(cat); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-sm w-[90vw]">
        <DialogHeader><DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle><DialogDescription>{editing ? "Update category details" : "Create a new category"}</DialogDescription></DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2"><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Category name" className="w-full h-11" /></div>
          <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={3} className="resize-none w-full" /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11 px-6">Cancel</Button><Button onClick={handleSave} disabled={saving} className="h-11 px-6">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editing ? "Update" : "Create"}</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete Category</DialogTitle>
        <DialogDescription>Are you sure you want to delete &quot;{deleting?.name}&quot;?</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11 px-6">Cancel</Button><Button variant="destructive" onClick={handleDelete} className="h-11 px-6">Delete</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
