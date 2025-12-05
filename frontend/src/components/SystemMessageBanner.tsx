'use client';

import { useState, useEffect } from 'react';
import { X, AlertTriangle, Info, Megaphone, Wrench } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getActiveSystemMessages, type ActiveSystemMessage } from '@/lib/api';

const MESSAGE_CONFIG = {
  maintenance: {
    icon: Wrench,
    bgClass: 'bg-amber-500/90',
    textClass: 'text-white',
    iconClass: 'text-amber-100',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-red-500/90',
    textClass: 'text-white',
    iconClass: 'text-red-100',
  },
  announcement: {
    icon: Megaphone,
    bgClass: 'bg-blue-500/90',
    textClass: 'text-white',
    iconClass: 'text-blue-100',
  },
  info: {
    icon: Info,
    bgClass: 'bg-gray-600/90',
    textClass: 'text-white',
    iconClass: 'text-gray-200',
  },
};

const DISMISSED_MESSAGES_KEY = 'dismissedSystemMessages';

function getDismissedMessages(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(DISMISSED_MESSAGES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function dismissMessage(messageId: string): void {
  const dismissed = getDismissedMessages();
  if (!dismissed.includes(messageId)) {
    dismissed.push(messageId);
    localStorage.setItem(DISMISSED_MESSAGES_KEY, JSON.stringify(dismissed));
  }
}

export function SystemMessageBanner() {
  const [messages, setMessages] = useState<ActiveSystemMessage[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setDismissedIds(getDismissedMessages());

    async function fetchMessages() {
      try {
        const response = await getActiveSystemMessages();
        setMessages(response.messages);
      } catch (error) {
        console.error('Failed to fetch system messages:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchMessages();

    // Refresh messages every 5 minutes
    const interval = setInterval(fetchMessages, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (messageId: string) => {
    dismissMessage(messageId);
    setDismissedIds((prev) => [...prev, messageId]);
  };

  // Filter out dismissed messages
  const visibleMessages = messages.filter(
    (msg) => !msg.dismissible || !dismissedIds.includes(msg.id)
  );

  if (isLoading || visibleMessages.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex flex-col">
      {visibleMessages.map((message) => {
        const config = MESSAGE_CONFIG[message.type] || MESSAGE_CONFIG.info;
        const Icon = config.icon;

        return (
          <div
            key={message.id}
            className={cn(
              'flex items-center justify-center gap-3 px-4 py-2.5 backdrop-blur-sm',
              config.bgClass,
              config.textClass
            )}
          >
            <Icon className={cn('h-4 w-4 flex-shrink-0', config.iconClass)} />
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="font-semibold">{message.title}</span>
              {message.content && (
                <>
                  <span className="opacity-60">—</span>
                  <span className="opacity-90">{message.content}</span>
                </>
              )}
            </div>
            {message.dismissible && (
              <button
                onClick={() => handleDismiss(message.id)}
                className="ml-2 rounded p-1 opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
                aria-label="Dismiss message"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
