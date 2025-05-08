# Machine Vision HMI Styling System

This directory contains a complete styling system extracted from the Machine Vision HMI application. Use this system to create consistent UIs with the same look and feel in your new projects.

## Directory Structure

```
styling-system/
├── css/
│   ├── base.css          # Core variables and base styles
│   ├── components.css    # Component-specific styles
│   └── index.css         # Main CSS entry with Tailwind imports
├── config/
│   ├── tailwind.config.js # Tailwind CSS configuration
│   └── theme.js          # JavaScript theme variables
├── components/
│   └── Camera.jsx        # Sample React component using the styles
├── fonts/                # Font files (empty, using web imports)
└── README.md             # This file
```

## Getting Started

### 1. Install Dependencies

Add these dependencies to your package.json:

```json
{
  "dependencies": {
    "lucide-react": "^0.469.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "tailwindcss": "^3.4.17"
  }
}
```

### 2. Configure Tailwind CSS

Copy the `tailwind.config.js` to your project root and configure your content paths:

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Configuration from config/tailwind.config.js
    },
  },
  plugins: [],
}
```

### 3. Import CSS Files

Copy the CSS files to your project and import them in your main entry file:

```js
// In your main.jsx or index.js file
import './path/to/index.css';
```

## Styling System Overview

### Colors

The system uses a consistent color palette defined as CSS variables:

- Primary: `--color-primary` (`#646cff`)
- Success: `--color-success` (`#10b981`)
- Warning: `--color-warning` (`#f59e0b`)
- Error: `--color-error` (`#ef4444`)
- Info: `--color-info` (`#3b82f6`)

Each color is available both as a CSS variable and in the Tailwind config.

### Typography

The system uses the Inter font family imported from Google Fonts.

Font sizes are defined as variables:
- `--font-size-xs`: 12px
- `--font-size-sm`: 14px
- `--font-size-md`: 16px
- `--font-size-lg`: 18px
- `--font-size-xl`: 24px

### Spacing

Consistent spacing values are used throughout:
- `--spacing-xs`: 4px
- `--spacing-sm`: 8px
- `--spacing-md`: 16px
- `--spacing-lg`: 24px
- `--spacing-xl`: 32px

### Component Classes

The styling system includes ready-to-use classes for common UI components:

#### Cameras
- `.camera-container`: Main container for camera displays
- `.camera-image-container`: Container for the camera image
- `.camera-header`: Header section of the camera component
- `.camera-footer`: Footer section of the camera component

#### Status Indicators
- `.status-icon-success`: Green checkmark for success states
- `.status-icon-error`: Red X for error states
- `.status-icon-warning`: Amber triangle for warning states
- `.status-icon-info`: Blue circle for information

#### Detection Overlays
- `.detection-overlay`: Container for detection boxes
- `.detection-box`: Individual detection highlight box
- `.detection-label`: Label for detection boxes

### Using in JavaScript

For programmatic access to theme values, import from the theme.js file:

```jsx
import theme from './path/to/theme';

const MyComponent = () => {
  const buttonStyle = {
    backgroundColor: theme.colors.primary,
    padding: `${theme.spacing.sm} ${theme.spacing.md}`,
    borderRadius: theme.borderRadius.md,
  };
  
  return <button style={buttonStyle}>Click Me</button>;
};
```

## Sample Components

Check the `components/` directory for example components that demonstrate the styling system in use. You can copy and modify these for your own projects.

## Animations

The system includes predefined animations:

- `flashBorder`: Used for highlighting failing cameras with a pulsing red border

## Tailwind Classes

The styling system extends Tailwind with custom utility classes:

- Status badges: `.status-badge`, `.status-badge-success`, etc.
- Buttons: `.btn`, `.btn-primary`, `.btn-success`, etc.
- Cards: `.card`
- Layouts: `.container-layout`

## Customization

To customize the theme:

1. Modify the variables in `base.css` to change the core design tokens
2. Update the Tailwind config in `tailwind.config.js` to match your changes
3. If needed, update the JavaScript theme in `theme.js` with the same values

## License

This styling system is provided as-is under the same license as the Machine Vision HMI project. 