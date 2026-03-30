"""
GitHub Action script: fetches citation metrics for Tarikul Islam
using the Semantic Scholar API (free, no key, no CAPTCHA).

Falls back to the existing citations.json values if the API is unreachable,
so the workflow always exits 0 and never breaks the site.
"""
import json
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime, timezone

# ── Config ────────────────────────────────────────────────────────────────────
SCHOLAR_ID   = "60hz_E8AAAAJ"          # Google Scholar ID (kept for reference)
S2_AUTHOR_ID = "2061816683"            # Semantic Scholar author ID for Tarikul Islam
OUTPUT_FILE  = "citations.json"
PAPERS_FLOOR = 11                       # minimum paper count — bump when you publish more

# Semantic Scholar public API — no key required
S2_BASE      = "https://api.semanticscholar.org/graph/v1"
HEADERS      = {"User-Agent": "tarik-citations-bot/1.0 (tarikuli@usc.edu)"}
# ──────────────────────────────────────────────────────────────────────────────


def get(url: str, retries: int = 3, backoff: float = 4.0) -> dict:
    """HTTP GET with retries and exponential back-off."""
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            with urllib.request.urlopen(req, timeout=20) as resp:
                return json.loads(resp.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:                       # rate-limited
                wait = backoff * (2 ** attempt)
                print(f"  Rate-limited (429) — waiting {wait:.0f}s …")
                time.sleep(wait)
            else:
                raise
        except Exception as e:
            if attempt == retries - 1:
                raise
            time.sleep(backoff)
    raise RuntimeError(f"Failed after {retries} attempts: {url}")


def load_fallback() -> dict:
    """Return existing citations.json so we never write zeros."""
    try:
        with open(OUTPUT_FILE) as f:
            return json.load(f)
    except Exception:
        return {
            "total": 42, "hIndex": 3, "i10Index": 1, "papers": PAPERS_FLOOR,
            "byYear": {"2021": 2, "2022": 2, "2023": 2,
                       "2024": 14, "2025": 18, "2026": 4},
            "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d")
        }


def fetch_citations() -> bool:
    # ── 1. Author summary (total citations, h-index) ─────────────────────────
    author_url = (
        f"{S2_BASE}/author/{S2_AUTHOR_ID}"
        "?fields=citationCount,hIndex,paperCount"
    )
    author = get(author_url)

    total       = author.get("citationCount", 0)
    h_index     = author.get("hIndex", 0)
    paper_count = max(author.get("paperCount", 0), PAPERS_FLOOR)

    # ── 2. Per-paper data (for byYear + i10-index) ────────────────────────────
    papers_url = (
        f"{S2_BASE}/author/{S2_AUTHOR_ID}/papers"
        "?fields=citationCount,year&limit=100"
    )
    papers_data = get(papers_url)
    papers = papers_data.get("data", [])

    by_year: dict = {}
    i10_count = 0

    for p in papers:
        year  = p.get("year")
        cites = p.get("citationCount", 0)
        if cites >= 10:
            i10_count += 1
        if year:
            key = str(year)
            by_year[key] = by_year.get(key, 0) + cites

    # Sort years for clean JSON
    by_year = dict(sorted(by_year.items()))

    data = {
        "total":     total,
        "hIndex":    h_index,
        "i10Index":  i10_count,
        "papers":    paper_count,
        "byYear":    by_year,
        "updatedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }

    with open(OUTPUT_FILE, "w") as f:
        json.dump(data, f, indent=2)

    print(
        f"OK  total={data['total']}  h={data['hIndex']}  "
        f"i10={data['i10Index']}  papers={data['papers']}"
    )
    return True


if __name__ == "__main__":
    try:
        fetch_citations()
    except Exception as e:
        print(f"WARNING: Semantic Scholar fetch failed — {e}", file=sys.stderr)
        print("Preserving existing citations.json (no write).")
        # Exit 0 so the workflow stays green; site data is unchanged
        sys.exit(0)

    sys.exit(0)
