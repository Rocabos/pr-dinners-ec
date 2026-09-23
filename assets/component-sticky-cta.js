if (!customElements.get('sticky-product-cta')) {
  customElements.define(
    'sticky-product-cta',
    class StickyProductCta extends HTMLElement {
      connectedCallback() {
        const dataElement = this.querySelector(
          '[data-sticky-variant-data]'
        );

        if (!dataElement) return;

        this.productData = JSON.parse(
          dataElement.textContent
        );

        this.priceElement = this.querySelector(
          '[data-sticky-price]'
        );

        this.comparePriceElement = this.querySelector(
          '[data-sticky-compare-price]'
        );

        this.installmentElement = this.querySelector(
          '[data-sticky-installment-price]'
        );

        this.quantityInput = this.querySelector(
          '[data-sticky-quantity]'
        );

        this.submitButton = this.querySelector(
          '[data-sticky-submit]'
        );

        this.buttonText = this.querySelector(
          '[data-sticky-button-text]'
        );

        this.isSyncingQuantity = false;

        this.handleVariantChange =
          this.handleVariantChange.bind(this);

        this.handleMainQuantityChange =
          this.handleMainQuantityChange.bind(this);

        this.handlePlus = () => {
          this.changeQuantity(1);
        };

        this.handleMinus = () => {
          this.changeQuantity(-1);
        };

        this.handleQuantityChange = () => {
          this.syncQuantity();
        };

        this.handleSubmit = () => {
          this.syncQuantity();
        };

        document.addEventListener(
          'variant-change',
          this.handleVariantChange
        );

        document.addEventListener(
          'input',
          this.handleMainQuantityChange,
          true
        );

        document.addEventListener(
          'change',
          this.handleMainQuantityChange,
          true
        );

        this.querySelector(
          '[data-sticky-quantity-plus]'
        )?.addEventListener('click', this.handlePlus);

        this.querySelector(
          '[data-sticky-quantity-minus]'
        )?.addEventListener('click', this.handleMinus);

        this.quantityInput?.addEventListener(
          'input',
          this.handleQuantityChange
        );

        this.quantityInput?.addEventListener(
          'change',
          this.handleQuantityChange
        );

        this.submitButton?.addEventListener(
          'click',
          this.handleSubmit
        );

        const mainQuantityInput =
          this.getMainQuantityInput(false);

        if (mainQuantityInput) {
          this.syncFromMainQuantity(mainQuantityInput);
        } else {
          this.syncQuantity();
        }

        this.setupScrollVisibility();
      }

      disconnectedCallback() {
        this.visibilityObserver?.disconnect();

        document.removeEventListener(
          'variant-change',
          this.handleVariantChange
        );

        document.removeEventListener(
          'input',
          this.handleMainQuantityChange,
          true
        );

        document.removeEventListener(
          'change',
          this.handleMainQuantityChange,
          true
        );

        this.querySelector(
          '[data-sticky-quantity-plus]'
        )?.removeEventListener('click', this.handlePlus);

        this.querySelector(
          '[data-sticky-quantity-minus]'
        )?.removeEventListener('click', this.handleMinus);

        this.quantityInput?.removeEventListener(
          'input',
          this.handleQuantityChange
        );

        this.quantityInput?.removeEventListener(
          'change',
          this.handleQuantityChange
        );

        this.submitButton?.removeEventListener(
          'click',
          this.handleSubmit
        );
      }

      getProductForm() {
        const productFormId =
          this.dataset.productFormId;

        if (!productFormId) return null;

        return document.getElementById(productFormId);
      }

      getMainQuantityInput(createIfMissing = false) {
        const productForm = this.getProductForm();

        if (!productForm) return null;

        const quantityInputs = Array.from(
          document.querySelectorAll(
            'input[name="quantity"]'
          )
        ).filter((input) => {
          if (input === this.quantityInput) return false;

          return (
            input.form === productForm ||
            input.getAttribute('form') === productForm.id
          );
        });

        const visibleQuantityInput =
          quantityInputs.find(
            (input) => input.type !== 'hidden'
          );

        if (visibleQuantityInput) {
          return visibleQuantityInput;
        }

        const sectionRoot =
          this.closest('[id^="shopify-section-"]') ||
          document;

        const sectionQuantityInputs = Array.from(
          sectionRoot.querySelectorAll(
            'quantity-input input[name="quantity"]:not([data-sticky-quantity]), input[name="quantity"]:not([data-sticky-quantity])'
          )
        );

        const sectionQuantityInput =
          sectionQuantityInputs.find((input) => {
            return (
              input.type !== 'hidden' &&
              (!input.form || input.form === productForm)
            );
          });

        if (sectionQuantityInput) {
          return sectionQuantityInput;
        }

        const hiddenQuantityInput =
          quantityInputs.find(
            (input) => input.type === 'hidden'
          );

        if (hiddenQuantityInput) {
          return hiddenQuantityInput;
        }

        if (!createIfMissing) return null;

        const createdQuantityInput =
          document.createElement('input');

        createdQuantityInput.type = 'hidden';
        createdQuantityInput.name = 'quantity';
        createdQuantityInput.dataset.stickyCreatedQuantity =
          'true';

        productForm.appendChild(createdQuantityInput);

        return createdQuantityInput;
      }

      setupScrollVisibility() {
        const productForm = this.getProductForm();

        this.hidden = false;
        this.classList.remove('is-visible');
        this.setAttribute('aria-hidden', 'true');

        if (!productForm) return;

        this.visibilityObserver?.disconnect();

        this.visibilityObserver =
          new IntersectionObserver(
            ([entry]) => {
              const shouldShow =
                entry.boundingClientRect.bottom <= 0;

              this.classList.toggle(
                'is-visible',
                shouldShow
              );

              this.setAttribute(
                'aria-hidden',
                String(!shouldShow)
              );
            },
            {
              root: null,
              threshold: 0
            }
          );

        this.visibilityObserver.observe(productForm);
      }

      handleMainQuantityChange(event) {
        if (this.isSyncingQuantity) return;

        const changedInput = event.target;

        if (
          !(changedInput instanceof HTMLInputElement)
        ) {
          return;
        }

        if (changedInput === this.quantityInput) {
          return;
        }

        if (changedInput.name !== 'quantity') {
          return;
        }

        const mainQuantityInput =
          this.getMainQuantityInput(false);

        if (changedInput !== mainQuantityInput) {
          return;
        }

        this.syncFromMainQuantity(
          mainQuantityInput
        );
      }

      syncFromMainQuantity(mainQuantityInput) {
        if (
          this.isSyncingQuantity ||
          !this.quantityInput ||
          !mainQuantityInput ||
          mainQuantityInput.value === ''
        ) {
          return;
        }

        this.isSyncingQuantity = true;

        ['min', 'max', 'step'].forEach(
          (attribute) => {
            if (
              mainQuantityInput.hasAttribute(attribute)
            ) {
              this.quantityInput.setAttribute(
                attribute,
                mainQuantityInput.getAttribute(attribute)
              );
            } else {
              this.quantityInput.removeAttribute(
                attribute
              );
            }
          }
        );

        this.quantityInput.value =
          mainQuantityInput.value;

        this.isSyncingQuantity = false;
      }

      handleVariantChange(event) {
        const { sectionId, variant } =
          event.detail || {};

        if (
          String(sectionId) !==
          String(this.dataset.sectionId)
        ) {
          return;
        }

        const variantData =
          this.productData.variants.find(
            (item) =>
              String(item.id) ===
              String(variant?.id)
          );

        if (!variantData) {
          if (this.submitButton) {
            this.submitButton.disabled = true;
          }

          if (this.buttonText) {
            this.buttonText.textContent =
              this.productData.texts.unavailable;
          }

          return;
        }

        this.renderVariant(variantData);
      }

      renderVariant(variant) {
        if (this.priceElement) {
          this.priceElement.innerHTML =
            variant.price;
        }

        if (this.installmentElement) {
          this.installmentElement.innerHTML =
            variant.installmentPrice;
        }

        const isOnSale =
          variant.compareAtPriceValue >
          variant.priceValue;

        if (this.comparePriceElement) {
          this.comparePriceElement.hidden =
            !isOnSale;

          if (isOnSale) {
            this.comparePriceElement.innerHTML =
              variant.compareAtPrice;
          }
        }

        if (this.submitButton) {
          this.submitButton.disabled =
            !variant.available;
        }

        if (this.buttonText) {
          this.buttonText.textContent =
            !variant.available
              ? this.productData.texts.soldOut
              : this.productData.isPreorder
                ? this.productData.texts.preorder
                : this.productData.texts.addToCart;
        }

        if (!this.quantityInput) return;

        this.quantityInput.min =
          variant.minimum;

        this.quantityInput.step =
          variant.increment;

        if (variant.maximum !== null) {
          this.quantityInput.max =
            variant.maximum;
        } else {
          this.quantityInput.removeAttribute(
            'max'
          );
        }

        this.quantityInput.value =
          variant.minimum;

        this.syncQuantity();
      }

      changeQuantity(direction) {
        if (!this.quantityInput) return;

        const minimum =
          Number(this.quantityInput.min) || 1;

        const maximum = this.quantityInput.max
          ? Number(this.quantityInput.max)
          : Infinity;

        const increment =
          Number(this.quantityInput.step) || 1;

        const current =
          Number(this.quantityInput.value) ||
          minimum;

        const next = Math.min(
          maximum,
          Math.max(
            minimum,
            current + increment * direction
          )
        );

        this.quantityInput.value = next;

        this.syncQuantity();
      }

      syncQuantity() {
        if (
          this.isSyncingQuantity ||
          !this.quantityInput ||
          this.quantityInput.value === ''
        ) {
          return;
        }

        const mainQuantityInput =
          this.getMainQuantityInput(true);

        if (!mainQuantityInput) return;

        const minimum =
          Number(this.quantityInput.min) || 1;

        const maximum = this.quantityInput.max
          ? Number(this.quantityInput.max)
          : Infinity;

        const current =
          Number(this.quantityInput.value) ||
          minimum;

        const quantity = Math.min(
          maximum,
          Math.max(minimum, current)
        );

        this.isSyncingQuantity = true;

        this.quantityInput.value = quantity;
        mainQuantityInput.value = quantity;

        mainQuantityInput.dispatchEvent(
          new Event('input', {
            bubbles: true
          })
        );

        mainQuantityInput.dispatchEvent(
          new Event('change', {
            bubbles: true
          })
        );

        this.isSyncingQuantity = false;
      }
    }
  );
}