# Fix Plan for Music Playback and Home Page Issues

## Problem 1: Music Stops When Navigating
**Root Cause:** When users navigate to Search or another Playlist, we call `wv.loadURL()` which navigates the YouTube Music webview, stopping any currently playing music.

**Solution:** 
- Don't navigate the webview when users browse the app
- Only navigate webview when users actually click to play something
- Keep the webview on the currently playing page
- Use our React routing for UI navigation only

**Files to modify:**
1. `Search.jsx` - Remove `wv.loadURL()` from performSearch, scrape without navigating
2. `PlaylistView.jsx` - Check if it navigates webview unnecessarily
3. `Home.jsx` - Only navigate webview when clicking to play, not when loading the page

## Problem 2: Home Page Shows Placeholder Data
**Root Cause:** The scraping is failing silently and returning empty array, causing fallback data to be used.

**Possible causes:**
1. YouTube Music page structure changed
2. Timing issues - page not fully loaded
3. Script execution errors in webview
4. Navigation happening but content not ready

**Solution:**
- Add better error logging to see what's actually happening
- Try scraping without navigating first (use current webview state)
- If that fails, then navigate and scrape
- Increase wait times if needed

## Implementation Order:
1. Fix Home page scraping first (easier to test)
2. Then fix navigation issue (requires more changes)
