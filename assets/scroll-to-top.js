if (!customElements.get('scroll-to-top-button')) {
  class ScrollToTopButton extends HTMLElement {
    constructor() {
      super();
      this.isRevealed = false;
      this.onScrollHandler = this.onScroll.bind(this);
      this.onClickHandler = this.scrollToTop.bind(this);
      this.onKeyDownHandler = this.onKeyDown.bind(this);
    }

    connectedCallback() {
      // Initial state
      this.updateVisibility();

      window.addEventListener('scroll', this.onScrollHandler, { passive: true });
      this.addEventListener('click', this.onClickHandler);
      this.addEventListener('keydown', this.onKeyDownHandler);
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScrollHandler);
      this.removeEventListener('click', this.onClickHandler);
      this.removeEventListener('keydown', this.onKeyDownHandler);
    }

    onScroll() {
      // Schedule all DOM reads/writes in one animation frame
      if (this._ticking) return;
      this._ticking = true;

      requestAnimationFrame(() => {
        this._ticking = false;
        this.updateVisibility();
      });
    }

    updateVisibility() {
      // Read scroll position once per frame, not on every event
      const shouldReveal = window.scrollY > window.innerHeight;
      if (shouldReveal !== this.isRevealed) {
        this.isRevealed = shouldReveal;
        this.classList.toggle('reveal', shouldReveal);
      }
    }

    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });

      // Wait until scroll completes before focusing (simple heuristic)
      setTimeout(() => {
        document.querySelector('.skip-to-content-link')?.focus();
      }, 700);
    }

    onKeyDown(event) {
      if (event.key === 'Enter') {
        this.scrollToTop();
      }
    }
  }

  customElements.define('scroll-to-top-button', ScrollToTopButton);
}