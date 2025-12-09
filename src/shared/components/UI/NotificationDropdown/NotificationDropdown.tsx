'use client';

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/shared/utils/cn';
import { useDesignSystem, COMMON_CLASSES } from '@/shared/hooks/useDesignSystem';
import { Button } from '../Button/Button';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  project_id?: string | null;
  chat_id?: string | null;
  file_id?: string | null;
  action_url?: string | null;
  action_label?: string | null;
  is_read: boolean;
  read_at?: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
}

interface NotificationDropdownProps {
  locale: 'nl' | 'en';
  className?: string;
}

export function NotificationDropdown({ locale, className }: NotificationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { classBuilders } = useDesignSystem();

  const translations = {
    nl: {
      notifications: 'Meldingen',
      markAllAsRead: 'Alles markeren als gelezen',
      noNotifications: 'Geen meldingen',
      viewAll: 'Alles bekijken',
      loading: 'Laden...',
      markAsRead: 'Markeren als gelezen',
      delete: 'Verwijderen',
      timeAgo: {
        justNow: 'Zojuist',
        minutesAgo: (n: number) => `${n} min geleden`,
        hoursAgo: (n: number) => `${n} uur geleden`,
        daysAgo: (n: number) => `${n} dagen geleden`,
      },
    },
    en: {
      notifications: 'Notifications',
      markAllAsRead: 'Mark all as read',
      noNotifications: 'No notifications',
      viewAll: 'View all',
      loading: 'Loading...',
      markAsRead: 'Mark as read',
      delete: 'Delete',
      timeAgo: {
        justNow: 'Just now',
        minutesAgo: (n: number) => `${n} min ago`,
        hoursAgo: (n: number) => `${n} hours ago`,
        daysAgo: (n: number) => `${n} days ago`,
      },
    },
  };

  const t = translations[locale];

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/notifications?limit=10');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data.notifications || []);
        setUnreadCount(data.data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'PATCH',
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const res = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Delete notification
  const deleteNotification = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
    setIsOpen(false);
  };

  // Format time ago
  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t.timeAgo.justNow;
    if (diffInSeconds < 3600) return t.timeAgo.minutesAgo(Math.floor(diffInSeconds / 60));
    if (diffInSeconds < 86400) return t.timeAgo.hoursAgo(Math.floor(diffInSeconds / 3600));
    return t.timeAgo.daysAgo(Math.floor(diffInSeconds / 86400));
  };

  // Get priority color
  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'urgent':
        return 'text-error';
      case 'high':
        return 'text-warning';
      default:
        return 'text-text-primary';
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        buttonRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [isOpen]);

  // Fetch notifications when opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Poll for new notifications every 30 seconds
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('relative', className)}>
      {/* Notification Bell Button */}
      <Button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        variant="ghost"
        size="sm"
        className="relative w-10 h-10 p-0"
        aria-label={t.notifications}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-error text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {/* Notification Dropdown */}
      <div
        ref={dropdownRef}
        className={cn(
          'absolute top-full right-0 mt-sm',
          classBuilders.glass(true, 'border shadow-xl rounded-xl'),
          'w-[380px] max-h-[500px] overflow-hidden',
          'transition-all duration-fast',
          isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
        )}
        role="menu"
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="px-base py-sm border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-text-primary">
            {t.notifications}
          </h3>
          {unreadCount > 0 && (
            <Button
              onClick={markAllAsRead}
              variant="ghost"
              size="sm"
              className="text-xs px-sm py-xs h-auto"
            >
              {t.markAllAsRead}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto max-h-[400px]">
          {isLoading ? (
            <div className="p-lg text-center text-sm text-gray-500">
              {t.loading}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-lg text-center">
              <svg className="w-12 h-12 mx-auto mb-sm text-gray-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
              <p className="text-sm text-gray-500">{t.noNotifications}</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  'px-base py-sm border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer',
                  !notification.is_read && 'bg-primary-light/30'
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-sm">
                  {/* Unread indicator */}
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-primary mt-1 flex-shrink-0" />
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-medium mb-xs', getPriorityColor(notification.priority))}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-2 mb-xs">
                      {notification.message}
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatTimeAgo(notification.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(notification.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className="w-6 h-6 p-0 text-gray-400 hover:text-error"
                      aria-label={t.delete}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationDropdown;
