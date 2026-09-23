class DetailsModal extends HTMLElement {
  constructor() {
    super();
    window.initScriptOnDemand(this, this.init.bind(this));
  }

  init() {
    this.detailsContainer = this.querySelector('details');
    this.summaryToggle = this.querySelector('summary');
    this.overlay = this.querySelector('.drawer__header-overlay');
    this.detailsContainer.addEventListener('keyup', (event) => event.code.toUpperCase() === 'ESCAPE' && this.close());
    this.summaryToggle.addEventListener('click', this.onSummaryClick.bind(this));
    this.overlay?.addEventListener('click', this.close.bind(this));
    this.summaryToggle.setAttribute('role', 'button');

    this.addEventListener('click', (event) => {
      if (event.target.matches('.search-modal__close-button') || event.target.closest('.search-modal__close-button') || event.target.closest('.modal__close-button')) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.detailsContainer.hasAttribute('open');
  }

  onSummaryClick(event) {
    event.preventDefault();
    event.target.closest('details').hasAttribute('open') ? this.close() : this.open(event);
  }

  onBodyClick(event) {
    if (!this.contains(event.target) || event.target.classList.contains('modal-overlay')) this.close(false);
  }

  open(event) {
    if (this.querySelector('template.deferred')) {
      window.loadTemplateContent(this);
      this.querySelector('button[type="button"]').addEventListener('click', this.close.bind(this));
    }

    this.onBodyClickEvent = this.onBodyClickEvent || this.onBodyClick.bind(this);
    event.target.closest('details').setAttribute('open', true);
    document.body.addEventListener('click', this.onBodyClickEvent);
    document.body.classList.add('overflow-hidden', 'drawer--open', 'drawer--open-header');

    trapFocus(
      this.detailsContainer.querySelector('[tabindex="-1"]'),
      this.detailsContainer.querySelector('input:not([type="hidden"])')
    );
  }

  close(focusToggle = true) {
    removeTrapFocus(focusToggle ? this.summaryToggle : null);
    this.detailsContainer?.removeAttribute('open');
    document.body.removeEventListener('click', this.onBodyClickEvent);
    document.body.classList.remove('overflow-hidden', 'drawer--open', 'drawer--open-header');
  }
}

customElements.define('details-modal', DetailsModal);
