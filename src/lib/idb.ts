import { FileRecord } from '../types';

const DB_NAME = 'VaultPersistentDB';
const DB_VERSION = 1;
const STORE_METADATA = 'metadata';
const STORE_BLOBS = 'fileBlobs';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_METADATA)) {
        db.createObjectStore(STORE_METADATA, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function idbSaveRecord(record: FileRecord): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_METADATA, 'readwrite');
    const store = tx.objectStore(STORE_METADATA);
    store.put(record);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.error('Failed to save record to IndexedDB:', err);
  }
}

export async function idbSaveRecords(records: FileRecord[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_METADATA, 'readwrite');
    const store = tx.objectStore(STORE_METADATA);
    for (const r of records) {
      store.put(r);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.error('Failed to save records to IndexedDB:', err);
  }
}

export async function idbSaveBlob(id: string, blob: Blob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_BLOBS);
    store.put({ id, blob, updatedAt: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.error('Failed to save blob to IndexedDB:', err);
  }
}

export async function idbGetAllRecords(): Promise<FileRecord[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_METADATA, 'readonly');
    const store = tx.objectStore(STORE_METADATA);
    const request = store.getAll();
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get records from IndexedDB:', err);
    return [];
  }
}

export async function idbGetBlob(id: string): Promise<Blob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_BLOBS, 'readonly');
    const store = tx.objectStore(STORE_BLOBS);
    const request = store.get(id);
    return await new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const result = request.result;
        resolve(result && result.blob ? result.blob : null);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to get blob from IndexedDB:', err);
    return null;
  }
}

export async function idbDeleteRecord(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_METADATA, STORE_BLOBS], 'readwrite');
    tx.objectStore(STORE_METADATA).delete(id);
    tx.objectStore(STORE_BLOBS).delete(id);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.error('Failed to delete record from IndexedDB:', err);
  }
}

export async function idbDeleteRecords(ids: string[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction([STORE_METADATA, STORE_BLOBS], 'readwrite');
    const metaStore = tx.objectStore(STORE_METADATA);
    const blobStore = tx.objectStore(STORE_BLOBS);
    for (const id of ids) {
      metaStore.delete(id);
      blobStore.delete(id);
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
  } catch (err) {
    console.error('Failed to delete records from IndexedDB:', err);
  }
}
