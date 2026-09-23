if (!customElements.get('full-width-animate')) {

  class FullWidthAnimate extends HTMLElement {
    constructor() {
      super();
      window.initScriptOnDemand(this, this.init.bind(this));
    }

    init() {
      this.onScroll = this.onScroll.bind(this);
      if (window.innerWidth >= 750) {
        this.calculateValues();
        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resizeend', () => this.calculateValues());
        this.onScroll();  // Initial check in case the element is already in view
      }
    }

    disconnectedCallback() {
      window.removeEventListener('scroll', this.onScroll);
    }

    calculateValues() {
      this.rootFontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
      this.headerHeight = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height'));
      this.pxMobile = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--px-mobile'));
      this.textBoxRadius = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--text-boxes-radius'));
      this.xMaxValue = window.innerWidth < 750 ? this.pxMobile * this.rootFontSize : 5 * this.rootFontSize;
      this.yMaxValue = this.textBoxRadius;

      if (this.getBoundingClientRect().top > (this.headerHeight * 4)) this.headerHeight = this.headerHeight * 4;
    }

    onScroll() {
      if (window.innerWidth >= 750) {
        requestAnimationFrame(() => {
          const rect = this.getBoundingClientRect();

          if (rect.top <= this.headerHeight && rect.bottom >= 0) {
            const distanceFromTop = this.headerHeight - rect.top;
            const elementHeight = rect.height;
            const maxDistance = elementHeight / 1.5;

            const xValue = Math.min(distanceFromTop / maxDistance * this.xMaxValue, this.xMaxValue);
            const yValue = Math.min(distanceFromTop / maxDistance * this.yMaxValue, this.yMaxValue);

            this.style.clipPath = `inset(${xValue}px round ${yValue}px)`;
          } else {
            this.style.clipPath = `inset(0px round 0px)`;
          }
        });
      }
    }
  }

  customElements.define('full-width-animate', FullWidthAnimate);
}