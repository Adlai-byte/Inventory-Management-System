"use client";

import { useEffect, useState, useCallback } from "react";
import { formatCurrency, generateSKU } from "@/lib/utils";
import { getExpiryStatus, formatDaysUntilExpiry } from "@/lib/expiry";
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
import { Package, Plus, Search, MoreHorizontal, Pencil, Trash2, Loader2, AlertTriangle, Download, FileDown, Upload } from "lucide-react";
import type { Product, Category, Supplier } from "@/lib/types";
import { Pagination } from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { UNITS_OF_MEASURE, generateCSV, downloadCSV, getExportFilename } from "@/lib/product-export";

interface ProductsResponse {
  data: Product[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterExpiry, setFilterExpiry] = useState<string>("all");
  const [filterStock, setFilterStock] = useState<string>("all");
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0, page: 1, limit: 25 });
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [exportingAll, setExportingAll] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; updated: number; skipped: number; errors: string[] } | null>(null);

  const [form, setForm] = useState({
    name: "", sku: "", description: "", category_id: "", supplier_id: "",
    cost_price: "", quantity: "", min_stock_level: "10", max_stock_level: "100",
    reorder_point: "15", unit: "pcs" as string, warehouse_id: "1",
    barcode: "", expiry_date: "", manufacture_date: "", lot_number: "", status: "active",
  });

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsRes, categoriesRes, suppliersRes] = await Promise.all([
        fetch(`/api/products?search=${encodeURIComponent(debouncedSearch)}&category=${filterCategory}&status=${filterStatus}&expiry_filter=${filterExpiry}&stock_filter=${filterStock}&page=${currentPage}&limit=25`),
        fetch("/api/categories?limit=1000"),
        fetch("/api/suppliers?limit=1000"),
      ]);
      
      if (productsRes.ok) {
        const productsResult = await productsRes.json() as ProductsResponse;
        setProducts(productsResult.data);
        setPagination(productsResult.pagination);
      }
      if (categoriesRes.ok) {
        const categoriesResult = await categoriesRes.json();
        setCategories(categoriesResult.data || []);
      }
      if (suppliersRes.ok) {
        const suppliersResult = await suppliersRes.json();
        setSuppliers(suppliersResult.data || []);
      }
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  }, [debouncedSearch, filterCategory, filterStatus, filterExpiry, filterStock, currentPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, filterCategory, filterStatus, filterExpiry, filterStock]);

  const resetForm = () => {
    setForm({
      name: "", sku: generateSKU(), description: "", category_id: "", supplier_id: "",
      cost_price: "", quantity: "", min_stock_level: "10", max_stock_level: "100",
      reorder_point: "15", unit: "pcs", warehouse_id: "1",
      barcode: "", expiry_date: "", manufacture_date: "", lot_number: "", status: "active",
    });
    setEditingProduct(null);
  };

  const openCreateDialog = () => { resetForm(); setDialogOpen(true); };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name, sku: product.sku, description: product.description || "",
      category_id: product.category_id?.toString() || "", supplier_id: product.supplier_id?.toString() || "",
      cost_price: product.cost_price.toString(),
      quantity: product.quantity.toString(), min_stock_level: product.min_stock_level.toString(),
      max_stock_level: product.max_stock_level.toString(), reorder_point: product.reorder_point.toString(),
      unit: product.unit || "pcs", warehouse_id: product.warehouse_id?.toString() || "1",
      barcode: product.barcode || "", 
      expiry_date: product.expiry_date || "", 
      manufacture_date: product.manufacture_date || "", 
      lot_number: product.lot_number || "",
      status: product.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) { toast.error("Name and SKU are required"); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name, sku: form.sku, description: form.description || null,
        category_id: form.category_id ? parseInt(form.category_id) : null,
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        cost_price: parseFloat(form.cost_price) || 0,
        quantity: parseInt(form.quantity) || 0, min_stock_level: parseInt(form.min_stock_level) || 10,
        max_stock_level: parseInt(form.max_stock_level) || 100,
        reorder_point: parseInt(form.reorder_point) || 15,
        unit: form.unit, warehouse_id: parseInt(form.warehouse_id) || null,
        barcode: form.barcode || null, 
        expiry_date: form.expiry_date || null, 
        manufacture_date: form.manufacture_date || null, 
        lot_number: form.lot_number || null,
        status: form.status,
      };
      
      const url = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast.success(editingProduct ? "Product updated successfully" : "Product created successfully");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error: unknown) { 
      const msg = error instanceof Error ? error.message : "Failed to save";
      toast.error(msg); 
    }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deletingProduct) return;
    const res = await fetch(`/api/products/${deletingProduct.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    toast.success("Product deleted");
    setDeleteDialogOpen(false);
    setDeletingProduct(null);
    fetchData();
  };

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

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(products.map(p => p.id)));
    }
  };

  const toggleSelect = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) { newSet.delete(id); } else { newSet.add(id); }
    setSelectedIds(newSet);
  };

  // =============================================
  // CSV Export — Selected products (all columns)
  // =============================================
  const exportSelectedToCSV = () => {
    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    if (selectedProducts.length === 0) { toast.error("No products selected"); return; }
    const csv = generateCSV(selectedProducts);
    downloadCSV(csv, getExportFilename("products-selected"));
    toast.success(`Exported ${selectedProducts.length} products`);
    setSelectedIds(new Set());
  };

  // =============================================
  // CSV Export — ALL filtered products (all columns)
  // =============================================
  const exportAllFilteredToCSV = async () => {
    setExportingAll(true);
    try {
      const res = await fetch(
        `/api/products?search=${encodeURIComponent(debouncedSearch)}&category=${filterCategory}&status=${filterStatus}&expiry_filter=${filterExpiry}&stock_filter=${filterStock}&page=1&limit=10000`
      );
      if (!res.ok) throw new Error("Failed to fetch products");
      const result = await res.json() as ProductsResponse;
      if (!result.data || result.data.length === 0) { toast.error("No products to export"); return; }
      const csv = generateCSV(result.data);
      downloadCSV(csv, getExportFilename("products-all"));
      toast.success(`Exported ${result.data.length} products`);
    } catch {
      toast.error("Failed to export products");
    } finally {
      setExportingAll(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      const res = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setImportResult(data);
      toast.success(`Imported ${data.imported} new, updated ${data.updated} products`);
      fetchData();
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Failed to import";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  };

  const downloadCSVTemplate = () => {
    const template = "name,sku,barcode,description,category_name,supplier_name,cost_price,quantity,min_stock_level,unit,status\n" +
      "Sample Product,SKU-001,123456789,Description here,Category Name,Supplier Name,100.00,50,10,pcs,active";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product_import_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // =============================================
  // Bulk Delete — with confirmation dialog
  // =============================================
  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    const results = await Promise.allSettled(ids.map(id => fetch(`/api/products/${id}`, { method: "DELETE" })));
    const successCount = results.filter(r => r.status === "fulfilled" && r.value.ok).length;
    toast.success(`Deleted ${successCount} products`);
    setBulkDeleteDialogOpen(false);
    setSelectedIds(new Set());
    fetchData();
  };

  const selectedProductsForDelete = products.filter(p => selectedIds.has(p.id));

  return (
    <div className="space-y-6">
      <PageHeader title="Products" description={`${pagination.total} products in inventory`} icon={Package}>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setImportOpen(true); setImportFile(null); setImportResult(null); }} className="gap-2">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="outline" onClick={exportAllFilteredToCSV} disabled={exportingAll} className="gap-2">
            {exportingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            Export All
          </Button>
          <Button onClick={openCreateDialog} className="gap-2"><Plus className="h-4 w-4" />Add Product</Button>
        </div>
      </PageHeader>

      <Card><CardContent className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search products by name, SKU, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" /></div>
          <Select value={filterCategory} onValueChange={(v: string | null) => setFilterCategory(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (<SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>))}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={(v: string | null) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="discontinued">Discontinued</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStock} onValueChange={(v: string | null) => setFilterStock(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Stock Level" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stock Levels</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
              <SelectItem value="low">Low Stock</SelectItem>
              <SelectItem value="overstocked">Overstocked</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterExpiry} onValueChange={(v: string | null) => setFilterExpiry(v ?? "all")}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue placeholder="Expiry" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="expiring">Expiring Soon</SelectItem>
              <SelectItem value="none">No Expiry</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-0 overflow-x-auto">
        {/* Bulk Selection Toolbar */}
        {selectedIds.size > 0 && (
          <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={exportSelectedToCSV}>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </Button>
              <Button size="sm" variant="destructive" onClick={() => setBulkDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-1" /> Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear</Button>
            </div>
          </div>
        )}
        <Table><TableHeader><TableRow>
        <TableHead className="w-[40px]">
          <Checkbox checked={products.length > 0 && selectedIds.size === products.length} onCheckedChange={toggleSelectAll} />
        </TableHead>
        <TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Category</TableHead>
        <TableHead className="text-right">Cost Price</TableHead><TableHead className="text-right">Qty</TableHead>
        <TableHead>Stock</TableHead><TableHead>Expiry</TableHead><TableHead>Status</TableHead><TableHead className="w-[50px]"></TableHead>
      </TableRow></TableHeader><TableBody>
        {loading ? (
          <TableRow><TableCell colSpan={10} className="text-center h-32"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
        ) : products.length === 0 ? (
          <TableRow><TableCell colSpan={10} className="text-center h-32 text-muted-foreground">No products found</TableCell></TableRow>
        ) : products.map((product: Product) => (
          <TableRow key={product.id} className="cursor-pointer hover:bg-accent/50">
            <TableCell>
              <Checkbox checked={selectedIds.has(product.id)} onCheckedChange={() => toggleSelect(product.id)} />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/10 to-chart-3/10 flex items-center justify-center"><Package className="h-4 w-4 text-primary" /></div>
                <div><p className="font-medium text-sm">{product.name}</p>{(product.supplier?.name || product.supplier_name) && <p className="text-xs text-muted-foreground">{product.supplier?.name || product.supplier_name}</p>}</div>
              </div>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{product.sku}</TableCell>
            <TableCell className="text-sm">{product.category?.name || product.category_name || "—"}</TableCell>
            <TableCell className="text-right text-sm font-medium">{formatCurrency(product.cost_price || 0)}</TableCell>
            <TableCell className="text-right text-sm">{product.quantity}</TableCell>
            <TableCell>{getStockBadge(product)}</TableCell>
            <TableCell>
              {product.expiry_date ? (
                <Badge variant={getExpiryStatus(product.expiry_date) === "expired" ? "destructive" : getExpiryStatus(product.expiry_date) === "critical" ? "outline" : getExpiryStatus(product.expiry_date) === "warning" ? "secondary" : "default"}>
                  {formatDaysUntilExpiry(product.expiry_date)}
                </Badge>
              ) : <span className="text-muted-foreground text-sm">—</span>}
            </TableCell>
            <TableCell>{getStatusBadge(product.status)}</TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-10 w-10 sm:h-8 sm:w-8 inline-flex items-center justify-center rounded-md hover:bg-accent"><MoreHorizontal className="h-5 w-5 sm:h-4 sm:w-4" /></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(product)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => { setDeletingProduct(product); setDeleteDialogOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}</TableBody></Table></CardContent></Card>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center py-4">
          <Pagination
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* ============================================= */}
      {/* Create / Edit Product Dialog                  */}
      {/* ============================================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-2xl sm:max-w-lg w-[90vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editingProduct ? "Edit Product" : "Add New Product"}</DialogTitle><DialogDescription>{editingProduct ? "Update product details" : "Fill in the product details"}</DialogDescription></DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Row 1: Name + SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label htmlFor="name">Product Name *</Label><Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Enter product name" className="w-full h-11" /></div>
            <div className="space-y-2"><Label htmlFor="sku">SKU *</Label><Input id="sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Auto-generated" className="font-mono w-full h-11" /></div>
          </div>
          {/* Row 2: Description */}
          <div className="space-y-2"><Label htmlFor="description">Description</Label><Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Product description..." rows={2} className="resize-none w-full" /></div>
          {/* Row 3: Category + Supplier */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Category</Label><Select value={form.category_id || ""} onValueChange={(v: string | null) => setForm({ ...form, category_id: v ?? "" })}><SelectTrigger className="w-full h-11"><SelectValue placeholder="Select category" /></SelectTrigger><SelectContent>{categories.map((cat) => (<SelectItem key={cat.id} value={cat.id.toString()}>{cat.name}</SelectItem>))}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Supplier</Label><Select value={form.supplier_id || ""} onValueChange={(v: string | null) => setForm({ ...form, supplier_id: v ?? "" })}><SelectTrigger className="w-full h-11"><SelectValue placeholder="Select supplier" /></SelectTrigger><SelectContent>{suppliers.map((s) => (<SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>))}</SelectContent></Select></div>
          </div>
          {/* Row 4: Cost Price + Quantity + Unit */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Cost Price</Label><Input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} placeholder="0.00" className="w-full h-11" /></div>
            <div className="space-y-2"><Label>Initial Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} placeholder="0" className="w-full h-11" /></div>
            <div className="space-y-2"><Label>Unit</Label><Select value={form.unit || ""} onValueChange={(v: string | null) => setForm({ ...form, unit: v ?? "pcs" })}><SelectTrigger className="w-full h-11"><SelectValue placeholder="Select unit" /></SelectTrigger><SelectContent>{UNITS_OF_MEASURE.map((u) => (<SelectItem key={u} value={u}>{u}</SelectItem>))}</SelectContent></Select></div>
          </div>
          {/* Row 5: Min Stock + Max Stock + Reorder Point */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Min Stock Level</Label><Input type="number" value={form.min_stock_level} onChange={(e) => setForm({ ...form, min_stock_level: e.target.value })} placeholder="10" className="w-full h-11" /></div>
            <div className="space-y-2"><Label>Max Stock Level</Label><Input type="number" value={form.max_stock_level} onChange={(e) => setForm({ ...form, max_stock_level: e.target.value })} placeholder="100" className="w-full h-11" /></div>
            <div className="space-y-2"><Label>Reorder Point</Label><Input type="number" value={form.reorder_point} onChange={(e) => setForm({ ...form, reorder_point: e.target.value })} placeholder="15" className="w-full h-11" /></div>
          </div>
          {/* Row 6: Barcode + Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2"><Label>Barcode</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} placeholder="Scan or enter barcode" className="w-full h-11" /></div>
            <div className="space-y-2"><Label>Status</Label><Select value={form.status || ""} onValueChange={(v: string | null) => setForm({ ...form, status: v ?? "active" })}><SelectTrigger className="w-full h-11"><SelectValue placeholder="Select status" /></SelectTrigger><SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem><SelectItem value="discontinued">Discontinued</SelectItem></SelectContent></Select></div>
          </div>
          {/* Row 7: Expiry + Manufacture Date + Lot Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2"><Label>Expiry Date</Label><Input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} className="w-full h-11" /></div>
            <div className="space-y-2"><Label>Manufacture Date</Label><Input type="date" value={form.manufacture_date} onChange={(e) => setForm({ ...form, manufacture_date: e.target.value })} className="w-full h-11" /></div>
            <div className="space-y-2"><Label>Lot Number</Label><Input value={form.lot_number} onChange={(e) => setForm({ ...form, lot_number: e.target.value })} placeholder="Batch/Lot number" className="w-full h-11" /></div>
          </div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11">Cancel</Button><Button onClick={handleSave} disabled={saving} className="h-11">{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingProduct ? "Update Product" : "Create Product"}</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* ============================================= */}
      {/* Single Delete Confirmation                    */}
      {/* ============================================= */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete Product</DialogTitle>
        <DialogDescription>Are you sure you want to delete &quot;{deletingProduct?.name}&quot;? This cannot be undone.</DialogDescription></DialogHeader>
        <DialogFooter><Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleDelete}>Delete</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* ============================================= */}
      {/* Bulk Delete Confirmation with Product Names   */}
      {/* ============================================= */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}><DialogContent>
        <DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-destructive" />Delete {selectedIds.size} Products</DialogTitle>
        <DialogDescription>This action cannot be undone. The following products will be permanently deleted:</DialogDescription></DialogHeader>
        <div className="max-h-[200px] overflow-y-auto border rounded-md p-2 space-y-1">
          {selectedProductsForDelete.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted text-sm">
              <span className="font-medium">{p.name}</span>
              <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
            </div>
          ))}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleBulkDelete}><Trash2 className="mr-2 h-4 w-4" />Delete All {selectedIds.size}</Button></DialogFooter>
      </DialogContent></Dialog>

      {/* CSV Import Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Import Products from CSV</DialogTitle>
            <DialogDescription>Upload a CSV file to bulk import or update products. Products are matched by SKU.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => { setImportFile(e.target.files?.[0] ?? null); setImportResult(null); }}
                className="text-sm"
              />
              {importFile && (
                <p className="text-sm text-muted-foreground mt-2">{importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)</p>
              )}
            </div>
            <button
              onClick={downloadCSVTemplate}
              className="text-sm text-primary hover:underline"
            >
              Download CSV template
            </button>
            {importResult && (
              <div className="bg-muted rounded-lg p-4 space-y-2 text-sm">
                <p className="font-medium">Import Results:</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-emerald-500">{importResult.imported}</p>
                    <p className="text-xs text-muted-foreground">New</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-500">{importResult.updated}</p>
                    <p className="text-xs text-muted-foreground">Updated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-amber-500">{importResult.skipped}</p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-destructive cursor-pointer">{importResult.errors.length} errors</summary>
                    <ul className="text-xs text-destructive mt-1 space-y-0.5 max-h-24 overflow-y-auto">
                      {importResult.errors.slice(0, 20).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Close</Button>
            <Button onClick={handleImportCSV} disabled={!importFile || importing}>
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
