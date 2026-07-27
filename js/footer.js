/* Renders the shared footer once content.json is available. */
(function () {
  function render(content) {
    const el = document.getElementById('site-footer');
    if (!el) return;
    const s = content.site;
    const areas = (s.areas || []).map((a) => `<li>${a}</li>`).join('');
    el.innerHTML = `
      <div class="container">
        <div class="footer-grid">
          <div>
            <div class="footer-brand">
              <img src="images/logo.png" alt="">
            </div>
            <p style="max-width:34ch;">${s.tagline}</p>
            <p class="regno" style="margin-top:14px;">Company no. ${s.companyNumber}</p>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li><a href="tel:${s.phoneHref}">${s.phone}</a></li>
              <li><a href="mailto:${s.email}">${s.email}</a></li>
              <li>${s.address}</li>
              <li>${s.hours}</li>
            </ul>
          </div>
          <div>
            <h4>Areas covered</h4>
            <ul>${areas}</ul>
          </div>
          <div>
            <h4>Site</h4>
            <ul>
              <li><a href="index.html">Home</a></li>
              <li><a href="gallery.html">Our work</a></li>
              <li><a href="about.html">About</a></li>
              <li><a href="contact.html">Contact</a></li>
            </ul>
          </div>
        </div>
        <div class="footer-bottom">
          <span>&copy; <span id="year"></span> ${s.name}. All rights reserved.</span>
          <a href="https://portfolio.charlieivin.co.uk" target="_blank" rel="noopener noreferrer" class="btn-charlie">Website Built by Charlie Ivin</a>
          <a href="admin/index.html">Site admin</a>
        </div>
      </div>
    `;
    const year = document.getElementById('year');
    if (year) year.textContent = new Date().getFullYear();
  }

  document.addEventListener('crown:content-ready', (e) => render(e.detail));
})();
