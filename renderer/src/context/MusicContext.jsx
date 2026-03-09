import { createContext, useContext, useState, useEffect } from "react";
import * as ytAPI from "../utils/ytMusicAPI";

const MusicContext = createContext();

export const useMusicContext = () => {
  const context = useContext(MusicContext);
  if (!context) {
    throw new Error("useMusicContext must be used within MusicProvider");
  }
  return context;
};

export const MusicProvider = ({ children }) => {
  const [currentSong, setCurrentSong] = useState({
    title: "Not Playing",
    artist: "",
    album: "",
    artwork: "",
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // Poll for current song metadata - REDUCED FREQUENCY
  useEffect(() => {
    const interval = setInterval(async () => {
      const song = await ytAPI.getCurrentSong();
      if (song && song.title) {
        setCurrentSong(prev => {
          // Only update if changed to reduce re-renders
          if (prev.title !== song.title) {
            return song;
          }
          return prev;
        });
      }
    }, 2000); // Increased from 1000ms to 2000ms

    return () => clearInterval(interval);
  }, []);

  // Poll for play state - REDUCED FREQUENCY
  useEffect(() => {
    const interval = setInterval(async () => {
      const playing = await ytAPI.isPlaying();
      setIsPlaying(prev => {
        // Only update if changed
        if (prev !== playing) {
          return playing;
        }
        return prev;
      });
    }, 1000); // Increased from 500ms to 1000ms

    return () => clearInterval(interval);
  }, []);

  // Search function
  const search = async (query) => {
    if (!query.trim()) return;

    setLoading(true);
    await ytAPI.searchYouTubeMusic(query);

    // Wait for results to load
    setTimeout(() => {
      setLoading(false);
    }, 1500);
  };

  // Fetch playlists
  const fetchPlaylists = async () => {
    setLoading(true);
    await ytAPI.goToLibrary();

    setTimeout(async () => {
      const fetchedPlaylists = await ytAPI.getPlaylists();
      if (fetchedPlaylists) {
        setPlaylists(fetchedPlaylists);
      }
      setLoading(false);
    }, 2000);
  };

  // Play/Pause
  const togglePlay = async () => {
    await ytAPI.togglePlayPause();
  };

  // Next track
  const next = async () => {
    await ytAPI.nextTrack();
  };

  // Previous track
  const previous = async () => {
    await ytAPI.previousTrack();
  };

  // Navigate to home
  const goHome = async () => {
    await ytAPI.goToHome();
  };

  // Play playlist
  const playPlaylist = async (playlistId) => {
    await ytAPI.playPlaylist(playlistId);
  };

  const value = {
    currentSong,
    isPlaying,
    playlists,
    searchResults,
    loading,
    search,
    fetchPlaylists,
    togglePlay,
    next,
    previous,
    goHome,
    playPlaylist,
  };

  return (
    <MusicContext.Provider value={value}>
      {children}
    </MusicContext.Provider>
  );
};
