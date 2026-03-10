import { useEffect, useState, useRef, useCallback } from "react";
import { FiX, FiTrash2 } from "react-icons/fi";
import { getQueue, removeFromQueue, playFromQueueIndex } from "../utils/ytMusicAPI";
import "./QueuePanel.css";

export default function QueuePanel({ onClose }) {
  const [queue, setQueue] = useState({ nowPlaying: null, upcoming: [] });
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [removingDomIndex, setRemovingDomIndex] = useState(null);

  // Track manually removed items by title+artist key so the poll doesn't resurface them
  const removedKeys = useRef(new Set());
  // Timestamp of last remove — pause polling for 10s after remove
  const lastRemoveTime = useRef(0);

  const fetchQueue = useCallback(async () => {
    // Don't poll within 8 seconds of a manual remove
    if (Date.now() - lastRemoveTime.current < 8000) return;

    const result = await getQueue();
    if (result) {
      // Filter out any items the user already removed this session
      const filtered = {
        ...result,
        upcoming: result.upcoming.filter(item => {
          const key = `${item.title}|||${item.artist}`;
          return !removedKeys.current.has(key);
        })
      };
      setQueue(filtered);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial load (always)
    getQueue().then(result => {
      if (result) setQueue(result);
      setLoading(false);
    });

    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleRemove = async (e, item) => {
    e.stopPropagation();

    // Mark as removed optimistically BEFORE calling API
    const key = `${item.title}|||${item.artist}`;
    removedKeys.current.add(key);
    lastRemoveTime.current = Date.now();

    // Optimistically update UI immediately
    setQueue(prev => ({
      ...prev,
      upcoming: prev.upcoming.filter(i => i.domIndex !== item.domIndex)
    }));

    setRemovingDomIndex(item.domIndex);
    const result = await removeFromQueue(item.domIndex);
    console.log('[QueuePanel] removeFromQueue result:', result);

    setRemovingDomIndex(null);

    // If remove failed in YTM, clear the key after 3s so it can come back
    if (!result?.success) {
      console.warn('[QueuePanel] Remove may have failed:', result?.error);
      setTimeout(() => removedKeys.current.delete(key), 3000);
    }
  };

  const handlePlay = async (item) => {
    await playFromQueueIndex(item.domIndex);
    // After playing, clear removed keys and refresh
    removedKeys.current.clear();
    lastRemoveTime.current = 0;
    setTimeout(async () => {
      const result = await getQueue();
      if (result) setQueue(result);
    }, 1500);
  };

  return (
    <div className="queue-panel">
      <div className="queue-panel-header">
        <div className="queue-panel-tabs">
          <span className="queue-tab active">Queue</span>
        </div>
        <button className="queue-close-btn" onClick={onClose}>
          <FiX size={18} />
        </button>
      </div>

      <div className="queue-panel-body">
        {loading ? (
        <div className="queue-loading">
            <div className="loading-spinner-green" />
            <span>Loading queue...</span>
          </div>
        ) : (
          <>
            {/* Now Playing */}
            {queue.nowPlaying && (
              <div className="queue-section">
                <h4 className="queue-section-title">Now playing</h4>
                <div className="queue-item queue-item--playing">
                  <div className="queue-item-art">
                    {queue.nowPlaying.artwork ? (
                      <img src={queue.nowPlaying.artwork} alt={queue.nowPlaying.title} />
                    ) : (
                      <div className="queue-item-art-placeholder" />
                    )}
                    <div className="queue-item-playing-indicator">
                      <span /><span /><span />
                    </div>
                  </div>
                  <div className="queue-item-info">
                    <div className="queue-item-title playing">{queue.nowPlaying.title}</div>
                    <div className="queue-item-artist">{queue.nowPlaying.artist}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Next Up */}
            {queue.upcoming.length > 0 ? (
              <div className="queue-section">
                <h4 className="queue-section-title">Next up</h4>
                <div className="queue-list">
                  {queue.upcoming.map((item, i) => {
                    const isHovered = hoveredIndex === i;
                    const isRemoving = removingDomIndex === item.domIndex;

                    return (
                      <div
                        key={`${item.domIndex}-${item.title}`}
                        className={`queue-item ${isHovered ? 'hovered' : ''} ${isRemoving ? 'removing' : ''}`}
                        onMouseEnter={() => setHoveredIndex(i)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        onClick={() => handlePlay(item)}
                        title={`Play: ${item.title}`}
                      >
                        <div className="queue-item-art">
                          {item.artwork ? (
                            <img src={item.artwork} alt={item.title} />
                          ) : (
                            <div className="queue-item-art-placeholder" />
                          )}
                          {isHovered && (
                            <div className="queue-item-play-overlay">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="queue-item-info">
                          <div className="queue-item-title">{item.title}</div>
                          <div className="queue-item-artist">{item.artist}</div>
                        </div>
                        {isHovered && (
                          <button
                            className="queue-item-remove-btn"
                            title="Remove from queue"
                            onClick={(e) => handleRemove(e, item)}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              !loading && (
                <div className="queue-empty">
                  <p>No upcoming songs in queue.</p>
                  <p className="queue-empty-hint">Play a playlist or album to see the queue.</p>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}
