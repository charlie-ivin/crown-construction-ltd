(function () {
  document.addEventListener('crown:content-ready', function (e) {
    var form = document.getElementById('contact-form');
    var status = document.getElementById('form-status');
    var submitBtn = document.getElementById('submit-btn');
    if (!form) return;
    var formId = (e.detail.site && e.detail.site.formspreeId) || '';

    form.addEventListener('submit', function (evt) {
      evt.preventDefault();

      if (!formId || formId === 'YOUR_FORM_ID') {
        var email = (e.detail.site && e.detail.site.email) || '';
        status.textContent = 'Online form isn\u2019t connected yet \u2014 please email ' + email + ' or call us directly, and we\u2019ll get back to you.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending\u2026';
      status.textContent = '';

      fetch('https://formspree.io/f/' + formId, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      })
        .then(function (res) {
          if (res.ok) {
            form.reset();
            status.textContent = 'Thanks \u2014 your enquiry has been sent. We\u2019ll be in touch within one working day.';
          } else {
            status.textContent = 'Something went wrong sending that. Please call or email us directly.';
          }
        })
        .catch(function () {
          status.textContent = 'Something went wrong sending that. Please call or email us directly.';
        })
        .finally(function () {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send enquiry';
        });
    });
  });
})();
