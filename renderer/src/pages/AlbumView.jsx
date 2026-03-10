import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { FiPlay, FiClock } from "react-icons/fi";
import { getAlbumTracks, playAlbumFromTrack, addToQueue } from "../utils/ytMusicAPI";
import "./PlaylistView.css";
import "./AlbumView.css";

// Text scramble utility (same as PlaylistView)
const scrambleText = (element, finalText, duration = 800) => {
  const chars = "!@#$%^&*()_+-=[]{}|;:,.<>?/~`1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const steps = 20;
  const stepDuration = duration / steps;
  let currentStep = 0;

  const interval = setInterval(() => {
    if (currentStep >= steps) {
      element.textContent = finalText;
      clearInterval(interval);
      return;
    }

    const progress = currentStep / steps;
    let scrambled = '';

    for (let i = 0; i < finalText.length; i++) {
      if (Math.random() < progress) {
        scrambled += finalText[i];
      } else {
        scrambled += chars[Math.floor(Math.random() * chars.length)];
      }
    }

    element.textContent = scrambled;
    currentStep++;
  }, stepDuration);

  return interval;
};

export default function AlbumView() {
  const { browseId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [album, setAlbum] = useState(null);
  const [tracks, setTracks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTrack, setHoveredTrack] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState('');
  const [queuedIds, setQueuedIds] = useState(new Set());
  const scrambleIntervals = useRef({});

  const preTitle = searchParams.get("name") || "";
  const preArtist = searchParams.get("artist") || "";
  const preCover = searchParams.get("cover") || "";

  // Add/remove body class when hovering to hide sidebar
  useEffect(() => {
    if (hoveredTrack !== null) {
      document.body.classList.add('playlist-song-hovered');
    } else {
      document.body.classList.remove('playlist-song-hovered');
    }
    return () => {
      document.body.classList.remove('playlist-song-hovered');
    };
  }, [hoveredTrack]);

  useEffect(() => {
    if (!browseId) return;
    setLoading(true);
    setTracks([]);

    getAlbumTracks(browseId).then(data => {
      if (data) {
        setAlbum(data.album);
        // Upgrade thumbnails
        const hqTracks = (data.tracks || []).map(t => ({
          ...t,
          thumbnail: t.thumbnail
            ? t.thumbnail.replace(/w\d+-h\d+/, 'w544-h544').replace(/s\d+/, 's544')
            : t.thumbnail
        }));
        setTracks(hqTracks);
      }
      setLoading(false);
    });
  }, [browseId]);

  // Preload images
  useEffect(() => {
    tracks.forEach(t => {
      if (t.thumbnail) { const img = new Image(); img.src = t.thumbnail; }
    });
  }, [tracks]);

  // Cleanup scramble intervals
  useEffect(() => {
    return () => {
      Object.values(scrambleIntervals.current).forEach(i => { if (i) clearInterval(i); });
    };
  }, []);

  const handlePlayTrack = async (track) => {
    // Always use playAlbumFromTrack so YTM queues all remaining album tracks
    // (same pattern as playSongInPlayback for playlists)
    await playAlbumFromTrack(browseId, track.index);
  };

  const handlePlayAll = async () => {
    if (tracks.length > 0) await handlePlayTrack(tracks[0]);
  };

  const handleAddToQueue = async (e, track) => {
    e.stopPropagation();
    if (!track.videoId) return;
    await addToQueue(track.videoId);
    setQueuedIds(prev => new Set([...prev, track.videoId]));
    setTimeout(() => {
      setQueuedIds(prev => { const n = new Set(prev); n.delete(track.videoId); return n; });
    }, 2000);
  };

  const handleTrackHover = (track, index) => {
    if (track && track.thumbnail) {
      setHoveredTrack(index);
      setBackgroundImage(track.thumbnail);

      const titleEl = document.querySelector(`[data-track-index="${index}"] .song-title`);
      const artistEl = document.querySelector(`[data-track-index="${index}"] .col-artist`);

      if (titleEl && track.title) {
        if (scrambleIntervals.current[`title-${index}`]) clearInterval(scrambleIntervals.current[`title-${index}`]);
        scrambleIntervals.current[`title-${index}`] = scrambleText(titleEl, track.title, 600);
      }
      if (artistEl && track.artist) {
        if (scrambleIntervals.current[`artist-${index}`]) clearInterval(scrambleIntervals.current[`artist-${index}`]);
        scrambleIntervals.current[`artist-${index}`] = scrambleText(artistEl, track.artist, 600);
      }
    }
  };

  const handleTrackLeave = () => {
    setHoveredTrack(null);
    setBackgroundImage('');
  };

  const displayAlbum = album || {};
  const displayTitle = displayAlbum.title || preTitle || "Album";
  const displayArtist = displayAlbum.artist || preArtist || "";
  const displayArtwork = displayAlbum.artwork || preCover || "";

  if (loading) {
    return (
      <div className="album-view loading">
        <div className="loading-spinner-green" />
        <p>Loading album…</p>
        {preTitle && <p className="album-loading-sub">{preTitle}</p>}
      </div>
    );
  }

  if (!tracks.length) {
    return (
      <div className="album-view empty">
        <p>No tracks found for this album.</p>
        <button onClick={() => navigate(-1)}>Go Back</button>
      </div>
    );
  }

  return (
    <div className="album-view">
      {/* Dynamic Background */}
      <div
        className="playlist-background"
        style={{
          backgroundImage: backgroundImage ? `url(${backgroundImage})` : 'none',
          opacity: backgroundImage ? 1 : 0
        }}
      />

      {/* Header */}
      <div className="playlist-header">
        <div className="playlist-info-section">
          <div className="playlist-cover-large">
            {displayArtwork ? (
              <img src={displayArtwork} alt={displayTitle} />
            ) : (
              <div className="cover-placeholder">
                <FiPlay size={48} />
              </div>
            )}
          </div>

          <div className="playlist-details">
            <span className="playlist-type-label">ALBUM</span>
            <h1 className="playlist-title">{displayTitle}</h1>
            <div className="playlist-meta">
              {displayArtist && <span className="playlist-creator">{displayArtist}</span>}
              {displayAlbum.year && (
                <>
                  <span className="dot">•</span>
                  <span>{displayAlbum.year}</span>
                </>
              )}
              <span className="dot">•</span>
              <span className="playlist-song-count">{tracks.length} tracks</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="playlist-actions">
        <button className="play-all-button" onClick={handlePlayAll}>
          <FiPlay size={20} />
          <span>Play All</span>
        </button>
      </div>

      {/* Tracks Table */}
      <div className="songs-table">
        <div className="table-header">
          <div className="col-index">#</div>
          <div className="col-title">TITLE</div>
          <div className="col-artist">ARTIST</div>
          <div className="col-duration"><FiClock size={16} /></div>
          <div />
        </div>

        <div className="table-body">
          {tracks.map((track, i) => (
            <div
              key={`${track.videoId || i}-${track.title}`}
              data-track-index={i}
              className={`song-row ${hoveredTrack === i ? 'hovered' : ''} ${hoveredTrack !== null && hoveredTrack !== i ? 'faded' : ''}`}
              onClick={() => handlePlayTrack(track)}
              onMouseEnter={() => handleTrackHover(track, i)}
              onMouseLeave={handleTrackLeave}
            >
              <div className="col-index">
                <span className="track-number">{i + 1}</span>
                <FiPlay className="play-icon" size={16} />
              </div>

              <div className="col-title">
                <div className="song-thumbnail">
                  {track.thumbnail ? (
                    <img src={track.thumbnail} alt={track.title} />
                  ) : (
                    <div className="thumb-placeholder">🎵</div>
                  )}
                </div>
                <span className="song-title">{track.title}</span>
              </div>

              <div className="col-artist">{track.artist}</div>
              <div className="col-duration">{track.duration}</div>

              {track.videoId && (
                <button
                  className={`add-queue-btn ${queuedIds.has(track.videoId) ? 'queued' : ''}`}
                  title="Add to queue"
                  onClick={(e) => handleAddToQueue(e, track)}
                >
                  {queuedIds.has(track.videoId) ? "✓" : "+"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
