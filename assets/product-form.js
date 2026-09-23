if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();
        if (document.querySelector('.sticky-cta')) {
         this.init();
        } else {
          window.initScriptOnDemand(this, this.init.bind(this), 100);
        }
      }

      init() {
        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
        this.cartDrawer = document.querySelector('cart-drawer');
        this.cartItems = document.querySelector('cart-items');
        this.cartNotification = document.querySelector('cart-notification');
        this.submitButton = this.querySelector('[type="submit"]');
        this.ctaButton = !this.closest('.section-featured-product') ?
          this.closest('.section')?.querySelector('.sticky-cta .button') : null;

        if (document.querySelector('cart-drawer')) this.submitButton.setAttribute('aria-haspopup', 'dialog');

        this.hideErrors = this.dataset.hideErrors === 'true';

        if (this.ctaButton) {
          this.ctaButtonListener = this.ctaButtonListener || this.ctaButtonClickHandler.bind(this);
          this.ctaButton.addEventListener('click', this.ctaButtonListener);
        }

        if (this.cartDrawer) {
          customElements.whenDefined('cart-drawer').then(() => {
            this.cartDrawer.init();
          });
        }

        if (this.cartNotification) {
          customElements.whenDefined('cart-notification').then(() => {
            this.cartNotification.init();
          });
        }
      }

      disconnectedCallback() {
        if (this.ctaButton) {
          this.ctaButton.removeEventListener('click', this.ctaButtonListener);
        }
      }

      ctaButtonClickHandler() {
        if (this.submitButton && this.submitButton.classList.contains('product-form__submit')) {
          this.submitButton.click();
        }
      }

      onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner')?.classList.remove('hidden', 'spinning-complete');

        if (this.ctaButton) {
          this.ctaButton.setAttribute('aria-disabled', true);
          this.ctaButton.querySelector('.loading__spinner')?.classList.remove('hidden', 'spinning-complete');
          this.ctaButton.classList.add('loading');
        }

        const config = fetchConfig('javascript');
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        delete config.headers['Content-Type'];

        const formData = new FormData(this.form);

        // Get all the sections that need to be re-rendered
        let sections = [];
        if (this.cartDrawer) {
          sections = this.cartDrawer.getSectionsToRender().map((section) => section.id);
        }
        if (this.cartNotification) {
          window.loadTemplateContent(this.cartNotification);
          const cartNotificationSections = this.cartNotification.getSectionsToRender().map((section) => section.id);
          sections = [...sections, ...cartNotificationSections];
        }
        if (this.cartItems) {
          const cartItemsSections = this.cartItems.getSectionsToRender().map((section) => section.section);
          sections = [...sections, ...cartItemsSections];
        }

        if (sections.length > 0) {
          formData.append('sections', [...new Set(sections)]);
          formData.append('sections_url', window.location.pathname);

          if (theme.settings.cartDrawer.atcAction === 'drawer' && this.cartDrawer) {
           this.cartDrawer.setActiveElement(document.activeElement);
          } else if (theme.settings.cartDrawer.atcAction === 'notification' && this.cartNotification) {
            this.cartNotification.setActiveElement(document.activeElement);
          }
        }

        config.body = formData;
        fetch(`${routes.cart_add_url}`, config)
          .then((response) => response.json())
          .then((response) => {
            if (response.status) {
              publish(PUB_SUB_EVENTS.cartError, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                errors: response.errors || response.description,
                message: response.message,
              });
              this.handleErrorMessage(response.description);

              if (this.cartDrawer) this.cartDrawer.reload();

              const soldOutMessage = this.submitButton.querySelector('.sold-out-message');
              if (!soldOutMessage) return;
              this.submitButton.setAttribute('aria-disabled', true);
              this.submitButton.querySelector('span').classList.add('hidden');
              if (this.ctaButton) {
                this.ctaButton.setAttribute('aria-disabled', true);
                this.ctaButton.querySelector('span').classList.add('hidden');
              }
              soldOutMessage.classList.remove('hidden');
              this.error = true;
              return;
            } else if (theme.settings.cartDrawer.atcAction === 'page') {
              window.location = window.routes.cart_url;
              return;
            }

            if (response.sections === null && document.querySelector('.section-main-cart')) {
              window.location.reload();
            }

            if (!this.error)
              publish(PUB_SUB_EVENTS.cartUpdate, {
                source: 'product-form',
                productVariantId: formData.get('id'),
                cartData: response,
              });
            this.error = false;
            const quickAddModal = this.closest('quick-add-modal');
            if (quickAddModal) {
              document.body.addEventListener(
                'modalClosed',
                () => {
                  setTimeout(() => {
                    if (this.cartDrawer) this.cartDrawer.renderContents(response);
                    if (this.cartItems) this.cartItems.renderContents(response);
                    if (this.cartNotification) this.cartNotification.renderContents(response);
                  });
                },
                { once: true }
              );
              if (!theme.settings.cartDrawer.muteNotification) {
                quickAddModal.hide(true);
              }
            } else {
              if (this.cartDrawer) this.cartDrawer.renderContents(response);
              if (this.cartItems) this.cartItems.renderContents(response);
              if (this.cartNotification) this.cartNotification.renderContents(response);
            }

            this.ctaButton?.classList.add('added-to-cart');
            this.submitButton.classList.add('added-to-cart');
          })
          .catch((e) => {
            console.error(e);
          })
          .finally(() => {
            this.submitButton.classList.remove('loading');
            if (this.cartDrawer && this.cartDrawer.classList.contains('is-empty')) this.cartDrawer.classList.remove('is-empty');
            if (this.cartNotification && this.cartNotification.classList.contains('is-empty')) this.cartNotification.classList.remove('is-empty');
            if (!this.error) this.submitButton.removeAttribute('aria-disabled');

            setTimeout(() => {
              this.ctaButton?.classList.remove('added-to-cart');
              this.submitButton.classList.remove('added-to-cart');
            }, 1000)

            if (this.ctaButton) {
              this.ctaButton.classList.remove('loading');
              if (!this.error) this.ctaButton.removeAttribute('aria-disabled');
              this.ctaButton.querySelector('.loading__spinner')?.classList.add('hidden', 'spinning-complete');
            }
            this.querySelector('.loading__spinner')?.classList.add('hidden', 'spinning-complete');

            publish('quick-buy-action-complete');
          });
      }

      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
        if (!this.errorMessageWrapper) return;
        this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;

          // Scroll to the error if needed
          const elementRect = this.errorMessage.getBoundingClientRect();
          const isVisible = elementRect.top >= 0 && elementRect.bottom <= window.innerHeight && elementRect.top >= 100;

          // If the element is not visible or if the top of the element is closer than 100px to the top of the viewport
          if (!isVisible) {
            const topPosition = elementRect.top + window.pageYOffset - 150; // Calculate position with 150px padding

            window.scrollTo({
              top: topPosition,
              behavior: 'smooth'
            });
          }
        }
      }

      toggleSubmitButton(disable = true, text) {
        let price;
        if (this.form.dataset.showPrice === 'true') {
          const productInfo = this.form.closest('.product__info-wrapper');
          const priceElem = productInfo?.querySelector('.price__container .price-item--last');
          const priceText = priceElem?.textContent.trim();
          if (priceText && priceText.length > 0) price = priceText;
        }

        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          this.ctaButton?.setAttribute('disabled', 'disabled');

          if (text) {
            this.submitButton.querySelector('span').textContent = `${text}${price ? ' - ' + price : ''}`;
            if(this.ctaButton) this.ctaButton.querySelector('span').textContent = text;
          }

          if (text === window.variantStrings.soldOut) this.closest('.product')?.setAttribute('data-variant-status', 'out-of-stock');
        } else {
          this.submitButton.removeAttribute('disabled');
          this.ctaButton?.removeAttribute('disabled');
          const buttonText = this.submitButton.dataset.isPreorder ? window.variantStrings.preorder : window.variantStrings.addToCart;
          this.submitButton.querySelector('span').textContent = `${buttonText}${price ? ' - ' + price : ''}`;
          if(this.ctaButton) this.ctaButton.querySelector('span').textContent = buttonText;
          this.closest('.product')?.setAttribute('data-variant-status', 'in-stock');
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name=id]');
      }
    }
  );
}
