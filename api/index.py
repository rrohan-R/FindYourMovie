import json
import os

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import StreamingResponse

import sys
sys.path.insert(0, os.path.dirname(__file__))
import langchain_helper as helper

app = FastAPI(title="Find Your Movie API")



@app.get("/api/health")
def health():
    return {
        "ok": True,
        "gemini_key": bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")),
        "omdb_key": bool(helper.OMDB_API_KEY),
    }


@app.get("/api/movies/stream")
def movies_stream(language: str = Query(...), genre: str = Query(...), year: str = Query(..., pattern=r"^\d{4}$")):
    """Newline-delimited JSON stream: titles -> movie* -> done (or error)."""
    if not helper.OMDB_API_KEY:
        raise HTTPException(500, "OMDB_API_KEY is not configured on the server")

    def gen():
        try:
            for event in helper.stream_movie_recommendations(language, genre, year):
                yield json.dumps(event) + "\n"
        except Exception as exc:  # surface failures to the UI instead of a dead stream
            yield json.dumps({"type": "error", "message": str(exc)[:300]}) + "\n"

    return StreamingResponse(gen(), media_type="application/x-ndjson", headers={"Cache-Control": "no-store"})
