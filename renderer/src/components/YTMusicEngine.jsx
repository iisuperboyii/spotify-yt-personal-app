import { useEffect, useRef, useState } from "react";

export default function YTMusicEngine({ onReady }) {
  const webviewRef = useRef(null);
  const [initialized, setInitialized] = useState(
    localStorage.getItem("yt_initialized") === "true"
  );

  useEffect(() => {
    const webview = webviewRef.current;
    if (!webview) return;

    const handleReady = () => {
      console.log("YT Music WebView ready");
      onReady?.(webview);
    };

    webview.addEventListener("did-finish-load", handleReady);
    return () =>
      webview.removeEventListener("did-finish-load", handleReady);
  }, [onReady]);

  const markInitialized = () => {
    localStorage.setItem("yt_initialized", "true");
    setInitialized(true);
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#000",
        zIndex: 9999,
        display: initialized ? "none" : "flex",
        flexDirection: "column",
      }}
    >
      {/* INIT BANNER */}
      <div
        style={{
          padding: "12px 16px",
          background: "#181818",
          color: "white",
          fontSize: "14px",
          borderBottom: "1px solid #282828",
        }}
      >
        ▶ Click any song once to initialize playback.
        After this, the player will work normally.
        <button
          onClick={markInitialized}
          style={{
            marginLeft: 12,
            background: "#1db954",
            border: "none",
            padding: "6px 10px",
            borderRadius: 4,
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          I’ve clicked play
        </button>
      </div>

      {/* YOUTUBE MUSIC */}
      <webview
  ref={webviewRef}
  src="https://music.youtube.com"
  partition="persist:ytmusic"
  webpreferences="contextIsolation=yes"
  style={{ flex: 1 }}
  allow="autoplay"
/>

    </div>
  );
}
