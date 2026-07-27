/* Crown Construction — admin content manager
   A static-site CMS: edits data/content.json (and gallery images) in memory,
   then publishes by committing straight to the GitHub repo via the REST
   API, using a personal access token the user supplies. Nothing here has
   a server of its own — GitHub IS the backend, and GitHub Pages rebuilds
   the live site automatically a minute or so after each publish. */

(function () {
  const CONFIG_KEY = 'crown_admin_config';
  const CONTENT_PATH = 'data/content.json';

  const state = {
    config: null,      // { owner, repo, branch, token }
    content: null,      // parsed content.json
    sha: null,           // blob sha of content.json on the branch
    pendingImages: [],  // [{ path, base64, mime, targetSha }]
    activeTab: 'site',
    dirty: false
  };

  // This admin panel is wired to one specific repo — update these three
  // if the site ever moves to a different GitHub username, repo, or branch.
  const REPO_OWNER = 'charlie-ivin';
  const REPO_NAME = 'crown-construction-ltd';
  const REPO_BRANCH = 'main';

  const root = document.getElementById('admin-root');
  const headerActions = document.getElementById('admin-header-actions');

  // ---------------------------------------------------------------- utils
  function el(html) {
    const t = document.createElement('template');
    t.innerHTML = html.trim();
    return t.content.firstElementChild;
  }
  function b64EncodeUnicode(str) {
    return btoa(unescape(encodeURIComponent(str)));
  }
  function b64DecodeUnicode(str) {
    return decodeURIComponent(escape(atob(str.replace(/\n/g, ''))));
  }
  function slugify(str) {
    return (str || 'item').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'item';
  }
  function markDirty() { state.dirty = true; renderPublishBar(); }

  // ---------------------------------------------------------------- GitHub API
  function ghHeaders() {
    return {
      Authorization: 'Bearer ' + state.config.token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };
  }
  function ghUrl(path) {
    const { owner, repo } = state.config;
    return `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  }
  function ghGetFile(path) {
    return fetch(ghUrl(path) + '?ref=' + encodeURIComponent(state.config.branch), { headers: ghHeaders() })
      .then((res) => {
        if (res.status === 404) return null;
        if (!res.ok) return res.json().then((b) => { throw new Error(b.message || ('GitHub error ' + res.status)); });
        return res.json();
      });
  }
  function ghPutFile(path, base64Content, message, sha) {
    const body = { message, content: base64Content, branch: state.config.branch };
    if (sha) body.sha = sha;
    return fetch(ghUrl(path), { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) })
      .then((res) => res.json().then((data) => {
        if (!res.ok) throw new Error(data.message || ('GitHub error ' + res.status));
        return data;
      }));
  }

  // ---------------------------------------------------------------- login screen
  function renderLogin(prefill, errorMsg) {
    headerActions.innerHTML = '';
    root.innerHTML = '';
    const card = el(`
      <div class="admin-card">
        <h2>Login To The Web Editor</h2>
        <p class="help">
          This admin panel edits the websites content then publishes by
          committing straight to the GitHub server. GitHub rebuilds the live site automatically,
          usually within a minute.
        </p>
        ${errorMsg ? `<p class="help" style="color:var(--brick);">${errorMsg}</p>` : ''}
        <div class="admin-field field">
          <label for="cfg-token">Personal access token</label>
          <input id="cfg-token" type="password" placeholder="github_pat_...">
        </div>
        <p class="help">
          Use a <strong>fine-grained</strong> token (GitHub &rarr; Settings &rarr; Developer settings &rarr;
          Personal access tokens) scoped to only the <code>${REPO_OWNER}/${REPO_NAME}</code> repository, with
          <strong>Contents: Read and write</strong> permission. It's stored only in this browser, never
          anywhere else. Use the <em>Log out</em> button on a shared computer to remove it.
        </p>
        <button class="btn btn-primary" id="cfg-connect" style="width:100%;justify-content:center;">Connect &amp; load site content</button>
      </div>
    `);
    root.appendChild(card);
    if (prefill) {
      card.querySelector('#cfg-token').value = prefill.token || '';
    }
    card.querySelector('#cfg-connect').addEventListener('click', () => {
      const cfg = {
        owner: REPO_OWNER,
        repo: REPO_NAME,
        branch: REPO_BRANCH,
        token: card.querySelector('#cfg-token').value.trim()
      };
      if (!cfg.token) {
        renderLogin(cfg, 'Please enter your personal access token.');
        return;
      }
      state.config = cfg;
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
      connectAndLoad();
    });
  }

  function connectAndLoad() {
    root.innerHTML = `<div class="admin-card"><h2>Loading&hellip;</h2><p class="help">Fetching <code>data/content.json</code> from GitHub.</p></div>`;
    ghGetFile(CONTENT_PATH)
      .then((file) => {
        if (!file) throw new Error('Could not find data/content.json on that branch. Check the repo name and branch, and that the site has been pushed to GitHub.');
        state.content = JSON.parse(b64DecodeUnicode(file.content));
        state.sha = file.sha;
        state.pendingImages = [];
        state.dirty = false;
        renderApp();
      })
      .catch((err) => {
        renderLogin(state.config, err.message + ' If this is a permissions error, check the token has Contents read/write access to this repo.');
      });
  }

  // ---------------------------------------------------------------- app shell
  function renderHeaderActions() {
    headerActions.innerHTML = '';
    const reload = el(`<button class="btn btn-outline-light" style="margin-right:8px;">Reload from GitHub</button>`);
    const logout = el(`<button class="btn btn-outline-light">Log out</button>`);
    reload.addEventListener('click', () => {
      if (state.dirty && !confirm('Discard unpublished changes and reload from GitHub?')) return;
      connectAndLoad();
    });
    logout.addEventListener('click', () => {
      localStorage.removeItem(CONFIG_KEY);
      state.config = null; state.content = null;
      renderLogin();
    });
    headerActions.appendChild(reload);
    headerActions.appendChild(logout);
  }

  const TABS = [
    ['site', 'Site & contact'],
    ['home', 'Homepage'],
    ['services', 'Services'],
    ['whyUs', 'Why choose us'],
    ['testimonials', 'Testimonials'],
    ['projects', 'Project gallery'],
    ['about', 'About page']
  ];

  function renderApp() {
    renderHeaderActions();
    root.innerHTML = '';
    const layout = el(`
      <div class="admin-layout">
        <nav class="admin-tabs"></nav>
        <div class="admin-panel-wrap">
          <div class="admin-panel" id="admin-panel"></div>
          <div class="publish-bar" id="publish-bar"></div>
        </div>
      </div>
    `);
    const tabsNav = layout.querySelector('.admin-tabs');
    TABS.forEach(([key, label]) => {
      const btn = el(`<button data-tab="${key}">${label}</button>`);
      if (key === state.activeTab) btn.classList.add('active');
      btn.addEventListener('click', () => { state.activeTab = key; renderApp(); });
      tabsNav.appendChild(btn);
    });
    root.appendChild(layout);
    renderPanel();
    renderPublishBar();
  }

  function renderPublishBar() {
    const bar = document.getElementById('publish-bar');
    if (!bar) return;
    bar.innerHTML = '';
    const status = el(`<span class="status">${state.dirty ? 'Unpublished changes' : 'Up to date with GitHub'}</span>`);
    const btn = el(`<button class="btn btn-primary">Publish changes</button>`);
    btn.disabled = !state.dirty;
    if (!state.dirty) { btn.style.opacity = '0.5'; btn.style.cursor = 'default'; }
    btn.addEventListener('click', publish);
    bar.appendChild(status);
    bar.appendChild(btn);
  }

  function panel() { return document.getElementById('admin-panel'); }

  // ---------------------------------------------------------------- field helpers
  function fieldRow(label, value, onInput, opts) {
    opts = opts || {};
    const wrap = document.createElement('div');
    wrap.className = 'admin-field';
    const lbl = document.createElement('label');
    lbl.textContent = label;
    wrap.appendChild(lbl);
    const input = document.createElement(opts.textarea ? 'textarea' : 'input');
    if (!opts.textarea) input.type = opts.type || 'text';
    input.value = value || '';
    input.addEventListener('input', () => { onInput(input.value); markDirty(); });
    wrap.appendChild(input);
    return wrap;
  }

  function sectionHeading(title, help) {
    const wrap = document.createElement('div');
    wrap.innerHTML = `<h2>${title}</h2>${help ? `<p class="help">${help}</p>` : ''}`;
    return wrap;
  }

  function addButton(label, onClick) {
    const btn = el(`<button class="btn-add">+ ${label}</button>`);
    btn.addEventListener('click', onClick);
    return btn;
  }
  function removeButton(onClick) {
    const btn = el(`<button class="btn-remove">Remove</button>`);
    btn.addEventListener('click', onClick);
    return btn;
  }

  // ---------------------------------------------------------------- tab: site
  function renderSiteTab() {
    const p = panel(); p.innerHTML = '';
    p.appendChild(sectionHeading('Site &amp; contact details', 'Shown in the header, footer and contact page across the whole site.'));
    const s = state.content.site;
    const grid = document.createElement('div'); grid.className = 'two-col';
    grid.appendChild(fieldRow('Business name', s.name, (v) => s.name = v));
    grid.appendChild(fieldRow('Short name (nav/footer)', s.shortName, (v) => s.shortName = v));
    grid.appendChild(fieldRow('Phone (displayed)', s.phone, (v) => s.phone = v));
    grid.appendChild(fieldRow('Phone (for tel: links, digits only, e.g. +441892000000)', s.phoneHref, (v) => s.phoneHref = v));
    grid.appendChild(fieldRow('Email address', s.email, (v) => s.email = v));
    grid.appendChild(fieldRow('Address / town', s.address, (v) => s.address = v));
    grid.appendChild(fieldRow('Opening hours', s.hours, (v) => s.hours = v));
    grid.appendChild(fieldRow('Companies House number', s.companyNumber, (v) => s.companyNumber = v));
    p.appendChild(grid);
    p.appendChild(fieldRow('Tagline (used in footer &amp; page titles)', s.tagline, (v) => s.tagline = v));
    p.appendChild(fieldRow('Formspree form ID (for the contact form — see README)', s.formspreeId, (v) => s.formspreeId = v));

    // Areas covered — tag editor
    const areasWrap = document.createElement('div');
    areasWrap.innerHTML = '<label style="font-family:var(--font-mono);font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-soft);display:block;margin-bottom:8px;">Areas covered</label>';
    const pillBox = document.createElement('div'); pillBox.className = 'tag-editor';
    function renderPills() {
      pillBox.innerHTML = '';
      s.areas.forEach((area, i) => {
        const pill = el(`<span class="tag-pill">${area}<button aria-label="Remove">&times;</button></span>`);
        pill.querySelector('button').addEventListener('click', () => { s.areas.splice(i, 1); renderPills(); markDirty(); });
        pillBox.appendChild(pill);
      });
    }
    renderPills();
    areasWrap.appendChild(pillBox);
    const addAreaRow = document.createElement('div');
    addAreaRow.style.display = 'flex'; addAreaRow.style.gap = '10px';
    const addAreaInput = el(`<input placeholder="Add an area, e.g. Leighton Buzzard" style="flex:1;">`);
    const addAreaBtn = el(`<button class="btn btn-outline">Add</button>`);
    addAreaBtn.addEventListener('click', () => {
      if (addAreaInput.value.trim()) { s.areas.push(addAreaInput.value.trim()); addAreaInput.value = ''; renderPills(); markDirty(); }
    });
    addAreaRow.appendChild(addAreaInput); addAreaRow.appendChild(addAreaBtn);
    areasWrap.appendChild(addAreaRow);
    p.appendChild(areasWrap);

    // Logo replace
    const logoWrap = document.createElement('div'); logoWrap.style.marginTop = '28px';
    logoWrap.innerHTML = '<label style="font-family:var(--font-mono);font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-soft);display:block;margin-bottom:8px;">Logo</label>';
    const logoImg = el(`<img class="admin-thumb" style="max-width:220px;" src="../images/logo.png" alt="Current logo">`);
    const logoInput = el(`<input type="file" accept="image/*">`);
    logoInput.addEventListener('change', () => handleImageUpload(logoInput.files[0], 'images/logo.png', (dataUrl) => { logoImg.src = dataUrl; }, true));
    logoWrap.appendChild(logoImg); logoWrap.appendChild(logoInput);
    p.appendChild(logoWrap);
  }

  // ---------------------------------------------------------------- tab: homepage
  function renderHomeTab() {
    const p = panel(); p.innerHTML = '';
    p.appendChild(sectionHeading('Homepage hero', 'The top banner text and stat panel on the homepage.'));
    const h = state.content.hero;
    p.appendChild(fieldRow('Eyebrow line', h.eyebrow, (v) => h.eyebrow = v));
    p.appendChild(fieldRow('Headline', h.heading, (v) => h.heading = v));
    p.appendChild(fieldRow('Supporting text', h.lede, (v) => h.lede = v, { textarea: true }));
    const grid = document.createElement('div'); grid.className = 'two-col';
    grid.appendChild(fieldRow('Primary button text', h.ctaPrimary, (v) => h.ctaPrimary = v));
    grid.appendChild(fieldRow('Secondary button text', h.ctaSecondary, (v) => h.ctaSecondary = v));
    p.appendChild(grid);
  }

  // ---------------------------------------------------------------- tab: services
  function renderServicesTab() {
    const p = panel(); p.innerHTML = '';
    p.appendChild(sectionHeading('Services', 'The six service cards shown on the homepage.'));
    const list = document.createElement('div');
    state.content.services.forEach((item, i) => {
      const row = el(`<div class="repeat-item"><div class="repeat-head"><span>Service ${i + 1}</span></div></div>`);
      row.querySelector('.repeat-head').appendChild(removeButton(() => { state.content.services.splice(i, 1); markDirty(); renderServicesTab(); }));
      row.appendChild(fieldRow('Number tag (e.g. 01)', item.num, (v) => item.num = v));
      row.appendChild(fieldRow('Title', item.title, (v) => item.title = v));
      row.appendChild(fieldRow('Description', item.description, (v) => item.description = v, { textarea: true }));
      list.appendChild(row);
    });
    p.appendChild(list);
    p.appendChild(addButton('Add service', () => {
      state.content.services.push({ num: String(state.content.services.length + 1).padStart(2, '0'), title: 'New service', description: '' });
      markDirty(); renderServicesTab();
    }));
  }

  // ---------------------------------------------------------------- tab: why us
  function renderWhyUsTab() {
    const p = panel(); p.innerHTML = '';
    p.appendChild(sectionHeading('Why choose us', 'The reasons list shown on the homepage and about page.'));
    const list = document.createElement('div');
    state.content.whyUs.forEach((item, i) => {
      const row = el(`<div class="repeat-item"><div class="repeat-head"><span>Reason ${i + 1}</span></div></div>`);
      row.querySelector('.repeat-head').appendChild(removeButton(() => { state.content.whyUs.splice(i, 1); markDirty(); renderWhyUsTab(); }));
      row.appendChild(fieldRow('Title', item.title, (v) => item.title = v));
      row.appendChild(fieldRow('Description', item.description, (v) => item.description = v, { textarea: true }));
      list.appendChild(row);
    });
    p.appendChild(list);
    p.appendChild(addButton('Add reason', () => {
      state.content.whyUs.push({ title: 'New reason', description: '' });
      markDirty(); renderWhyUsTab();
    }));
  }

  // ---------------------------------------------------------------- tab: testimonials
  function renderTestimonialsTab() {
    const p = panel(); p.innerHTML = '';
    p.appendChild(sectionHeading('Testimonials', 'Client quotes shown on the homepage.'));
    const list = document.createElement('div');
    state.content.testimonials.forEach((item, i) => {
      const row = el(`<div class="repeat-item"><div class="repeat-head"><span>Testimonial ${i + 1}</span></div></div>`);
      row.querySelector('.repeat-head').appendChild(removeButton(() => { state.content.testimonials.splice(i, 1); markDirty(); renderTestimonialsTab(); }));
      row.appendChild(fieldRow('Quote', item.quote, (v) => item.quote = v, { textarea: true }));
      const grid = document.createElement('div'); grid.className = 'two-col';
      grid.appendChild(fieldRow('Client name (or initial)', item.author, (v) => item.author = v));
      grid.appendChild(fieldRow('Location', item.location, (v) => item.location = v));
      row.appendChild(grid);
      list.appendChild(row);
    });
    p.appendChild(list);
    p.appendChild(addButton('Add testimonial', () => {
      state.content.testimonials.push({ quote: '', author: '', location: '' });
      markDirty(); renderTestimonialsTab();
    }));
  }

  // ---------------------------------------------------------------- tab: projects
  function handleImageUpload(file, suggestedPath, onPreview, isLogo) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      const mime = file.type || 'image/jpeg';
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = isLogo ? 'images/logo.png' : `images/gallery/${slugify(suggestedPath)}-${Date.now()}.${ext}`;
      state.pendingImages = state.pendingImages.filter((p) => p.path !== path);
      state.pendingImages.push({ path, base64, mime });
      if (onPreview) onPreview(dataUrl);
      if (!isLogo) onPreview.__path = path;
      markDirty();
      if (typeof onPreview.setPath === 'function') onPreview.setPath(path);
    };
    reader.readAsDataURL(file);
  }

  function renderProjectsTab() {
    const p = panel(); p.innerHTML = '';
    p.appendChild(sectionHeading('Project gallery', 'Photos and details for the "Our work" page. Upload a photo to replace the placeholder.'));
    const list = document.createElement('div');
    state.content.projects.forEach((item, i) => {
      const row = el(`<div class="repeat-item"><div class="repeat-head"><span>Project ${i + 1}</span></div></div>`);
      row.querySelector('.repeat-head').appendChild(removeButton(() => { state.content.projects.splice(i, 1); markDirty(); renderProjectsTab(); }));

      const thumb = el(`<img class="admin-thumb" src="../${item.image}" alt="">`);
      row.appendChild(thumb);
      const fileInput = el(`<input type="file" accept="image/*" style="margin-bottom:16px;display:block;">`);
      const previewFn = (dataUrl) => { thumb.src = dataUrl; };
      previewFn.setPath = (path) => { item.image = path; };
      fileInput.addEventListener('change', () => handleImageUpload(fileInput.files[0], item.title || 'project', previewFn, false));
      row.appendChild(fileInput);

      row.appendChild(fieldRow('Title', item.title, (v) => item.title = v));
      const grid = document.createElement('div'); grid.className = 'two-col';
      grid.appendChild(fieldRow('Category', item.category, (v) => item.category = v));
      grid.appendChild(fieldRow('Location', item.location, (v) => item.location = v));
      row.appendChild(grid);
      row.appendChild(fieldRow('Description', item.description, (v) => item.description = v, { textarea: true }));
      list.appendChild(row);
    });
    p.appendChild(list);
    p.appendChild(addButton('Add project', () => {
      state.content.projects.push({
        id: 'p' + Date.now(),
        title: 'New project', category: 'Extensions', location: '',
        description: '', image: 'images/gallery/placeholder-1.svg'
      });
      markDirty(); renderProjectsTab();
    }));
  }

  // ---------------------------------------------------------------- tab: about
  function renderAboutTab() {
    const p = panel(); p.innerHTML = '';
    p.appendChild(sectionHeading('About page', 'The story and values shown on the About page.'));
    const a = state.content.about;
    p.appendChild(fieldRow('Eyebrow line', a.eyebrow, (v) => a.eyebrow = v));
    p.appendChild(fieldRow('Heading', a.heading, (v) => a.heading = v));
    p.appendChild(fieldRow('Intro paragraph', a.intro, (v) => a.intro = v, { textarea: true }));

    const storyWrap = document.createElement('div');
    storyWrap.innerHTML = '<label style="font-family:var(--font-mono);font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-soft);display:block;margin-bottom:8px;">Story paragraphs</label>';
    a.story.forEach((para, i) => {
      const row = document.createElement('div');
      row.style.display = 'flex'; row.style.gap = '10px'; row.style.alignItems = 'flex-start';
      const ta = el(`<textarea style="flex:1;font-family:var(--font-body);font-size:0.95rem;padding:11px 12px;border:1px solid var(--line);border-radius:var(--radius);background:var(--paper);min-height:70px;">${para}</textarea>`);
      ta.addEventListener('input', () => { a.story[i] = ta.value; markDirty(); });
      const rm = removeButton(() => { a.story.splice(i, 1); markDirty(); renderAboutTab(); });
      row.appendChild(ta); row.appendChild(rm);
      storyWrap.appendChild(row);
      const spacer = document.createElement('div'); spacer.style.height = '10px'; storyWrap.appendChild(spacer);
    });
    p.appendChild(storyWrap);
    p.appendChild(addButton('Add paragraph', () => { a.story.push(''); markDirty(); renderAboutTab(); }));

    const valuesHead = document.createElement('div'); valuesHead.style.marginTop = '28px';
    valuesHead.innerHTML = '<h3 style="text-transform:none;font-family:var(--font-body);font-weight:700;font-size:1.05rem;">Values</h3>';
    p.appendChild(valuesHead);
    a.values.forEach((v, i) => {
      const row = el(`<div class="repeat-item"><div class="repeat-head"><span>Value ${i + 1}</span></div></div>`);
      row.querySelector('.repeat-head').appendChild(removeButton(() => { a.values.splice(i, 1); markDirty(); renderAboutTab(); }));
      row.appendChild(fieldRow('Title', v.title, (val) => v.title = val));
      row.appendChild(fieldRow('Description', v.description, (val) => v.description = val, { textarea: true }));
      p.appendChild(row);
    });
    p.appendChild(addButton('Add value', () => { a.values.push({ title: '', description: '' }); markDirty(); renderAboutTab(); }));
  }

  function renderPanel() {
    ({
      site: renderSiteTab,
      home: renderHomeTab,
      services: renderServicesTab,
      whyUs: renderWhyUsTab,
      testimonials: renderTestimonialsTab,
      projects: renderProjectsTab,
      about: renderAboutTab
    })[state.activeTab]();
  }

  // ---------------------------------------------------------------- publish
  function logLine(box, msg, cls) {
    const line = document.createElement('div');
    line.className = 'line' + (cls ? ' ' + cls : '');
    line.textContent = msg;
    box.appendChild(line);
    box.scrollTop = box.scrollHeight;
  }

  function publish() {
    const bar = document.getElementById('publish-bar');
    bar.innerHTML = `<span class="status">Publishing&hellip;</span>`;
    const log = el(`<div class="log-box"></div>`);
    document.getElementById('admin-panel').appendChild(log);

    const images = state.pendingImages.slice();
    let chain = Promise.resolve();

    images.forEach((img) => {
      chain = chain.then(() => {
        logLine(log, `Checking ${img.path}\u2026`);
        return ghGetFile(img.path).then((existing) => {
          const sha = existing ? existing.sha : undefined;
          return ghPutFile(img.path, img.base64, `Update ${img.path} via admin panel`, sha);
        }).then(() => logLine(log, `\u2713 Uploaded ${img.path}`, 'ok'));
      });
    });

    chain = chain.then(() => {
      logLine(log, 'Saving data/content.json\u2026');
      const json = JSON.stringify(state.content, null, 2);
      return ghPutFile(CONTENT_PATH, b64EncodeUnicode(json), 'Update site content via admin panel', state.sha)
        .then((res) => {
          state.sha = res.content.sha;
          logLine(log, '\u2713 Content published', 'ok');
        });
    });

    chain.then(() => {
      state.pendingImages = [];
      state.dirty = false;
      logLine(log, 'Done. GitHub Pages will rebuild the live site within a minute or two.', 'ok');
      renderPublishBar();
      const bar2 = document.getElementById('publish-bar');
      bar2.appendChild(log);
    }).catch((err) => {
      logLine(log, 'Error: ' + err.message, 'err');
      renderPublishBar();
      document.getElementById('publish-bar').appendChild(log);
    });
  }

  // ---------------------------------------------------------------- boot
  function boot() {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (saved) {
      try {
        state.config = JSON.parse(saved);
        connectAndLoad();
        return;
      } catch (e) { /* fall through to login */ }
    }
    renderLogin();
  }

  boot();
})();
