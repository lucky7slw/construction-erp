# Company Branding Theme System

## Overview
The theme system allows you to customize your company's branding including colors and fonts. Changes are applied globally across the entire application in real-time.

## How It Works

### 1. Theme Provider
Located in `src/lib/theme-provider.tsx`, this provider:
- Loads branding settings from localStorage on app startup
- Applies branding to CSS variables
- Provides a hook to update branding from anywhere in the app

### 2. Settings Page
Go to **Settings → Company → Company Branding & Customization** to:
- Upload company logo and favicon
- Choose primary, secondary, and accent colors
- Select heading and body fonts
- See live preview of your changes

### 3. Using Brand Colors in Components

#### Option 1: CSS Classes
```tsx
// Use the predefined classes
<div className="bg-brand-primary text-white">
  Primary colored background
</div>

<h1 className="text-brand-secondary font-brand-heading">
  Secondary colored heading with brand font
</h1>

<button className="bg-brand-accent hover:bg-brand-accent/90">
  Accent colored button
</button>
```

#### Option 2: CSS Variables
```tsx
// Use CSS variables directly
<div style={{ backgroundColor: 'var(--brand-primary)' }}>
  Custom styling
</div>
```

#### Option 3: useTheme Hook
```tsx
import { useTheme } from '@/lib/theme-provider';

function MyComponent() {
  const { branding, updateBranding } = useTheme();
  
  return (
    <div style={{ color: branding.primaryColor }}>
      Using theme hook
    </div>
  );
}
```

## Available CSS Classes

### Background Colors
- `bg-brand-primary`
- `bg-brand-secondary`
- `bg-brand-accent`

### Text Colors
- `text-brand-primary`
- `text-brand-secondary`
- `text-brand-accent`

### Border Colors
- `border-brand-primary`
- `border-brand-secondary`
- `border-brand-accent`

### Fonts
- `font-brand-heading` - For headings
- `font-brand-body` - For body text

### Hover States
All color classes have hover variants:
- `hover:bg-brand-primary`
- `hover:text-brand-secondary`
- etc.

## Available CSS Variables

### Colors
- `--brand-primary` - Primary brand color (hex)
- `--brand-secondary` - Secondary brand color (hex)
- `--brand-accent` - Accent brand color (hex)
- `--brand-primary-rgb` - Primary color as RGB values
- `--brand-secondary-rgb` - Secondary color as RGB values
- `--brand-accent-rgb` - Accent color as RGB values

### Fonts
- `--brand-heading-font` - Font family for headings
- `--brand-body-font` - Font family for body text

## Available Fonts

- Inter (default)
- Roboto
- Open Sans
- Lato
- Montserrat
- Poppins

## Programmatic Updates

```tsx
import { useTheme } from '@/lib/theme-provider';

function BrandingControls() {
  const { branding, updateBranding } = useTheme();
  
  const changePrimaryColor = () => {
    updateBranding({
      ...branding,
      primaryColor: '#ff0000', // New color
    });
  };
  
  return <button onClick={changePrimaryColor}>Change Color</button>;
}
```

## Storage

Branding settings are automatically saved to `localStorage` under the key `companyBranding` and persist across sessions.

## Example Usage

```tsx
// Card with brand colors
<Card className="border-brand-primary">
  <CardHeader className="bg-brand-primary text-white">
    <CardTitle className="font-brand-heading">
      Branded Card
    </CardTitle>
  </CardHeader>
  <CardContent className="font-brand-body">
    Content using brand body font
  </CardContent>
</Card>

// Button with brand accent
<Button className="bg-brand-accent hover:bg-brand-accent/90">
  Accent Button
</Button>

// Text with brand colors
<h1 className="text-brand-primary font-brand-heading text-4xl">
  Primary Heading
</h1>
<p className="text-brand-secondary font-brand-body">
  Secondary text
</p>
```

## Notes

- Changes apply immediately across the entire app
- Settings persist in localStorage
- The body font is applied globally to `document.body`
- All fonts are loaded from Google Fonts
- Color pickers support hex values
- RGB values are provided for Tailwind compatibility
