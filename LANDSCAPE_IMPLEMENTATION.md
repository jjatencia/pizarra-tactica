# Landscape-Only PWA Implementation for iPad

## Overview

This implementation enforces landscape orientation for the PWA when installed on iPad using "Add to Home Screen" (A2HS). Since iOS doesn't allow native orientation locking via `screen.orientation.lock()`, we use a UX-based approach that blocks the UI when in portrait mode.

## Changes Made

### 1. Manifest Configuration (`vite.config.ts`)

Updated the PWA manifest to specify landscape orientation:

```typescript
manifest: {
  name: 'Mi Pizarra',
  short_name: 'Pizarra',
  orientation: 'landscape',
  start_url: '.',
  background_color: '#000000',
  theme_color: '#000000',
  // ... other settings
}
```

**Note:** iOS ignores the `orientation` property in the manifest, but it's kept for Android and other platforms.

### 2. HTML Meta Tags (`index.html`)

Updated PWA meta tags for better iOS support:

```html
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Mi Pizarra">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no">
```

### 3. Rotation Overlay HTML

Added overlay structure that appears in portrait mode:

```html
<div id="rotate-overlay" aria-live="polite" aria-hidden="true">
  <div class="rotate-card">
    <p>Gira el iPad para continuar</p>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2v3m0 14v3M2 12h3m14 0h3M5.6 5.6l2.1 2.1m8.6 8.6l2.1 2.1M5.6 18.4l2.1-2.1m8.6-8.6l2.1-2.1"/>
    </svg>
  </div>
</div>
```

### 4. CSS Styles (`src/styles/index.css`)

Added orientation enforcement styles:

- **Overlay styles**: Full-screen overlay with blur backdrop
- **Orientation classes**: `.is-landscape` and `.is-portrait` classes on `<html>`
- **Portrait blocking**: Prevents scrolling and shows overlay in portrait mode
- **Safe area support**: Enhanced safe area handling for landscape mode

### 5. TypeScript Utility (`src/lib/enforce-landscape.ts`)

Created a comprehensive orientation enforcement utility:

```typescript
export function initLandscapeEnforcement(): void
export function cleanupLandscapeEnforcement(): void
export function isLandscapeMode(): boolean
export function isIOSPWA(): boolean
```

**Key features:**
- Detects orientation using `window.matchMedia('(orientation: landscape)')`
- Applies CSS classes to `<html>` element
- Handles iOS A2HS quirks with periodic checking
- Manages overlay visibility and accessibility attributes

### 6. Integration (`src/main.tsx`)

Integrated the landscape enforcement in the main entry point:

```typescript
import { initLandscapeEnforcement } from './lib/enforce-landscape'

window.addEventListener('DOMContentLoaded', () => {
  initLandscapeEnforcement();
});
```

## How It Works

1. **Detection**: Uses `matchMedia('(orientation: landscape)')` to detect current orientation
2. **CSS Classes**: Adds `.is-landscape` or `.is-portrait` classes to `<html>`
3. **Overlay**: Shows blocking overlay with rotation instruction in portrait mode
4. **Event Handling**: Listens to `resize`, `orientationchange`, and `visibilitychange` events
5. **iOS A2HS Compatibility**: Uses periodic checking (500ms) as fallback for iOS PWA mode

## Why This Approach?

- **iOS Limitation**: `screen.orientation.lock()` is not supported in iOS Safari or PWA mode
- **UX-Based Solution**: Provides clear user feedback instead of broken functionality
- **Accessibility**: Proper ARIA attributes and semantic markup
- **Performance**: Lightweight implementation with minimal overhead
- **Compatibility**: Works across different iOS versions and PWA installation methods

## Testing Instructions

1. **Development**: Use browser dev tools to simulate different orientations
2. **iPad Testing**: 
   - Install the PWA using "Add to Home Screen"
   - Launch from home screen (not Safari)
   - Rotate device to test orientation enforcement
   - In portrait: should see overlay
   - In landscape: should see normal app interface

## Alternative Implementation

The CSS includes a commented alternative that rotates the entire app container in portrait mode instead of showing an overlay:

```css
html.is-portrait #root {
  transform: rotate(90deg);
  transform-origin: center center;
  height: 100vw;
  width: 100vh;
}
```

This can be enabled if preferred over the overlay approach.

## Browser Support

- **iOS Safari (PWA)**: ✅ Full support with UX enforcement
- **Android Chrome**: ✅ Native orientation locking + UX fallback  
- **Desktop**: ✅ Responsive design adapts to window size
- **Other mobile browsers**: ✅ UX enforcement works universally

## Files Modified

- `vite.config.ts` - PWA manifest configuration
- `index.html` - Meta tags and overlay HTML
- `src/styles/index.css` - Orientation enforcement styles
- `src/lib/enforce-landscape.ts` - Orientation utility (new file)
- `src/main.tsx` - Integration point

## Technical Notes

- The implementation is TypeScript-first with proper type safety
- Uses modern CSS features (`inset`, `backdrop-filter`, `env()` for safe areas)
- Follows accessibility best practices with ARIA attributes
- Integrates seamlessly with existing Tailwind CSS setup
- No external dependencies required