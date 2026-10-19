import { useEffect } from "react";
import { Poster } from "./MovieCard.jsx";

export default function MovieModal({ movie, saved, onToggleSave, onClose }) {
  useEffect(() => {
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="close" onClick={onClose} aria-label="Close">✕</button>
        <Poster movie={movie} className="modal-poster" />
        <div className="modal-body">
          <h2>{movie.title} <small>{movie.year}</small></h2>
          <div className="meta">
            {movie.rating && <span className="pill gold">★ {movie.rating} IMDb</span>}
            {movie.runtime && <span className="pill">{movie.runtime}</span>}
            {movie.genre && movie.genre.split(", ").map((g) => <span key={g} className="pill">{g}</span>)}
          </div>
          {movie.plot && <p className="modal-plot">{movie.plot}</p>}
          {movie.director && <p><b>Director</b> {movie.director}</p>}
          {movie.actors && <p><b>Cast</b> {movie.actors}</p>}
          <div className="actions">
            {movie.imdb_link && <a className="btn primary" href={movie.imdb_link} target="_blank" rel="noreferrer">Open on IMDb ↗</a>}
            <button className="btn" onClick={() => onToggleSave(movie)}>{saved ? "♥ In watchlist" : "♡ Add to watchlist"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
