if (!customElements.get('country-selector')) {
  class CountrySelector extends HTMLElement {
    constructor() {
      super();
      this.provinceElement = this.querySelector('.js-shipping-province');
      this.countryElement = this.querySelector('.js-shipping-country');
      this.provinceWrapper = this.querySelector('.js-province-container');
      window.initScriptOnDemand(this, this.init.bind(this));
    }

    init() {
      CountrySelector.selectOption(this.countryElement, this.countryElement.dataset.default);

      this.updateProvinceOptions();

      if (this.provinceElement.dataset.default && this.provinceElement.options.length > 0) {
        CountrySelector.selectOption(this.provinceElement, this.provinceElement.dataset.default);
      }

      this.countryElement.addEventListener('change', this.updateProvinceOptions.bind(this));
    }

    /**
     * Updates the province/state options based on selected country.
     */
    updateProvinceOptions() {
      const selectedCountry = this.countryElement.options[this.countryElement.selectedIndex];
      const provinceList = JSON.parse(selectedCountry.dataset.provinces);

      // Clear existing options in the province field.
      Array.from(this.provinceElement.options).forEach((option) => option.remove());

      if (provinceList && provinceList.length === 0) {
        this.provinceWrapper.hidden = true;
      } else {
        provinceList.forEach((province) => {
          const provinceOption = document.createElement('option');
          [provinceOption.value, provinceOption.innerHTML] = province;
          this.provinceElement.appendChild(provinceOption);
        });

        this.provinceWrapper.hidden = false;
      }
    }

    /**
     * Sets the selected option of a <select> element.
     * @param {Element} dropdown - Country or province <select> element.
     * @param {string} value - The value to be selected in the dropdown.
     */
    static selectOption(dropdown, value) {
      Array.from(dropdown.options).forEach((option, index) => {
        if (option.value === value || option.innerHTML === value) {
          dropdown.selectedIndex = index;
        }
      });
    }
  }

  customElements.define('country-selector', CountrySelector);
}

if (!customElements.get('shipping-calculator')) {
  class ShippingCalculator extends HTMLElement {
    constructor() {
      super();
      this.submitButton = this.querySelector('button');
      this.shippingForm = this.querySelector('form');
      this.shippingForm.addEventListener('submit', this.processFormSubmit.bind(this));
    }

    initialize() {
      this.countryField = this.querySelector('.js-shipping-country');
      this.provinceField = this.querySelector('.js-shipping-province');
      this.cityField = this.querySelector('.js-city-input');
      this.addressField = this.querySelector('.js-address-input');
      this.zipField = this.querySelector('.js-zip-input');
      this.ratesDisplay = this.querySelector('.js-shipping-rate');
      this.errorDisplay = this.querySelector('.js-shipping-error');
      this.isInitialized = true;
    }

    /**
     * Handles the form submission for calculating shipping rates.
     * @param {object} event - The submit event object.
     */
    async processFormSubmit(event) {
      event.preventDefault();
      if (!this.isInitialized) this.initialize();

      this.errorDisplay.hidden = true;
      this.ratesDisplay.hidden = true;
      this.submitButton.disabled = true;

      this.submitButton.setAttribute('aria-disabled', true);
      this.submitButton.classList.add('loading');
      this.submitButton.querySelector('.loading__spinner').classList.remove('hidden', 'spinning-complete');

      const queryParams = `shipping_address[zip]=${this.zipField.value}&shipping_address[country]=${this.countryField.value}&shipping_address[province]=${this.provinceField.value}&shipping_address[city]=${this.cityField?.value}&shipping_address[address1]=${this.addressField?.value}`;

      try {
        const response = await fetch(`${window.routes.cart_url}/shipping_rates.json?${queryParams}`);
        const resultData = await response.json();

        if (response.ok) {
          this.displayRates(resultData);
        } else {
          this.displayErrors(resultData);
        }
      } catch (error) {
        console.error(error); // eslint-disable-line
      } finally {
        this.submitButton.disabled = false;
        this.submitButton.setAttribute('aria-disabled', false);
        this.submitButton.classList.remove('loading');
        this.submitButton.querySelector('.loading__spinner').classList.add('hidden', 'spinning-complete');
      }
    }

    /**
     * Displays the available shipping rates.
     * @param {object} data - The response data from the shipping API.
     */
    displayRates(data) {
      const headingElement = this.ratesDisplay.querySelector('.js-shipping-rate-heading');
      const textElement = this.ratesDisplay.querySelector('.js-shipping-rate-text');
      textElement.innerHTML = '';

      if (data.shipping_rates && data.shipping_rates.length) {
        const headingText = data.shipping_rates.length === 1 ? 'singleRate' : 'multipleRates';
        let rateOptions = '';

        data.shipping_rates.forEach((rate) => {
          const formattedPrice = theme.settings.moneyWithCurrencyFormat.replace(/\{\{\s*(\w+)\s*\}\}/, rate.price);
          rateOptions += `<li>${rate.name}: ${formattedPrice}</li>`;
        });

        headingElement.textContent = window.strings.cart.shippingCalculator[headingText];
        textElement.innerHTML = `<ul class="mt-1 t5">${rateOptions}</ul>`;
        headingElement.hidden = false;
      } else {
        headingElement.hidden = true;
        textElement.innerHTML = window.strings.cart.shippingCalculator.noRates;
      }

      this.ratesDisplay.hidden = false;
    }

    /**
     * Displays errors related to shipping rate retrieval.
     * @param {object} data - The error data from the shipping API.
     */
    displayErrors(data) {
      let errorMessages = '';

      Object.keys(data).forEach((key) => {
        errorMessages += `<li>${data[key]}</li>`;
      });

      this.errorDisplay.querySelector('.js-shipping-error-content').innerHTML = `<ul class="mt-1 t5">${errorMessages}</ul>`;
      this.errorDisplay.hidden = false;
    }
  }

  customElements.define('shipping-calculator', ShippingCalculator);
}
