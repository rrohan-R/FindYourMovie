# 🎬 Pick Your Movie

Recommends real, verified movies by language, genre and year. Gemini (via LangChain) suggests titles; OMDb verifies each one and supplies poster, rating, plot and IMDb link.
UI is **React (Vite)**, backed by a small **FastAPI** server (replaces Streamlit).

## Interactive features
- Chip pickers, year slider, 🎲 Surprise me, recent-search shortcuts
- Live streaming results with progress bar + skeleton cards
- Poster cards (tilt, hover plot, rating badge), detail modal
- Filter by title/actor/director, sort, min-rating slider
- Watchlist drawer (saved in browser); last choices remembered

## Run locally
```bash
cp .env.example .env            # add GEMINI_API_KEY and OMDB_API_KEY
pip install -r requirements.txt
cd api && uvicorn index:app --reload --port 8000
# new terminal
cd frontend && npm install && npm run dev   # http://localhost:5173 (proxies /api to :8000)
```

## Deploy on Vercel (frontend + API in one project)
1. Push to GitHub, import at vercel.com/new (framework preset: Other; `vercel.json` sets the build).
2. Add env vars `GEMINI_API_KEY` and `OMDB_API_KEY` in Project Settings.
3. Deploy, then check `/api/health`.
