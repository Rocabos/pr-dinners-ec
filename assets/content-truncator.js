if (!customElements.get('content-truncator')) {

  class ContentTruncator extends HTMLElement {
    constructor() {
      super();
      window.initScriptOnDemand(this, this.init.bind(this));
    }

    init() {
      this.contentWrapper = this.querySelector('.content-truncator__wrapper');
      this.content = this.querySelector('.content-truncator__content');
      this.button = this.querySelector('.content-truncator__button');

      this.updateButtonVisibility();

      this.button.addEventListener('click', () => this.showMoreContent());
      window.addEventListener('resizeend', () => this.updateButtonVisibility());
    }

    updateButtonVisibility() {
      const contentHeight = this.content.scrollHeight;
      const wrapperHeight = this.contentWrapper.clientHeight;

      if (contentHeight > wrapperHeight) {
        this.contentWrapper.classList.add('is-expandable');
        this.button.style.display = 'inline-block';
      } else {
        this.contentWrapper.classList.remove('is-expandable');
        this.button.style.display = 'none';
      }
    }

    showMoreContent() {
      const contentHeight = this.content.scrollHeight;
      this.contentWrapper.style.setProperty('--max-content-height', `${contentHeight}px`);
      this.contentWrapper.classList.add('expanded');
      this.updateButtonVisibility();
    }
  }

  customElements.define('content-truncator', ContentTruncator);
}