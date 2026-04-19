const DB_NAME = "BATISTIL_OFFLINE";
const STORE_NAME = "scan_queue";
const PRODUCT_STORE = "products";
const DB_VERSION = 2; // Incremented version

export interface OfflineMovement {
  id?: number;
  type: string;
  reason?: string | null;
  notes?: string | null;
  items: Array<{
    product_id: number;
    quantity: number;
  }>;
  timestamp: number;
}

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id", autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(PRODUCT_STORE)) {
        const pStore = db.createObjectStore(PRODUCT_STORE, { keyPath: "id" });
        pStore.createIndex("sku", "sku", { unique: false });
        pStore.createIndex("barcode", "barcode", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addToQueue(movement: OfflineMovement): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(movement);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getQueue(): Promise<OfflineMovement[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromQueue(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Product Caching
export async function syncProducts(products: any[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PRODUCT_STORE, "readwrite");
    const store = transaction.objectStore(PRODUCT_STORE);
    store.clear();
    products.forEach((p) => store.add(p));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function lookupProductOffline(query: string): Promise<any | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PRODUCT_STORE, "readonly");
    const store = transaction.objectStore(PRODUCT_STORE);
    
    // Try by SKU
    const skuIndex = store.index("sku");
    const skuReq = skuIndex.get(query);
    
    skuReq.onsuccess = () => {
      if (skuReq.result) {
        resolve(skuReq.result);
        return;
      }
      
      // Try by Barcode
      const barcodeIndex = store.index("barcode");
      const barcodeReq = barcodeIndex.get(query);
      barcodeReq.onsuccess = () => resolve(barcodeReq.result || null);
      barcodeReq.onerror = () => reject(barcodeReq.error);
    };
    skuReq.onerror = () => reject(skuReq.error);
  });
}
