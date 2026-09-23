if (!customElements.get('discount-code')) {
  customElements.define('discount-code', class DiscountCode extends HTMLElement {
      constructor() {
        super();
        window.initScriptOnDemand(this, this.init.bind(this));
      }

      init() {
        this.copyButton = this.querySelector('.share-button__copy');
        this.closeButton = this.querySelector('.share-button__close');
        this.successMessage = this.querySelector('[id^="DiscountCode"]');
        this.input = this.querySelector('input');

        this.copyButton.addEventListener('click', this.copyToClipboard.bind(this));
        this.closeButton.addEventListener('click', this.closeSuccess.bind(this));
      }

      copyToClipboard() {
        if (Shopify.designMode) {
          alert('The Theme Editor restricts this action. Please test it by previewing your store.');
        }

        navigator.clipboard.writeText(this.input.value).then(() => {
          this.classList.add('discount-copied');
          this.closeButton.classList.remove('hidden');
          this.closeButton.focus();
        });
      }

      closeSuccess() {
        this.classList.remove('discount-copied');
        this.closeButton.classList.add('hidden');
      }
    }
  );
}