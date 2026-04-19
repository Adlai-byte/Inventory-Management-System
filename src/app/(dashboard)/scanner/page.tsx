"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
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
  Wifi,
  WifiOff,
  CloudUpload,
  Tag,
  Calendar,
  Zap,
  ZapOff,
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
import { addToQueue, getQueue, removeFromQueue, OfflineMovement, syncProducts, lookupProductOffline } from "@/lib/offline-storage";

interface CartItem extends Product {
  scanQty: number;
}

// Movement types for the scanner
const MOVEMENT_OPTIONS: { value: MovementType | "stock_take"; label: string; icon: React.ReactNode; description: string }[] = [
  { value: "transfer_out", label: "Dispatch", icon: <ArrowRightLeft className="h-5 w-5" />, description: "Items sold or transferred out" },
  { value: "restock", label: "Restock", icon: <Package className="h-5 w-5" />, description: "Items received into inventory" },
  { value: "write_off", label: "Write-off", icon: <Trash2 className="h-5 w-5" />, description: "Damaged, expired, or lost items" },
  { value: "adjustment", label: "Adjustment", icon: <RefreshCw className="h-5 w-5" />, description: "Correct stock count discrepancies" },
];

// Types that increase stock
const INBOUND_TYPES: MovementType[] = ["restock", "transfer_in", "initial"];
// Types that decrease stock (including write-off)
const OUTBOUND_TYPES: MovementType[] = ["transfer_out", "damage", "expired", "loss", "sample", "return_out", "write_off"];

export default function ScannerPage() {
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => { setHasMounted(true); }, []);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanFlash, setScanFlash] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [movementType, setMovementType] = useState<MovementType>("transfer_out");
  const [movementReason, setMovementReason] = useState("");
  // Batch details
  const [batchNumber, setBatchNumber] = useState("");
  const [manufactureDate, setManufactureDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [recording, setRecording] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [inputMode, setInputMode] = useState<"keyboard" | "camera">("keyboard");
  const [clearCartOpen, setClearCartOpen] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [productsCached, setProductsCached] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const prevInputModeRef = useRef<"keyboard" | "camera">("camera");
  const videoRef = useRef<HTMLVideoElement>(null);
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null);
  const lastScannedCodeRef = useRef<string>("");
  const lastScannedTimeRef = useRef<number>(0);
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [nameMatches, setNameMatches] = useState<Product[]>([]);

  const currentMovement = MOVEMENT_OPTIONS.find(m => m.value === movementType)!;
  const isInbound = INBOUND_TYPES.includes(movementType as MovementType);
  const varianceTotal = cart.reduce((sum, item) => sum + (item.scanQty - item.quantity), 0);

  // Smart Focus: Focus the barcode field on mount and whenever mode changes to keyboard
  useEffect(() => {
    if (inputMode === "keyboard") {
      inputRef.current?.focus();
    }
  }, [inputMode]);

  // Online/Offline status & Sync logic
  useEffect(() => {
    setIsOnline(navigator.onLine);
    
    const handleOnline = () => {
      setIsOnline(true);
      toast.info("Back online. Starting sync...");
      syncOfflineQueue();
      refreshProductCache();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast.warning("You are offline. Scans will be queued locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    // Initial check for pending syncs
    updatePendingCount();
    if (navigator.onLine) {
      refreshProductCache();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const refreshProductCache = async () => {
    try {
      const res = await fetch("/api/products?limit=1000");
      if (res.ok) {
        const { data } = await res.json();
        await syncProducts(data);
        setProductsCached(data.length);
      }
    } catch (err) {
      console.error("Failed to refresh product cache", err);
    }
  };

  const updatePendingCount = async () => {
    const queue = await getQueue();
    setPendingSync(queue.length);
  };

  const syncOfflineQueue = async () => {
    if (syncing) return;
    const queue = await getQueue();
    if (queue.length === 0) return;

    setSyncing(true);
    let successCount = 0;

    for (const movement of queue) {
      try {
        const res = await fetch("/api/stock-movements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(movement),
        });

        if (res.ok) {
          if (movement.id) await removeFromQueue(movement.id);
          successCount++;
        }
      } catch (err) {
        console.error("Sync failed for item:", movement, err);
        break; // Stop syncing if network fails again
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully synced ${successCount} offline record(s)`);
    }
    updatePendingCount();
    setSyncing(false);
  };

  const addToCart = useCallback((product: Product) => {
    // Block outbound dispatch of out-of-stock items for non-adjustment movements
    if (!INBOUND_TYPES.includes(movementType as MovementType) && movementType !== "adjustment" && product.quantity <= 0) {
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
        scanQty: movementType === "adjustment" ? Math.max(product.quantity, 0) : 1
      }];
    });

    // Visual scan success feedback
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 600);

    toast.success(`Added ${product.name} to batch`);
  }, [movementType]);

  const handleScanResult = useCallback(async (barcode: string) => {
    setLoading(true);
    setNameMatches([]);
    try {
      const res = await fetch(`/api/scanner/lookup?q=${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const body = await res.json();
        if (body.matches) {
          // Multiple name matches — show picker
          setNameMatches(body.matches);
        } else {
          addToCart(body.data);
        }
      } else {
        const offlineData = await lookupProductOffline(barcode);
        if (offlineData) {
          addToCart(offlineData);
          toast.info("Product found in offline cache", { duration: 1000 });
        } else {
          toast.error("Product not found");
        }
      }
    } catch (error) {
      const offlineData = await lookupProductOffline(barcode);
      if (offlineData) {
        addToCart(offlineData);
        toast.info("Offline lookup successful", { duration: 1000 });
      } else {
        toast.error("Scan error: Check connection or cache");
      }
    } finally {
      setLoading(false);
      if (inputMode === "camera") {
        setQuery("");
      } else {
        inputRef.current?.focus();
      }
    }
  }, [addToCart, inputMode]);

  const startCamera = useCallback(async () => {
    if (zxingControlsRef.current) return;

    setCameraLoading(true);
    setCameraError(null);

    try {
      // Manually acquire stream so we control play() — ZXing's loadedmetadata
      // approach is unreliable on Android Chrome.
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      const video = videoRef.current!;
      video.srcObject = stream;
      video.muted = true;

      await new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = () => resolve();
        video.onerror = reject;
        setTimeout(resolve, 3000); // fallback if event never fires
      });

      await video.play();

      const codeReader = new BrowserMultiFormatReader();
      const controls = await codeReader.decodeFromVideoElement(
        video,
        async (result) => {
          if (!result) return;
          const code = result.getText();
          const now = Date.now();
          if (code !== lastScannedCodeRef.current || now - lastScannedTimeRef.current > 1000) {
            lastScannedCodeRef.current = code;
            lastScannedTimeRef.current = now;
            navigator.vibrate?.(50);
            await handleScanResult(code);
          }
        }
      );

      zxingControlsRef.current = controls;
      setIsScanning(true);

      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as Record<string, unknown> | undefined;
      setTorchSupported(!!capabilities?.torch);

      setCameraLoading(false);
    } catch (err) {
      setCameraLoading(false);
      let errorMessage = err instanceof Error ? err.message : "Failed to start camera";
      if (/Permission|NotAllowed/i.test(errorMessage)) {
        errorMessage = "Camera permission denied. Please allow camera access in browser settings.";
      } else if (/NotFoundError|not found/i.test(errorMessage)) {
        errorMessage = "No camera found on this device.";
      } else if (/over HTTPS|secure/i.test(errorMessage)) {
        errorMessage = "Camera requires HTTPS. Access via secure URL or use Manual entry.";
      }
      setCameraError(errorMessage);
      toast.error("Camera error: " + errorMessage);
    }
  }, [handleScanResult]);

  const stopCamera = useCallback(() => {
    if (zxingControlsRef.current) {
      zxingControlsRef.current.stop();
      zxingControlsRef.current = null;
    }
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream | null;
      stream?.getTracks().forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setTorchOn(false);
  }, []);

  const toggleTorch = useCallback(async () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    const newState = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: newState } as MediaTrackConstraintSet] });
      setTorchOn(newState);
    } catch {
      toast.error("Torch not available");
    }
  }, [torchOn]);

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
    if (showCamera && !zxingControlsRef.current) {
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

  const resetAll = () => {
    setCart([]);
    setMovementReason("");
    setBatchNumber("");
    setManufactureDate("");
    setExpiryDate("");
    toast.info("Scanner reset");
  };

  const confirmClearCart = () => {
    setCart([]);
    toast.info("Batch cleared");
    setClearCartOpen(false);
  };

  const applyMovement = async () => {
    if (cart.length === 0) {
      toast.error("Batch is empty");
      return;
    }

    // Validate stock availability for outbound movements (not for adjustment)
    if (!INBOUND_TYPES.includes(movementType as MovementType) && movementType !== "adjustment") {
      const overscan = cart.filter(item => item.scanQty > item.quantity);
      if (overscan.length > 0) {
        const names = overscan.map(i => `${i.name} (${i.quantity} avail, ${i.scanQty} scanned)`).join(", ");
        toast.error(`Insufficient stock: ${names}`);
        return;
      }
    }

    setRecording(true);

    const movementData = {
      type: movementType,
      reason: movementReason || null,
      notes: `Recorded via scanner - ${currentMovement.label}${!isOnline ? " (Captured Offline)" : ""}`,
      batch_number: batchNumber || null,
      manufacture_date: manufactureDate || null,
      expiry_date: expiryDate || null,
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.scanQty,
      })),
      timestamp: Date.now(),
    };

    if (!isOnline) {
      try {
        await addToQueue(movementData);
        toast.success("Saved to offline queue");
        setCart([]);
        setMovementReason("");
        setBatchNumber("");
        setManufactureDate("");
        setExpiryDate("");
        updatePendingCount();
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } catch (err) {
        toast.error("Failed to save offline: " + (err instanceof Error ? err.message : "Storage error"));
      } finally {
        setRecording(false);
      }
      return;
    }

    try {
      // Normal movement flow
      const res = await fetch("/api/stock-movements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(movementData),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record movement");
      }

      toast.success(`${currentMovement.label} recorded for ${cart.length} product(s)`);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
      setCart([]);
      setMovementReason("");
      setBatchNumber("");
      setManufactureDate("");
      setExpiryDate("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to record";
      toast.error(msg);
    } finally {
      setRecording(false);
    }
  };

  const totalItems = cart.reduce((sum, item) => sum + item.scanQty, 0);
  const totalCostOfGoods = cart.reduce((sum, item) => sum + (item.scanQty * (item.cost_price || 0)), 0);

  if (!hasMounted) return null;

  if (showSuccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="h-24 w-24 rounded-full bg-green-500/20 flex items-center justify-center mb-6 animate-in zoom-in-50">
          <CheckCircle2 className="h-12 w-12 text-green-500" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Movement Recorded</h2>
        <p className="text-muted-foreground">Inventory has been updated</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Mobile Scanner" 
        description="PWA Inventory Scanner" 
        helpText="Use this module for fast, mobile-friendly stock recording. It supports barcode scanning and manual entry. If you lose internet connection, your scans will be saved locally (Offline Mode) and synced automatically when you're back online. Click 'Dispatch' to record sales or 'Restock' for new arrivals."
        icon={Scan}
      >
        <div className="flex items-center gap-2">
          {pendingSync > 0 && (
            <Badge variant="warning" className="animate-pulse flex gap-1 items-center">
              <CloudUpload className="h-3 w-3" />
              {pendingSync} Pending Sync
            </Badge>
          )}
          {productsCached > 0 && isOnline && (
            <Badge variant="outline" className="hidden sm:flex gap-1 items-center text-[10px] opacity-70">
              {productsCached} products cached
            </Badge>
          )}
          <Badge variant={isOnline ? "success" : "destructive"} className="flex gap-1 items-center">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline Mode"}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={resetAll}
            className="gap-1.5 text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reset
          </Button>
        </div>
      </PageHeader>

      <Card>
        <CardContent className="p-4 space-y-4">
          {/* Movement Type Selection */}
          <div className="space-y-3">
            <label className="text-base font-semibold">Movement Type</label>
            <Select value={movementType} onValueChange={(v: string | null) => { setMovementType(v as MovementType); setCart([]); }}>
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
              title="Camera requires HTTPS. Use Manual for offline/local."
            >
              <Camera className="h-5 w-5" />
              Camera
            </Button>
          </div>

          {inputMode === "keyboard" ? (
            <div className="space-y-2">
              <form onSubmit={handleScan} className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Scan className="h-5 w-5" />}
                </div>
                <Input
                  ref={inputRef}
                  className="pl-10 h-12"
                  placeholder="Barcode, SKU, or product name..."
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setNameMatches([]); }}
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
              {nameMatches.length > 0 && (
                <div className="rounded-lg border bg-background shadow-md overflow-hidden">
                  <p className="text-xs text-muted-foreground px-3 py-2 border-b">
                    {nameMatches.length} products found — tap to add
                  </p>
                  <div className="max-h-56 overflow-y-auto divide-y">
                    {nameMatches.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors"
                        onClick={() => { addToCart(p); setNameMatches([]); setQuery(""); inputRef.current?.focus(); }}
                      >
                        <p className="text-sm font-medium leading-snug">{p.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {p.sku ?? "—"} · Stock: {p.quantity}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  autoPlay
                  muted
                />
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
                {/* Scanning status badge */}
                {isScanning && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full pointer-events-none">
                    <span className={cn(
                      "h-2 w-2 rounded-full",
                      scanFlash ? "bg-green-400" : "bg-green-400 animate-pulse"
                    )} />
                    {scanFlash ? "Found!" : "Scanning..."}
                  </div>
                )}
                {/* Scan target with corner accents — flashes green on successful scan */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-64 h-40 relative overflow-hidden rounded-lg">
                    <div className={cn(
                      "absolute inset-0 rounded-lg transition-all duration-200",
                      scanFlash ? "border-2 border-green-400 bg-green-400/15" : "border border-white/20"
                    )} />
                    <div className={cn("absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] rounded-tl-lg transition-colors duration-200", scanFlash ? "border-green-400" : "border-primary")} />
                    <div className={cn("absolute top-0 right-0 w-6 h-6 border-t-[3px] border-r-[3px] rounded-tr-lg transition-colors duration-200", scanFlash ? "border-green-400" : "border-primary")} />
                    <div className={cn("absolute bottom-0 left-0 w-6 h-6 border-b-[3px] border-l-[3px] rounded-bl-lg transition-colors duration-200", scanFlash ? "border-green-400" : "border-primary")} />
                    <div className={cn("absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] rounded-br-lg transition-colors duration-200", scanFlash ? "border-green-400" : "border-primary")} />
                    {/* Animated scan line */}
                    {!scanFlash && isScanning && (
                      <div className="animate-scanline absolute left-3 right-3 h-[2px] rounded-full bg-primary/80 shadow-[0_0_6px_2px_oklch(0.708_0.15_160/0.5)]" />
                    )}
                    {scanFlash && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-green-400 drop-shadow-lg animate-in zoom-in-50 duration-150" />
                      </div>
                    )}
                  </div>
                </div>
                {/* Torch toggle */}
                {torchSupported && !cameraLoading && !cameraError && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={cn(
                      "absolute bottom-3 right-3 p-2.5 rounded-full transition-all",
                      torchOn ? "bg-yellow-400 text-black" : "bg-black/50 text-white hover:bg-black/70"
                    )}
                    title={torchOn ? "Turn off flashlight" : "Turn on flashlight"}
                  >
                    {torchOn ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
                  </button>
                )}
              </div>
              <p className="text-xs text-center text-muted-foreground">
                Point camera at barcode • Hold steady
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
                    <div key={item.id} className={cn("p-3 rounded-lg space-y-2", (!INBOUND_TYPES.includes(movementType as MovementType) && movementType !== "adjustment" && item.scanQty > item.quantity) ? "bg-destructive/10 border border-destructive/30" : "bg-accent/50")}>
                      {/* Row 1: Name + remove button */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {item.quantity === 0 && !INBOUND_TYPES.includes(movementType as MovementType) && movementType !== "adjustment" && (
                            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          <span className="font-medium text-sm leading-snug">{item.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      {/* Row 2: Stock info + qty controls + total */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-xs text-muted-foreground shrink-0">
                          <span>Stock: {item.quantity}</span>
                          {movementType === "adjustment" && (
                            <span className="ml-1 font-medium text-foreground">→ {item.scanQty}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Input
                            type="number"
                            min={movementType === "adjustment" ? "0" : "1"}
                            value={item.scanQty}
                            onChange={(e) => setItemQuantity(item.id, e.target.value)}
                            className="h-8 w-14 text-center shrink-0"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="text-xs font-semibold text-right min-w-[60px] shrink-0">
                            {formatCurrency(item.scanQty * (item.cost_price || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                

                {/* Batch details for Inbound */}
                {isInbound && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <div className="col-span-full font-semibold text-sm flex items-center gap-2 text-primary">
                      <Tag className="h-4 w-4" /> Batch & Expiry Details
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Batch / Lot Number</label>
                      <Input
                        placeholder="e.g. LOT-2024-001"
                        value={batchNumber}
                        onChange={(e) => setBatchNumber(e.target.value)}
                        className="h-11 bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Expiry Date</label>
                      <Input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                        className="h-11 bg-background"
                      />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Manufacture Date (Optional)</label>
                      <Input
                        type="date"
                        value={manufactureDate}
                        onChange={(e) => setManufactureDate(e.target.value)}
                        className="h-11 bg-background"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Products in Batch</span>
                    <span className="font-medium">{cart.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Total Units</span>
                    <span className="font-medium">{totalItems}</span>
                  </div>
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
                    disabled={recording || cart.length === 0}
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
                        : "Stock will be reduced for each scanned item."}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

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
