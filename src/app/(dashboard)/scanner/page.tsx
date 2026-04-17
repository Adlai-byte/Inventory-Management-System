"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { 
  Scan, 
  Package, 
  X,
  Camera,
  CameraOff,
  Loader2, 
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  Keyboard,
  RefreshCw,
  AlertTriangle,
  Trash2,
  ArrowRightLeft,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, cn } from "@/lib/utils";
import type { Product, MovementType } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

interface CartItem extends Product {
  scanQty: number;
}

// Movement types for the scanner
const MOVEMENT_OPTIONS: { value: MovementType | "stock_take"; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "transfer_out", label: "Dispatch", icon: <ArrowRightLeft className="h-5 w-5" />, description: "Dispatch/transfer outgoing items" },
  { value: "restock", label: "Restock", icon: <Package className="h-5 w-5" />, description: "Add items to inventory" },
  { value: "damage", label: "Damage", icon: <AlertTriangle className="h-5 w-5" />, description: "Record damaged items" },
  { value: "expired", label: "Expired", icon: <AlertTriangle className="h-5 w-5" />, description: "Record expired items" },
  { value: "loss", label: "Loss", icon: <Trash2 className="h-5 w-5" />, description: "Record lost/stolen items" },
  { value: "adjustment", label: "Adjustment", icon: <RefreshCw className="h-5 w-5" />, description: "Correct stock count" },
  { value: "stock_take", label: "Stock Take", icon: <ClipboardCheck className="h-5 w-5" />, description: "Physical count — scan and verify actual quantities" },
];

// Types that increase stock
const INBOUND_TYPES: MovementType[] = ["restock", "transfer_in", "initial"];
// Types that decrease stock
const OUTBOUND_TYPES: MovementType[] = ["transfer_out", "damage", "expired", "loss", "sample", "return_out"];

export default function ScannerPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [movementType, setMovementType] = useState<MovementType | "stock_take">("transfer_out");
  const [movementReason, setMovementReason] = useState("");
  const [recording, setRecording] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inputMode, setInputMode] = useState<"keyboard" | "camera">("camera");
  const [clearCartOpen, setClearCartOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  const scannerInstanceRef = useRef<{ stop: () => Promise<void> } | null>(null);
  const isStoppingRef = useRef(false);
  const prevInputModeRef = useRef<"keyboard" | "camera">("camera");

  const currentMovement = MOVEMENT_OPTIONS.find(m => m.value === movementType)!;
  const isInbound = INBOUND_TYPES.includes(movementType as MovementType);
  const isStockTake = movementType === "stock_take";
  const varianceTotal = cart.reduce((sum, item) => sum + (item.scanQty - item.quantity), 0);

  useEffect(() => {
    const focusTimer = setInterval(() => {
      if (inputMode === "keyboard" && document.activeElement?.tagName !== "INPUT") {
        inputRef.current?.focus();
      }
    }, 1000);
    return () => clearInterval(focusTimer);
  }, [inputMode]);

  const addToCart = useCallback((product: Product) => {
    setLastScanned(product);

    // Block outbound dispatch of out-of-stock items (not for stock take — you're counting what's there)
    if (!INBOUND_TYPES.includes(movementType as MovementType) && !isStockTake && movementType !== "adjustment" && product.quantity <= 0) {
      toast.error(`${product.name} is out of stock (0 units)`);
      return;
    }
    
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // Block exceeding available stock for outbound
        if (!INBOUND_TYPES.includes(movementType as MovementType) && movementType !== "adjustment" && existing.scanQty >= product.quantity) {
          toast.error(`Only ${product.quantity} units available for ${product.name}`);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, scanQty: item.scanQty + 1 } : item
        );
      }
      return [...prev, { 
        ...product, 
        scanQty: isStockTake ? product.quantity : (movementType === "adjustment" ? Math.max(product.quantity, 0) : 1) 
      }];
    });
    
    toast.success(`Added ${product.name} to batch`);
  }, [movementType, isStockTake]);

  const handleScanResult = useCallback(async (barcode: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/scanner/lookup?q=${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const { data } = await res.json();
        addToCart(data);
      } else {
        toast.error("Product not found");
      }
    } catch {
      toast.error("Scan error");
    } finally {
      setLoading(false);
      if (inputMode === "camera") {
        setQuery("");
      }
    }
  }, [addToCart, inputMode]);

  const startCamera = useCallback(async () => {
    if (!scannerRef.current) return;
    
    setCameraLoading(true);
    setCameraError(null);
    
    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      
      const scannerElement = document.getElementById("scanner-viewport");
      if (!scannerElement) {
        throw new Error("Scanner element not found");
      }
      
      const scanner = new Html5Qrcode("scanner-viewport");
      scannerInstanceRef.current = scanner;
      
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length) {
        const backCamera = devices.find(d => d.label.toLowerCase().includes("back")) || devices[0];
        
        await scanner.start(
          { deviceId: { exact: backCamera.id } },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.777778,
          },
          async (decodedText) => {
            setQuery(decodedText);
            await handleScanResult(decodedText);
          },
          () => {}
        );
      } else {
        throw new Error("No cameras found on this device");
      }
      
      setCameraLoading(false);
    } catch (err) {
      setCameraLoading(false);
      let errorMessage = err instanceof Error ? err.message : "Failed to start camera";
      
      if (errorMessage.includes("Permission") || errorMessage.includes("NotAllowed")) {
        errorMessage = "Camera permission denied. Please allow camera access in browser settings.";
      } else if (errorMessage.includes("NotFoundError") || errorMessage.includes("not found")) {
        errorMessage = "No camera found on this device.";
      } else if (errorMessage.includes("over HTTPS") || errorMessage.includes("secure")) {
        errorMessage = "Camera requires HTTPS. Access via secure URL or use Manual entry.";
      }
      
      setCameraError(errorMessage);
      toast.error("Camera error: " + errorMessage);
    }
  }, [handleScanResult]);

  const stopCamera = useCallback(async () => {
    if (scannerInstanceRef.current && !isStoppingRef.current) {
      isStoppingRef.current = true;
      try {
        await scannerInstanceRef.current.stop();
      } catch {
      }
      scannerInstanceRef.current = null;
      isStoppingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (inputMode === "camera" && prevInputModeRef.current !== "camera") {
      setShowCamera(true);
    } else if (inputMode === "keyboard") {
      stopCamera();
      setShowCamera(false);
    }
    prevInputModeRef.current = inputMode;
  }, [inputMode, startCamera, stopCamera]);

  useEffect(() => {
    if (showCamera && scannerInstanceRef.current === null) {
      startCamera();
    } else if (!showCamera) {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [showCamera, startCamera, stopCamera]);

  const handleScan = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query) return;
    await handleScanResult(query);
    setQuery("");
    inputRef.current?.focus();
  };

  const updateQuantity = (itemId: number, delta: number) => {
    setCart(prev => {
      const item = prev.find(i => i.id === itemId);
      if (!item) return prev;
      
      const newQty = item.scanQty + delta;
      if (movementType !== "adjustment" && newQty <= 0) {
        return prev.filter(i => i.id !== itemId);
      }
      if (movementType === "adjustment" && newQty < 0) {
        return prev;
      }
      return prev.map(i => i.id === itemId ? { ...i, scanQty: newQty } : i);
    });
  };

  const setItemQuantity = (itemId: number, value: string) => {
    const parsed = Number.parseInt(value, 10);
    setCart(prev =>
      prev.map(item =>
        item.id === itemId
          ? {
              ...item,
              scanQty:
                Number.isFinite(parsed) && parsed >= (movementType === "adjustment" ? 0 : 1)
                  ? parsed
                  : movementType === "adjustment"
                    ? 0
                    : 1,
            }
          : item
      )
    );
  };

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setClearCartOpen(true);
  };

  const confirmClearCart = () => {
    setCart([]);
    setLastScanned(null);
    toast.info("Batch cleared");
    setClearCartOpen(false);
  };

  const applyMovement = async () => {
    if (cart.length === 0) {
      toast.error("Batch is empty");
      return;
    }

    // Require reason for stock reductions
    if (OUTBOUND_TYPES.includes(movementType as MovementType) && !movementReason.trim()) {
      toast.error("Please provide a reason for this stock reduction");
      return;
    }

    // Validate stock availability for outbound movements (not for stock take or adjustment)
    if (!INBOUND_TYPES.includes(movementType as MovementType) && !isStockTake && movementType !== "adjustment") {
      const overscan = cart.filter(item => item.scanQty > item.quantity);
      if (overscan.length > 0) {
        const names = overscan.map(i => `${i.name} (${i.quantity} avail, ${i.scanQty} scanned)`).join(", ");
        toast.error(`Insufficient stock: ${names}`);
        return;
      }
    }

    setRecording(true);

    try {
      if (isStockTake) {
        // Stock Take flow (scanner-mode): create session with ONLY scanned items → complete
        // This avoids the data-loss bug where auto-populating all products then completing
        // would zero out all unscanned products.
        const createRes = await fetch("/api/stock-takes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: `Stock Take ${new Date().toISOString().split("T")[0]}`,
            notes: movementReason || null,
            // Pass scanned items directly so only these are inserted in the session
            items: cart.map((item) => ({
              product_id: item.id,
              counted_quantity: item.scanQty,
            })),
          }),
        });
        const createData = await createRes.json();
        if (!createRes.ok) throw new Error(createData.error);
        const sessionId = createData.id;

        // Complete stock take — auto-generates adjustment movements for any variances
        const completeRes = await fetch(`/api/stock-takes/${sessionId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "complete" }),
        });
        const completeData = await completeRes.json();
        if (!completeRes.ok) throw new Error(completeData.error);

        toast.success(completeData.message);
      } else {
        // Normal movement flow
        const res = await fetch("/api/stock-movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: movementType,
            reason: movementReason || null,
            notes: `Recorded via scanner - ${currentMovement.label}`,
            items: cart.map((item) => ({
              product_id: item.id,
              quantity: item.scanQty,
            })),
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to record movement");
        }

        toast.success(`${currentMovement.label} recorded for ${cart.length} product(s)`);
      }

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setCart([]);
      setLastScanned(null);
      setMovementReason("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to record";
      toast.error(msg);
    } finally {
      setRecording(false);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.scanQty, 0);
  const totalCostOfGoods = cart.reduce((sum, item) => sum + (item.scanQty * (item.cost_price || 0)), 0);

  if (showSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-in zoom-in-50">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">{isStockTake ? "Stock Take Complete" : "Movement Recorded"}</h2>
        <p className="text-muted-foreground">{isStockTake ? "Inventory has been adjusted to match counted quantities" : "Inventory has been updated"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scanner"
        description="Scan barcodes for inventory movements"
        icon={Scan}
      />

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Movement Type Selection */}
          <div className="space-y-3">
            <label className="text-base font-semibold">Movement Type</label>
            <Select value={movementType} onValueChange={(v: string | null) => { setMovementType(v as MovementType | "stock_take"); setCart([]); }}>
              <SelectTrigger 
                className={cn(
                  "w-full !h-16 text-lg font-medium border-2 transition-all mt-1",
                  isInbound ? "border-emerald-500 hover:border-emerald-500/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" :
                  movementType === "adjustment" ? "border-blue-500 hover:border-blue-500/80 bg-blue-500/10 text-blue-700 dark:text-blue-400" :
                  "border-amber-500 hover:border-amber-500/80 bg-amber-500/10 text-amber-700 dark:text-amber-400"
                )}
              >
                {currentMovement && <div className="opacity-90 ml-1">{currentMovement.icon}</div>}
                <span className="flex-1 text-left select-none">{currentMovement ? currentMovement.label : "Select movement type"}</span>
              </SelectTrigger>
              <SelectContent>
                {MOVEMENT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-base py-3">
                    <div className="flex items-center gap-3">
                      <div className="opacity-70">{option.icon}</div>
                      <span className="font-semibold">{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">{currentMovement.description}</p>
          </div>

          {/* Input Mode Toggle */}
          <div className="flex gap-3">
            <Button
              variant={inputMode === "keyboard" ? "default" : "outline"}
              onClick={() => { setInputMode("keyboard"); }}
              className="flex-1 gap-2 h-12"
            >
              <Keyboard className="h-5 w-5" />
              Manual
            </Button>
            <Button
              variant={inputMode === "camera" ? "default" : "outline"}
              onClick={() => { setInputMode("camera"); }}
              className="flex-1 gap-2 h-12"
            >
              <Camera className="h-5 w-5" />
              Camera
            </Button>
          </div>

          {inputMode === "keyboard" ? (
            <form onSubmit={handleScan} className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
              </div>
              <Input
                ref={inputRef}
                className="pl-10 h-12"
                placeholder="Type Barcode or SKU..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button 
                type="submit" 
                size="sm" 
                className="absolute right-2 top-1/2 -translate-y-1/2 h-8"
                disabled={loading}
              >
                Search
              </Button>
            </form>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <div id="scanner-viewport" ref={scannerRef} className="w-full h-full" />
                {cameraLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                    <Loader2 className="h-8 w-8 animate-spin mb-2" />
                    <p className="text-sm">Starting camera...</p>
                  </div>
                )}
                {cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
                    <CameraOff className="h-8 w-8 mb-2" />
                    <p className="text-sm text-center px-4">{cameraError}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-3 bg-white text-black hover:bg-gray-200"
                      onClick={startCamera}
                    >
                      Retry
                    </Button>
                  </div>
                )}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-40 border-2 border-white/50 rounded-lg" />
                </div>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Point camera at barcode
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {lastScanned ? (
            <Card className="border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Last Scanned</CardTitle>
                  <Badge variant="outline">Just Now</Badge>
                </div>
                <CardDescription className="font-mono text-xs">
                  {lastScanned.sku || lastScanned.barcode || "No barcode"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <h4 className="text-xl font-bold mb-3">{lastScanned.name}</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-accent">
                    <div className="text-xs text-muted-foreground mb-1">CURRENT STOCK</div>
                    <div className="text-lg font-bold">{lastScanned.quantity}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-accent">
                    <div className="text-xs text-muted-foreground mb-1">UNIT COST</div>
                    <div className="text-lg font-bold">{formatCurrency(lastScanned.cost_price || 0)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Scan className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Ready to Scan</p>
                <p className="text-xs mt-1">Scan items to build the batch</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {currentMovement.icon}
                <span>
                  {isInbound 
                    ? "Scan items to add to inventory. Each item increases stock."
                    : movementType === "adjustment"
                      ? "Scan items and set the correct count. Previous stock will be replaced."
                      : isStockTake
                      ? "Scan items and enter the actual counted quantity. Stock will be adjusted to match the physical count."
                      : "Scan items to record as " + currentMovement.label.toLowerCase() + ". Stock will be reduced."}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {currentMovement.icon}
                Batch
                {totalItems > 0 && (
                  <Badge variant="secondary">{totalItems} unit(s)</Badge>
                )}
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-muted-foreground">
                  Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Batch is empty</p>
                <p className="text-xs mt-1">Scan items to add them here</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="max-h-72 overflow-y-auto space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className={cn("flex items-center gap-3 p-3 rounded-lg", (!INBOUND_TYPES.includes(movementType as MovementType) && movementType !== "adjustment" && item.scanQty > item.quantity) ? "bg-destructive/10 border border-destructive/30" : "bg-accent/50")}>
                      {item.quantity === 0 && !INBOUND_TYPES.includes(movementType as MovementType) && movementType !== "adjustment" && (
                        <div className="h-8 w-8 rounded-full bg-destructive/20 flex items-center justify-center shrink-0">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{item.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {isStockTake ? `System: ${item.quantity} · Counted:` : `Stock: ${item.quantity} · Cost:`} {formatCurrency(item.cost_price || 0)} × {item.scanQty} = <span className="font-medium text-foreground">{formatCurrency(item.scanQty * (item.cost_price || 0))}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 sm:h-8 sm:w-8 shrink-0"
                          onClick={() => updateQuantity(item.id, -1)}
                        >
                          <Minus className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                        <span className="w-8 flex-shrink-0 text-center font-semibold text-sm">
                          {item.scanQty}
                        </span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-9 w-9 sm:h-8 sm:w-8 shrink-0"
                          onClick={() => updateQuantity(item.id, 1)}
                        >
                          <Plus className="h-4 w-4 sm:h-3 sm:w-3" />
                        </Button>
                      </div>
                      <Input
                        type="number"
                        min={movementType === "adjustment" ? "0" : "1"}
                        value={item.scanQty}
                        onChange={(e) => setItemQuantity(item.id, e.target.value)}
                        className="h-10 w-24 sm:h-8 sm:w-20 text-right shrink-0"
                      />
                      <div className="text-right min-w-[80px]">
                        <div className="font-semibold text-sm">
                          {movementType === "adjustment"
                            ? `${item.quantity} → ${item.scanQty}`
                            : isStockTake
                            ? `${item.scanQty} counted (variance: ${item.scanQty - item.quantity >= 0 ? "+" : ""}${item.scanQty - item.quantity})`
                            : `${item.scanQty} units`}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reason field for reductions */}
                {OUTBOUND_TYPES.includes(movementType as MovementType) && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Reason (Required)</label>
                    <Input
                      placeholder={`Why are these items being recorded as ${currentMovement.label.toLowerCase()}?`}
                      value={movementReason}
                      onChange={(e) => setMovementReason(e.target.value)}
                    />
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Products in Batch</span>
                    <span className="font-medium">{cart.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{isStockTake ? "Total Counted" : "Total Units"}</span>
                    <span className="font-medium">{totalItems}</span>
                  </div>
                  {isStockTake && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">System Total</span>
                      <span className="font-medium">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
                    </div>
                  )}
                  {isStockTake && varianceTotal !== 0 && (
                    <div className={cn("flex items-center justify-between p-3 rounded-lg border", varianceTotal < 0 ? "bg-destructive/5 border-destructive/10" : "bg-emerald-500/5 border-emerald-500/10")}>
                      <div>
                        <span className={cn("font-semibold text-sm", varianceTotal < 0 ? "text-destructive" : "text-emerald-600")}>Variance</span>
                        <p className="text-xs text-muted-foreground">counted vs system</p>
                      </div>
                      <span className={cn("text-xl font-bold", varianceTotal < 0 ? "text-destructive" : "text-emerald-600")}>
                        {varianceTotal > 0 ? "+" : ""}{varianceTotal} units
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <div>
                      <span className="font-semibold text-sm">Total Cost of Goods</span>
                      <p className="text-xs text-muted-foreground">at purchase cost</p>
                    </div>
                    <span className="text-xl font-bold">{formatCurrency(totalCostOfGoods)}</span>
                  </div>


                  <Button
                    className="w-full h-12"
                    onClick={applyMovement}
                    disabled={recording || cart.length === 0 || (OUTBOUND_TYPES.includes(movementType as MovementType) && !movementReason.trim())}
                  >
                    {recording ? (
                      <>
                        <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                        Recording...
                      </>
                    ) : (
                      <>
                        {currentMovement.icon}
                        <span className="ml-2">
                          Record {currentMovement.label} ({cart.length} products)
                        </span>
                      </>
                    )}
                  </Button>

                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3 text-blue-600 dark:text-blue-400">
                    <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-xs leading-tight">
                      {isInbound
                        ? "Stock will be increased for each scanned item."
                        : isStockTake
                        ? "Stock will be adjusted to match your physical count. Variance is auto-recorded."
                        : movementType === "adjustment"
                          ? "Stock will be set to the quantity you specify for each item."
                          : "Stock will be reduced for each scanned item. A reason is required."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={clearCartOpen} onOpenChange={setClearCartOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Batch?</DialogTitle>
            <DialogDescription>
              This will remove all {cart.length} item(s) from the current batch. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearCartOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmClearCart}>Clear All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
