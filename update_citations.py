"""
GitHub Action script: fetches Google Scholar citations for Tarikul Islam
and writes citations.json to the repo root.
Run on a schedule (e.g. weekly) via GitHub Actions.
"""
import json
import sys
from scholarly import scholarly

SCHOLAR_ID   = "60hz_E8AAAAJ"
PAPERS_FLOOR = 11   # hardcoded minimum — update if you publish more

def fetch_citations():
    try:
        author = scholarly.search_author_id(SCHOLAR_ID)
        author = scholarly.fill(author, sections=["basics", "indices", "counts", "publications"])

        # Debug: print every top-level key so we can see what scholarly returns
        print("DEBUG keys:", list(author.keys()))
        for k in ["num_pub_total", "num_pub", "publications"]:
            val = author.get(k)
            if val is not None:
                print(f"DEBUG {k}: {len(val) if isinstance(val, list) else val}")

        # Build citations-per-year
        by_year = {}
        for year, count in author.get("cites_per_year", {}).items():
            by_year[str(year)] = count

        # Paper count — try every known scholarly key, then fall back to PAPERS_FLOOR
        paper_count = (
            author.get("num_pub_total")          # some scholarly versions
            or author.get("num_pub")             # alternate key
            or len(author.get("publications", []))  # count the list
            or PAPERS_FLOOR                      # guaranteed non-zero fallback
        )

        data = {
            "total":     author.get("citedby", 0),
            "hIndex":    author.get("hindex", 0),
            "i10Index":  author.get("i10index", 0),
            "papers":    paper_count,
            "byYear":    by_year,
            "updatedAt": __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d")
        }

        with open("citations.json", "w") as f:
            json.dump(data, f, indent=2)

        print(f"OK: total={data['total']}, h={data['hIndex']}, "
              f"i10={data['i10Index']}, papers={data['papers']}")
        return True

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = fetch_citations()
    sys.exit(0 if success else 1)
