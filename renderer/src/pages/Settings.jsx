import { useEffect, useState } from "react";
import { FiArrowLeft } from "react-icons/fi";
import { getSettings, setSettings } from "../utils/settings";
import "./Settings.css";

export default function Settings() {
  const [settings, setLocalSettings] = useState(getSettings());

  // Persist settings whenever they change
  useEffect(() => {
    setSettings(settings);
  }, [settings]);

  const toggle = (key) => {
    setLocalSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const SettingsRow = ({ label, description, checked, onChange }) => (
    <div className="settings-row">
      <div className="settings-info">
        <span className="settings-label">{label}</span>
        {description && <span className="settings-description">{description}</span>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="slider round"></span>
      </label>
    </div>
  );

  return (
    <div className="settings-page">
      <div className="settings-header" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => window.history.back()}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex' }}
        >
          <FiArrowLeft size={24} />
        </button>
        <h2>Settings</h2>
      </div>

      <div className="settings-section">
        <h3 className="section-title">Playback Controls</h3>

        <SettingsRow
          label="Spacebar to Play/Pause"
          description="Use the spacebar to control playback when the app is focused."
          checked={settings.spacebarPlayPause}
          onChange={() => toggle("spacebarPlayPause")}
        />

        <SettingsRow
          label="Global Media Keys"
          description="Use your keyboard's media keys (Play, Next, Prev) even when the app is in the background."
          checked={settings.globalMediaKeys}
          onChange={() => toggle("globalMediaKeys")}
        />
      </div>



      <hr className="settings-divider" />

      <div className="settings-section">
        <h3 className="section-title">Display</h3>

        <SettingsRow
          label="Show YouTube Music UI"
          description="Display the underlying YouTube Music web interface overlay (browse webview)."
          checked={settings.showYouTubeUI}
          onChange={() => toggle("showYouTubeUI")}
        />

        <SettingsRow
          label="Show Playback Screen"
          description="Make the hidden playback webview visible so you can interact with it directly (useful for volume and premium controls)."
          checked={settings.showPlaybackWebview}
          onChange={() => toggle("showPlaybackWebview")}
        />
      </div>
    </div>
  );
}
