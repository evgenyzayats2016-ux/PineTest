import type { HistoricalDataset, OhlcvBar } from '../types';

const DB_NAME = 'PineTraderDB';
const DB_VERSION = 1;
const DATASETS_STORE = 'datasets';
const OHLCV_STORE = 'ohlcv';

let db: IDBDatabase | null = null;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const dbInstance = (event.target as IDBOpenDBRequest).result;
      if (!dbInstance.objectStoreNames.contains(DATASETS_STORE)) {
        dbInstance.createObjectStore(DATASETS_STORE, { keyPath: 'id' });
      }
      if (!dbInstance.objectStoreNames.contains(OHLCV_STORE)) {
        dbInstance.createObjectStore(OHLCV_STORE, { keyPath: 'datasetId' });
      }
    };

    request.onsuccess = (event) => {
      db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
      reject("Error opening database.");
    };
  });
};

export const saveDataset = async (dataset: HistoricalDataset, ohlcvData: OhlcvBar[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DATASETS_STORE, OHLCV_STORE], 'readwrite');
        const datasetsStore = transaction.objectStore(DATASETS_STORE);
        const ohlcvStore = transaction.objectStore(OHLCV_STORE);

        const datasetRequest = datasetsStore.put(dataset);
        const ohlcvRequest = ohlcvStore.put({ datasetId: dataset.id, data: ohlcvData });

        let completed = 0;
        const checkCompletion = () => {
            completed++;
            if(completed === 2) {
                 resolve();
            }
        };

        datasetRequest.onsuccess = checkCompletion;
        ohlcvRequest.onsuccess = checkCompletion;

        transaction.onerror = (event) => {
            console.error("Transaction error:", (event.target as IDBTransaction).error);
            reject("Error saving dataset.");
        }
    });
};

export const getDatasets = async (): Promise<HistoricalDataset[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(DATASETS_STORE, 'readonly');
        const store = transaction.objectStore(DATASETS_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = (event) => {
            console.error("Get all datasets error:", (event.target as IDBRequest).error);
            reject("Error fetching datasets.");
        };
    });
};

export const getOhlcvData = async (datasetId: string): Promise<OhlcvBar[] | null> => {
     const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(OHLCV_STORE, 'readonly');
        const store = transaction.objectStore(OHLCV_STORE);
        const request = store.get(datasetId);

        request.onsuccess = () => {
            resolve(request.result ? request.result.data : null);
        };
         request.onerror = (event) => {
            console.error("Get OHLCV error:", (event.target as IDBRequest).error);
            reject("Error fetching OHLCV data.");
        };
    });
};


export const deleteDataset = async (datasetId: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([DATASETS_STORE, OHLCV_STORE], 'readwrite');
        const datasetsStore = transaction.objectStore(DATASETS_STORE);
        const ohlcvStore = transaction.objectStore(OHLCV_STORE);

        datasetsStore.delete(datasetId);
        ohlcvStore.delete(datasetId);

        transaction.oncomplete = () => {
            resolve();
        };

         transaction.onerror = (event) => {
            console.error("Delete transaction error:", (event.target as IDBTransaction).error);
            reject("Error deleting dataset.");
        };
    });
};
