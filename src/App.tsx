import { useState, useEffect, lazy, Suspense } from 'react'
import { useOpenFacet } from './hooks/useOpenFacet'
import { useAlerts } from './hooks/useAlerts'
import { useTheme } from './hooks/useTheme'
import { saveSnapshot } from './lib/historyDb'

const PriceMatrix = lazy(() => import('./components/PriceMatrix'))
const PriceCalculator = lazy(() => import('./components/PriceCalculator'))
const MarketIndex = lazy(() => import('./components/MarketIndex'))
const MarketDepth = lazy(() => import('./components/MarketDepth'))
const PriceHistory = lazy(() => import('./components/PriceHistory'))
const PriceAlerts = lazy(() => import('./components/PriceAlerts'))

type Tab = 'matrix' | 'calculator' | 'market' | 'history' | 'alerts'

const TABS: { id: Tab; label: string }[] = [
  { id: 'matrix', label: 'Price Matrix' },
  { id: 'calculator', label: 'Calculator' },
  { id: 'market', label: 'Market Overview' },
  { id: 'history', label: 'History' },
  { id: 'alerts', label: 'Alerts' },
]

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes === 1) return '1 min ago'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours === 1) return '1 hour ago'
  return `${hours} hours ago`
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('matrix')
  const { index, matrix, depth, previousMatrix, loading, error, lastFetched, refreshing, refresh } = useOpenFacet()
  const { alerts, addAlert, removeAlert, checkAlerts, triggeredCount } = useAlerts()
  const { theme, toggle } = useTheme()
  const [, setTick] = useState(0)

  // Update "X min ago" text every 30 seconds
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30_000)
    return () => clearInterval(id)
  }, [])

  // Save snapshot to IndexedDB on every matrix fetch
  useEffect(() => {
    if (matrix) saveSnapshot(matrix)
  }, [matrix])

  // Check alerts whenever matrix data changes
  useEffect(() => {
    if (matrix) checkAlerts(matrix)
  }, [matrix, checkAlerts])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center" aria-live="polite">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 dark:text-gray-400">Loading diamond data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-xl p-6 max-w-md text-center" role="alert">
          <p className="text-red-800 dark:text-red-300 font-medium">Failed to load data</p>
          <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Diamond Price Explorer</h1>
            <div className="flex items-center gap-3 text-xs text-gray-400">
              {refreshing ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-500">Refreshing...</span>
                </span>
              ) : lastFetched ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-dot" />
                  <span>Updated {timeAgo(lastFetched)}</span>
                </span>
              ) : null}
              <button
                onClick={refresh}
                disabled={refreshing}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer disabled:opacity-40"
                title="Refresh now"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              </button>
              <button
                onClick={toggle}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />
                  </svg>
                )}
              </button>
              <span className="text-gray-300 dark:text-gray-600">|</span>
              <span>OpenFacet (GIA 3EX, no fluor.)</span>
            </div>
          </div>
          <nav className="flex gap-1 mt-3 -mb-px" role="tablist">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors cursor-pointer relative ${
                  activeTab === tab.id
                    ? 'bg-gray-50 dark:bg-gray-900 text-blue-600 dark:text-blue-400 border border-gray-200 dark:border-gray-700 border-b-gray-50 dark:border-b-gray-900 -mb-px'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {tab.label}
                {tab.id === 'alerts' && triggeredCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {triggeredCount}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6" role="tabpanel">
        <Suspense fallback={<div className="text-center py-12 text-gray-400">Loading...</div>}>
          {activeTab === 'matrix' && matrix && depth && (
            <PriceMatrix matrix={matrix} depth={depth} previousMatrix={previousMatrix} />
          )}
          {activeTab === 'calculator' && matrix && (
            <PriceCalculator matrix={matrix} />
          )}
          {activeTab === 'market' && index && depth && (
            <div className="space-y-8">
              <MarketIndex index={index} />
              <MarketDepth depth={depth} />
            </div>
          )}
          {activeTab === 'history' && matrix && (
            <PriceHistory matrix={matrix} />
          )}
          {activeTab === 'alerts' && matrix && (
            <PriceAlerts
              matrix={matrix}
              alerts={alerts}
              onAdd={addAlert}
              onRemove={removeAlert}
            />
          )}
        </Suspense>
      </main>
    </div>
  )
}
