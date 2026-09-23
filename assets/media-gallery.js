if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();
        window.initScriptOnDemand(this, this.init.bind(this), 100);
      }

      init() {
        this.elements = {
          liveRegion: this.querySelector('[id^="GalleryStatus"]'),
          viewer: this.querySelector('[id^="GalleryViewer"]'),
          thumbnails: this.querySelector('[id^="GalleryThumbnails"]'),
        };
        this.isQuickbuy = !!this.closest('quick-add-modal');
        this.mql = window.matchMedia('(min-width: 750px)');
        this.activeVariantScroll = this.dataset.activeVariantScroll;
        this.modelButton = this.querySelector('.product__xr-button');

        // Bind to the video/3d model play buttons on mobile
        this.querySelectorAll('.product__media-toggle-play').forEach(button => {
          button.addEventListener('click', (evt) => {
            this.setActiveMedia(evt.target.dataset.mediaSectionId);
            // const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${evt.target.dataset.mediaSectionId}"]`);
            // this.playActiveMedia(activeMedia);
          });
        });

        if (this.elements.thumbnails && !this.elements.thumbnails.slider) {
          this.elements.thumbnails.init();
        }

        // Scroll to the active media on load
        if (this.activeVariantScroll === 'true' && !window.themeScrollComplete) {
          const activeMedia = this.elements.viewer.querySelector('.is-active');
          this.setActiveMedia(activeMedia.dataset.mediaId, true);
          window.themeScrollComplete = true;
        }

        if (!this.elements.thumbnails) return;

        this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 50));
        this.elements.viewer.addEventListener('slideChange', window.pauseAllMedia);
        this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
          mediaToSwitch
            .querySelector('button')
            .addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target));
        });
        if (this.dataset.desktopLayout === 'slider' && this.mql.matches) this.removeListSemantic();
      }

      onSlideChanged(event) {
        window.pauseAllMedia();
        if (event.detail.currentElement && !this.settingActiveMedia) {
          const mediaId = event.detail.currentElement.dataset.mediaId;

          // Set active thumbnail
          const thumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
          this.setActiveThumbnail(thumbnail);

          // Set active media
          const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
            this.elements.viewer.querySelector(`[data-media-id="${mediaId.replaceAll('quickadd-', '')}"]`) ||
            this.elements.viewer.querySelector('[data-media-id]');
          this.updateActiveMediaClass(activeMedia);

          // Update the 3d model IDs
          const model = activeMedia.querySelector('product-model');
          if (this.modelButton && model) {
            this.modelButton.dataset.shopifyModel3dId = model.dataset.mediaId;
          }
        }
      }

      updateActiveMediaClass(activeMedia) {
        this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
          element.classList.remove('is-active');
          const playButton = element.querySelector('button.deferred-media__poster');
          if (playButton) playButton.setAttribute('tabindex', '-1');
        });

        activeMedia.classList.add('is-active');
        const playButton = activeMedia.querySelector('button.deferred-media__poster');
        if (playButton) playButton.setAttribute('tabindex', '0');
      }

      setActiveMedia(mediaId, isPageLoad = false) {
        if (!this.elements) this.init();
        if (typeof isPageLoad !== 'boolean') {
          isPageLoad = false;
        }

        this.settingActiveMedia = true;

        const activeMedia = this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
          this.elements.viewer.querySelector(`[data-media-id="${mediaId.replaceAll('quickadd-', '')}"]`) ||
          this.elements.viewer.querySelector('[data-media-id]');

        if (!activeMedia) {
          return;
        }

        this.updateActiveMediaClass(activeMedia);

        this.preventStickyHeader();

        window.setTimeout(() => {
          if (!this.mql.matches || this.dataset.desktopLayout === 'slider') {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }

          const activeMediaRect = activeMedia.getBoundingClientRect();

          // Don't scroll if the image is already in view
          // if (activeMediaRect.top > -0.5) return;
          let top = activeMediaRect.top + window.scrollY;

          if (this.dataset.desktopLayout !== 'slider' && this.mql.matches && (isPageLoad || !isPageLoad && this.dataset.activeVariantScrollOnChange === 'true')) {
            const headerHeightValue = getComputedStyle(document.body).getPropertyValue('--header-height').trim();
            let headerHeightNum = headerHeightValue ? parseFloat(headerHeightValue) : 0;

            if (headerHeightNum > 0) {
              const gridValue = getComputedStyle(document.documentElement).getPropertyValue('--grid-desktop-horizontal-spacing-initial').trim();
              const gridNum = gridValue ? parseFloat(gridValue) : 0;
              headerHeightNum += gridNum;
            }

            top -= headerHeightNum;

            if (top < 150) top = 0;

            if (!MediaGallery.elementInView(activeMedia)) {
              if (this.isQuickbuy) {
                const qbModal = this.closest('.popup-modal__content');
                if (qbModal) activeMedia.scrollIntoView({ behavior: 'smooth', block: 'center' });
              } else {
                setTimeout(() => {
                  window.requestAnimationFrame(() => {
                    window.scrollTo({top: top, behavior: 'smooth'});
                  });
                }, isPageLoad ? 50 : 0);
              }
            }
          }
        });

        if (!this.elements.thumbnails) return;
        const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${mediaId}"]`);
        this.setActiveThumbnail(activeThumbnail);
        this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);

        if (isPageLoad == false) {
          setTimeout(() => {
            this.playActiveMedia(activeMedia);
          }, 600);
        }

        setTimeout(() => {
          this.settingActiveMedia = false;
        }, 1000);
      }

      static elementInView(element) {
        const rect = element.getBoundingClientRect();

        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
      }

      setActiveThumbnail(thumbnail) {
        if (!this.elements.thumbnails || !thumbnail || (this.elements.thumbnails.classList.contains('hidden-xs') && window.matchMedia('(max-width: 749.98px)').matches)) return;

        this.elements.thumbnails
          .querySelectorAll('button')
          .forEach((element) => element.removeAttribute('aria-current'));
        thumbnail.querySelector('button').setAttribute('aria-current', true);
        if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

        this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
      }

      announceLiveRegion(activeItem, position) {
        const image = activeItem.querySelector('.product__modal-opener--image img');
        if (!image) return;
        image.onload = () => {
          this.elements.liveRegion.setAttribute('aria-hidden', false);
          this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
          setTimeout(() => {
            this.elements.liveRegion.setAttribute('aria-hidden', true);
          }, 2000);
        };
        image.src = image.src;
      }

      playActiveMedia(activeItem) {
        window.pauseAllMedia();
        const deferredMedia = activeItem.querySelector('.deferred-media');
        if (deferredMedia) deferredMedia.loadContent(false);
      }

      preventStickyHeader() {
        this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
        if (!this.stickyHeader) return;
        this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
      }

      removeListSemantic() {
        if (!this.elements.viewer.slider) return;
        this.elements.viewer.slider.setAttribute('role', 'presentation');
        this.elements.viewer.sliderItems.forEach((slide) => slide.setAttribute('role', 'presentation'));
      }
    }
  );
}
