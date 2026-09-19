"""Update citation metrics from the Google Scholar profile through SerpAPI.

The API key is read only from the SERPAPI_KEY environment variable. If the
secret is missing or the service is unavailable, the existing citations.json
is preserved so the public website never falls back to zeros.
"""

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone


SCHOLAR_ID = "60hz_E8AAAAJ"
OUTPUT_FILE = "citations.json"
PAPERS_FLOOR = 11
SERPAPI_ENDPOINT = "https://serpapi.com/search.json"
PROFILE_URL = f"https://scholar.google.com/citations?hl=en&user={SCHOLAR_ID}"
HEADERS = {"User-Agent": "tarik-citations-bot/2.0 (tarikuli@usc.edu)"}


def get_json(url: str, retries: int = 3, backoff: float = 4.0) -> dict:
    """Fetch JSON without ever exposing the API key in logs or exceptions."""
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read())
        except urllib.error.HTTPError as error:
            if error.code == 429 and attempt < retries - 1:
                wait = backoff * (2**attempt)
                print(f"Rate limited; retrying in {wait:.0f} seconds.")
                time.sleep(wait)
                continue
            raise RuntimeError(f"Citation service returned HTTP {error.code}") from None
        except Exception:
            if attempt == retries - 1:
                raise RuntimeError("Citation service request failed") from None
            time.sleep(backoff * (2**attempt))
    raise RuntimeError("Citation service request failed")


def metric_value(table: list, metric: str) -> int:
    """Read the all-time value from SerpAPI's cited_by table."""
    for row in table:
        value = row.get(metric)
        if isinstance(value, dict):
            return int(value.get("all", 0) or 0)
    return 0


def parse_serpapi(payload: dict) -> dict:
    """Convert a Google Scholar Author API response to the site's schema."""
    if payload.get("error"):
        raise RuntimeError("Citation service returned an error")

    cited_by = payload.get("cited_by") or {}
    table = cited_by.get("table") or []
    graph = cited_by.get("graph") or []
    if not table:
        raise RuntimeError("Google Scholar metrics were missing from the response")

    total = metric_value(table, "citations")
    h_index = metric_value(table, "h_index")
    i10_index = metric_value(table, "i10_index")
    if total <= 0:
        raise RuntimeError("Google Scholar returned an invalid citation total")

    by_year = {
        str(item["year"]): int(item.get("citations", 0) or 0)
        for item in graph
        if item.get("year") is not None
    }
    by_year = dict(sorted(by_year.items()))
    paper_count = max(len(payload.get("articles") or []), PAPERS_FLOOR)

    return {
        "total": total,
        "hIndex": h_index,
        "i10Index": i10_index,
        "papers": paper_count,
        "byYear": by_year,
        "updatedAt": datetime.now(timezone.utc).strftime("%B %d, %Y"),
        "source": "Google Scholar",
        "profileUrl": PROFILE_URL,
        "yearSeriesLabel": "Citations per year",
    }


def load_fallback() -> dict:
    """Return existing website data so a failed refresh never erases metrics."""
    try:
        with open(OUTPUT_FILE, encoding="utf-8") as file:
            return json.load(file)
    except Exception:
        return {
            "total": 51,
            "hIndex": 3,
            "i10Index": 2,
            "papers": PAPERS_FLOOR,
            "byYear": {},
            "updatedAt": "June 08, 2026",
            "source": "Semantic Scholar",
            "profileUrl": "https://www.semanticscholar.org/author/2061816683",
            "yearSeriesLabel": "Citations by publication year",
        }


def fetch_citations() -> dict:
    api_key = os.environ.get("SERPAPI_KEY", "").strip()
    if not api_key:
        raise RuntimeError("SERPAPI_KEY is not configured")

    query = urllib.parse.urlencode(
        {
            "engine": "google_scholar_author",
            "author_id": SCHOLAR_ID,
            "hl": "en",
            "num": 100,
            "api_key": api_key,
        }
    )
    return parse_serpapi(get_json(f"{SERPAPI_ENDPOINT}?{query}"))


def write_data(data: dict) -> None:
    with open(OUTPUT_FILE, "w", encoding="utf-8") as file:
        json.dump(data, file, indent=2, ensure_ascii=False)
        file.write("\n")


if __name__ == "__main__":
    try:
        updated = fetch_citations()
        write_data(updated)
        print(
            f"Updated Google Scholar metrics: citations={updated['total']} "
            f"h-index={updated['hIndex']} i10-index={updated['i10Index']} "
            f"papers={updated['papers']}"
        )
    except Exception as error:
        cached = load_fallback()
        print(f"WARNING: {error}. Preserving cached {cached.get('source', 'citation')} data.")
        sys.exit(0)
