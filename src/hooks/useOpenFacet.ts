import { useState, useEffect, useRef, useCallback } from 'react'
import {
  fetchIndex, fetchMatrix, fetchDepth,
  type IndexData, type MatrixData, type DepthData,
} from '../api/openfacet'

const POLL_INTERVAL = 30 * 60 * 1000 // 30 minutes

interface OpenFacetState {
  index: IndexData | null
  matrix: MatrixData | null
  depth: DepthData | null
  previousMatrix: MatrixData | null
  loading: boolean
  error: string | null
  lastFetched: Date | null
  refreshing: boolean
}

export function useOpenFacet() {
  const [state, setState] = useState<OpenFacetState>({
    index: null,
    matrix: null,
    depth: null,
    previousMatrix: null,
    loading: true,
    error: null,
    lastFetched: null,
    refreshing: false,
  })

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const doFetch = useCallback(async (isBackground: boolean) => {
    if (isBackground) {
      setState(prev => ({ ...prev, refreshing: true }))
    }

    try {
      const [index, matrix, depth] = await Promise.all([
        fetchIndex(),
        fetchMatrix(),
        fetchDepth(),
      ])

      setState(prev => {
        const dataChanged = prev.matrix && prev.matrix.ts !== matrix.ts
        return {
          index,
          matrix,
          depth,
          previousMatrix: dataChanged ? prev.matrix : prev.previousMatrix,
          loading: false,
          error: null,
          lastFetched: new Date(),
          refreshing: false,
        }
      })
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        refreshing: false,
        error: err instanceof Error ? err.message : 'Failed to load data',
      }))
    }
  }, [])

  const refresh = useCallback(() => {
    doFetch(true)
  }, [doFetch])

  // Initial load
  useEffect(() => {
    doFetch(false)
  }, [doFetch])

  // Polling
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      doFetch(true)
    }, POLL_INTERVAL)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [doFetch])

  return {
    index: state.index,
    matrix: state.matrix,
    depth: state.depth,
    previousMatrix: state.previousMatrix,
    loading: state.loading,
    error: state.error,
    lastFetched: state.lastFetched,
    refreshing: state.refreshing,
    refresh,
  }
}
