import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { FiHome, FiSearch, FiX } from "react-icons/fi";
import { goToHome } from "../utils/ytMusicAPI";
import "./TopNav.css";

export default function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleHomeClick = async () => {
    navigate('/');
    await goToHome();
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  // Hide TopNav on Now Playing screen
  if (location.pathname === '/now-playing') {
    return null;
  }

  return (
    <div className="top-nav">
      <button
        className={`nav-home-btn ${location.pathname === '/' ? 'active' : ''}`}
        onClick={handleHomeClick}
        title="Home"
      >
        <FiHome size={28} />
      </button>

      <div className="nav-search-container">
        <form className="nav-search-form" onSubmit={handleSearch}>
          <FiSearch className="search-icon" size={20} />
          <input
            type="text"
            className="nav-search-input"
            placeholder="What do you want to play?"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={clearSearch}
            >
              <FiX size={20} />
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
