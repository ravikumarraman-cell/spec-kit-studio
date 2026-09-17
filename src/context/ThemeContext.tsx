import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeId = 'system' | 'github-dark' | 'github-light' | 'warm-paper';

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  mode: 'system' | 'dark' | 'light';
  description: string;
  bgHex: string;
  cardHex: string;
  textHex: string;
  accentHex: string;
}

export const THEME_PRESETS: ThemeMeta[] = [
  {
    id: 'system',
    name: 'System Default',
    mode: 'system',
    description: 'Automatically match your operating system appearance (macOS / Windows / Linux).',
    bgHex: '#0d1117',
    cardHex: '#161b22',
    textHex: '#f0f6fc',
    accentHex: '#38bdf8',
  },
  {
    id: 'github-dark',
    name: 'Obsidian Dark',
    mode: 'dark',
    description: 'GitHub & Linear inspired dark canvas (#090d16) with high contrast text and cyan accents.',
    bgHex: '#090d16',
    cardHex: '#0f172a',
    textHex: '#f8fafc',
    accentHex: '#06b6d4',
  },
  {
    id: 'github-light',
    name: 'Nordic Light',
    mode: 'light',
    description: 'Crisp GitHub/Stripe clean light theme (#f8fafc) with pure white cards and midnight slate text.',
    bgHex: '#f8fafc',
    cardHex: '#ffffff',
    textHex: '#0f172a',
    accentHex: '#0284c7',
  },
  {
    id: 'warm-paper',
    name: 'Warm Paper',
    mode: 'light',
    description: 'Warm editorial cream canvas (#faf8f5) with terracotta accents and rich charcoal text.',
    bgHex: '#faf8f5',
    cardHex: '#ffffff',
    textHex: '#1c1917',
    accentHex: '#c2410c',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  resolvedMode: 'light' | 'dark';
  currentThemeMeta: ThemeMeta;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem('speckit_theme_id') as ThemeId;
    if (saved && (saved === 'system' || saved === 'github-dark' || saved === 'github-light' || saved === 'warm-paper')) {
      return saved;
    }
    // Backward compatibility for previously saved names
    if (saved === ('obsidian' as any)) return 'github-dark';
    if (saved === ('nordic-light' as any)) return 'github-light';
    return 'system';
  });

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Listen to OS theme changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemIsDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    localStorage.setItem('speckit_theme_id', newTheme);
  };

  // Determine effective mode
  const resolvedMode: 'light' | 'dark' =
    theme === 'system'
      ? systemIsDark
        ? 'dark'
        : 'light'
      : theme === 'github-dark'
      ? 'dark'
      : 'light';

  const isDark = resolvedMode === 'dark';

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(resolvedMode === 'dark' ? 'github-light' : 'github-dark');
    } else if (theme === 'github-dark') {
      setTheme('github-light');
    } else if (theme === 'github-light') {
      setTheme('warm-paper');
    } else {
      setTheme('system');
    }
  };

  useEffect(() => {
    const root = document.documentElement;
    // Map theme to data-theme attribute
    const dataTheme =
      theme === 'system'
        ? systemIsDark
          ? 'obsidian'
          : 'nordic-light'
        : theme === 'github-dark'
        ? 'obsidian'
        : theme === 'warm-paper'
        ? 'warm-paper'
        : 'nordic-light';

    root.setAttribute('data-theme', dataTheme);
    root.setAttribute('data-mode', resolvedMode);

    if (resolvedMode === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  }, [theme, resolvedMode, systemIsDark]);

  const currentThemeMeta = THEME_PRESETS.find((t) => t.id === theme) || THEME_PRESETS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        resolvedMode,
        currentThemeMeta,
        isDark,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
