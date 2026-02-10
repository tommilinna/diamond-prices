import type { MatrixData } from '../api/openfacet'

export interface DailySnapshot {
  date: string                  // 'YYYY-MM-DD' (key)
  ts: string                    // original MatrixData.ts
  l: Record<string, number[]>  // log prices from MatrixData.l
}

const DB_NAME = 'diamond-price-history'
const STORE_NAME = 'snapshots'
const DB_VERSION = 1

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'date' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/** Save today's matrix snapshot (idempotent — overwrites same-day entry) */
export async function saveSnapshot(matrix: MatrixData): Promise<void> {
  try {
    const date = matrix.ts.slice(0, 10)
    const snapshot: DailySnapshot = { date, ts: matrix.ts, l: matrix.l }
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(snapshot)
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // IndexedDB unavailable — silently ignore
  }
}

/** Retrieve snapshots in a date range, sorted ascending */
export async function getSnapshots(from?: string, to?: string): Promise<DailySnapshot[]> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)

    const range =
      from && to ? IDBKeyRange.bound(from, to) :
      from ? IDBKeyRange.lowerBound(from) :
      to ? IDBKeyRange.upperBound(to) :
      undefined

    const req = range ? store.getAll(range) : store.getAll()
    const result = await new Promise<DailySnapshot[]>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return result.sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

/** Total number of stored snapshots */
export async function getSnapshotCount(): Promise<number> {
  try {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).count()
    const count = await new Promise<number>((resolve, reject) => {
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    db.close()
    return count
  } catch {
    return 0
  }
}
