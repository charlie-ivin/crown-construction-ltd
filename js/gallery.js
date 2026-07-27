(function () {
  let allProjects = [];

  function renderGrid(projects) {
    const el = document.getElementById('gallery-grid');
    if (!el) return;
    if (!projects.length) {
      el.innerHTML = `<p>No projects in this category yet.</p>`;
      return;
    }
    el.innerHTML = projects.map((p) => `
      <div class="project-card">
        <div class="thumb"><img src="${p.image}" alt="${p.title}, ${p.location}" loading="lazy"></div>
        <div class="body">
          <span class="tag">${p.category}</span>
          <h3>${p.title}</h3>
          <p class="loc">${p.location}</p>
          <p style="margin-top:10px;font-size:0.92rem;">${p.description}</p>
        </div>
      </div>
    `).join('');
  }

  function renderFilters(projects) {
    const bar = document.getElementById('filter-bar');
    if (!bar) return;
    const categories = ['All', ...Array.from(new Set(projects.map((p) => p.category)))];
    bar.innerHTML = categories.map((c, i) => `
      <button class="filter-btn ${i === 0 ? 'active' : ''}" data-cat="${c}">${c}</button>
    `).join('');
    bar.querySelectorAll('.filter-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        bar.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.getAttribute('data-cat');
        renderGrid(cat === 'All' ? allProjects : allProjects.filter((p) => p.category === cat));
      });
    });
  }

  document.addEventListener('crown:content-ready', (e) => {
    allProjects = e.detail.projects || [];
    renderFilters(allProjects);
    renderGrid(allProjects);
  });
})();
