# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
```
# Development
npm run dev           # Run development server
npm run build         # Build for production
npm run preview       # Preview production build
npm run lint          # Run ESLint

# Testing
# No specific test scripts configured
```

## Code Style Guidelines
- **Imports**: Group imports by type (React, components, utilities)
- **Component Structure**: Function components with hooks
- **Formatting**: Use 2-space indentation 
- **Naming**: Use PascalCase for components, camelCase for variables/functions
- **Error Handling**: Try/catch blocks with appropriate fallbacks (see image loading)
- **CSS**: Use Tailwind CSS classes for styling
- **Component Props**: Document props with JSDoc or inline comments
- **File Organization**: Group related components in /components directory
- **React Best Practices**: Follow React hooks rules, use React.memo for performance optimization when needed
- **TODOs**: Mark todos with // TODO: comment

## Project Architecture

### Main Components
- **App.jsx**: Root component with state management for camera selection
- **CameraGrid**: Container component displaying a responsive grid of camera cards
- **CameraCard**: Shows individual camera feeds with real-time status updates
- **ExpandedCameraModal**: Detailed view with advanced inspection features
- **Header**: Displays logos in the application header
- **MetadataBar**: Shows metadata about the current manufacturing context

### Key Features
- **Real-time Visual Inspection**: Monitors multiple camera feeds simultaneously
- **Defect Detection**: Uses YOLO format annotations to mark defects on images
- **Pan/Zoom Interface**: Uses @panzoom/panzoom for detailed image inspection
- **Failure Analysis**: Thresholds for defect size, density, and proximity
- **Region Definition**: Custom inspection regions with separate failure criteria
- **Disposition Workflow**: Defect navigation and disposition controls

### State Management
- Uses React's built-in useState and useEffect hooks
- Local storage for region configuration persistence
- No global state management library

### Image Processing
- Defect detection via YOLO format text files (normalized coordinates)
- Coordinate transformation for different viewport sizes
- Automatic image fallbacks for error handling

### Authentication
- Simple time-based PIN for accessing admin controls (current time format HHmm)

## Styling System
Located in `/styling-system/` for reuse in related projects:
- Tailwind CSS for utility-based styling
- Custom CSS animations for status indicators
- Consistent color palette and spacing
- Responsive breakpoints for different screen sizes