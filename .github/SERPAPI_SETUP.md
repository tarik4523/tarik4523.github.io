# Google Scholar citation updates

The `Update Google Scholar Citations` workflow refreshes `citations.json` once
per day using the SerpAPI Google Scholar Author API.

## One-time activation

1. Create or copy an API key from the SerpAPI dashboard.
2. Open this repository on GitHub and go to **Settings → Secrets and
   variables → Actions**.
3. Create a repository secret named `SERPAPI_KEY` and paste the key as its
   value. Never commit the key to the repository.
4. Open **Actions → Update Google Scholar Citations → Run workflow** to perform
   the first refresh immediately.

If the secret is missing or an API request fails, the workflow preserves the
last valid metrics so the website never displays zeros.
