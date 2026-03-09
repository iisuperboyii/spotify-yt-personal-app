import "./PlaylistCard.css";

export default function PlaylistCard({ title, description, color, icon, onClick }) {
  return (
    <div className="playlist-card" onClick={onClick}>
      <div className="playlist-card-cover" style={{ background: color }}>
        <span className="playlist-card-icon">{icon}</span>
      </div>
      <div className="playlist-card-info">
        <div className="playlist-card-title">{title}</div>
        {description && (
          <div className="playlist-card-description">{description}</div>
        )}
      </div>
    </div>
  );
}
