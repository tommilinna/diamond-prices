import { renderHook, act } from '@testing-library/react'
import type { MatrixData } from '../../api/openfacet'
import { useAlerts, getCurrentPrice } from '../useAlerts'
import { CARAT_BANDS } from '../../utils/price'

// ---------- helpers ----------

const COLORS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']
const CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2']

function createMockMatrix(
  fill: (band: string, colorIdx: number, clarityIdx: number) => number = () => 8,
): MatrixData {
  const l: Record<string, number[]> = {}
  for (const band of CARAT_BANDS) {
    const values: number[] = []
    for (let r = 0; r < COLORS.length; r++) {
      for (let c = 0; c < CLARITIES.length; c++) {
        values.push(fill(band, r, c))
      }
    }
    l[band] = values
  }

  return {
    c: CLARITIES,
    r: COLORS,
    s: [COLORS.length, CLARITIES.length] as [number, number],
    l,
    ts: '2025-01-01T00:00:00Z',
  }
}

// ---------- localStorage mock ----------

const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// ---------- crypto.randomUUID mock ----------

let uuidCounter = 0

beforeEach(() => {
  localStorageMock.clear()
  vi.clearAllMocks()
  uuidCounter = 0
  vi.stubGlobal('crypto', {
    ...crypto,
    randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// ---------- getCurrentPrice ----------

describe('getCurrentPrice', () => {
  const matrix = createMockMatrix(() => 8.5)

  it('returns price for an exact carat band', () => {
    const price = getCurrentPrice(matrix, 1, 'G', 'VS2')
    expect(price).toBeCloseTo(Math.exp(8.5), 5)
  })

  it('returns interpolated price for a non-band carat', () => {
    const price = getCurrentPrice(matrix, 1.25, 'G', 'VS2')
    expect(price).not.toBeNull()
    // With uniform log values, interpolation yields the same price
    expect(price).toBeCloseTo(Math.exp(8.5), 5)
  })

  it('returns null for invalid color/clarity combination', () => {
    const sparseMatrix = createMockMatrix(() => 0)
    const price = getCurrentPrice(sparseMatrix, 1, 'G', 'VS2')
    expect(price).toBeNull()
  })
})

// ---------- useAlerts ----------

describe('useAlerts', () => {
  describe('initial state', () => {
    it('starts with empty alerts and zero triggered count', () => {
      const { result } = renderHook(() => useAlerts())
      expect(result.current.alerts).toEqual([])
      expect(result.current.triggeredCount).toBe(0)
    })

    it('loads existing alerts from localStorage', () => {
      const existingAlerts = [
        {
          id: 'existing-1',
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 5000,
          direction: 'above' as const,
          triggered: false,
        },
      ]
      localStorageMock.setItem('diamond-price-alerts', JSON.stringify(existingAlerts))

      const { result } = renderHook(() => useAlerts())
      expect(result.current.alerts).toHaveLength(1)
      expect(result.current.alerts[0].id).toBe('existing-1')
    })
  })

  describe('addAlert', () => {
    it('adds an alert with a generated id and triggered = false', () => {
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.5,
          color: 'D',
          clarity: 'FL',
          targetPrice: 10000,
          direction: 'above',
        })
      })

      expect(result.current.alerts).toHaveLength(1)
      expect(result.current.alerts[0]).toEqual({
        id: 'test-uuid-1',
        carat: 1.5,
        color: 'D',
        clarity: 'FL',
        targetPrice: 10000,
        direction: 'above',
        triggered: false,
      })
    })

    it('adds multiple alerts sequentially', () => {
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 5000,
          direction: 'above',
        })
      })
      act(() => {
        result.current.addAlert({
          carat: 2.0,
          color: 'E',
          clarity: 'VVS1',
          targetPrice: 8000,
          direction: 'below',
        })
      })

      expect(result.current.alerts).toHaveLength(2)
      expect(result.current.alerts[0].id).toBe('test-uuid-1')
      expect(result.current.alerts[1].id).toBe('test-uuid-2')
    })
  })

  describe('removeAlert', () => {
    it('removes an alert by id', () => {
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 5000,
          direction: 'above',
        })
      })
      act(() => {
        result.current.addAlert({
          carat: 2.0,
          color: 'E',
          clarity: 'VVS1',
          targetPrice: 8000,
          direction: 'below',
        })
      })

      act(() => {
        result.current.removeAlert('test-uuid-1')
      })

      expect(result.current.alerts).toHaveLength(1)
      expect(result.current.alerts[0].id).toBe('test-uuid-2')
    })

    it('does nothing when the id does not exist', () => {
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 5000,
          direction: 'above',
        })
      })

      act(() => {
        result.current.removeAlert('nonexistent-id')
      })

      expect(result.current.alerts).toHaveLength(1)
    })
  })

  describe('localStorage persistence', () => {
    it('saves alerts to localStorage after adding', () => {
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 5000,
          direction: 'above',
        })
      })

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'diamond-price-alerts',
        expect.any(String),
      )

      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls.at(-1)![1],
      )
      expect(savedData).toHaveLength(1)
      expect(savedData[0].id).toBe('test-uuid-1')
    })

    it('saves alerts to localStorage after removing', () => {
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 5000,
          direction: 'above',
        })
      })
      act(() => {
        result.current.removeAlert('test-uuid-1')
      })

      const savedData = JSON.parse(
        localStorageMock.setItem.mock.calls.at(-1)![1],
      )
      expect(savedData).toHaveLength(0)
    })

    it('handles corrupt localStorage data gracefully', () => {
      localStorageMock.setItem('diamond-price-alerts', '{invalid json')

      const { result } = renderHook(() => useAlerts())
      expect(result.current.alerts).toEqual([])
    })
  })

  describe('checkAlerts', () => {
    it('triggers an alert when price is above the target with direction "above"', () => {
      // exp(8.5) ~ 4914.77 -- set target below that
      const matrix = createMockMatrix(() => 8.5)
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 4000,
          direction: 'above',
        })
      })

      act(() => {
        result.current.checkAlerts(matrix)
      })

      expect(result.current.alerts[0].triggered).toBe(true)
      expect(result.current.triggeredCount).toBe(1)
    })

    it('triggers an alert when price is below the target with direction "below"', () => {
      // exp(8.5) ~ 4914.77 -- set target above that
      const matrix = createMockMatrix(() => 8.5)
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 6000,
          direction: 'below',
        })
      })

      act(() => {
        result.current.checkAlerts(matrix)
      })

      expect(result.current.alerts[0].triggered).toBe(true)
      expect(result.current.triggeredCount).toBe(1)
    })

    it('does not trigger an alert when condition is not met', () => {
      // exp(8.5) ~ 4914.77 -- set target above that for "above" direction
      const matrix = createMockMatrix(() => 8.5)
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 6000,
          direction: 'above',
        })
      })

      act(() => {
        result.current.checkAlerts(matrix)
      })

      expect(result.current.alerts[0].triggered).toBe(false)
      expect(result.current.triggeredCount).toBe(0)
    })

    it('does not re-trigger an already triggered alert', () => {
      const matrix = createMockMatrix(() => 8.5)
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 4000,
          direction: 'above',
        })
      })

      act(() => {
        result.current.checkAlerts(matrix)
      })
      act(() => {
        result.current.checkAlerts(matrix)
      })

      expect(result.current.triggeredCount).toBe(1)
    })

    it('skips alerts with null prices (invalid combination)', () => {
      const zeroMatrix = createMockMatrix(() => 0)
      const { result } = renderHook(() => useAlerts())

      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 100,
          direction: 'above',
        })
      })

      act(() => {
        result.current.checkAlerts(zeroMatrix)
      })

      expect(result.current.alerts[0].triggered).toBe(false)
    })
  })

  describe('triggeredCount', () => {
    it('counts only triggered alerts', () => {
      const matrix = createMockMatrix(() => 8.5)
      const { result } = renderHook(() => useAlerts())

      // Add one that will trigger (target 4000 < exp(8.5) ~ 4914)
      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 4000,
          direction: 'above',
        })
      })
      // Add one that will NOT trigger (target 6000 > exp(8.5) ~ 4914)
      act(() => {
        result.current.addAlert({
          carat: 1.0,
          color: 'G',
          clarity: 'VS2',
          targetPrice: 6000,
          direction: 'above',
        })
      })

      act(() => {
        result.current.checkAlerts(matrix)
      })

      expect(result.current.triggeredCount).toBe(1)
      expect(result.current.alerts).toHaveLength(2)
    })
  })
})
