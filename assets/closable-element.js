if (!customElements.get('closable-element')) {
  class CloseableElement extends HTMLElement {
    constructor() {
      super();
      window.initScriptOnDemand(this, this.init.bind(this));
    }

    init() {
      window.addEventListener('resizeend', this.checkElementHeight.bind(this));
      this.checkElementHeight();
      if (!Shopify.designMode) {
        this.closeButton = this.querySelector('.js-close-button');
        this.closeButton.addEventListener('click', this.closeElement.bind(this));
        this.hideHiddenElements();
      } else {
        window.addEventListener('shopify:section:load', this.checkElementHeight.bind(this));
      }
    }

    hideHiddenElements() {
      let closedElements = JSON.parse(localStorage.getItem('theme-closed-elements'));
      if (closedElements) {
        closedElements.forEach(id => {
          if (this.closest(`#${id}`) && this.id === id) {
            this.closeElement();
          }
        });
      }
    }

    checkElementHeight() {
      this.classList.toggle('short-section', this.clientHeight < 80);
    }

    closeElement() {
      this.style.maxHeight = `${this.clientHeight}px`;
      requestAnimationFrame(() => this.setAttribute('aria-hidden', 'true'));
      this.setAttribute('tabindex', '-1');

      if (!Shopify.designMode) {
        const closedElements = JSON.parse(localStorage.getItem('theme-closed-elements')) || [];

        if (this.dataset.closesSection) {
          // Get the ID of the closest '.shopify-section'
          let sectionId = this.closest('.shopify-section')?.id;
          if (!sectionId) {
            console.warn('CloseableElement: No .shopify-section parent found.');
            return;
          }

          if (!closedElements.includes(sectionId)) closedElements.push(sectionId);
        } else if (this.dataset.persistClose) {
          if (!this.id) {
            console.warn('CloseableElement: No id found for element', this);
            return;
          }

          if (!closedElements.includes(this.id)) closedElements.push(this.id);
        }

        // Save the updated array back to localStorage
        localStorage.setItem('theme-closed-elements', JSON.stringify(closedElements));
      }
    }
  }

  customElements.define('closable-element', CloseableElement);
}