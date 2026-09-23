if (!customElements.get('cart-notification')) {
  class CartNotification extends HTMLElementLazyInit {
    constructor() {
      super();
      this.isInitialized = false;
    }

    init() {
      if (!this.isInitialized) {
        window.loadTemplateContent(this);

        requestAnimationFrame(() => {
          this.notification = document.getElementById('cart-notification');
          this.header = document.querySelector('sticky-header');
          this.cartDrawer = document.querySelector('cart-drawer');
          this.viewCartButton = this.querySelector('.js-view-cart');
          this.onBodyClick = this.handleBodyClick.bind(this);

          this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
          this.viewCartButton.addEventListener('click', this.handleViewCartClick.bind(this));
          this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
            closeButton.addEventListener('click', this.close.bind(this))
          );
          this.isInitialized = true;
        });
      }
    }

    open() {
      if (theme.settings.cartDrawer.muteNotification) return;

      if (this.cartDrawer) {
        customElements.whenDefined('cart-drawer').then(() => {
          this.cartDrawer.init();
        });
      }

      this.notification.classList.add('animate', 'active');

      this.notification.addEventListener(
        'transitionend',
        () => {
          this.notification.focus();
          trapFocus(this.notification);
        },
        {once: true}
      );

      document.body.addEventListener('click', this.onBodyClick);
    }

    close() {
      this.notification.classList.remove('active');
      document.body.removeEventListener('click', this.onBodyClick);

      removeTrapFocus(this.activeElement);
    }

    renderContents(parsedState) {
      this.cartItemKey = parsedState.key;
      this.getSectionsToRender().forEach((section) => {
        document.getElementById(section.id).innerHTML = this.getSectionInnerHTML(
          parsedState.sections[section.id],
          section.selector
        );
      });

      if (theme.settings.cartDrawer.atcAction === 'notification' && !(this.cartDrawer && this.cartDrawer.classList.contains('active'))) {
        if (this.header) this.header.reveal();
        this.open();
      }
    }

    getSectionsToRender() {
      return [
        {
          id: 'cart-notification-product',
          selector: `[id="cart-notification-product-${this.cartItemKey}"]`,
        },
        {
          id: 'cart-notification-button',
        },
        {
          id: 'cart-icon-bubble',
        },
      ];
    }

    getSectionInnerHTML(html, selector = '.shopify-section') {
      html = html.replace(/<template\b[^>]*>|<\/template>/g, '');
      return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
    }

    handleViewCartClick(evt) {
      if (this.cartDrawer) {
        evt.preventDefault();
        this.close();
        this.cartDrawer.open();
      }
    }

    handleBodyClick(evt) {
      const target = evt.target;
      if (target !== this.notification && !target.closest('cart-notification')) {
        const disclosure = target.closest('details-disclosure, header-menu');
        this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
        this.close();
      }
    }

    setActiveElement(element) {
      this.activeElement = element;
    }
  }

  customElements.define('cart-notification', CartNotification);
}
