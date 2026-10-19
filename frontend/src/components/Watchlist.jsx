import { Poster } from "./MovieCard.jsx";

export default function Watchlist({ open, items, onClose, onRemove, onOpenMovie }) {
  return (
    <>
      <div className={`scrim ${open ? "show" : ""}`} onClick={onClose} />
      <aside className={`drawer ${open ? "open" : ""}`} aria-hidden={!open}>
        <header>
          <h2>My Watchlist <span className="count">{items.length}</span></h2>
          <button className="close static" onClick={onClose} aria-label="Close">✕</button>
        </header>
        {items.length === 0 ? (
          <p className="empty">Tap the ♡ on any movie to save it here. Saved movies are kept in your browser.</p>
        ) : (
          <ul>
            {items.map((m) => (
              <li key={m.id}>
                <button className="row" onClick={() => onOpenMovie(m)}>
                  <Poster movie={m} className="thumb" />
                  <span><b>{m.title}</b><small>{[m.year, m.rating && `★ ${m.rating}`].filter(Boolean).join(" · ")}</small></span>
                </button>
                <button className="remove" onClick={() => onRemove(m)} aria-label={`Remove ${m.title}`}>✕</button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  );
}
