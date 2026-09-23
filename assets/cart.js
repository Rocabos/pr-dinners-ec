if (!customElements.get('cart-remove-button')) {
  class CartRemoveButton extends HTMLElement {
    constructor() {
      super();
      window.initScriptOnDemand(this, this.init.bind(this));
    }

    init() {
      this.addEventListener('click', (event) => {
        event.preventDefault();
        const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
        cartItems.updateQuantity(this.dataset.index, 0);
      });
    }
  }

  customElements.define('cart-remove-button', CartRemoveButton);
}

class CartItems extends HTMLElement {
  constructor() {
    super();
    window.initScriptOnDemand(this, this.init.bind(this));
  }

  init() {
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');
    this.cartDrawer = document.querySelector('cart-drawer');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue > 0 && inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId
      );
    }
  }

  onChange(event) {
    this.validateQuantity(event);
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
          this.cartDrawer?.removeDeleteTabIndex();
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      fetch(`${routes.cart_url}?section_id=main-cart`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
          window.renderSelects();
          window.loadDesktopOnlyTemplates();
          this.cartDrawer?.removeDeleteTabIndex();
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart-items',
        section: 'main-cart',
        selector: '.js-cart-items',
      },
      {
        id: 'cart-summary',
        section: 'main-cart',
        selector: '.js-subtotal',
      },
      {
        id: 'cart-summary',
        section: 'main-cart',
        selector: '.js-free-shipping-bar',
      },
      {
        id: 'cart-summary',
        section: 'main-cart',
        selector: '.cart__recommendations',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      }
    ];
  }

  updateQuantity(line, quantity, name, variantId) {
    this.enableLoading(line);

    let sectionsToRender = [];

    const cartDrawerItems = document.querySelector('cart-drawer-items');
    if (cartDrawerItems) {
      sectionsToRender = [...sectionsToRender, ...cartDrawerItems.getSectionsToRender()];
    }

    const cartItems = document.querySelector('cart-items');
    if (cartItems) {
      sectionsToRender = [...sectionsToRender, ...cartItems.getSectionsToRender()];
    }

    const body = JSON.stringify({
      line,
      quantity,
      sections: sectionsToRender.map((section) => section.section),
      sections_url: window.location.pathname,
    });

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        const quantityElement =
            document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
        const items = document.querySelectorAll('.cart-item');

        if (parsedState.errors) {
          quantityElement.value = quantityElement.getAttribute('value');
          this.updateLiveRegions(line, parsedState.errors);
          return;
        }

        this.renderContents(parsedState, sectionsToRender);

        const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
        let message = '';
        if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
          if (typeof updatedValue === 'undefined') {
            message = window.cartStrings.error;
          } else {
            message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
          }
        }
        this.updateLiveRegions(line, message);
        const cartDrawerWrapper = document.querySelector('cart-drawer');

        const lineItem =
            document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
          cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
              : lineItem.querySelector(`[name="${name}"]`).focus();
        } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
        } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
          trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
        }
        window.renderSelects();
        window.loadDesktopOnlyTemplates();

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch((err) => {
        console.warn(err);
        this.querySelectorAll('.loading__spinner').forEach((spinner) => spinner.classList.add('hidden', 'spinning-complete'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        if (typeof this.cartDrawer?.removeDeleteTabIndex === 'function') this.cartDrawer?.removeDeleteTabIndex();
        this.disableLoading(line);
      });
  }

  renderContents(parsedState, sectionsToRender) {
    if (!sectionsToRender) sectionsToRender = this.getSectionsToRender();

    this.classList.toggle('is-empty', parsedState.item_count === 0);
    const cartDrawerWrapper = document.querySelector('cart-drawer');
    const cart = document.getElementById('main-cart');

    if (cart) cart.classList.toggle('is-empty', parsedState.item_count === 0);
    if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

    sectionsToRender.forEach((section) => {
      const elementToReplace =
          document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
      const newHtml = this.getSectionInnerHTML(
          parsedState.sections[section.section],
          section.selector
      );

      if (newHtml) {
        // Prevent a flash of content with recommendations
        const oldRecommendations = elementToReplace.querySelector('product-recommendations');
        if (oldRecommendations) {
          const newRecommendations = newHtml.querySelector('product-recommendations');
          if (newRecommendations) {
            newRecommendations.innerHTML = oldRecommendations.innerHTML;
          }
        }

        // Animate free shipping progress bar from old number to new number
        const oldFreeShippingBar = elementToReplace.querySelector('.free-shipping-bar');
        if (oldFreeShippingBar) {
          const oldProgress = oldFreeShippingBar.style.getPropertyValue('--shipping-bar-width');
          const newFreeShippingBar = newHtml.querySelector('.free-shipping-bar');
          const newProgress = newFreeShippingBar.style.getPropertyValue('--shipping-bar-width');
          newFreeShippingBar.style.setProperty('--shipping-bar-width', oldProgress);

          setTimeout(() => {
            elementToReplace.querySelector('.free-shipping-bar').style
              .setProperty('--shipping-bar-width', newProgress);
          }, 0);
        }

        elementToReplace.innerHTML = newHtml.innerHTML;
        window.loadTemplateContent(this);
      }
    });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    html = html.replace(/<template\b[^>]*>|<\/template>/g, '');
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector);
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);

    this.closest('cart-drawer')?.classList.add('closable-element--no-trans');
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));

    window.requestAnimationFrame(() => {
      this.closest('cart-drawer')?.classList.remove('closable-element--no-trans');
    });
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();
        window.initScriptOnDemand(this, this.init.bind(this));
      }

      init() {
        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } });
          }, ON_CHANGE_DEBOUNCE_TIMER)
        );
      }
    }
  );
}
