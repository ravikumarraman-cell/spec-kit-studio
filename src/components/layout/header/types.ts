import React from 'react';
import { ViewTab } from '../../../types/speckit';

export interface HeaderMenuItem {
  id: ViewTab;
  label: string;
  shortLabel: string;
  description: string;
  category: 'Core Specification' | 'Execution & Tasks' | 'Governance & AI';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  activeColor: string;
  badge?: string;
  badgeVariant?: 'default' | 'cyan' | 'indigo' | 'emerald' | 'purple' | 'amber';
  shortcutKey: string; // e.g. '⌥1'
  shortcutDigit: number; // 1-9 for Alt+Digit
}
