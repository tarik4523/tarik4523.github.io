# Updating site content

Most repeatable content on the website is controlled by
[`site-content.json`](site-content.json):

- `news` controls the Bio page news feed. Set `featured` to `false` to place an
  item behind the **View all news** button.
- `research.current` and `research.previous` control the Research page cards.
- A research project's `images` array controls its gallery. Each `base` value
  points to matching `.avif`, `.webp`, and `.jpg` files without the extension.
- `publications.journals`, `publications.conference`, and
  `publications.posters` control the Publications page and its live counts.

Keep the JSON syntax valid: use double quotes, separate items with commas, and
do not place a comma after the final item in an array or object. The website
keeps the existing HTML as a fallback if this file cannot be loaded.

Publication entries can use a `bibtexKey` that matches an entry in the
`BIBTEX` object near the end of `script.js`. Omit `bibtexKey` when no BibTeX
entry is available.
