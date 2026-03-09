import Sidebar from "../components/Sidebar";
import TopNav from "../components/TopNav";
import PlayerBar from "../components/PlayerBar";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { getSettings } from "../utils/settings";
import { FiSettings } from "react-icons/fi";
import "./AppLayout.css";

export default function AppLayout() {
  const [showYT, setShowYT] = useState(getSettings().showYouTubeUI);
  const [showPlaybackWV, setShowPlaybackWV] = useState(getSettings().showPlaybackWebview);
  const [playbackReady, setPlaybackReady] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const playbackWebviewRef = useRef(null);
  const browseWebviewRef = useRef(null);

  // React to settings changes
  useEffect(() => {
    const interval = setInterval(() => {
      const s = getSettings();
      setShowYT(s.showYouTubeUI);
      setShowPlaybackWV(s.showPlaybackWebview);
    }, 300);

    return () => clearInterval(interval);
  }, []);

  const isSettingsPage = location.pathname === '/settings';
  const isNowPlayingPage = location.pathname === '/now-playing';

  // Add body class for Now Playing page
  useEffect(() => {
    if (isNowPlayingPage) {
      document.body.classList.add('now-playing-page');
    } else {
      document.body.classList.remove('now-playing-page');
    }
  }, [isNowPlayingPage]);

  // Hide YouTube UI on Settings page
  const shouldShowYT = showYT && !isSettingsPage;
  const shouldShowPlayback = showPlaybackWV && !isSettingsPage;

  return (
    <div style={{ display: "flex", height: "100vh", background: "#121212", position: "relative" }}>
      {/* Always render Sidebar but hide on Now Playing to prevent remounting */}
      <div style={{ display: isNowPlayingPage ? "none" : "block" }}>
        <Sidebar />
      </div>

      <div className="main-content-wrapper" style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", marginLeft: isNowPlayingPage ? "0" : "256px" }}>
        {/* Top Navigation */}
        <TopNav />

        {/* Main content area */}
        <div style={{ flex: 1, overflow: "auto", position: "relative", zIndex: shouldShowYT ? 0 : 1, marginTop: isNowPlayingPage ? "0" : "64px" }}>
          <Outlet />
        </div>

        {/* PLAYBACK WEBVIEW - dedicated to audio playback only */}
        <webview
          key="playback-webview"
          partition="persist:ytmusic"
          allow="autoplay"
          ref={(el) => {
            if (el && !window.ytPlaybackWebview) {
              window.ytPlaybackWebview = el;
              playbackWebviewRef.current = el;

              // Mark as ready when DOM loads
              el.addEventListener('dom-ready', () => {
                console.log('[Playback Webview] DOM ready');
                setPlaybackReady(true);
                // Ensure it is NOT muted - unmute the video element
                el.executeJavaScript(`
                  (function() {
                    const tryUnmute = () => {
                      const video = document.querySelector('video');
                      if (video) {
                        video.muted = false;
                        video.volume = 1;
                        console.log('[Playback Webview] Video unmuted, volume set to 1');
                      } else {
                        setTimeout(tryUnmute, 500);
                      }
                    };
                    tryUnmute();
                  })();
                `).catch(() => {});
              });

              // Load YouTube Music home initially
              el.src = 'https://music.youtube.com';
              console.log('[Playback Webview] Initialized');
            }
          }}
          style={{
            position: "absolute",
            top: shouldShowPlayback ? (isNowPlayingPage ? "0" : "64px") : 0,
            left: 0,
            width: "100%",
            height: shouldShowPlayback
              ? (isNowPlayingPage ? "calc(100% - 90px)" : "calc(100% - 154px)")
              : "calc(100% - 90px)",
            border: "none",
            opacity: shouldShowPlayback ? 1 : 0,
            pointerEvents: shouldShowPlayback ? "auto" : "none",
            zIndex: shouldShowPlayback ? 3 : -1,
          }}
        />

        {/* BROWSING WEBVIEW - Visible, for navigation and browsing */}
        {/* This webview can navigate freely without affecting playback */}
        <webview
          key="browsing-webview"
          src="https://music.youtube.com"
          partition="persist:ytmusic"
          allow="autoplay"
          ref={(el) => {
            if (el && !window.ytBrowseWebview) {
              window.ytBrowseWebview = el;
              browseWebviewRef.current = el;
              // Also set ytWebview for backward compatibility
              window.ytWebview = el;
              console.log('[Browse Webview] Initialized');
            }
          }}
          style={{
            position: "absolute",
            top: isNowPlayingPage ? "0" : "64px",
            left: 0,
            width: "100%",
            height: isNowPlayingPage ? "calc(100% - 90px)" : "calc(100% - 154px)",
            border: "none",
            opacity: shouldShowYT ? 1 : 0,
            pointerEvents: shouldShowYT ? "auto" : "none",
            zIndex: shouldShowYT ? 2 : 0,
          }}
        />

        <PlayerBar />
      </div>
    </div>
  );
}
