# Ford Livonia Porosity HMI

A machine vision HMI (Human-Machine Interface) application for detecting porosity defects in manufacturing components at Ford Livonia Transmission Plant.

## Features

- Multi-camera monitoring interface with real-time status updates
- Automatic defect detection and visualization
- Camera grid view with expandable detailed inspection mode
- Pan/zoom capabilities for detailed image inspection
- Responsive layout with Tailwind CSS styling

## Tech Stack

- React 18
- Vite 6
- Tailwind CSS
- ESLint 9
- Konva for image annotations
- PanZoom for image manipulation

## Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Navigate to the project directory
cd Ford_Livonia_Porosity_HMI/machine-vision-hmi

# Install dependencies
npm install
```

### Development

```bash
# Start the development server
npm run dev

# Build for production
npm run build

# Preview the production build
npm run preview

# Run linting
npm run lint
```

## Project Structure

- `/public/images` - Camera sample images and defect data
- `/src/components` - React components
- `/src/assets` - Static assets
- `/styling-system` - Styling configuration and components

## License

Proprietary - USS (United Smart Systems)