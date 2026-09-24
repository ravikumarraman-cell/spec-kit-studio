import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ThemeId = 'system' | 'github-dark' | 'github-light' | 'warm-paper' | 'optum';

/**
 * The only source of truth for Studio colour. Components use semantic utility
 * roles, while the provider publishes these tokens as CSS custom properties.
 * Keeping the palette here makes themes interchangeable without a component
 * having to know a brand colour or a contrast exception.
 */
export interface ThemePalette {
  canvas: string;
  surface: string;
  inset: string;
  raised: string;
  border: string;
  borderStrong: string;
  text: string;
  muted: string;
  faint: string;
  primary: string;
  primaryStrong: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  warm: string;
  warmText: string;
  warmForeground: string;
  infoTint: string;
  successTint: string;
  warningTint: string;
  dangerTint: string;
  gradientStart: string;
  gradientMiddle: string;
  gradientEnd: string;
}

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  mode: 'system' | 'dark' | 'light';
  description: string;
  bgHex: string;
  cardHex: string;
  textHex: string;
  accentHex: string;
  palette: ThemePalette;
}

export const THEME_PALETTES = {
  dark: {
    canvas: '#090d16', surface: '#0f172a', inset: '#0b0f19', raised: '#1e293b', border: '#334155', borderStrong: '#475569',
    text: '#f8fafc', muted: '#cbd5e1', faint: '#94a3b8', primary: '#22c1d6', primaryStrong: '#67e8f9', secondary: '#a78bfa',
    success: '#6ee7b7', warning: '#fcd34d', danger: '#fda4af', warm: '#9a3412', warmText: '#fdba74', warmForeground: '#f8fafc', infoTint: '#123447', successTint: '#123d32', warningTint: '#493717', dangerTint: '#471d28',
    gradientStart: '#0c2636', gradientMiddle: '#0f172a', gradientEnd: '#101827',
  },
  light: {
    canvas: '#f8fafc', surface: '#ffffff', inset: '#f1f5f9', raised: '#e2e8f0', border: '#cbd5e1', borderStrong: '#94a3b8',
    text: '#0f172a', muted: '#475569', faint: '#64748b', primary: '#0369a1', primaryStrong: '#075985', secondary: '#4338ca',
    success: '#047857', warning: '#92400e', danger: '#991b1b', warm: '#f97316', warmText: '#b45309', warmForeground: '#0f172a', infoTint: '#cffafe', successTint: '#d1fae5', warningTint: '#fef3c7', dangerTint: '#fee2e2',
    gradientStart: '#e0f2fe', gradientMiddle: '#f8fafc', gradientEnd: '#ffffff',
  },
  warm: {
    canvas: '#faf8f5', surface: '#ffffff', inset: '#f5f0e8', raised: '#ece4d5', border: '#e5dec9', borderStrong: '#cdbf9f',
    text: '#1c1917', muted: '#57534e', faint: '#78716c', primary: '#b45309', primaryStrong: '#92400e', secondary: '#3730a3',
    success: '#047857', warning: '#92400e', danger: '#991b1b', warm: '#c2410c', warmText: '#9a3412', warmForeground: '#ffffff', infoTint: '#f5ead8', successTint: '#dff3e9', warningTint: '#fef3c7', dangerTint: '#fee2e2',
    gradientStart: '#f5ead8', gradientMiddle: '#faf8f5', gradientEnd: '#ffffff',
  },
  optum: {
    canvas: '#f5f8fa', surface: '#ffffff', inset: '#f7fbfc', raised: '#edf5f8', border: '#c4d6e0', borderStrong: '#7892a8',
    text: '#002677', muted: '#36546a', faint: '#526d82', primary: '#0067b9', primaryStrong: '#004f91', secondary: '#5d3f95',
    success: '#087455', warning: '#92510b', danger: '#a12b3a', warm: '#f58220', warmText: '#a94600', warmForeground: '#002677', infoTint: '#dff3f6', successTint: '#e0f3e9', warningTint: '#fff0da', dangerTint: '#fbe5e8',
    gradientStart: '#dff3f6', gradientMiddle: '#f5fafb', gradientEnd: '#ffffff',
  },
} satisfies Record<string, ThemePalette>;

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
    palette: THEME_PALETTES.dark,
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
    palette: THEME_PALETTES.dark,
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
    palette: THEME_PALETTES.light,
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
    palette: THEME_PALETTES.warm,
  },
  {
    id: 'optum',
    name: 'Optum-inspired',
    mode: 'light',
    description: 'A calm healthcare-inspired light palette: warm white, deep navy, clear blue, and restrained orange emphasis.',
    bgHex: '#f7f7f5',
    cardHex: '#ffffff',
    textHex: '#002677',
    accentHex: '#f58220',
    palette: THEME_PALETTES.optum,
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
    if (saved && (saved === 'system' || saved === 'github-dark' || saved === 'github-light' || saved === 'warm-paper' || saved === 'optum')) {
      return saved;
    }
    // Backward compatibility for previously saved names
    if (saved === ('obsidian' as any)) return 'github-dark';
    if (saved === ('nordic-light' as any)) return 'github-light';
    // Studio's default is intentionally a calm, accessible light surface.
    // System-dark remains available, but it must be an explicit choice rather
    // than turning an Optum-inspired workspace into a dark developer console.
    return 'optum';
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
  const currentThemeMeta = THEME_PRESETS.find((t) => t.id === theme) || THEME_PRESETS[0];

  const toggleTheme = () => {
    const order: ThemeId[] = ['optum', 'github-light', 'warm-paper', 'github-dark', 'system'];
    const currentIndex = order.indexOf(theme);
    setTheme(order[(currentIndex + 1) % order.length]);
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
        : theme === 'optum'
        ? 'optum'
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

    const palette = theme === 'system'
      ? (systemIsDark ? THEME_PALETTES.dark : THEME_PALETTES.light)
      : currentThemeMeta.palette;
    const properties: Record<string, string> = {
      '--bg-canvas': palette.canvas,
      '--bg-surface': palette.surface,
      '--bg-surface-hover': palette.raised,
      '--bg-card': palette.surface,
      '--bg-input': palette.inset,
      '--border-subtle': palette.border,
      '--border-strong': palette.borderStrong,
      '--text-main': palette.text,
      '--text-muted': palette.muted,
      '--text-faint': palette.faint,
      '--accent-primary': palette.primary,
      '--accent-indigo': palette.secondary,
      '--accent-purple': palette.secondary,
      '--accent-emerald': palette.success,
      '--theme-canvas': palette.canvas,
      '--theme-surface': palette.surface,
      '--theme-inset': palette.inset,
      '--theme-raised': palette.raised,
      '--theme-border': palette.border,
      '--theme-text': palette.text,
      '--theme-muted': palette.muted,
      '--theme-faint': palette.faint,
      '--theme-primary': palette.primary,
      '--theme-primary-strong': palette.primaryStrong,
      '--theme-secondary': palette.secondary,
      '--theme-success': palette.success,
      '--theme-warning': palette.warning,
      '--theme-danger': palette.danger,
      '--theme-warm': palette.warm,
      '--theme-warm-text': palette.warmText,
      '--theme-warm-foreground': palette.warmForeground,
      '--theme-info-tint': palette.infoTint,
      '--theme-success-tint': palette.successTint,
      '--theme-warning-tint': palette.warningTint,
      '--theme-danger-tint': palette.dangerTint,
      '--theme-gradient-start': palette.gradientStart,
      '--theme-gradient-middle': palette.gradientMiddle,
      '--theme-gradient-end': palette.gradientEnd,
    };
    Object.entries(properties).forEach(([property, value]) => root.style.setProperty(property, value));
  }, [theme, resolvedMode, systemIsDark, currentThemeMeta.palette]);

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
