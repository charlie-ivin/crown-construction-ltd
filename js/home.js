(function () {
  function renderServices(services) {
    const el = document.getElementById('services-grid');
    if (!el) return;
    el.innerHTML = services.map((s) => `
      <div class="card">
        <span class="num">${s.num}</span>
        <h3>${s.title}</h3>
        <p>${s.description}</p>
      </div>
    `).join('');
  }

  function renderReasons(reasons) {
    const el = document.getElementById('reasons-list');
    if (!el) return;
    el.innerHTML = reasons.map((r, i) => `
      <div class="reason">
        <div class="mark">${String(i + 1).padStart(2, '0')}</div>
        <div>
          <h4>${r.title}</h4>
          <p>${r.description}</p>
        </div>
      </div>
    `).join('');
  }

  function renderProjects(projects) {
    const el = document.getElementById('home-projects');
    if (!el) return;
    el.innerHTML = projects.slice(0, 3).map((p) => `
      <a class="project-card" href="gallery.html">
        <div class="thumb"><img src="${p.image}" alt="${p.title}, ${p.location}" loading="lazy"></div>
        <div class="body">
          <span class="tag">${p.category}</span>
          <h3>${p.title}</h3>
          <p class="loc">${p.location}</p>
        </div>
      </a>
    `).join('');
  }

  function renderTestimonials(items) {
    const el = document.getElementById('testimonials-list');
    if (!el) return;
    el.innerHTML = items.map((t) => `
      <div class="testi">
        <p class="quote">&ldquo;${t.quote}&rdquo;</p>
        <p class="who"><strong>${t.author}</strong> — ${t.location}</p>
      </div>
    `).join('');
  }

  document.addEventListener('crown:content-ready', (e) => {
    const c = e.detail;
    renderServices(c.services || []);
    renderReasons(c.whyUs || []);
    renderProjects(c.projects || []);
    renderTestimonials(c.testimonials || []);
  });
})();
