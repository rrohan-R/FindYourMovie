import os
import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Iterator

import requests
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser

load_dotenv()

OMDB_API_KEY = os.environ.get("OMDB_API_KEY", "")
# langchain-google-genai reads GEMINI_API_KEY / GOOGLE_API_KEY from the environment.

_llm = None


def get_llm():
    """Create the LLM lazily so the server can boot (and report config errors) without it."""
    global _llm
    if _llm is None:
        _llm = ChatGoogleGenerativeAI(model="gemini-3.6-flash", temperature=0.7)
    return _llm


PROMPT = PromptTemplate(
    input_variables=["language", "genre", "year"],
    template="""Give all real {language} language movies in the {genre} genre released in the year {year}.

Respond ONLY with a valid JSON array of movie titles as strings, nothing else — no explanation, no markdown formatting, no code fences.

Example format:
["Movie Name One", "Movie Name Two"]""",
)


def get_titles(language, genre, year):
    chain = PROMPT | get_llm() | StrOutputParser()
    raw = chain.invoke({"language": language, "genre": genre, "year": year})
    return parse_titles_response(raw)


def stream_movie_recommendations(language, genre, year) -> Iterator[dict]:
    """Yield events as work progresses:
      {"type": "titles", "count": n}   - the LLM suggested n titles
      {"type": "movie", "movie": {...}} - a title verified on OMDb (in completion order)
      {"type": "done", "found": k, "suggested": n}
    """
    titles = get_titles(language, genre, year)
    # de-duplicate while keeping order
    titles = list(dict.fromkeys(t for t in titles if isinstance(t, str) and t.strip()))
    yield {"type": "titles", "count": len(titles)}

    found = 0
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(lookup_movie_on_omdb, t, year) for t in titles]
        for fut in as_completed(futures):
            movie = fut.result()
            if movie:
                found += 1
                yield {"type": "movie", "movie": movie}
    yield {"type": "done", "found": found, "suggested": len(titles)}


def generate_movie_recommendations(language, genre, year):
    """Non-streaming helper (kept for scripts / tests)."""
    return [e["movie"] for e in stream_movie_recommendations(language, genre, year) if e["type"] == "movie"]


def parse_titles_response(raw_response):
    """Clean up and parse the LLM's JSON response into a list of title strings."""
    if isinstance(raw_response, list):  # some model versions return content blocks
        raw_response = "".join(
            b.get("text", "") if isinstance(b, dict) else str(b) for b in raw_response
        )
    cleaned = raw_response.strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    cleaned = cleaned.strip()

    try:
        titles = json.loads(cleaned)
        return titles if isinstance(titles, list) else []
    except json.JSONDecodeError:
        match = re.search(r"\[.*\]", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return []


def _clean(value):
    return None if value in (None, "", "N/A") else value


def lookup_movie_on_omdb(title, year):
    """Query OMDb for a title and return real IMDb data, or None if not found."""
    try:
        response = requests.get(
            "https://www.omdbapi.com/",
            params={"t": title, "y": year, "plot": "short", "apikey": OMDB_API_KEY},
            timeout=8,
        )
        data = response.json()
        if data.get("Response") != "True":
            return None
        imdb_id = data.get("imdbID")
        return {
            "id": imdb_id or title,
            "title": data.get("Title", title),
            "year": _clean(data.get("Year")),
            "imdb_link": f"https://www.imdb.com/title/{imdb_id}/" if imdb_id else None,
            "poster": _clean(data.get("Poster")),
            "plot": _clean(data.get("Plot")),
            "rating": _clean(data.get("imdbRating")),
            "runtime": _clean(data.get("Runtime")),
            "director": _clean(data.get("Director")),
            "actors": _clean(data.get("Actors")),
            "genre": _clean(data.get("Genre")),
        }
    except (requests.RequestException, ValueError):
        return None


if __name__ == "__main__":
    for movie in generate_movie_recommendations("Hindi", "Comedy", "2019"):
        print(movie["title"], "-", movie["imdb_link"])
