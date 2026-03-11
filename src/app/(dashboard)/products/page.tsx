"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDate, generateSKU } from "@/lib/utils";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Package, Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, AlertTriangle } from "lucide-react";
import type { Product, Category, Supplier, Warehouse } from "@/lib/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "", sku: "", description: "", category_id: "", supplier_id: "",
    unit_price: "", cost_price: "", quantity: "", min_stock_level: "10",
    warehouse_id: "", barcode: "", status: "active",
  });

  const supabase = createClient();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, suppliersRes, warehousesRes] = await Promise.all([
        supabase.from("products").select("*, category:categories(*), supplier:suppliers(*), warehouse:warehouses(*)").order("created_at", { ascending: false }),
        supabase.from("categories").select("*").order("name"),
        supabase.from("suppliers").select("*").order("name"),
        supabase.from("warehouses").select("*").order("name"),
      ]);
      if (productsRes.data) setProducts(productsRes.data as unknown as Product[]);
      if (categoriesRes.data) setCategories(categoriesRes.data as Category[]);
      if (suppliersRes.data) setSuppliers(suppliersRes.data as Supplier[]);
      if (warehousesRes.data) setWarehouses(warehousesRes.data as Warehouse[]);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const resetForm = () => {
    setForm({ name: "", sku: generateSKU(), description: "", category_id: "", supplier_id: "", unit_price: "", cost_price: "", quantity: "", min_stock_level: "10", warehouse_id: "", barcode: "", status: "active" });
    setEditingProduct(null);
  };

  const openCreateDialog = () => { resetForm(); setDialogOpen(true); };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name, sku: product.sku, description: product.description || "",
      category_id: product.category_id || "", supplier_id: product.supplier_id || "",
      unit_price: product.unit_price.toString(), cost_price: product.cost_price.toString(),
      quantity: product.quantity.toString(), min_stock_level: product.min_stock_level.toString(),
      warehouse_id: product.warehouse_id || "", barcode: product.barcode || "", status: product.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) { toast.error("Name and SKU are required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, sku: form.sku, description: form.description || null,
        category_id: form.category_id || null, supplier_id: form.supplier_id || null,
        unit_price: parseFloat(form.unit_price) || 0, cost_price: parseFloat(form.cost_price) || 0,
        quantity: parseInt(form.quantity) || 0, min_stock_level: parseInt(form.min_stock_level) || 10,
        warehouse_id: form.warehouse_id || null, barcode: form.barcode || null, status: form.status,
      };
      if (editingProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editingProduct.id);
        if (error) throw error;
        toast.success("Product updated successfully");
      } else {
        const { error } = await supabase.from("products").insert(payload);
        if (error) throw error;
        toast.success("Product created successfully");
      }
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: any) { toast.error(error.message || "Failed to save"); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const { error } = await supabase.from("products").delete().eq("id", deletingProduct.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Product deleted");
    setDeleteDialogOpen(false);
    setDeletingProduct(null);
    fetchData();
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filterCategory === "all" || p.category_id === filterCategory;
    const matchStatus = filterStatus === "all" || p.status === filterStatus;
    return matchSearch && matchCategory && matchStatus;
  });

  const getStockBadge = (product: Product) => {
    if (product.quantity === 0) return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
    if (product.quantity <= product.min_stock_level) return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px]">Low Stock</Badge>;
    return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">In Stock</Badge>;
  };

  const getStatusBadge = (status: string) => {
    if (status === "active") return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Active</Badge>;
    if (status === "inactive") return <Badge variant="secondary" className="text-[10px]">Inactive</Badge>;
    if (status === "discontinued") return <Badge variant="destructive" className="text-[10px]">Discontinued</Badge>;
    return null;
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description={`${products.length} products in inventory`} icon={Package}>
        <Button onClick={openCreateDialog} className="gap-2"><Plus className="h-4 w-4" />Add Product</Button>
      </PageHeader>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products by name, SKU, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0"><Table><TableHeader><TableRow>
        <TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead>
        <TableHead className="text-right">Price</TableHead><TableHead className="text-right">Qty</TableHead>
        <TableHead>Stock</TableHead><TableHead>Status</TableHead><TableHead className="w-[50px]"></TableHead>
      </TableRow></TableHeader><TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={8} className="text-center h-32"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
        ) : filteredProducts.length === 0 ? (
          <TableRow><TableCell colSpan={8} className="text-center h-32 text-muted-foreground">No products found</TableCell></TableRow>
        ) : filteredProducts.map((product) => (
          <TableRow key={product.id} className="cursor-pointer hover:bg-accent/50">
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/10 to-chart-3/10 flex items-center justify-center"><Package className="h-4 w-4 text-primary" /></div>
                <div><p className="font-medium text-sm">{product.name}</p>{product.supplier?.name && <p className="text-xs text-muted-foreground">{product.supplier.name}</p>}</div>
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
            <TableCell className="text-sm">{product.category?.name || "—"}</TableCell>
            <TableCell className="text-right text-sm font-medium">{formatCurrency(product.unit_price)}</TableCell>
            <TableCell className="text-right text-sm">{product.quantity}</TableCell>
            <TableCell>{getStockBadge(product)}</TableCell>
            <TableCell>{getStatusBadge(product.status)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"><MoreHorizontal className="h-4 w-4" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(product)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => { setDeletingProduct(product); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}</TableBody></Table></CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle><DialogDescription>{editingProduct ? "Update product details" : "Fill in the product details"}</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="name">Product Name *</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter product name" /></div>
            <div className="space-y-2"><Label htmlFor="sku">SKU *</Label><Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated" className="font-mono" /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Category</Label><Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v ?? "" })}><SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((cat) => (<SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Supplier</Label><Select value={form.supplier_id} onValueChange={(v) => setForm({ ...form, supplier_id: v ?? "" })}><SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{suppliers.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Unit Price</Label><Input type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} placeholder="0.00" /></div>
            <div className="space-y-2"><Label>Cost Price</Label><Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0.00" /></div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Initial Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" /></div>
            <div className="space-y-2"><Label>Min Stock Level</Label><Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })} placeholder="10" /></div>
            <div className="space-y-2"><Label>Warehouse</Label><Select value={form.warehouse_id} onValueChange={(v) => setForm({ ...form, warehouse_id: v ?? "" })}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{warehouses.map((w) => (<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>))}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Barcode</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or enter barcode" /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "active" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="discontinued">Discontinued</SelectItem></SelectContent></Select></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingProduct ? "Update Product" : "Create Product"}</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete Product</DialogTitle>
        <DialogDescription>Are you sure you want to delete &quot;{deletingProduct?.name}&quot;? This cannot be undone.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter>
      </DialogContent></Dialog>
    </div>
  );
}
