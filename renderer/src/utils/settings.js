const DEFAULT_SETTINGS = {
  spacebarPlayPause: true,
  globalMediaKeys: true,
  rememberVolume: true,
  showYouTubeUI: true,
  showPlaybackWebview: false,
};

export function getSettings() {
  const saved = localStorage.getItem("app_settings");
  return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
}

export function setSettings(newSettings) {
  localStorage.setItem("app_settings", JSON.stringify(newSettings));
}

// Alias for compatibility
export const saveSettings = setSettings;
