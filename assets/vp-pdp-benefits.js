if (!customElements.get('vp-pdp-benefits')) {
  customElements.define(
    'vp-pdp-benefits',
    class VpPdpBenefits extends HTMLElement {
      connectedCallback() {
        if (this.isInitialized) return;

        const dataElement = this.querySelector('[data-vp-installment-variants]');
        if (!dataElement) return;

        try {
          this.productData = JSON.parse(dataElement.textContent);
        } catch (error) {
          return;
        }

        this.isInitialized = true;
        this.numberElements = this.querySelectorAll('[data-vp-installments-number]');
        this.variantIds = new Set(this.productData.variants.map((variant) => String(variant.id)));
        this.sectionRoot = this.closest('[id^="shopify-section-"]') || document;
        this.hideWhenUnavailable = this.dataset.hideWhenUnavailable === 'true';

        this.handleChange = this.handleChange.bind(this);
        this.handleVariantEvent = this.handleVariantEvent.bind(this);

        this.sectionRoot.addEventListener('change', this.handleChange, true);
        document.addEventListener('variant:change', this.handleVariantEvent);
        document.addEventListener('variant-change', this.handleVariantEvent);
        document.addEventListener('product:variant-change', this.handleVariantEvent);

        this.scheduleUpdate();

        this.variantWatcher = window.setInterval(() => {
          this.updateFromProductForm();
        }, 300);

        document.addEventListener('shopify:section:unload', this.onSectionUnload);
      }

      disconnectedCallback() {
        this.teardown();
      }

      onSectionUnload = (event) => {
        if (event.target?.contains?.(this)) {
          this.teardown();
        }
      };

      teardown() {
        this.isInitialized = false;
        this.sectionRoot?.removeEventListener('change', this.handleChange, true);
        document.removeEventListener('variant:change', this.handleVariantEvent);
        document.removeEventListener('variant-change', this.handleVariantEvent);
        document.removeEventListener('product:variant-change', this.handleVariantEvent);
        document.removeEventListener('shopify:section:unload', this.onSectionUnload);
        window.clearInterval(this.variantWatcher);
        window.clearTimeout(this.updateTimer);
        window.clearTimeout(this.delayedUpdateTimer);
      }

      handleChange() {
        this.scheduleUpdate();
      }

      handleVariantEvent(event) {
        const variant = event.detail?.variant || event.detail?.data?.variant;

        if (variant?.id && this.variantIds.has(String(variant.id))) {
          this.update(variant.id);
          return;
        }

        this.scheduleUpdate();
      }

      scheduleUpdate() {
        window.clearTimeout(this.updateTimer);
        window.clearTimeout(this.delayedUpdateTimer);

        this.updateTimer = window.setTimeout(() => {
          this.updateFromProductForm();
        }, 0);

        this.delayedUpdateTimer = window.setTimeout(() => {
          this.updateFromProductForm();
        }, 150);
      }

      updateFromProductForm() {
        const variantId = this.getSelectedVariantId();
        if (variantId) this.update(variantId);
      }

      getSelectedVariantId() {
        const forms = Array.from(this.sectionRoot.querySelectorAll('form[action*="/cart/add"]'));
        const preferredForm = forms.find((form) => form?.id?.includes?.(this.dataset.sectionId));
        const orderedForms = preferredForm
          ? [preferredForm, ...forms.filter((form) => form !== preferredForm)]
          : forms;

        for (const form of orderedForms) {
          const variantField = form.querySelector('[name="id"]');
          if (variantField?.value && this.variantIds.has(String(variantField.value))) {
            return variantField.value;
          }
        }

        const urlVariantId = new URL(window.location.href).searchParams.get('variant');
        if (urlVariantId && this.variantIds.has(String(urlVariantId))) {
          return urlVariantId;
        }

        return null;
      }

      update(variantId) {
        const normalizedVariantId = String(variantId);
        if (normalizedVariantId === this.currentVariantId) return;

        const selectedVariant = this.productData.variants.find(
          (variant) => String(variant.id) === normalizedVariantId
        );
        if (!selectedVariant) return;

        this.currentVariantId = normalizedVariantId;

        const hasInstallments =
          selectedVariant.hasInstallments && Number(selectedVariant.installmentsNumber) > 0;

        if (this.hideWhenUnavailable) {
          this.hidden = !hasInstallments;
        }

        if (!hasInstallments) return;

        this.numberElements.forEach((element) => {
          element.textContent = selectedVariant.installmentsNumber;
        });
      }
    }
  );
}

document.addEventListener('shopify:section:load', () => {
  document.querySelectorAll('vp-pdp-benefits').forEach((element) => {
    if (typeof element.connectedCallback === 'function') {
      element.connectedCallback();
    }
  });
});
