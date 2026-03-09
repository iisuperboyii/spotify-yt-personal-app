import "./AlbumCard.css";

export default function AlbumCard({ title, description, color, icon, onClick }) {
  return (
    <div className="album-card" onClick={onClick}>
      <div className="album-card-cover" style={{ background: color }}>
        <span className="album-card-icon">{icon}</span>
      </div>
      <div className="album-card-info">
        <div className="album-card-title">{title}</div>
        {description && (
          <div className="album-card-description">{description}</div>
        )}
      </div>
    </div>
  );
}
