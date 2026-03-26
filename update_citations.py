"""
GitHub Action script: fetches Google Scholar citations for Tarikul Islam
and writes citations.json to the repo root.
Run on a schedule (e.g. weekly) via GitHub Actions.
"""
import json
import sys
from scholarly import scholarly, ProxyGenerator

SCHOLAR_ID = "60hz_E8AAAAJ"

def fetch_citations():
    try:
        author = scholarly.search_author_id(SCHOLAR_ID)
        author = scholarly.fill(author, sections=["basics", "indices", "counts", "publications"])

        by_year = {}
        for year, count in author.get("cites_per_year", {}).items():
            by_year[str(year)] = count

        # num_pub_total is the public count on the Scholar profile page;
        # fall back to num_pub, then count the publications list directly
        paper_count = (
            author.get("num_pub_total")
            or author.get("num_pub")
            or len(author.get("publications", []))
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

        print(f"OK: {data['total']} citations, h={data['hIndex']}, "
              f"i10={data['i10Index']}, papers={data['papers']}")
        return True

    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    success = fetch_citations()
    sys.exit(0 if success else 1)
