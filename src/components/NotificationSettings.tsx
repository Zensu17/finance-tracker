/**
 * NotificationSettings Component
 * Allows users to enable/disable push notifications
 */

import { useState, useEffect } from 'react'
import { Bell, BellOff, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import {
  getNotificationStatus,
  enableNotifications,
  disableNotifications,
  sendTestNotification,
} from '../utils/notifications'

interface NotificationSettingsProps {
  userId: string
}

export function NotificationSettings({ userId }: NotificationSettingsProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [notificationStatus, setNotificationStatus] = useState<'granted' | 'denied' | 'default' | 'unsupported'>('default')

  // Check notification status on mount
  useEffect(() => {
    const status = getNotificationStatus()
    setNotificationStatus(status)
    setNotificationsEnabled(status === 'granted')
  }, [])

  const handleToggleNotifications = async () => {
    setIsLoading(true)

    try {
      if (notificationsEnabled) {
        // Disable notifications
        const success = await disableNotifications(userId)
        if (success) {
          setNotificationsEnabled(false)
          setNotificationStatus('denied')
        }
      } else {
        // Enable notifications
        const success = await enableNotifications(userId)
        if (success) {
          setNotificationsEnabled(true)
          setNotificationStatus('granted')
        }
      }
    } catch (error) {
      console.error('Error toggling notifications:', error)
      toast.error('✗ Failed to update notification settings')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendTestNotification = async () => {
    setIsLoading(true)
    try {
      await sendTestNotification()
    } finally {
      setIsLoading(false)
    }
  }

  if (notificationStatus === 'unsupported') {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-sm text-slate-600">
          Push notifications are not supported on your browser.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Main toggle */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {notificationsEnabled ? (
              <Bell size={20} className="text-emerald-600" />
            ) : (
              <BellOff size={20} className="text-slate-400" />
            )}
            <div>
              <h3 className="font-medium text-slate-900">Push Notifications</h3>
              <p className="text-xs text-slate-500 mt-1">
                {notificationsEnabled
                  ? '✓ Notifications enabled'
                  : 'Notifications disabled'}
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleNotifications}
            disabled={isLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              notificationsEnabled
                ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              'Loading...'
            ) : notificationsEnabled ? (
              <>
                <X size={14} className="inline mr-1" />
                Disable
              </>
            ) : (
              <>
                <Check size={14} className="inline mr-1" />
                Enable
              </>
            )}
          </button>
        </div>

        {notificationStatus === 'denied' && (
          <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded text-xs text-rose-700">
            ⚠️ Notifications are blocked. Check your browser settings to enable.
          </div>
        )}
      </div>

      {/* Test notification button */}
      {notificationsEnabled && (
        <div>
          <button
            onClick={handleSendTestNotification}
            disabled={isLoading}
            className="w-full px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Sending...' : '📢 Send Test Notification'}
          </button>
          <p className="text-xs text-slate-500 mt-2">
            Click to send a test notification to verify notifications are working.
          </p>
        </div>
      )}

      {/* Info section */}
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
        <p className="text-xs text-blue-700">
          <strong>ℹ️ What are push notifications?</strong>
        </p>
        <ul className="text-xs text-blue-600 mt-2 ml-4 list-disc space-y-1">
          <li>Get reminders to log your spending</li>
          <li>Receive budget alerts when approaching limits</li>
          <li>Stay updated with financial insights</li>
        </ul>
      </div>
    </div>
  )
}
