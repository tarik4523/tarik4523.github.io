/* ── THEME ── */
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const themeModes = ['auto', 'light', 'dark'];

function getStoredTheme() {
  try { return localStorage.getItem('theme') || 'auto'; } catch (e) { return 'auto'; }
}
function systemPrefersDark() {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function resolveTheme(mode) {
  return mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode;
}
function renderThemeIcon() {
  const mode = document.documentElement.dataset.themePreference || getStoredTheme();
  const resolved = document.documentElement.dataset.theme || resolveTheme(mode);
  const isAuto = mode === 'auto';
  const isDark = resolved === 'dark';
  themeIcon.innerHTML = isAuto
    ? '<rect x="3.5" y="4" width="17" height="12" rx="2.5"></rect><path d="M8 20h8"></path><path d="M12 16v4"></path><path d="M7 8h.01"></path><path d="M17 8h.01"></path>'
    : isDark
      ? '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2"></path><path d="M12 20v2"></path><path d="M4.93 4.93l1.41 1.41"></path><path d="M17.66 17.66l1.41 1.41"></path><path d="M2 12h2"></path><path d="M20 12h2"></path><path d="M4.93 19.07l1.41-1.41"></path><path d="M17.66 6.34l1.41-1.41"></path>'
      : '<circle cx="12" cy="12" r="5"></circle><path d="M12 1v2"></path><path d="M12 21v2"></path><path d="M4.22 4.22l1.42 1.42"></path><path d="M18.36 18.36l1.42 1.42"></path><path d="M1 12h2"></path><path d="M21 12h2"></path><path d="M4.22 19.78l1.42-1.42"></path><path d="M18.36 5.64l1.42-1.42"></path>';
  themeToggle.title = 'Theme: ' + mode.charAt(0).toUpperCase() + mode.slice(1);
  themeToggle.setAttribute('aria-label', 'Change theme. Current theme: ' + mode);
}
function applyTheme(mode, persist = true) {
  const resolved = resolveTheme(mode);
  document.documentElement.dataset.theme = resolved;
  document.documentElement.dataset.themePreference = mode;
  try { if (persist) localStorage.setItem('theme', mode); } catch (e) {}
  renderThemeIcon();
  /* Update theme-color meta for mobile browser chrome */
  const tcMeta = document.getElementById('theme-color-meta');
  if (tcMeta) tcMeta.content = resolved === 'dark' ? '#0b1020' : '#f4f7fb';
  /* Announce change to screen readers */
  const announce = document.getElementById('theme-announce');
  if (announce && persist) {
    announce.textContent = '';
    setTimeout(() => { announce.textContent = 'Theme changed to ' + mode; }, 50);
  }
  window.dispatchEvent(new CustomEvent('themechange', { detail: { mode, resolved } }));
}
if (themeToggle && themeIcon) {
  applyTheme(getStoredTheme(), false);
  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.dataset.themePreference || getStoredTheme();
    const idx = themeModes.indexOf(current);
    const next = themeModes[(idx + 1) % themeModes.length];
    applyTheme(next, true);
  });
  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemThemeChange = () => {
      const current = document.documentElement.dataset.themePreference || getStoredTheme();
      if (current === 'auto') applyTheme('auto', false);
    };
    if (mq.addEventListener) mq.addEventListener('change', onSystemThemeChange);
    else if (mq.addListener) mq.addListener(onSystemThemeChange);
  }
}

/* TOPBAR SCROLL STATE */
const topbar = document.querySelector('.topbar');
function updateTopbarState() {
  if (!topbar) return;
  topbar.classList.toggle('scrolled', window.scrollY > 12);
}
window.addEventListener('scroll', updateTopbarState, { passive: true });
updateTopbarState();

/* ── CV AVAILABILITY NOTICE ── */
let cvNoticeTimer = null;
function showCvUnavailable(trigger) {
  const toast = document.getElementById('site-toast');
  const text = document.getElementById('site-toast-text');
  if (!toast || !text) return;
  text.textContent = 'CV is not available yet. Please check back soon.';
  toast.hidden = false;
  requestAnimationFrame(() => toast.classList.add('visible'));
  if (cvNoticeTimer) clearTimeout(cvNoticeTimer);
  cvNoticeTimer = setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => { toast.hidden = true; }, 220);
  }, 3600);
  if (trigger) trigger.setAttribute('aria-describedby', 'site-toast-text');
}

/* ── PAGE NAV ── */
let pageSwitchTimer = null;
const VALID_PAGES = new Set(['bio','research','publications','teaching','mentoring','awards','skills','experience']);

function showPage(id, pushState = true) {
  if (!VALID_PAGES.has(id)) id = 'bio';
  const nextPage = document.getElementById('page-' + id);
  const currentPage = document.querySelector('.page.active');
  if (pageSwitchTimer) { clearTimeout(pageSwitchTimer); pageSwitchTimer = null; }
  document.querySelectorAll('.topbar-nav a, .mobile-nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === id);
  });
  const navMore = document.getElementById('nav-more');
  if (navMore) {
    navMore.classList.toggle('is-active', ['awards', 'skills', 'experience'].includes(id));
    navMore.open = false;
  }
  /* Update URL hash without triggering a page reload */
  if (pushState) history.pushState({ page: id }, '', '#' + id);
  if (currentPage && currentPage !== nextPage) {
    currentPage.classList.remove('active');
    currentPage.classList.add('leaving');
    pageSwitchTimer = setTimeout(() => {
      currentPage.classList.remove('leaving');
      nextPage.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      refreshReveals();
      if (id === 'bio') setTimeout(animateInterestTags, 80);
      /* Move focus to new page for keyboard/screen-reader users */
      const focusTarget = nextPage.querySelector('.page-title') || nextPage;
      focusTarget.setAttribute('tabindex', '-1');
      focusTarget.focus({ preventScroll: true });
    }, 150);
  } else {
    nextPage.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    refreshReveals();
    if (id === 'bio') setTimeout(animateInterestTags, 80);
    const focusTarget = nextPage.querySelector('.page-title') || nextPage;
    focusTarget.setAttribute('tabindex', '-1');
    focusTarget.focus({ preventScroll: true });
  }
}

/* Restore page from URL hash on load or browser back/forward */
(function () {
  const hash = location.hash.replace('#', '').toLowerCase();
  if (VALID_PAGES.has(hash) && hash !== 'bio') {
    /* Remove the default active class from bio and activate the correct page */
    const bioPage = document.getElementById('page-bio');
    if (bioPage) bioPage.classList.remove('active');
    showPage(hash, false);
  }
})();

window.addEventListener('popstate', e => {
  const id = (e.state && e.state.page) || location.hash.replace('#', '') || 'bio';
  showPage(id, false);
});

/* ── HAMBURGER ── */
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobile-nav');
mobileNav.inert = true;
mobileNav.setAttribute('aria-hidden', 'true');
hamburger.addEventListener('click', e => {
  e.stopPropagation();
  const open = mobileNav.classList.toggle('open');
  hamburger.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', String(open));
  hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  mobileNav.inert = !open;
  mobileNav.setAttribute('aria-hidden', String(!open));
});
document.addEventListener('click', e => {
  if (mobileNav.classList.contains('open') && !mobileNav.contains(e.target) && e.target !== hamburger) {
    closeMobileNav();
  }
  const navMore = document.getElementById('nav-more');
  if (navMore && navMore.open && !navMore.contains(e.target)) navMore.open = false;
});
function closeMobileNav() {
  mobileNav.classList.remove('open');
  hamburger.classList.remove('open');
  hamburger.setAttribute('aria-expanded', 'false');
  hamburger.setAttribute('aria-label', 'Open menu');
  mobileNav.inert = true;
  mobileNav.setAttribute('aria-hidden', 'true');
}
window.addEventListener('resize', () => { if (window.innerWidth > 920) closeMobileNav(); });

/* ── SCROLL PROGRESS + BACK-TO-TOP ── */
const progressBar = document.getElementById("progress-bar");
const backTop = document.getElementById("back-top");
let ambientScrollRaf = null;
function updateAmbientMotion() {
  const y = window.scrollY || 0;
  document.documentElement.style.setProperty("--orb1-y", Math.round(y * 0.04) + "px");
  document.documentElement.style.setProperty("--orb2-y", Math.round(y * -0.03) + "px");
  document.documentElement.style.setProperty("--orb3-y", Math.round(y * 0.02) + "px");
}
window.addEventListener("scroll", () => {
  const docH = document.documentElement.scrollHeight - window.innerHeight;
  const pct = docH > 0 ? (window.scrollY / docH) * 100 : 0;
  progressBar.style.width = pct + "%";
  backTop.classList.toggle("visible", window.scrollY > 320);
  if (!ambientScrollRaf) {
    ambientScrollRaf = requestAnimationFrame(() => { updateAmbientMotion(); ambientScrollRaf = null; });
  }
}, { passive: true });
updateAmbientMotion();

/* ── DATA-DRIVEN CONTENT ──
   News, research projects, galleries, and publications are loaded from
   data/site-content.json. The original HTML remains as an SEO-friendly and
   offline fallback if the data file cannot be loaded. */
(function loadSiteContent() {
  const validUrl = value => {
    try {
      const parsed = new URL(value, window.location.origin);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '#';
    } catch (error) { return '#'; }
  };
  const plural = (count, singular, pluralForm) => count + ' ' + (count === 1 ? singular : pluralForm);

  function renderNews(items) {
    const list = document.getElementById('news-list');
    if (!list || !Array.isArray(items) || !items.length) return;
    list.replaceChildren();
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'news-row' + (item.featured === false ? ' news-extra' : '');
      if (item.featured === false) row.style.display = 'none';
      const date = document.createElement('span');
      date.className = 'news-date';
      date.textContent = item.date || '';
      const copy = document.createElement('span');
      copy.className = 'news-text';
      copy.innerHTML = item.textHtml || '';
      if (item.badge) {
        const badge = document.createElement('span');
        badge.className = 'news-badge';
        badge.textContent = item.badge;
        copy.append(' ', badge);
      }
      row.append(date, copy);
      list.append(row);
    });
    const toggle = document.getElementById('news-toggle-btn');
    if (toggle) toggle.hidden = !items.some(item => item.featured === false);
  }

  function renderPathway(steps) {
    if (!Array.isArray(steps) || !steps.length) return null;
    const figure = document.createElement('figure');
    figure.className = 'research-pathway';
    figure.setAttribute('aria-labelledby', 'research-pathway-title');
    const caption = document.createElement('figcaption');
    caption.id = 'research-pathway-title';
    caption.textContent = 'Research pathway';
    const grid = document.createElement('div');
    grid.className = 'pathway-grid';
    steps.forEach((step, index) => {
      if (index) {
        const arrow = document.createElement('span');
        arrow.className = 'pathway-arrow';
        arrow.setAttribute('aria-hidden', 'true');
        arrow.textContent = '→';
        grid.append(arrow);
      }
      const item = document.createElement('div');
      item.className = 'pathway-step';
      const number = document.createElement('span');
      number.className = 'pathway-number';
      number.textContent = String(index + 1).padStart(2, '0');
      const label = document.createElement('strong');
      label.textContent = step.label || '';
      const detail = document.createElement('span');
      detail.textContent = step.detail || '';
      item.append(number, label, detail);
      grid.append(item);
    });
    figure.append(caption, grid);
    return figure;
  }

  function renderGallery(project) {
    if (!Array.isArray(project.images) || !project.images.length) return null;
    const gallery = document.createElement('div');
    gallery.className = 'research-gallery';
    gallery.setAttribute('aria-label', project.galleryLabel || ('Selected figures for ' + project.title));
    project.images.forEach(image => {
      const figure = document.createElement('figure');
      figure.className = 'research-figure';
      const imageLink = document.createElement('a');
      imageLink.className = 'research-figure-image';
      imageLink.href = image.base + '.jpg';
      imageLink.target = '_blank';
      imageLink.rel = 'noopener noreferrer';
      imageLink.setAttribute('aria-label', 'Open full-size figure: ' + image.alt);
      const picture = document.createElement('picture');
      [['avif', 'image/avif'], ['webp', 'image/webp']].forEach(([extension, type]) => {
        const source = document.createElement('source');
        source.type = type;
        source.srcset = image.base + '.' + extension;
        picture.append(source);
      });
      const img = document.createElement('img');
      img.src = image.base + '.jpg';
      img.alt = image.alt || '';
      img.width = Number(image.width) || 900;
      img.height = Number(image.height) || 600;
      img.loading = 'lazy';
      img.decoding = 'async';
      picture.append(img);
      imageLink.append(picture);
      const caption = document.createElement('figcaption');
      const captionText = document.createElement('span');
      captionText.textContent = image.caption || '';
      const cite = document.createElement('cite');
      if (image.sourceUrl) {
        const sourceLink = document.createElement('a');
        sourceLink.href = validUrl(image.sourceUrl);
        sourceLink.target = '_blank';
        sourceLink.rel = 'noopener noreferrer';
        sourceLink.textContent = image.citation || 'Source';
        cite.append(sourceLink);
      } else cite.textContent = image.citation || '';
      caption.append(captionText, cite);
      figure.append(imageLink, caption);
      gallery.append(figure);
    });
    return gallery;
  }

  function createResearchCard(project) {
    const card = document.createElement('div');
    card.className = 'research-card' + (project.featured ? ' research-card-featured' : '') + (project.tone ? ' ' + project.tone : '');
    const tag = document.createElement('span');
    tag.className = 'rc-tag' + (project.tone ? ' ' + project.tone : '');
    tag.textContent = project.tag || '';
    const title = document.createElement('div');
    title.className = 'rc-title';
    title.textContent = project.title || '';
    const description = document.createElement('div');
    description.className = 'rc-desc';
    description.textContent = project.description || '';
    card.append(tag, title, description);
    const pathway = renderPathway(project.pathway);
    const gallery = renderGallery(project);
    if (pathway) card.append(pathway);
    if (gallery) card.append(gallery);
    return card;
  }

  function renderResearch(research) {
    if (!research) return;
    [['current', 'research-current-list'], ['previous', 'research-previous-list']].forEach(([key, id]) => {
      const container = document.getElementById(id);
      const projects = research[key];
      if (!container || !Array.isArray(projects) || !projects.length) return;
      container.replaceChildren(...projects.map(createResearchCard));
    });
  }

  function createPublication(item, number) {
    const row = document.createElement('div');
    row.className = 'pub-item';
    const num = document.createElement('span');
    num.className = 'pub-num';
    num.textContent = number;
    const badge = document.createElement('span');
    badge.className = 'pub-badge';
    badge.textContent = item.badge || '';
    const body = document.createElement('div');
    body.className = 'pub-body';
    const title = document.createElement('div');
    title.className = 'pub-title';
    title.textContent = item.title || '';
    const authors = document.createElement('div');
    authors.className = 'pub-authors';
    authors.innerHTML = item.authorsHtml || '';
    const venue = document.createElement('div');
    venue.className = 'pub-venue';
    venue.textContent = item.venue || '';
    const links = document.createElement('div');
    links.className = 'pub-links';
    if (item.url) {
      const link = document.createElement('a');
      link.href = validUrl(item.url);
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'pub-link';
      link.textContent = item.linkLabel || 'Link ↗';
      links.append(link);
    }
    if (item.bibtexKey) {
      const bib = document.createElement('button');
      bib.type = 'button';
      bib.className = 'pub-link bib-btn';
      bib.textContent = 'BibTeX';
      bib.addEventListener('click', () => copyBibtex(item.bibtexKey, bib));
      links.append(bib);
    }
    body.append(title, authors, venue, links);
    row.append(num, badge, body);
    return row;
  }

  function renderPublicationList(sectionId, items) {
    const list = document.querySelector('#' + sectionId + ' .pub-list');
    if (!list || !Array.isArray(items)) return;
    list.replaceChildren(...items.map((item, index) => createPublication(item, items.length - index)));
  }

  function renderPosters(items) {
    const section = document.getElementById('poster-section');
    if (!section || !Array.isArray(items)) return;
    section.querySelectorAll('.poster-item').forEach(item => item.remove());
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'poster-item';
      const label = document.createElement('div');
      label.className = 'poster-label';
      label.textContent = 'Poster · ' + item.year;
      const title = document.createElement('div');
      title.className = 'poster-title';
      title.textContent = item.title || '';
      const authors = document.createElement('div');
      authors.className = 'poster-authors';
      authors.textContent = item.authors || '';
      const venue = document.createElement('div');
      venue.className = 'poster-venue';
      venue.textContent = item.venue || '';
      if (item.url) {
        venue.append(' ');
        const link = document.createElement('a');
        link.href = validUrl(item.url);
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = '[View Poster ↗]';
        venue.append(link);
      }
      row.append(label, title, authors, venue);
      section.append(row);
    });
  }

  function renderPublications(publications) {
    if (!publications) return;
    const journals = publications.journals || [];
    const conference = publications.conference || [];
    const posters = publications.posters || [];
    renderPublicationList('journal-section', journals);
    renderPublicationList('conference-section', conference);
    renderPosters(posters);
    const journalsLabel = document.getElementById('pub-count-label');
    const conferenceLabel = document.getElementById('conference-count-label');
    const postersLabel = document.getElementById('poster-count-label');
    if (journalsLabel) journalsLabel.textContent = plural(journals.length, 'peer-reviewed journal paper', 'peer-reviewed journal papers');
    if (conferenceLabel) conferenceLabel.textContent = plural(conference.length, 'conference proceeding', 'conference proceedings');
    if (postersLabel) postersLabel.textContent = plural(posters.length, 'poster', 'posters');
  }

  fetch('data/site-content.json', { cache: 'no-cache' })
    .then(response => {
      if (!response.ok) throw new Error('Content request failed');
      return response.json();
    })
    .then(data => {
      renderNews(data.news);
      renderResearch(data.research);
      renderPublications(data.publications);
      document.documentElement.dataset.contentSource = 'data';
      refreshReveals();
    })
    .catch(error => {
      document.documentElement.dataset.contentSource = 'fallback';
      console.warn('Using built-in site content:', error.message);
    });
})();

/* ── PUBLICATION FILTER ── */
function filterPubs(type, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  /* Reset search when switching filter */
  const searchEl = document.getElementById('pub-search');
  if (searchEl && searchEl.value) {
    searchEl.value = '';
    /* Clear hidden-by-search state */
    document.querySelectorAll('.pub-item, .poster-item').forEach(i => i.classList.remove('hidden-by-search'));
    const noResults = document.getElementById('pub-no-results');
    if (noResults) noResults.style.display = 'none';
  }
  const sections = { journal: 'journal-section', conference: 'conference-section', poster: 'poster-section' };
  if (type === 'all') {
    Object.values(sections).forEach(id => document.getElementById(id).style.display = '');
  } else {
    Object.values(sections).forEach(id => document.getElementById(id).style.display = 'none');
    if (sections[type]) document.getElementById(sections[type]).style.display = '';
  }
}

function searchPubs(query) {
  const q = query.trim().toLowerCase();
  /* When searching, reset filter to "All" so all sections are visible */
  if (q) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.filter-btn[onclick*="\'all\'"]');
    if (allBtn) allBtn.classList.add('active');
    ['journal-section','conference-section','poster-section'].forEach(id => {
      const sec = document.getElementById(id);
      if (sec) sec.style.display = '';
    });
  }
  const allItems = document.querySelectorAll('#page-publications .pub-item, #page-publications .poster-item');
  let visibleCount = 0;
  allItems.forEach(item => {
    const text = item.textContent.toLowerCase();
    const matches = !q || text.includes(q);
    item.classList.toggle('hidden-by-search', !matches);
    if (matches) visibleCount++;
  });
  const noResults = document.getElementById('pub-no-results');
  if (noResults) noResults.style.display = visibleCount === 0 ? 'block' : 'none';
  /* Hide section headers that have no visible items */
  ['journal-section', 'conference-section', 'poster-section'].forEach(sId => {
    const sec = document.getElementById(sId);
    if (!sec) return;
    const hasVisible = [...sec.querySelectorAll('.pub-item, .poster-item')].some(i => !i.classList.contains('hidden-by-search'));
    sec.style.display = hasVisible ? '' : 'none';
  });
}

/* ── CITATION CHART ── */
(function () {
  const FALLBACK = {
    total: 51, hIndex: 3, i10Index: 2, papers: 11,
    byYear: { '2021': 2, '2022': 3, '2023': 2, '2024': 14, '2025': 18, '2026': 12 },
    updatedAt: 'June 08, 2026',
    source: 'Semantic Scholar',
    profileUrl: 'https://www.semanticscholar.org/author/2061816683',
    yearSeriesLabel: 'Citations by publication year'
  };
  let chartInstance = null;
  let latestYearData = {};

  function getPalette() {
    const styles = getComputedStyle(document.documentElement);
    const isDark = document.documentElement.dataset.theme === 'dark';
    return {
      teal: styles.getPropertyValue('--teal').trim() || '#0f766e',
      muted: styles.getPropertyValue('--faint').trim() || '#6b7280',
      border: styles.getPropertyValue('--border').trim() || '#d9e1ea',
      isDark
    };
  }

  function renderChart(yearData) {
    const canvas = document.getElementById('citChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const years = Object.keys(yearData).sort();
    const counts = years.map(y => yearData[y]);
    const palette = getPalette();
    const isDark = palette.isDark;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.offsetHeight || 100);
    grad.addColorStop(0, isDark ? 'rgba(176,58,46,0.90)' : 'rgba(176,58,46,0.85)');
    grad.addColorStop(1, isDark ? 'rgba(176,58,46,0.25)' : 'rgba(176,58,46,0.20)');
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)';
    const tickColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.48)';
    if (chartInstance) chartInstance.destroy();
    chartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: years,
        datasets: [{
          data: counts,
          backgroundColor: grad,
          hoverBackgroundColor: isDark ? 'rgba(224,80,66,0.95)' : 'rgba(146,43,33,0.90)',
          borderRadius: { topLeft: 5, topRight: 5, bottomLeft: 0, bottomRight: 0 },
          borderSkipped: false,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 700, easing: 'easeOutQuart', delay: ctx => ctx.dataIndex * 60 },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: isDark ? 'rgba(17,24,42,0.92)' : 'rgba(255,255,255,0.96)',
            titleColor: isDark ? '#f9fafb' : '#111827',
            bodyColor: isDark ? '#d1d5db' : '#374151',
            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
            borderWidth: 1, padding: 10, cornerRadius: 8, displayColors: false,
            callbacks: { title: items => items[0].label, label: i => i.raw + ' citations' }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { color: tickColor, font: { size: 9.5, family: "'DM Sans', sans-serif" }, maxRotation: 0 }
          },
          y: {
            beginAtZero: true,
            grid: { color: gridColor, drawTicks: false },
            border: { display: false, dash: [3, 3] },
            ticks: {
              color: tickColor,
              font: { size: 9.5, family: "'DM Sans', sans-serif" },
              callback: v => Number.isInteger(v) ? v : '',
              maxTicksLimit: 4, padding: 6
            }
          }
        }
      }
    });
  }

  function countUp(el, target, duration) {
    if (!el || isNaN(target)) { if (el) el.textContent = target; return; }
    const startTime = performance.now();
    function update(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * ease);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function applyData(d, fromNetwork) {
    const animateEl = (id, val) => {
      const el = document.getElementById(id);
      if (!el) return;
      const num = parseInt(val);
      if (!isNaN(num)) countUp(el, num, 900);
      else el.textContent = (val != null && val !== '') ? val : '—';
    };
    animateEl('total-cit', d.total);
    animateEl('h-index', d.hIndex);
    animateEl('i10-index', d.i10Index);
    animateEl('paper-count', d.papers);
    const badge = document.getElementById('cit-updated');
    const source = d.source || 'Citation data';
    if (badge) {
      badge.textContent = d.updatedAt
        ? source + ' · ' + d.updatedAt
        : source;
    }
    const sourceLink = document.getElementById('cit-source-link');
    if (sourceLink && d.profileUrl) {
      sourceLink.href = d.profileUrl;
      sourceLink.setAttribute('aria-label', 'Open ' + source + ' profile');
    }
    const chartLabel = document.getElementById('cit-chart-label');
    if (chartLabel) chartLabel.textContent = d.yearSeriesLabel || 'Citation history';
    latestYearData = d.byYear || {};
    renderChart(latestYearData);
  }

  function loadCitations() {
    fetch('citations.json?v=' + Date.now())
      .then(r => { if (!r.ok) throw new Error('not found'); return r.json(); })
      .then(d => applyData(d, true))
      .catch(() => applyData(FALLBACK, false));
  }

  window.addEventListener('themechange', () => {
    if (Object.keys(latestYearData).length) renderChart(latestYearData);
  });

  if (typeof Chart !== 'undefined') loadCitations();
  else window.addEventListener('load', loadCitations);
})();

/* ── SERIAL REVEAL ANIMATIONS (no scroll trigger) ── */
/* Sidebar elements are visually top-right but come late in DOM order —
   animate them immediately alongside the page title/subtitle. */
const SIDEBAR_SELECTOR =
  '.page.active .profile-photo-wrap, .page.active .profile-meta, .page.active .cit-card';

const REVEAL_SELECTOR =
  '.page.active .page-title, .page.active .page-subtitle, ' +
  '.page.active .bio-body, .page.active .tl-item, .page.active .current-projects-card, ' +
  '.page.active .section-label, .page.active .interest-tag, .page.active .news-row, ' +
  '.page.active .research-card, .page.active .pub-item, .page.active .poster-item, ' +
  '.page.active .mentor-highlight, .page.active .mentee-card, ' +
  '.page.active .award-card, .page.active .grant-card, .page.active .cert-item, ' +
  '.page.active .skill-card, .page.active .course-row, .page.active .service-item';

let _revealTimers = [];

function refreshReveals() {
  _revealTimers.forEach(t => clearTimeout(t));
  _revealTimers = [];

  const sidebar  = Array.from(document.querySelectorAll(SIDEBAR_SELECTOR));
  const main     = Array.from(document.querySelectorAll(REVEAL_SELECTOR));
  /* sidebar items won't appear in main (different selectors), but guard anyway */
  const sidebarSet = new Set(sidebar);
  const all = [...sidebar, ...main.filter(el => !sidebarSet.has(el))];

  /* Reset all to hidden */
  all.forEach(el => {
    el.style.transition = 'none';
    el.style.transitionDelay = '0ms';
    el.classList.add('reveal');
    el.classList.remove('in-view');
  });

  void document.body.offsetHeight;

  const STEP = 35;

  /* Sidebar: animate in sync with the first three main-column slots (0, 1, 2) */
  sidebar.forEach((el, i) => {
    const t = setTimeout(() => {
      el.style.transition = '';
      el.style.transitionDelay = '';
      el.classList.add('in-view');
    }, i * STEP);
    _revealTimers.push(t);
  });

  /* Main column: stagger in DOM order, starting right after sidebar */
  main.filter(el => !sidebarSet.has(el)).forEach((el, i) => {
    const t = setTimeout(() => {
      el.style.transition = '';
      el.style.transitionDelay = '';
      el.classList.add('in-view');
    }, i * STEP);
    _revealTimers.push(t);
  });
}

/* Keep animateInterestTags as a no-op alias — logic is now inside refreshReveals */
function animateInterestTags() {}

setTimeout(() => { refreshReveals(); }, 120);

/* ── DYNAMIC COPYRIGHT YEAR ── */
document.querySelectorAll('.dyn-year').forEach(el => { el.textContent = new Date().getFullYear(); });

/* ── KEYBOARD NAVIGATION ── */
const PAGE_ORDER = ['bio', 'research', 'publications', 'teaching', 'mentoring', 'awards', 'skills', 'experience'];
document.addEventListener('keydown', e => {
  /* Escape: close mobile nav */
  if (e.key === 'Escape') {
    if (mobileNav.classList.contains('open')) { closeMobileNav(); return; }
  }
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
  if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
  const currentActive = document.querySelector('.topbar-nav a.active');
  if (!currentActive) return;
  const currentId = currentActive.dataset.page;
  const idx = PAGE_ORDER.indexOf(currentId);
  if (idx === -1) return;
  const nextIdx = e.key === 'ArrowRight' ? Math.min(idx + 1, PAGE_ORDER.length - 1) : Math.max(idx - 1, 0);
  if (nextIdx !== idx) showPage(PAGE_ORDER[nextIdx]);
});

/* ── BIBTEX COPY ── */
const BIBTEX = {
  patowary2026: `@article{patowary2026hrwra,
  title   = {Experimental Investigation on the Effect of High Range Water Reducing Admixture on Mechanical and Microstructural Properties of Jute Fiber Reinforced Concrete},
  author  = {Patowary, Faruk and Islam, Tarikul and Sen, Debasish and Chowdhury, Sharmin Reza},
  journal = {Innovative Infrastructure Solutions},
  volume  = {11},
  number  = {6},
  pages   = {329},
  year    = {2026},
  doi     = {10.1007/s41062-026-02728-5}
}`,
  nazim2025: `@article{nazim2025bim,
  title   = {Implementing {BIM} for Sustainable Construction in Developing Countries: Emphasizing Economic, Environmental, and Social Aspects},
  author  = {Nazim, Md Fahad and Islam, Tarikul and Islam, S. and Shuvo, R. I.},
  journal = {Malaysian Journal of Civil Engineering},
  volume  = {37},
  number  = {3},
  pages   = {17--27},
  year    = {2025},
  doi     = {10.11113/mjce.v37.25019}
}`,
  islam2025cea: `@article{islam2025jute,
  title   = {Effect of Jute Fiber Content on Compressive and Split Tensile Strength of Concrete Utilizing Stone Chips as Coarse Aggregates},
  author  = {Islam, Tarikul and Patowary, Faruk and Sen, Debasish and Chowdhury, Sharmin Reza},
  journal = {Civil Engineering and Architecture},
  volume  = {13},
  number  = {3},
  pages   = {1995--2005},
  year    = {2025},
  doi     = {10.13189/cea.2025.130339}
}`,
  islam2023buildings: `@article{islam2023pvc,
  title   = {Mechanical Properties of {PVC} Fiber-Reinforced Concrete---Effects of Fiber Content and Length},
  author  = {Islam, Tarikul and Safiuddin, Md. and Roman, Rezwan Ahmed and Chakma, Bodhijit and Al Maroof, Abdullah},
  journal = {Buildings},
  volume  = {13},
  pages   = {2666},
  year    = {2023},
  doi     = {10.3390/buildings13102666}
}`,
  islam2023ajce: `@article{islam2023masonry,
  title   = {Numerical Modeling and Validation of Lateral Behavior of Masonry-Infilled {RC} Frame Focusing Sliding Failure of Infill Panel},
  author  = {Islam, Tarikul and Sen, Debasish},
  journal = {Asian Journal of Civil Engineering},
  volume  = {24},
  pages   = {1247--1255},
  year    = {2023},
  doi     = {10.1007/s42107-022-00566-1}
}`,
  islam2022cepm: `@article{islam2022retrofit,
  title   = {Numerical Analysis of Retrofitted {RC} Column under Lateral Load},
  author  = {Islam, Tarikul and Yasar, R. and Chowdhury, Sharmin Reza},
  journal = {Computational Engineering and Physical Modeling},
  volume  = {5},
  number  = {3},
  pages   = {82--95},
  year    = {2022},
  doi     = {10.22115/CEPM.2023.374244.1226}
}`,
  jahan2022: `@article{jahan2022soil,
  title   = {Effectiveness of Different Chemicals on Stabilization of Expansive Soil},
  author  = {Jahan, Nusrat and Islam, Tarikul and Islam, S.},
  journal = {Journal of Advances in Geotechnical Engineering},
  volume  = {5},
  number  = {3},
  pages   = {1--11},
  year    = {2022},
  doi     = {10.5281/zenodo.7451446}
}`,
  tasin2022: `@article{tasin2022carbon,
  title   = {Carbon Emission and Carbon Sequestration of Residential Building},
  author  = {Tasin, T. R. and Noman, A. A. R. and Prottoy, A. R. and Islam, S. and Islam, Tarikul},
  journal = {Journal of Construction and Building Materials Engineering},
  volume  = {8},
  number  = {1},
  pages   = {33--41},
  year    = {2022}
}`,
  islam2021mjce: `@article{islam2021flyash,
  title   = {Behavior of Concrete Compressive Strength by Utilizing Fly Ash and Wood Powder},
  author  = {Islam, Tarikul and Gupta, S. D. and Janin, J. and Rahman, A.},
  journal = {Malaysian Journal of Civil Engineering},
  volume  = {33},
  number  = {3},
  pages   = {69--77},
  year    = {2021},
  doi     = {10.11113/mjce.v33.17398}
}`,
  gupta2021scba: `@article{gupta2021scba,
  title   = {Experimental Study of Concrete with Sugarcane Bagasse Ash ({SCBA}) at Elevated Temperature},
  author  = {Gupta, S. D. and Islam, Tarikul and Palash, M. D. N. and Shohan, M. S. A.},
  journal = {Malaysian Journal of Civil Engineering},
  volume  = {33},
  number  = {3},
  pages   = {59--67},
  year    = {2021},
  doi     = {10.11113/mjce.v33.17379}
}`,
  gupta2021cepm: `@article{gupta2021ricehusk,
  title   = {Experimental Study of Concrete Using Raw Rice Husk as Partial Replacement of Cement with Natural Fiber ({Jute Fiber}) as Reinforcing Material},
  author  = {Gupta, S. D. and Islam, Tarikul and Sohag, M. A. I. and Salakin, S. and Hossain, I.},
  journal = {Computational Engineering and Physical Modeling},
  volume  = {4},
  number  = {3},
  pages   = {29--42},
  year    = {2021},
  doi     = {10.22115/CEPM.2021.280252.1166}
}`,
  islam2018: `@inproceedings{islam2018composting,
  title     = {Bench Scale Study on Co-Composting for Organic Solid Wastes and Faecal Sludge},
  author    = {Islam, Tarikul and Bari, Quazi Hamidul and Shovon, S. M. S. A. and Al Saif, R.},
  booktitle = {4th International Conference on Civil Engineering for Sustainable Development (ICCESD 2018)},
  year      = {2018}
}`
};

let _bibTimer = null;
function copyBibtex(key, trigger) {
  const entry = BIBTEX[key];
  if (!entry) return;
  const btn = trigger || (typeof event !== 'undefined' ? event.currentTarget : null);
  if (!btn) return;
  navigator.clipboard.writeText(entry).then(() => {
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    if (_bibTimer) clearTimeout(_bibTimer);
    _bibTimer = setTimeout(() => {
      btn.textContent = 'BibTeX';
      btn.classList.remove('copied');
    }, 2000);
  }).catch(() => {
    /* Fallback for non-HTTPS environments */
    const ta = document.createElement('textarea');
    ta.value = entry; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    btn.textContent = '✓ Copied!';
    btn.classList.add('copied');
    if (_bibTimer) clearTimeout(_bibTimer);
    _bibTimer = setTimeout(() => { btn.textContent = 'BibTeX'; btn.classList.remove('copied'); }, 2000);
  });
}

/* ── DYNAMIC PUBLICATION COUNT ── */
(function () {
  const label = document.getElementById('pub-count-label');
  if (!label) return;
  const n = document.querySelectorAll('#journal-section .pub-item').length;
  if (n > 0) label.textContent = n + ' peer-reviewed journal paper' + (n !== 1 ? 's' : '');
})();

/* ── CITATION CHART CANVAS DPI FIX ── */
(function () {
  const canvas = document.getElementById('citChart');
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  if (dpr <= 1) return;
  const parent = canvas.parentElement;
  /* Chart.js handles DPI internally via its devicePixelRatio option;
     ensure it uses the actual ratio by setting it explicitly */
  canvas._chartDPR = dpr;
})();
function toggleNewsExtra(btn) {
  const expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', String(!expanded));
  const extraRows = document.querySelectorAll('.news-extra');
  if (expanded) {
    /* Hiding */
    extraRows.forEach(row => { row.style.display = 'none'; });
  } else {
    /* Showing — re-trigger reveal animation */
    extraRows.forEach((row, i) => {
      row.style.display = 'flex';
      row.classList.add('reveal');
      row.classList.remove('in-view');
      void row.offsetHeight;
      setTimeout(() => {
        row.style.transition = '';
        row.style.transitionDelay = '';
        row.classList.add('in-view');
      }, i * 80);
    });
  }
  btn.querySelector('.news-toggle-text').textContent = expanded ? 'View all news' : 'Show less';
}
