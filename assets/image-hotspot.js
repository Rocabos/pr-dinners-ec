if (!customElements.get('image-hotspot')) {
  class ImageHotspot extends HTMLElement {
    constructor() {
      super();
      window.initScriptOnDemand(this, this.init.bind(this));

      if (Shopify.designMode) {
        document.addEventListener('shopify:block:select', event => {
          if (this.contains(event.target)) {
            document.querySelector('.hotspot--visible')?.togglePopoverVisibility();
            setTimeout(() => {
              this.togglePopoverVisibility();
            }, 200);
          }
        });
      }
    }

    init() {
      this.hotspotMarker = this.querySelector('.hotspot__marker');
      this.hotspotPopover = this.querySelector('.hotspot__popover');
      this.markerClickHandler = this.handleMarkerClick.bind(this);
      this.documentClickHandler = this.handleDocumentClick.bind(this);
      this.keyUpHandler = this.handleKeyUp.bind(this);

      this.hotspotMarker?.addEventListener('click', this.markerClickHandler);
    }

    disconnectedCallback() {
      this.hotspotMarker?.removeEventListener('click', this.markerClickHandler);
      document.removeEventListener('click', this.documentClickHandler);
      this.removeEventListener('keyup', this.keyUpHandler);
    }

    /**
     * Handle clicks of the marker
     */
    handleMarkerClick() {
      this.togglePopoverVisibility();
    }

    /**
     * Close the popup when the document is clicked
     * @param event
     */
    handleDocumentClick(event) {
      if (this.classList.contains('hotspot--visible') && !this.contains(event.target)) {
        this.togglePopoverVisibility();
      }
    }

    /**
     * Closes the popover when ESC is pressed
     * @param event
     */
    handleKeyUp(event) {
      if (event.code === 'Escape' && this.classList.contains('hotspot--visible')) {
        this.togglePopoverVisibility();
      }
    }

    /**
     * Show/hide the popover
     */
    togglePopoverVisibility() {
      if (!this.classList.contains('hotspot--visible')) {
        // The popover is about to open. Bind the listener to listen for clicks outside the popover to close it
        document.addEventListener('click', this.documentClickHandler);

        this.addEventListener('keyup', this.keyUpHandler);

        this.hotspotPopover.addEventListener(
          'transitionend',
          () => {
            this.hotspotPopover.focus();
            trapFocus(this.hotspotPopover);
          },
          {once: true}
        );
      } else {
        // The popover is about to hide. We don't need to close listener anymore
        document.removeEventListener('click', this.documentClickHandler);

        this.removeEventListener('keyup', this.keyUpHandler);

        removeTrapFocus(this.hotspotPopover);
      }

      this.hotspotPopover.setAttribute('aria-hidden', this.classList.contains('hotspot--visible'));
      this.classList.toggle('hotspot--visible');
    }
  }

  customElements.define('image-hotspot', ImageHotspot);
}
