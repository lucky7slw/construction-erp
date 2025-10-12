'use client';

import * as React from 'react';

interface BrandingSettings {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  headingFont: string;
  bodyFont: string;
}

interface ThemeContextType {
  branding: BrandingSettings;
  updateBranding: (branding: BrandingSettings) => void;
}

const defaultBranding: BrandingSettings = {
  primaryColor: '#f97316',
  secondaryColor: '#0ea5e9',
  accentColor: '#10b981',
  headingFont: 'inter',
  bodyFont: 'inter',
};

const ThemeContext = React.createContext<ThemeContextType>({
  branding: defaultBranding,
  updateBranding: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = React.useState<BrandingSettings>(defaultBranding);

  // Load branding from localStorage on mount
  React.useEffect(() => {
    const savedBranding = localStorage.getItem('companyBranding');
    if (savedBranding) {
      try {
        const parsed = JSON.parse(savedBranding);
        setBranding(parsed);
        applyBranding(parsed);
      } catch (error) {
        console.error('Failed to load branding:', error);
      }
    }
  }, []);

  // Apply branding to CSS variables
  const applyBranding = React.useCallback((settings: BrandingSettings) => {
    const root = document.documentElement;

    // Apply colors as CSS variables
    root.style.setProperty('--brand-primary', settings.primaryColor);
    root.style.setProperty('--brand-secondary', settings.secondaryColor);
    root.style.setProperty('--brand-accent', settings.accentColor);

    // Convert hex to RGB for Tailwind compatibility
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`
        : '0 0 0';
    };

    root.style.setProperty('--brand-primary-rgb', hexToRgb(settings.primaryColor));
    root.style.setProperty('--brand-secondary-rgb', hexToRgb(settings.secondaryColor));
    root.style.setProperty('--brand-accent-rgb', hexToRgb(settings.accentColor));

    // Apply fonts
    const fontMap: Record<string, string> = {
      inter: "'Inter', sans-serif",
      roboto: "'Roboto', sans-serif",
      opensans: "'Open Sans', sans-serif",
      lato: "'Lato', sans-serif",
      montserrat: "'Montserrat', sans-serif",
      poppins: "'Poppins', sans-serif",
    };

    root.style.setProperty('--brand-heading-font', fontMap[settings.headingFont] || fontMap.inter);
    root.style.setProperty('--brand-body-font', fontMap[settings.bodyFont] || fontMap.inter);

    // Apply to body for immediate effect
    document.body.style.fontFamily = fontMap[settings.bodyFont] || fontMap.inter;
  }, []);

  const updateBranding = React.useCallback((newBranding: BrandingSettings) => {
    setBranding(newBranding);
    applyBranding(newBranding);
    localStorage.setItem('companyBranding', JSON.stringify(newBranding));
  }, [applyBranding]);

  return (
    <ThemeContext.Provider value={{ branding, updateBranding }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
