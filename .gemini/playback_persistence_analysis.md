# Playback Persistence Analysis

## Problem
Music stops playing when:
1. Navigating to another playlist
2. Navigating to Now Playing screen
3. Any navigation that causes YouTube Music webview to reload

## Root Cause
The webview is reloading the YouTube Music page, which stops the audio playback. This happens because:
- `loadURL()` completely reloads the page
- Even with `history.pushState()`, YouTube Music's SPA might not preserve audio state

## Attempted Solutions

### ❌ Solution 1: In-Page Navigation
- **What we tried:** Replace `loadURL()` with `history.pushState()` + `popstate` events
- **Result:** Partially worked for search, but broke other functionality
- **Why it failed:** YouTube Music's router doesn't properly respond to manual `popstate` events

### ❌ Solution 2: Prevent Webview Re-renders
- **What we tried:** Remove `src` attribute, use refs to prevent re-initialization
- **Result:** Broke the app, caused UI issues
- **Why it failed:** Webview needs proper initialization, and React's reconciliation still triggered reloads

## Possible Solutions Going Forward

### Option A: Keep Webview Audio Alive (Recommended)
**Approach:** Ensure the webview's audio context stays alive even when navigating

**Implementation:**
1. Set webview to `nodeintegration="false"` and `webpreferences="backgroundThrottling=false"`
2. Use Electron's `webContents.setAudioMuted(false)` to ensure audio continues
3. Keep webview mounted but hidden when navigating

**Pros:**
- Minimal code changes
- Uses Electron's built-in capabilities
- Should work reliably

**Cons:**
- Might still have issues with YouTube Music's internal state

### Option B: Separate Playback Webview
**Approach:** Use two webviews - one for browsing, one for playback

**Implementation:**
1. Create a hidden webview dedicated to playback
2. Main webview for browsing/navigation
3. Sync state between them

**Pros:**
- Complete separation of concerns
- Browsing never affects playback

**Cons:**
- Complex state management
- Higher memory usage
- Need to sync queue, current song, etc.

### Option C: Use YouTube Music API Directly
**Approach:** Don't rely on webview for playback, use YouTube Music's API

**Implementation:**
1. Extract audio URLs from YouTube Music
2. Use HTML5 `<audio>` element for playback
3. Webview only for browsing/UI

**Pros:**
- Complete control over playback
- No webview reload issues
- Can implement custom player features

**Cons:**
- Complex implementation
- May violate YouTube's ToS
- Need to handle authentication, DRM, etc.

## Recommended Next Steps

1. **Try Option A first** - Add webview preferences to keep audio alive
2. If that doesn't work, **implement Option B** - Separate playback webview
3. **Option C** should be last resort due to complexity

## Code Changes Needed for Option A

### In AppLayout.jsx:
```javascript
<webview
  src="https://music.youtube.com"
  partition="persist:ytmusic"
  webpreferences="backgroundThrottling=false"
  nodeintegration="false"
  // ... rest of props
/>
```

### In main process (if needed):
```javascript
webview.getWebContents().setBackgroundThrottling(false);
```
