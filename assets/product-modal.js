if (!customElements.get('product-modal')) {
  customElements.define(
    'product-modal',
    class ProductModal extends ModalDialog {
      constructor() {
        super();
      }

      hide() {
        super.hide();
      }

      show(opener) {
        super.show(opener);
        setTimeout(this.showActiveMedia.bind(this), 120);
      }

      showActiveMedia() {
        this.querySelectorAll(
          `[data-media-id]:not([data-media-id="${this.openedBy.getAttribute('data-media-id')}"])`
        ).forEach((element) => {
          element.classList.remove('active');
        });

        const activeMedia = this.querySelector(`[data-media-id="${this.openedBy.getAttribute('data-media-id')}"]`);
        const activeMediaTemplate = activeMedia.querySelector('template');
        const activeMediaContent = activeMediaTemplate ? activeMediaTemplate.content : null;
        activeMedia.classList.add('active');

        const scrollContainer = this.querySelector('[role="document"]');

        // Determine the padding based on the window width
        const padding = window.innerWidth >= 750 ? 5 * parseFloat(getComputedStyle(document.documentElement).fontSize) : 20;

        // Get the height of the active media element and the scroll container
        const mediaHeight = activeMedia.offsetHeight;
        const containerHeight = scrollContainer.clientHeight;

        // Calculate the top position of the active media element relative to the scroll container
        const rect = activeMedia.getBoundingClientRect();
        const containerRect = scrollContainer.getBoundingClientRect();
        let offsetTop = scrollContainer.scrollTop + rect.top - containerRect.top - padding;

        // If the element is smaller than the container, adjust the offset to center it
        if (mediaHeight < containerHeight) {
            offsetTop -= (containerHeight - mediaHeight) / 2;
        }

        scrollContainer.scrollTo({
            top: offsetTop,
            behavior: 'smooth'
        });

        if (
          activeMedia.nodeName == 'DEFERRED-MEDIA' &&
          activeMediaContent &&
          activeMediaContent.querySelector('.js-youtube')
        )
          activeMedia.loadContent();
      }
    }
  );
}
