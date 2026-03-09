import { createContext, useContext, useState } from "react";

const UIContext = createContext();

export const useUIContext = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUIContext must be used within UIProvider");
  }
  return context;
};

export const UIProvider = ({ children }) => {
  const [showLyricsInNowPlaying, setShowLyricsInNowPlaying] = useState(false);
  const [currentSong, setCurrentSong] = useState({
    title: "Not Playing",
    artist: "",
    album: "",
    artwork: ""
  });
  const [currentLyrics, setCurrentLyrics] = useState("Lyrics not available");

  const value = {
    showLyricsInNowPlaying,
    setShowLyricsInNowPlaying,
    currentSong,
    setCurrentSong,
    currentLyrics,
    setCurrentLyrics
  };

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};
