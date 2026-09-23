if (!customElements.get('stat-counter')) {
  class StatCounter extends HTMLElement {
    constructor() {
      super();
      window.initScriptOnDemand(this, this.init.bind(this));
    }

    init() {
      if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
        this.bindObserver();
        document.addEventListener('shopify:section:load', () => {
          this.destroy();
          this.bindObserver();
        });
      }
    }

    disconnectedCallback() {
      this.destroy();
    }

    bindObserver() {
      if ('IntersectionObserver' in window && this.dataset.statAnimate === 'true') {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.counterCountUp();
            }
          });
        }, {threshold: 0});

        this.wrapNumbers();
        this.observer.observe(this);
      }
    }

    destroy() {
      if ('IntersectionObserver' in window) {
        this.observer?.disconnect();
        this.unwrapNumbers();
      }
    }

    wrapNumbers() {
      if (!this.dataset.statAnimating) {
        this.originalHtml = this.innerHTML;

        const characters = this.textContent.trim().split("");
        characters.forEach((el, i) => {
          if (!isNaN(parseInt(el, 10))) {
            characters[i] = `
        <div class='digit' data-counter-value=${el}>
          <div class='sequence'>
            <span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span>9</span>
          </div>
        </div>`;
          }
        });

        this.innerHTML = characters.join("");

        this.setAttribute('data-stat-animating', 'true');
      }
    }

    unwrapNumbers() {
      this.html = this.originalHtml;
    }

    counterCountUp() {
      this.querySelectorAll(".digit").forEach(digit => {
        const sequence = digit.querySelector(".sequence");
        const value = digit.getAttribute("data-counter-value");
        sequence.style.transform = `translate3d(0, ${-(value * 10)}%, 0)`;
      });
    }

    counterReset() {
      this.querySelectorAll(".digit").forEach(digit => {
        const sequence = digit.querySelector(".sequence");
        sequence.style.transform = "translate3d(0, 0%, 0)";
      });
    }
  }

  customElements.define('stat-counter', StatCounter);
}