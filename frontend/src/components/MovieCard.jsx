import { useRef } from "react";

export function Poster({ movie, className = "" }) {
  return movie.poster ? (
    <img className={`poster ${className}`} src={movie.poster} alt={`${movie.title} poster`} loading="lazy" />
  ) : (
    <div className={`poster poster-fallback ${className}`}>🎬<span>{movie.title}</span></div>
  );
}

export default function MovieCard({ movie, saved, onToggleSave, onOpen, index }) {
  const ref = useRef(null);

  // subtle 3D tilt that follows the pointer
  const onMove = (e) => {
    const el = ref.current;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateY(-4px)`;
  };
  const onLeave = () => { ref.current.style.transform = ""; };

  return (
    <article
      ref={ref}
      className="card"
      style={{ animationDelay: `${Math.min(index, 8) * 60}ms` }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      onClick={() => onOpen(movie)}
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen(movie)}
    >
      <Poster movie={movie} />
      {movie.rating && <span className="badge">★ {movie.rating}</span>}
      <button
        className={`heart ${saved ? "on" : ""}`}
        aria-label={saved ? "Remove from watchlist" : "Add to watchlist"}
        onClick={(e) => { e.stopPropagation(); onToggleSave(movie); }}
      >
        {saved ? "♥" : "♡"}
      </button>
      <div className="card-info">
        <h3>{movie.title}</h3>
        <p>{[movie.year, movie.runtime].filter(Boolean).join(" · ")}</p>
        {movie.plot && <p className="plot">{movie.plot}</p>}
      </div>
    </article>
  );
}

export function SkeletonCard() {
  return <div className="card skeleton" aria-hidden />;
}
