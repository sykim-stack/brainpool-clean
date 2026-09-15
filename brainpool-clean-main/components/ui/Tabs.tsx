'use client';

import React, { useState, ReactNode } from 'react';

export interface TabItem {
  id: string;
  label: string;
  roomType?: string;
  roomId?: string;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  children?: (activeTabId: string) => ReactNode;
  className?: string;
}

export function Tabs({ tabs, defaultTabId, onTabChange, children, className = '' }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTabId ?? tabs[0]?.id ?? '');

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <div className={className}>
      <div className="flex gap-2 overflow-x-auto border-b border-gray-200 dark:border-gray-700 px-4 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={`
              px-4 py-2 rounded-full text-sm whitespace-nowrap transition-colors
              ${activeTab === tab.id
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }
            `}
            data-tab-id={tab.id}
            data-room-type={tab.roomType}
            data-room-id={tab.roomId}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="p-4">
        {children ? children(activeTab) : null}
      </div>
    </div>
  );
}
