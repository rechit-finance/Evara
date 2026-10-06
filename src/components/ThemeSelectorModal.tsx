import React from 'react';
import { X, Palette, Check, Type, LayoutGrid } from 'lucide-react';
import { DensityMode, TypographyStyle, UIThemeId, UI_THEMES } from '../types/theme';

interface ThemeSelectorModalProps {
  currentThemeId: UIThemeId;
  currentTypography: TypographyStyle;
  currentDensity: DensityMode;
  onSelectTheme: (themeId: UIThemeId) => void;
  onSelectTypography: (typography: TypographyStyle) => void;
  onSelectDensity: (density: DensityMode) => void;
  onClose: () => void;
}

export const ThemeSelectorModal: React.FC<ThemeSelectorModalProps> = ({
  currentThemeId,
  currentTypography,
  currentDensity,
  onSelectTheme,
  onSelectTypography,
  onSelectDensity,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="theme-surface border theme-border rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col transition-colors duration-250">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b theme-border theme-header flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg theme-accent-bg font-bold flex items-center justify-center shadow-md">
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-100">
                Choose UI Visual Style
              </h2>
              <p className="text-xs text-stone-400">
                Customize atmospheric palette, typography, and density
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-200 theme-inner rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-6 overflow-y-auto text-xs">
          {/* Section 1: Visual Theme Palettes */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-mono text-stone-300 uppercase tracking-wider text-[11px] font-semibold flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 theme-accent-text" />
                <span>Atmospheric Visual Theme</span>
              </h3>
              <span className="text-[10px] text-stone-400 font-mono">Instant Live Preview</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {Object.values(UI_THEMES).map((theme) => {
                const isSelected = currentThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    onClick={() => onSelectTheme(theme.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'theme-card theme-card-selected shadow-md ring-1'
                        : 'theme-card hover:brightness-110'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Color swatch dots */}
                      <div className="flex items-center -space-x-1.5 shrink-0">
                        {theme.previewColors.map((color, i) => (
                          <div
                            key={i}
                            className="w-5 h-5 rounded-full border-2 border-stone-900 shadow-sm"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h4
                            className={`font-bold text-xs ${
                              isSelected ? 'theme-accent-text' : 'text-stone-200 group-hover:text-stone-100'
                            }`}
                          >
                            {theme.name}
                          </h4>
                          {isSelected && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded theme-badge border">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-stone-400 mt-0.5">{theme.tagline}</p>
                      </div>
                    </div>

                    <div className="shrink-0 ml-2">
                      {isSelected ? (
                        <div className="w-5 h-5 rounded-full theme-accent-bg flex items-center justify-center font-bold">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border theme-border group-hover:border-stone-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Typography Style */}
          <div className="space-y-2.5 pt-2 border-t theme-border">
            <h3 className="font-mono text-stone-300 uppercase tracking-wider text-[11px] font-semibold flex items-center gap-1.5">
              <Type className="w-3.5 h-3.5 theme-accent-text" />
              <span>Typography Styling</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  id: 'editorial',
                  title: 'Literary Serif',
                  desc: 'Storybook & historical chronicle feel',
                  fontPreview: 'font-serif',
                },
                {
                  id: 'technical',
                  title: 'Precision Monospace',
                  desc: 'Scientific world simulation console',
                  fontPreview: 'font-mono',
                },
                {
                  id: 'minimal',
                  title: 'Modern Sans',
                  desc: 'Clean, neutral, and restrained',
                  fontPreview: 'font-sans',
                },
              ].map((t) => {
                const isSelected = currentTypography === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTypography(t.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'theme-card theme-card-selected text-stone-100'
                        : 'theme-card text-stone-400 hover:brightness-110'
                    }`}
                  >
                    <span className={`text-base font-bold block mb-1 ${t.fontPreview} ${isSelected ? 'theme-accent-text' : 'text-stone-300'}`}>
                      Aa Evara
                    </span>
                    <span className="font-semibold block text-xs text-stone-200">{t.title}</span>
                    <span className="text-[10px] text-stone-400 block mt-0.5">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Information Density */}
          <div className="space-y-2.5 pt-2 border-t theme-border">
            <h3 className="font-mono text-stone-300 uppercase tracking-wider text-[11px] font-semibold flex items-center gap-1.5">
              <LayoutGrid className="w-3.5 h-3.5 theme-accent-text" />
              <span>Display Density</span>
            </h3>

            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  id: 'comfortable',
                  title: 'Comfortable & Atmospheric',
                  desc: 'Spacious cards, rich padding, immersive text',
                },
                {
                  id: 'compact',
                  title: 'Compact Simulation Monitor',
                  desc: 'High information density, condensed telemetry',
                },
              ].map((d) => {
                const isSelected = currentDensity === d.id;
                return (
                  <button
                    key={d.id}
                    onClick={() => onSelectDensity(d.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'theme-card theme-card-selected text-stone-100'
                        : 'theme-card text-stone-400 hover:brightness-110'
                    }`}
                  >
                    <span className={`font-semibold block text-xs ${isSelected ? 'theme-accent-text' : 'text-stone-200'}`}>
                      {d.title}
                    </span>
                    <span className="text-[10px] text-stone-400 block mt-0.5">{d.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t theme-border theme-header flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg theme-accent-bg font-bold text-xs transition-colors shadow-sm cursor-pointer"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
};
