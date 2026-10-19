import { useEffect, useMemo, useRef, useState } from "react";
import { LANGUAGES, GENRES, CURRENT_YEAR, MIN_YEAR } from "./constants.js";
import { streamMovies } from "./api.js";
import { useLocalStorage } from "./hooks.js";
import MovieCard, { SkeletonCard } from "./components/MovieCard.jsx";
import MovieModal from "./components/MovieModal.jsx";
import Watchlist from "./components/Watchlist.jsx";

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const num = (v) => (v ? parseFloat(v) || 0 : 0);

const SORTS = {
  arrival: { label: "Fastest first", fn: () => 0 },
  rating: { label: "Top rated", fn: (a, b) => num(b.rating) - num(a.rating) },
  title: { label: "A → Z", fn: (a, b) => a.title.localeCompare(b.title) },
  runtime: { label: "Shortest", fn: (a, b) => (num(a.runtime) || 999) - (num(b.runtime) || 999) },
};

export default function App() {
  const [language, setLanguage] = useLocalStorage("fym.language", "Hindi");
  const [genre, setGenre] = useLocalStorage("fym.genre", "Comedy");
  const [year, setYear] = useLocalStorage("fym.year", 2019);
  const [watchlist, setWatchlist] = useLocalStorage("fym.watchlist", []);
  const [history, setHistory] = useLocalStorage("fym.history", []);

  const [movies, setMovies] = useState([]);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [pending, setPending] = useState(0);
  const [suggested, setSuggested] = useState(0);
  const [error, setError] = useState("");
  const [lastQuery, setLastQuery] = useState(null);

  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("arrival");
  const [minRating, setMinRating] = useState(0);
  const [selected, setSelected] = useState(null);
  const [drawer, setDrawer] = useState(false);
  const abortRef = useRef(null);
  const resultsRef = useRef(null);

  const savedIds = useMemo(() => new Set(watchlist.map((m) => m.id)), [watchlist]);
  const toggleSave = (m) =>
    setWatchlist((w) => (w.some((x) => x.id === m.id) ? w.filter((x) => x.id !== m.id) : [m, ...w]));

  async function search(q = { language, genre, year }) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setMovies([]); setError(""); setFilter(""); setMinRating(0);
    setStatus("loading"); setPending(0); setSuggested(0);
    setLastQuery(q);
    setHistory((h) => [q, ...h.filter((x) => !(x.language === q.language && x.genre === q.genre && x.year === q.year))].slice(0, 6));
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

    try {
      let remaining = 0;
      await streamMovies({ ...q, year: String(q.year) }, (e) => {
        if (e.type === "titles") { remaining = e.count; setSuggested(e.count); setPending(e.count); }
        else if (e.type === "movie") { remaining -= 1; setPending((p) => Math.max(0, p - 1)); setMovies((m) => [...m, e.movie]); }
        else if (e.type === "done") { setPending(0); }
        else if (e.type === "error") { throw new Error(e.message); }
      }, ctrl.signal);
      setStatus("done");
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message || "Something went wrong");
      setStatus("error");
    }
  }

  const surprise = () => {
    const q = { language: pick(LANGUAGES), genre: pick(GENRES).name, year: MIN_YEAR + Math.floor(Math.random() * (CURRENT_YEAR - MIN_YEAR + 1)) };
    setLanguage(q.language); setGenre(q.genre); setYear(q.year);
    search(q);
  };

  const restore = (q) => { setLanguage(q.language); setGenre(q.genre); setYear(q.year); search(q); };

  // Enter anywhere (outside inputs/modals) runs the search
  useEffect(() => {
    const h = (e) => { if (e.key === "Enter" && e.target === document.body && !selected && !drawer) search(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return movies
      .filter((m) => (!f || [m.title, m.actors, m.director].some((s) => s?.toLowerCase().includes(f))) && num(m.rating) >= minRating)
      .sort(SORTS[sort].fn);
  }, [movies, filter, sort, minRating]);

  const loading = status === "loading";
  const progress = suggested ? Math.round(((suggested - pending) / suggested) * 100) : 0;

  return (
    <div className="app">
      <header className="top">
        <div className="brand">🎬 <span>Pick Your Movie</span></div>
        <button className="btn ghost" onClick={() => setDrawer(true)}>♥ Watchlist <span className="count">{watchlist.length}</span></button>
      </header>

      <section className="hero">
        <h1>What are we watching tonight?</h1>
        <p>Pick a language, genre and year — we'll find real, verified movies with IMDb links.</p>

        <div className="panel">
          <div className="field">
            <label>Language</label>
            <div className="chips">
              {LANGUAGES.map((l) => (
                <button key={l} className={`chip ${l === language ? "active" : ""}`} onClick={() => setLanguage(l)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Genre</label>
            <div className="chips">
              {GENRES.map((g) => (
                <button key={g.name} className={`chip ${g.name === genre ? "active" : ""}`} onClick={() => setGenre(g.name)}>
                  <span>{g.icon}</span> {g.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <label>Year <b className="year">{year}</b></label>
            <input
              type="range" min={MIN_YEAR} max={CURRENT_YEAR} value={year}
              onChange={(e) => setYear(+e.target.value)} className="slider"
              style={{ "--pct": `${((year - MIN_YEAR) / (CURRENT_YEAR - MIN_YEAR)) * 100}%` }}
            />
            <div className="ticks"><span>{MIN_YEAR}</span><span>2000</span><span>2010</span><span>2020</span><span>{CURRENT_YEAR}</span></div>
          </div>

          <div className="cta">
            <button className="btn primary big" disabled={loading} onClick={() => search()}>
              {loading ? "Searching…" : `Find ${genre} movies`}
            </button>
            <button className="btn big" disabled={loading} onClick={surprise}>🎲 Surprise me</button>
          </div>

          {history.length > 0 && (
            <div className="history">
              <span>Recent:</span>
              {history.map((h, i) => (
                <button key={i} className="chip small" onClick={() => restore(h)}>{h.genre} · {h.language} · {h.year}</button>
              ))}
              <button className="link" onClick={() => setHistory([])}>clear</button>
            </div>
          )}
        </div>
      </section>

      <main ref={resultsRef} className="results">
        {status !== "idle" && lastQuery && (
          <div className="results-head">
            <h2>{lastQuery.genre} movies in {lastQuery.language} <small>({lastQuery.year})</small></h2>
            {loading && (
              <div className="progress" role="progressbar" aria-valuenow={progress}>
                <div style={{ width: `${suggested ? progress : 8}%` }} />
                <span>{suggested ? `Verifying ${suggested - pending}/${suggested} on IMDb…` : "Fetching…"}</span>
              </div>
            )}
          </div>
        )}

        {movies.length > 1 && (
          <div className="toolbar">
            <input className="search" placeholder="Filter by title, actor or director…" value={filter} onChange={(e) => setFilter(e.target.value)} />
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <label className="rate">
              Min ★ <b>{minRating.toFixed(1)}</b>
              <input type="range" min="0" max="9" step="0.5" value={minRating} onChange={(e) => setMinRating(+e.target.value)} />
            </label>
          </div>
        )}

        {status === "error" && (
          <div className="notice error">
            <p>⚠️ {error}</p>
            <button className="btn" onClick={() => search(lastQuery)}>Try again</button>
          </div>
        )}

        {status === "done" && movies.length === 0 && (
          <div className="notice">
            <p>Couldn't find or verify any movies for this combination.</p>
            <button className="btn" onClick={surprise}>🎲 Try a random one</button>
          </div>
        )}

        <div className="grid">
          {visible.map((m, i) => (
            <MovieCard key={m.id} movie={m} index={i} saved={savedIds.has(m.id)} onToggleSave={toggleSave} onOpen={setSelected} />
          ))}
          {loading && Array.from({ length: suggested ? Math.min(pending, 6) : 6 }).map((_, i) => <SkeletonCard key={`s${i}`} />)}
        </div>

        {movies.length > 0 && visible.length === 0 && <p className="empty center">No movies match your filters.</p>}
        {status === "done" && movies.length > 0 && (
          <p className="foot">Showing {visible.length} of {movies.length} verified movies{suggested > movies.length ? ` (${suggested - movies.length} unverified suggestion${suggested - movies.length > 1 ? "s" : ""} skipped)` : ""}.</p>
        )}
      </main>

      {selected && <MovieModal movie={selected} saved={savedIds.has(selected.id)} onToggleSave={toggleSave} onClose={() => setSelected(null)} />}
      <Watchlist open={drawer} items={watchlist} onClose={() => setDrawer(false)} onRemove={toggleSave} onOpenMovie={(m) => { setDrawer(false); setSelected(m); }} />
    </div>
  );
}
