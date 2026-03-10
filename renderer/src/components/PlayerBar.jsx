import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  FiHeart,
  FiShuffle,
  FiRepeat,
  FiSkipBack,
  FiSkipForward,
  FiPlay,
  FiPause,
  FiMaximize2,
  FiMinimize2,
  FiVolume2,
  FiVolume1,
  FiVolume,
  FiVolumeX,
  FiList,
  FiSettings
} from "react-icons/fi";
import { TbMicrophone2 } from "react-icons/tb";
import { useUIContext } from "../context/UIContext";
import {
  getCurrentSong,
  togglePlayPause,
  previousTrack,
  nextTrack,
  getVolume,
  setVolume as setYTVolume,
  getProgress,
  fetchLyrics,
  getPlayerState,
  toggleLike,
  toggleShuffle,
  toggleRepeat,
  seekTo,
  ensureLyricsTabSelected
} from "../utils/ytMusicAPI";
import { getSettings } from "../utils/settings";
import "./PlayerBar.css";

export default function PlayerBar() {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    currentLyrics,
    setCurrentLyrics,
    showLyricsInNowPlaying,
    setShowLyricsInNowPlaying,
    showQueue,
    setShowQueue,
    setCurrentSong: setGlobalSong
  } = useUIContext();

  const [song, setSong] = useState({
    title: "",
    artist: "",
    album: "",
    artwork: ""
  });

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, percentage: 0 });
  const [volume, setVolume] = useState(50);
  const [isHoveringVolume, setIsHoveringVolume] = useState(false);
  const [showLyricsPopup, setShowLyricsPopup] = useState(false);
  // showQueue is now from UIContext (shared with NowPlaying + AppLayout)

  const lastPlayToggleTime = useRef(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isShuffle, setIsShuffle] = useState(false);
  const [repeatMode, setRepeatMode] = useState('NONE');

  const isOnNowPlaying = location.pathname === '/now-playing';

  // Load initial settings
  useEffect(() => {
    const settings = getSettings();
    if (settings.rememberVolume) {
      const savedVol = localStorage.getItem("app_volume");
      if (savedVol) setVolume(parseInt(savedVol));
    } else {
      getVolume().then(v => setVolume(v));
    }
  }, []);

  // Poll for song metadata
  useEffect(() => {
    const interval = setInterval(async () => {
      const current = await getCurrentSong();
      if (current && (current.title !== song.title || current.artist !== song.artist)) {
        if (current.artwork) {
          current.artwork = current.artwork.replace(/w\d+-h\d+/, 'w544-h544').replace(/s\d+/, 's544');
        }
        setSong(current);
        setGlobalSong(current);

        const state = await getPlayerState();
        setIsLiked(state.isLiked);
        setIsShuffle(state.isShuffle);
        setRepeatMode(state.repeatMode);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [song, setGlobalSong]);

  // Poll for Player State
  useEffect(() => {
    const interval = setInterval(async () => {
      const state = await getPlayerState();
      setIsLiked(state.isLiked);
      setIsShuffle(state.isShuffle);
      setRepeatMode(state.repeatMode);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Reset lyrics when song changes
  useEffect(() => {
    if (song.title) {
      setCurrentLyrics(null);
    }
  }, [song.title, setCurrentLyrics]);

  // Trigger fetch lyrics
  useEffect(() => {
    const shouldFetch = showLyricsPopup || (isOnNowPlaying && showLyricsInNowPlaying);

    if (shouldFetch) {
      const loadLyrics = async () => {
        if (!currentLyrics) setCurrentLyrics("Loading lyrics...");

        await ensureLyricsTabSelected();

        const l = await fetchLyrics();
        if (l) {
          setCurrentLyrics(l);
        }
      };
      loadLyrics();

      const interval = setInterval(async () => {
        const l = await fetchLyrics();
        if (l && l.length > 10) setCurrentLyrics(l);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [song.title, showLyricsPopup, isOnNowPlaying, showLyricsInNowPlaying, setCurrentLyrics, currentLyrics]);

  // Progress Sync
  useEffect(() => {
    const interval = setInterval(async () => {
      const prog = await getProgress();
      if (prog) setProgress(prog);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Play/Pause Sync - reads from the playback webview where music actually plays
  useEffect(() => {
    const interval = setInterval(async () => {
      const now = Date.now();
      if (now - lastPlayToggleTime.current < 2000) return;

      // Always check the playback webview, fall back to browse webview
      const wv = window.ytPlaybackWebview || window.ytBrowseWebview || window.ytWebview;
      if (!wv) return;
      try {
        const isPaused = await wv.executeJavaScript(
          `!!document.querySelector('.play-pause-button[aria-label="Play"], button[aria-label="Play"], #play-pause-button[aria-label="Play"]')`
        );
        setPlaying(!isPaused);
      } catch { }
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Key Handler
  useEffect(() => {
    const onKeyDown = (e) => {
      const settings = getSettings();
      if (!settings.spacebarPlayPause) return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") { e.preventDefault(); togglePlay(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Global Media
  useEffect(() => {
    const settings = getSettings();
    if (!settings.globalMediaKeys) return;
    window.electronAPI?.onMediaPlayPause(() => togglePlay());
    window.electronAPI?.onMediaNext(() => nextTrack());
    window.electronAPI?.onMediaPrev(() => prevTrack());
  }, []);

  const togglePlay = async () => {
    const nextState = !playing;
    setPlaying(nextState);
    lastPlayToggleTime.current = Date.now();
    await togglePlayPause();
  };

  const changeVolume = (newVolume) => {
    setVolume(newVolume);
    // Set volume on the playback webview
    setYTVolume(newVolume);
    window.electronAPI?.setSystemVolume(newVolume);
    if (getSettings().rememberVolume) localStorage.setItem("app_volume", newVolume);
  };

  const handleSeek = async (e) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.min(Math.max((x / rect.width) * 100, 0), 100);
    setProgress(p => ({ ...p, percentage }));
    await seekTo(percentage);
  };

  const toggleNowPlaying = () => {
    if (isOnNowPlaying) {
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate('/');
      }
    } else {
      if (showLyricsPopup) {
        setShowLyricsPopup(false);
        setShowLyricsInNowPlaying(true);
      }
      navigate('/now-playing');
    }
  };

  const handleLyricsToggle = () => {
    if (isOnNowPlaying) {
      setShowLyricsInNowPlaying(!showLyricsInNowPlaying);
    } else {
      setShowLyricsPopup(!showLyricsPopup);
    }
  };

  const handleLike = async () => {
    await toggleLike();
    setIsLiked(!isLiked);
  };

  const handleShuffle = async () => {
    await toggleShuffle();
    setIsShuffle(!isShuffle);
  };

  const handleRepeat = async () => {
    await toggleRepeat();
  };

  const handleQueueToggle = () => {
    setShowQueue(!showQueue);
  };

  const formatTime = (seconds) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getVolumeIcon = () => {
    if (volume === 0) return <FiVolumeX size={18} />;
    if (volume < 30) return <FiVolume size={18} />;
    if (volume < 70) return <FiVolume1 size={18} />;
    return <FiVolume2 size={18} />;
  };

  return (
    <div className="player-bar">

      {/* Left: Song Info */}
      <div className="player-left">
        {song.artwork ? (
          <div className="album-art" style={{ backgroundImage: `url(${song.artwork})`, backgroundSize: 'cover' }} />
        ) : (
          <div className="album-art placeholder" style={{ background: '#282828' }} />
        )}
        <div className="song-info">
          <div className="song-title">{song.title || "Not Playing"}</div>
          <div className="song-artist">{song.artist || ""}</div>
        </div>
        <button
          className={`like-btn ${isLiked ? 'active' : ''}`}
          onClick={handleLike}
          title="Save to your Liked Songs"
          disabled={!song.title}
        >
          <FiHeart size={16} fill={isLiked ? "#1ed760" : "none"} />
        </button>
      </div>

      {/* Center: Controls & Progress */}
      <div className="player-center">
        <div className="controls">
          <button
            className={`control-btn ${isShuffle ? 'active' : ''}`}
            onClick={handleShuffle}
            title="Shuffle"
          >
            <FiShuffle size={16} />
          </button>

          <button className="control-btn" onClick={previousTrack} title="Previous">
            <FiSkipBack size={20} />
          </button>

          <button className="play-btn-wrapper" onClick={togglePlay} title={playing ? "Pause" : "Play"}>
            {playing ? (
              <FiPause size={20} fill="black" className="play-btn-icon pause" />
            ) : (
              <FiPlay size={20} fill="black" className="play-btn-icon" />
            )}
          </button>

          <button className="control-btn" onClick={nextTrack} title="Next">
            <FiSkipForward size={20} />
          </button>

          <button
            className={`control-btn ${repeatMode !== 'NONE' ? 'active' : ''}`}
            onClick={handleRepeat}
            title="Repeat"
          >
            <FiRepeat size={16} />
            {repeatMode === 'ONE' && <span className="repeat-one-badge">1</span>}
          </button>
        </div>

        <div className="playback-bar">
          <span className="time">{formatTime(progress.current)}</span>
          <div className="progress-container" onClick={handleSeek}>
            <div
              className="progress-fill"
              style={{ width: `${progress.percentage}%` }}
            ></div>
          </div>
          <span className="time">{formatTime(progress.total)}</span>
        </div>
      </div>

      {/* Right: Actions & Volume */}
      <div className="player-right">
        <button
          className={`control-btn ${(isOnNowPlaying ? showLyricsInNowPlaying : showLyricsPopup) ? 'active' : ''}`}
          onClick={handleLyricsToggle}
          title="Lyrics"
          disabled={!song.title}
        >
          <TbMicrophone2 size={18} />
        </button>

        <button
          className={`control-btn ${showQueue ? 'active' : ''}`}
          onClick={handleQueueToggle}
          title="Queue"
        >
          <FiList size={18} />
        </button>

        <div
          className="volume-container"
          onMouseEnter={() => setIsHoveringVolume(true)}
          onMouseLeave={() => setIsHoveringVolume(false)}
        >
          <button className="control-btn" onClick={() => changeVolume(volume === 0 ? 50 : 0)}>
            {getVolumeIcon()}
          </button>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => changeVolume(parseInt(e.target.value))}
            style={{ '--volume-percent': `${volume}%` }}
          />
        </div>

        <button
          className="control-btn"
          onClick={() => navigate('/settings')}
          title="Settings"
        >
          <FiSettings size={18} />
        </button>

        <button
          className={`control-btn ${isOnNowPlaying ? 'active' : ''}`}
          onClick={toggleNowPlaying}
          title={isOnNowPlaying ? "Exit Full Screen" : "Full Screen"}
        >
          {isOnNowPlaying ? <FiMinimize2 size={18} /> : <FiMaximize2 size={18} />}
        </button>
      </div>

      {showLyricsPopup && !isOnNowPlaying && (
        <div className="lyrics-panel-small">
          <div className="lyrics-header">
            <h3>Lyrics</h3>
          </div>
          <div className="lyrics-content">
            {currentLyrics ? (
              currentLyrics.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))
            ) : (
              <p className="no-lyrics">Lyrics not available</p>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
