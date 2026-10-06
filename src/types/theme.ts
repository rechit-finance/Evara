export type UIThemeId =
  | 'scriptorium'
  | 'obsidian_terminal'
  | 'nordic_mist'
  | 'alchemical_brass'
  | 'lunar_starlight';

export type TypographyStyle = 'editorial' | 'technical' | 'minimal';
export type DensityMode = 'comfortable' | 'compact';

export interface UITheme {
  id: UIThemeId;
  name: string;
  tagline: string;
  bgColor: string;
  cardBg: string;
  cardBorder: string;
  primaryAccent: string;
  secondaryAccent: string;
  accentText: string;
  fontHeadingClass: string;
  previewColors: string[];
}

export const UI_THEMES: Record<UIThemeId, UITheme> = {
  scriptorium: {
    id: 'scriptorium',
    name: 'Archive Scriptorium',
    tagline: 'Warm sepia parchment, aged mahogany, and literary warmth',
    bgColor: 'bg-stone-950',
    cardBg: 'bg-stone-900/80',
    cardBorder: 'border-stone-800',
    primaryAccent: 'bg-amber-600',
    secondaryAccent: 'border-amber-700/60',
    accentText: 'text-amber-400',
    fontHeadingClass: 'font-serif',
    previewColors: ['#1c1917', '#292524', '#d97706', '#f59e0b'],
  },
  obsidian_terminal: {
    id: 'obsidian_terminal',
    name: 'Obsidian Terminal',
    tagline: 'Deep ink-black minimal simulation console with phosphor telemetry',
    bgColor: 'bg-zinc-950',
    cardBg: 'bg-zinc-900/90',
    cardBorder: 'border-zinc-800',
    primaryAccent: 'bg-emerald-500',
    secondaryAccent: 'border-emerald-600/60',
    accentText: 'text-emerald-400',
    fontHeadingClass: 'font-mono',
    previewColors: ['#09090b', '#18181b', '#10b981', '#34d399'],
  },
  nordic_mist: {
    id: 'nordic_mist',
    name: 'Nordic Sanctuary',
    tagline: 'Cool mountain slate, frosted pine, and alpine mist',
    bgColor: 'bg-slate-950',
    cardBg: 'bg-slate-900/80',
    cardBorder: 'border-slate-800',
    primaryAccent: 'bg-teal-500',
    secondaryAccent: 'border-teal-700/50',
    accentText: 'text-teal-400',
    fontHeadingClass: 'font-sans',
    previewColors: ['#020617', '#0f172a', '#14b8a6', '#2dd4bf'],
  },
  alchemical_brass: {
    id: 'alchemical_brass',
    name: 'Chrono-Smith Brass',
    tagline: 'Burnished copper, waterwheel timber, and horological gears',
    bgColor: 'bg-[#15100e]',
    cardBg: 'bg-[#1f1714]/85',
    cardBorder: 'border-[#382820]',
    primaryAccent: 'bg-orange-600',
    secondaryAccent: 'border-orange-700/60',
    accentText: 'text-orange-400',
    fontHeadingClass: 'font-serif',
    previewColors: ['#15100e', '#261b16', '#ea580c', '#fb923c'],
  },
  lunar_starlight: {
    id: 'lunar_starlight',
    name: 'Celestial Starlight',
    tagline: 'Nocturnal deep indigo, astral violet, and silver starlight',
    bgColor: 'bg-[#0b0c16]',
    cardBg: 'bg-[#121424]/85',
    cardBorder: 'border-[#232742]',
    primaryAccent: 'bg-violet-600',
    secondaryAccent: 'border-violet-700/60',
    accentText: 'text-violet-400',
    fontHeadingClass: 'font-sans',
    previewColors: ['#0b0c16', '#17192d', '#7c3aed', '#a78bfa'],
  },
};
