if (!customElements.get('cart-drawer')) {
  class CartDrawer extends HTMLElement {
    constructor() {
      super();
      this.isInitialized = false;
      this.setHeaderCartIconAccessibility();
    }

    init() {
      if (!this.isInitialized) {
        window.loadTemplateContent(this);

        requestAnimationFrame(() => {
          // Bind various things
          this.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
          this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
          this.moveCssLinks();
          this.isInitialized = true;
        });
      }
    }

    reload() {
      const sections = this.getSectionsToRender().map((section) => section.id);
      fetch(`?sections=${sections}`)
        .then((response) => response.json())
        .then((response) => {
          this.renderContents({
            sections: {
              ...response
            }
          }, true);
        })
        .catch((e) => {
          console.error(e);
        });
    }

    moveCssLinks() {
      const cssLinks = this.querySelectorAll('link[rel="stylesheet"][href*=".css"]');
      cssLinks.forEach(link => {
        // Check if the link already exists in the document head
        const href = link.href;
        if (!document.head.querySelector(`link[href="${href}"]`)) {
          // Clone the link element
          const newLink = link.cloneNode(true);
          // Append the cloned link to the document head
          document.head.appendChild(newLink);
        }
      });
    }

    setHeaderCartIconAccessibility() {
      const cartLink = document.querySelector('#cart-icon-bubble');
      if (!cartLink) return;

      cartLink.setAttribute('role', 'button');
      cartLink.setAttribute('aria-haspopup', 'dialog');
      cartLink.addEventListener('click', (event) => {
        event.preventDefault();
        this.open(cartLink);
      });
      cartLink.addEventListener('keydown', (event) => {
        if (event.code.toUpperCase() === 'SPACE') {
          event.preventDefault();
          this.open(cartLink);
        }
      });
    }

    open(triggeredBy) {
      this.init();

      if (triggeredBy) this.setActiveElement(triggeredBy);
      const cartDrawerNote = this.querySelector('[id^="Details-"] summary');
      if (cartDrawerNote && !cartDrawerNote.hasAttribute('role')) this.setSummaryAccessibility(cartDrawerNote);
      // here the animation doesn't seem to always get triggered. A timeout seem to help
      setTimeout(() => {
        this.classList.add('animate', 'active');
      });

      this.removeDeleteTabIndex();

      this.addEventListener(
        'transitionend',
        () => {
          const containerToTrapFocusOn = this.classList.contains('is-empty')
            ? this.querySelector('.drawer__inner-empty')
            : document.getElementById('CartDrawer');
          const focusElement = this.querySelector('.drawer__inner') || this.querySelector('.drawer__close');
          trapFocus(containerToTrapFocusOn, focusElement);

          publish(PUB_SUB_EVENTS.cartOpen);
        },
        {once: true}
      );

      document.body.classList.add('overflow-hidden');
    }

    close() {
      this.classList.remove('active');
      removeTrapFocus(this.activeElement);
      document.body.classList.remove('overflow-hidden');
      publish(PUB_SUB_EVENTS.cartClose);
    }

    /**
     * Ensure all remove buttons can be tabbed to
     */
    removeDeleteTabIndex() {
      this.querySelectorAll('.cart-remove-button').forEach((button) => {
        button.removeAttribute('tabindex')
      });
    }

    setSummaryAccessibility(cartDrawerNote) {
      cartDrawerNote.setAttribute('role', 'button');
      cartDrawerNote.setAttribute('aria-expanded', 'false');

      if (cartDrawerNote.nextElementSibling.getAttribute('id')) {
        cartDrawerNote.setAttribute('aria-controls', cartDrawerNote.nextElementSibling.id);
      }

      cartDrawerNote.addEventListener('click', (event) => {
        event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
      });

      cartDrawerNote.parentElement.addEventListener('keyup', onKeyUpEscape);
    }

    renderContents(parsedState, preventOpen = false) {
      this.querySelector('.drawer__inner').classList.contains('is-empty') &&
      this.querySelector('.drawer__inner').classList.remove('is-empty');
      this.productId = parsedState.id;
      this.getSectionsToRender().forEach((section) => {
        const sectionElement = section.selector
          ? document.querySelector(section.selector)
          : document.getElementById(section.id);

        if (!sectionElement) return;
        sectionElement.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
      });

      setTimeout(() => {
        window.loadTemplateContent(this);
        this.querySelector('#CartDrawer-Overlay').addEventListener('click', this.close.bind(this));
      });

      this.removeDeleteTabIndex();

      if (theme.settings.cartDrawer.atcAction === 'drawer' && !preventOpen) {
        setTimeout(() => {
          this.open();
        });
      }
    }

    getSectionInnerHTML(html, selector = '.shopify-section') {
      html = html.replace(/<template\b[^>]*>|<\/template>/g, '');
      return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
    }

    getSectionsToRender() {
      return [
        {
          id: 'cart-drawer',
          selector: '#CartDrawer',
        },
        {
          id: 'cart-icon-bubble',
        },
      ];
    }

    getSectionDOM(html, selector = '.shopify-section') {
      return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
    }

    setActiveElement(element) {
      this.activeElement = element;
    }
  }

  customElements.define('cart-drawer', CartDrawer);
}

if (!customElements.get('cart-drawer-items')) {
  customElements.whenDefined('cart-items').then(() => {
    class CartDrawerItems extends CartItems {
      getSectionsToRender() {
        return [
          {
            id: 'CartDrawer',
            section: 'cart-drawer',
            selector: '.drawer__inner',
          },
          {
            id: 'cart-icon-bubble',
            section: 'cart-icon-bubble',
            selector: '.shopify-section',
          },
        ];
      }
    }

    customElements.define('cart-drawer-items', CartDrawerItems);
  });
}
