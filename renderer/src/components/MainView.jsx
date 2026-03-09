import { useState } from "react";
import "./MainView.css";

export default function MainView() {
  const [initialized, setInitialized] = useState(
    localStorage.getItem("yt_initialized") === "true"
  );

  const init = () => {
    localStorage.setItem("yt_initialized", "true");
    setInitialized(true);
  };

  // INIT SCREEN (shown once)
  if (!initialized) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#121212",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            background: "#181818",
            padding: 32,
            borderRadius: 8,
            maxWidth: 420,
            textAlign: "center",
          }}
        >
          <h2 style={{ marginBottom: 12 }}>Initialize YouTube Music</h2>
          <p
            style={{
              fontSize: 14,
              color: "#b3b3b3",
              marginBottom: 20,
            }}
          >
            Click Continue, then press play once inside YouTube Music.
            <br />
            This is required by browser autoplay rules.
          </p>
          <button
            onClick={init}
            style={{
              background: "#1db954",
              color: "black",
              border: "none",
              padding: "10px 20px",
              borderRadius: 20,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Continue
          </button>
        </div>
      </div>
    );
  }

  // YT MUSIC ENGINE (VISIBLE)
return (
  <div
    className="main-view"
    style={{
      flex: 1,
      height: "100%",
      background: "#121212",
    }}
  >
    <webview
      src="https://music.youtube.com"
      partition="persist:ytmusic"
      allow="autoplay"
      ref={(el) => {
        if (el) window.ytWebview = el;
      }}
      style={{
        width: "100%",
        height: "100%",
        border: "none",
      }}
    />
  </div>
);

}
