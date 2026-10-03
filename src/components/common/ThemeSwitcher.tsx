import React, { useState, useRef, useEffect } from 'react';
import { Palette, Check, Moon, Sun, Feather, Laptop, HeartPulse } from 'lucide-react';
import { useTheme, THEME_PRESETS, ThemeId } from '../../context/ThemeContext';

export const ThemeSwitcher: React.FC = () => {
  const { theme, setTheme, currentThemeMeta, resolvedMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getThemeIcon = (id: ThemeId) => {
    switch (id) {
      case 'system':
        return <Laptop className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />;
      case 'github-dark':
        return <Moon className="w-3.5 h-3.5 text-cyan-400" />;
      case 'github-light':
        return <Sun className="w-3.5 h-3.5 text-sky-600" />;
      case 'warm-paper':
        return <Feather className="w-3.5 h-3.5 text-amber-600" />;
      case 'optum':
        return <HeartPulse className="w-3.5 h-3.5 text-orange-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 border border-slate-300 dark:border-zinc-700 text-xs font-semibold text-slate-800 dark:text-zinc-200 flex items-center gap-2 transition-all shadow-xs"
        title="Switch Theme & Appearance"
      >
        <Palette className="w-3.5 h-3.5 text-sky-600 dark:text-cyan-400" />
        <span className="hidden sm:inline font-medium text-[11px]">{currentThemeMeta.name}</span>
        <div className="flex items-center gap-1 pl-1 border-l border-slate-300 dark:border-zinc-700">
          <div
            className="w-2.5 h-2.5 rounded-full border border-black/20 dark:border-white/20"
            style={{ backgroundColor: currentThemeMeta.bgHex }}
          />
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: currentThemeMeta.accentHex }}
          />
        </div>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 p-2.5 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-2xl z-50 text-xs space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 border-b border-slate-200 dark:border-zinc-800/80 flex items-center justify-between text-slate-500 dark:text-zinc-400 font-bold uppercase text-[10px] tracking-wider">
            <span>Centralized Theme System</span>
            <span className="text-[10px] font-mono text-sky-600 dark:text-cyan-400 capitalize">
              {resolvedMode} Active
            </span>
          </div>

          <div className="space-y-1.5 pt-1">
            {THEME_PRESETS.map((preset) => {
              const isSelected = theme === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => {
                    setTheme(preset.id);
                    setIsOpen(false);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-start justify-between gap-3 transition-all border ${
                    isSelected
                      ? 'bg-sky-50 dark:bg-zinc-800 border-sky-400 dark:border-cyan-500/50 text-slate-900 dark:text-zinc-100 shadow-xs'
                      : 'border-transparent hover:bg-slate-100 dark:hover:bg-zinc-800/50 text-slate-700 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 shrink-0 mt-0.5">
                      {getThemeIcon(preset.id)}
                    </div>
                    <div className="space-y-0.5">
                      <div className="font-bold text-xs flex items-center gap-2">
                        <span>{preset.name}</span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 border border-slate-300 dark:border-zinc-800">
                          {preset.mode}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-zinc-400 leading-tight">
                        {preset.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between self-stretch shrink-0">
                    {isSelected ? (
                      <Check className="w-4 h-4 text-sky-600 dark:text-cyan-400" />
                    ) : (
                      <div className="w-4 h-4" />
                    )}

                    {/* Color Swatches */}
                    <div className="flex items-center gap-1 p-0.5 rounded bg-slate-100 dark:bg-zinc-950 border border-slate-300 dark:border-zinc-800 mt-2">
                      <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: preset.bgHex }} />
                      <div className="w-2.5 h-2.5 rounded-full border border-black/10" style={{ backgroundColor: preset.cardHex }} />
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: preset.accentHex }} />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
