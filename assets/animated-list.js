class AnimatedList extends HTMLElement {
  constructor() {
    super();
    this.autoplaySpeed = parseInt(this.getCssTimeMs(this, '--al-autoplay-speed')) || 3000;
    this.currentIndex = 1;
    this.prevIndex = 0;
    this.interval = null;
    this.observer = null;
  }

  connectedCallback() {
    this.initializeList();
    this.items = Array.from(this.querySelectorAll('.animated-list__item'));
    this.setupObserver();
    this.startAnimation();
    window.addEventListener('resizeend', () => {
      setTimeout(() => {
        this.setWidth(this.querySelector('.animated-list__item--visible'));
      }, 0);
    });
  }

  initializeList() {
    const dataList = this.getAttribute('data-list');
    if (dataList) {
      const items = dataList.split('|');
      this.innerHTML = `
        <span class="animated-list__item animated-list__item--visible">
            <span class="whitespace-nowrap">${this.innerHTML.trim()}</span>
        </span>
        ${items.map(item => `<span class="animated-list__item"><span class="whitespace-nowrap">${item.trim()}</span></span>`).join('')}
      `;
      setTimeout(() => {
        this.setWidth(this.querySelector('.animated-list__item--visible'));
      }, 0);
    }
  }

  disconnectedCallback() {
    this.stopAnimation();
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  setupObserver() {
    this.observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        this.startAnimation();
      } else {
        this.stopAnimation();
      }
    }, {threshold: 0.1});
    this.observer.observe(this);
  }

  startAnimation() {
    this.stopAnimation();
    this.interval = setInterval(() => this.nextItem(), this.autoplaySpeed);
  }

  stopAnimation() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  setWidth(nextElement) {
    const widthElement = nextElement.querySelector('span');
    this.style.width = `${widthElement.getBoundingClientRect().width}px`;
  }

  getCssTimeMs(element, variableName) {
    const value = getComputedStyle(element)
      .getPropertyValue(variableName)
      .trim();

    if (!value) return 0;

    if (value.endsWith('ms')) {
      return parseFloat(value);
    }

    if (value.endsWith('s')) {
      return parseFloat(value) * 1000;
    }

    // Fallback: assume milliseconds
    return parseFloat(value) || 0;
  }

  nextItem() {
    const prevElement = this.items[this.prevIndex];
    if (prevElement) {
      prevElement.style.width = `${prevElement.getBoundingClientRect().width}px`;
      prevElement.classList.add('animated-list__item--leaving');
      prevElement.classList.remove('animated-list__item--visible');
      setTimeout(() => {
        prevElement.classList.remove('animated-list__item--leaving');
        prevElement.style.width = '';
      }, this.getCssTimeMs(prevElement, '--al-leave-speed'));
    }

    const nextElement = this.items[this.currentIndex];
    nextElement.classList.add('animated-list__item--visible');
    this.setWidth(nextElement);

    this.prevIndex = this.currentIndex;
    this.currentIndex = (this.currentIndex + 1) % this.items.length;
  }
}

customElements.define('animated-list', AnimatedList);
