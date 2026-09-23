(function () {
  function validateAllowedDate(input) {
    const allowed = (input.dataset.allowedDates || '')
      .split(',')
      .map(item => item.trim().toLowerCase());

    const errorMessages = JSON.parse(input.dataset.jsonErrorMessages || '{}');

    const selected = input.value;
    const date = new Date(selected);
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[day];

    const errorElem = document.getElementById(`${input.id}_error`);

    // Extra: future_only fallback
    if (allowed.includes('future_only')) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      if (date < today) {
        if (errorElem) {
          const errorMessageElem = errorElem.querySelector('span');
          if (errorMessageElem && errorMessages['future_only']) {
            errorMessageElem.innerText = errorMessages['future_only'];
            errorElem.classList.remove('hidden');
          }
        }
        input.setAttribute('aria-invalid', 'true');
        input.value = '';
        return;
      }
    }

    const isAllowed = allowed.includes(selected) || allowed.includes(dayName);

    if (!isAllowed) {
      if (errorElem) {
        const errorMessageElem = errorElem.querySelector('span');
        if (errorMessageElem && errorMessages[dayName]) {
          errorMessageElem.innerText = errorMessages[dayName];
          errorElem.classList.remove('hidden');
        }
      }
      input.setAttribute('aria-invalid', 'true');
      input.value = '';
    } else {
      if (errorElem) errorElem.classList.add('hidden');
      input.removeAttribute('aria-invalid');
    }
  }

  function validateAllowedDateHandler(event) {
    validateAllowedDate(event.target);
  }

  function bindAllowedDateInputs() {
    document.querySelectorAll('[data-allowed-dates]').forEach(input => {
      input.removeEventListener('change', validateAllowedDateHandler); // Unbind first
      input.addEventListener('change', validateAllowedDateHandler);
    });
  }

  // Initial bind
  bindAllowedDateInputs();

  // Rebind on section load
  document.addEventListener('shopify:section:load', () => {
    bindAllowedDateInputs();
  });
})();
