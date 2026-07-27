/* Crown Construction — shared site behaviour
   Loads /data/content.json once and binds simple values onto elements
   marked with data-bind / data-bind-tel / data-bind-mailto attributes.
   Page-specific scripts (home.js, gallery.js, contact.js) read
   window.crownContent for the richer list rendering. */

(function () {
  function getPath(obj, path) {
    return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
  }

  function bindContent(content) {
    document.querySelectorAll('[data-bind]').forEach((el) => {
      const val = getPath(content, el.getAttribute('data-bind'));
      if (val !== undefined && val !== null) el.textContent = val;
    });
    document.querySelectorAll('[data-bind-tel]').forEach((el) => {
      const val = getPath(content, el.getAttribute('data-bind-tel'));
      if (val) el.setAttribute('href', 'tel:' + val);
    });
    document.querySelectorAll('[data-bind-mailto]').forEach((el) => {
      const val = getPath(content, el.getAttribute('data-bind-mailto'));
      if (val) el.setAttribute('href', 'mailto:' + val);
    });
    document.querySelectorAll('[data-bind-html]').forEach((el) => {
      const val = getPath(content, el.getAttribute('data-bind-html'));
      if (val) el.innerHTML = val;
    });
  }

  function initNav() {
    const toggle = document.querySelector('.nav-toggle');
    const nav = document.querySelector('.main-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    const path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.main-nav a[data-page]').forEach((a) => {
      if (a.getAttribute('data-page') === path) a.classList.add('active');
    });
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  function loadContent() {
    return fetch('data/content.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('content.json not found');
        return res.json();
      })
      .then((content) => {
        window.crownContent = content;
        bindContent(content);
        document.dispatchEvent(new CustomEvent('crown:content-ready', { detail: content }));
        return content;
      })
      .catch((err) => {
        console.warn('Crown Construction: could not load live content.json, page falls back to static copy.', err);
      });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    loadContent();
  });
})();
