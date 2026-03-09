import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiArrowLeft, FiFileText } from "react-icons/fi";

import { useUIContext } from "../context/UIContext";
import { generateColorFromText, generateGradient } from "../utils/colorExtractor";
import "./NowPlaying.css";

export default function NowPlaying() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showLyricsInNowPlaying, setShowLyricsInNowPlaying, currentSong: song, currentLyrics: lyrics } = useUIContext();

  const [backgroundColor, setBackgroundColor] = useState('linear-gradient(180deg, #1a1a1a 0%, #121212 100%)');

  // Generate color from song title and artist
  useEffect(() => {
    if (song.title) {
      try {
        // Use song title + artist for consistent color generation
        const colorSeed = `${song.title}-${song.artist}`;
        const dominantColor = generateColorFromText(colorSeed);
        const gradient = generateGradient(dominantColor);
        setBackgroundColor(gradient.gradient);
      } catch (error) {
        console.error('Failed to generate color:', error);
        setBackgroundColor('linear-gradient(180deg, #1a1a1a 0%, #121212 100%)');
      }
    } else {
      setBackgroundColor('linear-gradient(180deg, #1a1a1a 0%, #121212 100%)');
    }
  }, [song.title, song.artist]);

  return (
    <div className="now-playing" style={{ background: backgroundColor }}>
      {/* Header */}
      {/* Header Removed as requested - Full screen experience */}
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        {/* Optional: Add minimal branding or nothing */}
      </div>

      {/* Main Content - Dynamic Layout */}
      <div className={`now-playing-main ${showLyricsInNowPlaying ? 'with-lyrics' : 'centered'}`}>
        {/* Album Art - Always visible */}
        <div className="now-playing-album-section">
          <div className="album-art-large">
            {song.artwork ? (
              <img src={song.artwork} alt={song.title} />
            ) : (
              <div className="art-placeholder">
                <FiFileText size={64} />
              </div>
            )}
          </div>

          {/* Song Info */}
          <div className="song-info-large">
            <h1 className="song-title-large">{song.title}</h1>
            <p className="song-artist-large">{song.artist}</p>
            {song.album && <p className="song-album-large">{song.album}</p>}
          </div>
        </div>

        {/* Lyrics - Conditionally visible */}
        {showLyricsInNowPlaying && (
          <div className="now-playing-lyrics-section">
            <div className="lyrics-section-full">
              <div className="lyrics-header-full">
                <FiFileText size={24} />
                <h3>Lyrics</h3>
              </div>
              <div className="lyrics-text-full">
                {lyrics}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
