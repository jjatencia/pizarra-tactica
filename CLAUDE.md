# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **football tactical board PWA** (Progressive Web App) optimized for iPad. It allows football coaches to create tactical diagrams with player positions, arrows, and movements in a touch-friendly interface.

## Development Commands

### Core Commands
- `npm install` - Install dependencies  
- `npm run dev` - Start development server (http://localhost:5173)
- `npm run build` - Build for production (TypeScript compile + Vite build)
- `npm run preview` - Preview production build
- `npm run type-check` - TypeScript type checking without compilation

### Testing and Quality
- Run the development server and test manually on iPad Safari
- Check TypeScript errors with `npm run type-check`
- No automated test suite configured

## Architecture & Tech Stack

### Core Technologies
- **React 18** + **TypeScript** (strict mode)
- **Vite 5** for build tooling with ESNext target
- **TailwindCSS** for styling
- **Zustand** for state management (lightweight alternative to Redux)
- **PWA** capabilities via `vite-plugin-pwa` + Workbox

### Key Dependencies
- `dexie` - IndexedDB wrapper for local data persistence
- `openai` - AI integration for tactical suggestions
- `uuid` - Unique ID generation  
- `zod` - Runtime type validation
- `clsx` - Conditional CSS class names

## Project Structure

### Core Application Files
```
src/
├── App.tsx                 # Main app component with board layout
├── main.tsx               # React entry point
├── hooks/
│   ├── useBoardStore.ts   # Zustand store for tactical board state
│   ├── usePointerInteractions.ts # Touch/mouse gesture handling
│   ├── useZoomPan.ts      # Zoom and pan controls
│   └── useSimpleDrawing.ts # Canvas drawing functionality
├── components/
│   ├── Pitch.tsx          # Football field SVG component
│   ├── Token.tsx          # Draggable player tokens
│   ├── ArrowsLayer.tsx    # Tactical arrows overlay
│   ├── TrajectoriesLayer.tsx # Player movement paths
│   └── Toolbar.tsx        # Main controls toolbar
└── types/
    ├── index.ts           # Core types (Token, Arrow, Team, etc.)
    └── canvas.ts          # Canvas-specific types
```

### Key Architecture Patterns

#### State Management (Zustand)
- **Central store**: `useBoardStore.ts` manages all tactical board state
- **Persistence**: Auto-saves to localStorage on state changes
- **History**: Undo/redo system with 50-state history
- **Teams**: Supports 4 teams (red, blue, green, yellow) with max 11 players each

#### Touch Interactions
- **Multi-modal**: Switch between select, arrow, trajectory, and drawing modes
- **Gesture handling**: Separate hooks for pointer interactions, zoom/pan
- **Canvas overlay**: Drawing layer above SVG for free-form annotations

#### Component Organization
- **SVG-based field**: Scalable football pitch with accurate proportions (105×68m)
- **Token system**: Draggable player pieces with team colors and numbers
- **Layered architecture**: Pitch → Arrows → Trajectories → Tokens → Canvas

## Key Features Implementation

### Field and Tokens
- Field dimensions follow FIFA standards (105×68 meters)
- Player tokens are draggable within field boundaries
- Support for different object types: player, ball, cone, minigoal
- Automatic number assignment (1-11) for players

### Tactical Elements
- **Arrows**: Solid/dashed styles for passes and movements
- **Trajectories**: Freeform drawing for complex player paths  
- **Formations**: Predefined setups (4-3-3, 4-4-2, 3-5-2, etc.)

### AI Integration
- OpenAI integration in `src/lib/ai/` for tactical suggestions
- Cached responses using Dexie for offline capability
- Prompts and mappers for tactical analysis

### PWA Capabilities
- Installable on iPad via Safari "Add to Home Screen"
- Offline-first with service worker caching
- Optimized for landscape orientation
- Safe area handling for different device sizes

## Development Notes

### iPad Optimization
- Uses `100dvh` for dynamic viewport height
- PWA detection with safe area handling  
- Touch events optimized with `touch-action: none`
- Responsive design with container queries

### Type Safety
- Strict TypeScript configuration
- Comprehensive type definitions for all tactical elements
- Runtime validation with Zod where needed

### Performance
- Canvas drawing for smooth annotation experience
- Optimized SVG rendering for 60fps interactions
- Efficient state updates with Zustand

## Data Persistence

### Local Storage
- Board state auto-saved to localStorage
- JSON export/import functionality
- Dexie for structured data (AI cache, match plans)

### Database Schema
- Teams and players management
- Match plans and opponents tracking  
- AI interaction caching for offline use

## Deployment

### Vercel Configuration
- Automatic deployment configured in `vercel.json`
- Static site generation with Vite
- PWA manifest and service worker included

### PWA Installation
1. Deploy to Vercel or serve locally
2. Open in iPad Safari
3. Use "Add to Home Screen" to install as native app
4. Works fully offline after installation