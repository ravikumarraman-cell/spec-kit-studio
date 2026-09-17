import React, { useState, useRef, useEffect, memo } from 'react';
import {
  Search,
  ChevronDown,
  CheckCircle2,
  Sparkles,
  Command,
  ArrowRight,
  X
} from 'lucide-react';
import { ViewTab } from '../../../types/speckit';
import { HeaderMenuItem } from './types';

interface AllMenusDropdownProps {
  menuItems: HeaderMenuItem[];
  activeTab: ViewTab;
  onSelectTab: (tab: ViewTab) => void;
  onOpenAiSpecModal?: () => void;
  onOpenQuickSearch: () => void;
}

export const AllMenusDropdown: React.FC<AllMenusDropdownProps> = memo(({
  menuItems,
  activeTab,
  onSelectTab,
  onOpenAiSpecModal,
  onOpenQuickSearch,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on click outside or Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const filteredItems = menuItems.filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      (item.badge && item.badge.toLowerCase().includes(q))
    );
  });

  const categories: Array<HeaderMenuItem['category']> = [
    'Core Specification',
    'Execution & Tasks',
    'Governance & AI',
  ];

  return (
    <div className="relative shrink-0" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
          isOpen
            ? 'bg-zinc-800 text-cyan-300 border-zinc-700 shadow-sm'
            : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border-zinc-800/90'
        }`}
        title="Browse all Spec-Kit menus & modules"
      >
        <span className="text-[11px] font-medium tracking-wide">All Menus</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-cyan-400' : 'text-zinc-400'
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl bg-zinc-950/95 border border-zinc-800/90 shadow-2xl backdrop-blur-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-xs">
          {/* Header & Instant Filter */}
          <div className="space-y-2 pb-2.5 border-b border-zinc-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
                Workflow Modules Navigator
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                Press ⌥1-⌥9 to jump
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Filter menus by name, badge, or keyword..."
                className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-100 text-xs placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/50"
              />
              {filterQuery && (
                <button
                  type="button"
                  onClick={() => setFilterQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Grouped Menu List */}
          <div className="max-h-80 overflow-y-auto py-2 space-y-3 pr-1">
            {categories.map((cat) => {
              const items = filteredItems.filter((i) => i.category === cat);
              if (items.length === 0) return null;

              return (
                <div key={cat} className="space-y-1">
                  <div className="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-zinc-500 font-mono">
                    {cat}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((item) => {
                      const isActive = activeTab === item.id;
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(item.id);
                            setIsOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl flex items-center justify-between gap-2.5 transition-all group ${
                            isActive
                              ? 'bg-gradient-to-r from-cyan-500/15 via-indigo-500/10 to-transparent text-cyan-300 font-bold border border-cyan-500/30'
                              : 'hover:bg-zinc-900/90 text-zinc-300 hover:text-zinc-100 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                                isActive
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'bg-zinc-900 text-zinc-400 group-hover:text-zinc-200 group-hover:bg-zinc-800'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="truncate">
                              <div className="text-xs font-semibold flex items-center gap-1.5 truncate">
                                <span>{item.label}</span>
                                {item.badge && (
                                  <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-zinc-900 text-zinc-400 border border-zinc-800 font-normal">
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-zinc-500 truncate font-normal">
                                {item.description}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.5 rounded bg-zinc-900/80 border border-zinc-800">
                              {item.shortcutKey}
                            </span>
                            {isActive && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="p-6 text-center text-zinc-500 text-xs">
                No matching menus found for "{filterQuery}".
              </div>
            )}
          </div>

          {/* Quick Launch & AI Footer */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onOpenQuickSearch();
              }}
              className="text-zinc-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <Command className="w-3 h-3" />
              <span>Omnibox (⌘K)</span>
            </button>

            {onOpenAiSpecModal && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAiSpecModal();
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold flex items-center gap-1 transition-colors"
              >
                <Sparkles className="w-3 h-3 text-indigo-300" />
                <span>AI Spec Generator</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

AllMenusDropdown.displayName = 'AllMenusDropdown';
