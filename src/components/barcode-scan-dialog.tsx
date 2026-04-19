"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CameraOff, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface BarcodeScanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => void;
  title?: string;
}

export function BarcodeScanDialog({ open, onOpenChange, onScan, title = "Scan Barcode" }: BarcodeScanDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const lastCodeRef = useRef("");
  const lastTimeRef = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [flash, setFlash] = useState(false);

  const stopCamera = useCallback(() => {
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (controlsRef.current) return;
    setLoading(true);
    setError(null);
    try {
      const reader = new BrowserMultiFormatReader();
      const controls = await reader.decodeFromConstraints(
        { video: { facingMode: "environment" } },
        videoRef.current!,
        (result) => {
          if (!result) return;
          const code = result.getText();
          const now = Date.now();
          if (code !== lastCodeRef.current || now - lastTimeRef.current > 1000) {
            lastCodeRef.current = code;
            lastTimeRef.current = now;
            navigator.vibrate?.(50);
            setFlash(true);
            setTimeout(() => {
              stopCamera();
              setFlash(false);
              onScan(code);
              onOpenChange(false);
            }, 500);
          }
        }
      );
      controlsRef.current = controls;
      setIsScanning(true);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      let msg = err instanceof Error ? err.message : "Failed to start camera";
      if (/Permission|NotAllowed/i.test(msg)) msg = "Camera permission denied. Allow camera access in settings.";
      else if (/NotFoundError|not found/i.test(msg)) msg = "No camera found on this device.";
      else if (/HTTPS|secure/i.test(msg)) msg = "Camera requires HTTPS.";
      setError(msg);
    }
  }, [onScan, onOpenChange, stopCamera]);

  useEffect(() => {
    if (open) {
      lastCodeRef.current = "";
      startCamera();
    } else {
      stopCamera();
      setFlash(false);
    }
    return () => { stopCamera(); };
  }, [open, startCamera, stopCamera]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm w-[90vw]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Point the camera at a barcode to fill the field automatically.</DialogDescription>
        </DialogHeader>

        <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />

          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p className="text-sm">Starting camera...</p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4">
              <CameraOff className="h-8 w-8 mb-2" />
              <p className="text-sm text-center">{error}</p>
              <Button variant="outline" size="sm" className="mt-3 bg-white text-black hover:bg-gray-200" onClick={startCamera}>
                Retry
              </Button>
            </div>
          )}

          {/* Status badge */}
          {isScanning && (
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full pointer-events-none">
              <span className={cn("h-2 w-2 rounded-full bg-green-400", !flash && "animate-pulse")} />
              {flash ? "Found!" : "Scanning..."}
            </div>
          )}

          {/* Scan target overlay */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-56 h-32 relative overflow-hidden rounded-lg">
              <div className={cn(
                "absolute inset-0 rounded-lg transition-all duration-200",
                flash ? "border-2 border-green-400 bg-green-400/15" : "border border-white/20"
              )} />
              <div className={cn("absolute top-0 left-0 w-5 h-5 border-t-[3px] border-l-[3px] rounded-tl-lg transition-colors duration-200", flash ? "border-green-400" : "border-primary")} />
              <div className={cn("absolute top-0 right-0 w-5 h-5 border-t-[3px] border-r-[3px] rounded-tr-lg transition-colors duration-200", flash ? "border-green-400" : "border-primary")} />
              <div className={cn("absolute bottom-0 left-0 w-5 h-5 border-b-[3px] border-l-[3px] rounded-bl-lg transition-colors duration-200", flash ? "border-green-400" : "border-primary")} />
              <div className={cn("absolute bottom-0 right-0 w-5 h-5 border-b-[3px] border-r-[3px] rounded-br-lg transition-colors duration-200", flash ? "border-green-400" : "border-primary")} />
              {!flash && isScanning && (
                <div className="animate-scanline absolute left-2 right-2 h-[2px] rounded-full bg-primary/80 shadow-[0_0_6px_2px_oklch(0.708_0.15_160/0.5)]" />
              )}
              {flash && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <CheckCircle2 className="h-8 w-8 text-green-400 drop-shadow-lg animate-in zoom-in-50 duration-150" />
                </div>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
