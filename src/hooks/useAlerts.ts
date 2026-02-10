import { useState, useCallback, useEffect } from 'react'
import type { MatrixData } from '../api/openfacet'
import { getMatrixPrice, CARAT_BANDS, interpolatePrice } from '../utils/price'

export interface Alert {
  id: string
  carat: number
  color: string
  clarity: string
  targetPrice: number
  direction: 'above' | 'below'
  triggered: boolean
}

const STORAGE_KEY = 'diamond-price-alerts'

function loadAlerts(): Alert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAlerts(alerts: Alert[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts))
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

function sendNotification(alert: Alert, currentPrice: number) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Diamond Price Alert', {
      body: `${alert.carat}ct ${alert.color} ${alert.clarity} is now $${Math.round(currentPrice)}/ct (target: $${Math.round(alert.targetPrice)} ${alert.direction})`,
      icon: '💎',
    })
  }
}

export function getCurrentPrice(matrix: MatrixData, carat: number, color: string, clarity: string): number | null {
  const caratStr = carat.toString()
  if (CARAT_BANDS.includes(caratStr)) {
    return getMatrixPrice(matrix, caratStr, color, clarity)
  }
  const result = interpolatePrice(matrix, carat, color, clarity)
  return result?.pricePerCarat ?? null
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>(loadAlerts)

  useEffect(() => {
    saveAlerts(alerts)
  }, [alerts])

  const addAlert = useCallback((alert: Omit<Alert, 'id' | 'triggered'>) => {
    requestNotificationPermission()
    const newAlert: Alert = {
      ...alert,
      id: crypto.randomUUID(),
      triggered: false,
    }
    setAlerts(prev => [...prev, newAlert])
  }, [])

  const removeAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id))
  }, [])

  const checkAlerts = useCallback((matrix: MatrixData) => {
    setAlerts(prev => {
      let changed = false
      const updated = prev.map(alert => {
        if (alert.triggered) return alert

        const price = getCurrentPrice(matrix, alert.carat, alert.color, alert.clarity)
        if (price == null) return alert

        const shouldTrigger =
          (alert.direction === 'above' && price >= alert.targetPrice) ||
          (alert.direction === 'below' && price <= alert.targetPrice)

        if (shouldTrigger) {
          changed = true
          sendNotification(alert, price)
          return { ...alert, triggered: true }
        }
        return alert
      })
      return changed ? updated : prev
    })
  }, [])

  const triggeredCount = alerts.filter(a => a.triggered).length

  return { alerts, addAlert, removeAlert, checkAlerts, triggeredCount }
}
