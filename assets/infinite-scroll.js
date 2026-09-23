/**
 * Implements infinite scrolling functionality for a web component.
 *  This component loads additional content automatically as the user scrolls to the bottom of the page.
 *  It requires an element with class `.js-pagination__next-button` for fetching the next set of items.
 *
 * Usage:
 *  {%- paginate blog.articles by section.settings.items_per_page -%}
 *    <infinite-scroll data-infinite-scroll-enabled="{% if settings.pagination_style == 'infinite' %}true{% else %}false{% endif %}">
 *      <div class="js-pagination__item">One</div>
 *      <div class="js-pagination__item">Two</div>
 *      <div class="js-pagination__item">Three</div>
 *
 *      {%- if paginate.pages > 1 -%}
 *        {% render 'pagination', paginate: paginate %}
 *      {%- endif -%}
 *    </infinite-scroll>
 *  {%- endpaginate -%}
 */
if (!customElements.get('infinite-scroll')) {
  class InfiniteScroll extends HTMLElement {
    constructor() {
      super();
      this.init();
    }

    // Cleans up resources when the element is removed from the DOM
    disconnectedCallback() {
      this.destroy();
    }

    init() {
      // Elements involved in pagination
      this.paginationContainer = this.querySelector('.js-pagination');
      this.paginationItems = this.querySelectorAll('.js-pagination__item');
      this.nextButton = this.querySelector('.js-pagination__next-button');

      // Guard clause to ensure necessary elements exist
      if (!this.paginationContainer || !this.paginationItems.length || !this.nextButton.hasAttribute('href')) {
        return;
      }

      this.bindListeners();
    }

    // Removes event listeners and stops any ongoing intervals or observers
    destroy() {
      clearInterval(this.nextButtonTimer);
      this.nextButton?.removeEventListener('click', this.clickHandler);
      this.intersectionObserver?.disconnect();
    }

    // Handles the "Next" button click to fetch the next set of items
    onNextButtonClick(event) {
      event.preventDefault();
      this.fetchNextItems();
    }

    // Sets up the infinite scroll functionality
    bindListeners() {
      // Setup click handler for the "Next" button
      this.clickHandler = this.onNextButtonClick.bind(this);
      this.nextButton.addEventListener('click', this.clickHandler);

      // Initialize IntersectionObserver if infinite scrolling is enabled
      if (this.dataset.infiniteScrollEnabled === 'true') {
        this.intersectionObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              // Load more results when the "Next" button is in view
              this.fetchNextItems();
              this.nextButtonTimer = setInterval(this.fetchNextItems.bind(this), 1500);
            } else {
              clearInterval(this.nextButtonTimer);
            }
          });
        }, {rootMargin: `${window.innerHeight}px 0px`});

        this.intersectionObserver.observe(this.paginationContainer);
      }
    }

    // Fetches the next set of items and updates the DOM
    async fetchNextItems() {
      if (this.fetchInProgress) return;

      let originalButtonText = this.nextButton.textContent;
      this.fetchInProgress = true;
      this.nextButton.setAttribute('aria-disabled', 'true');
      this.nextButton.textContent = window.strings.general.pagination.loadingText;

      try {
        const response = await fetch(this.nextButton.href);
        if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`);

        const template = document.createElement('template');
        template.innerHTML = await response.text();

        // Append new items
        const newItemsHTML = Array.from(template.content.querySelectorAll('.js-pagination__item'))
          .map(item => item.outerHTML)
          .join('');
        this.paginationItems[this.paginationItems.length - 1].insertAdjacentHTML('afterend', newItemsHTML);
        const lastIndex = this.paginationItems.length
        this.paginationItems = this.querySelectorAll('.js-pagination__item');

        setTimeout(() => {
          if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger();
          window.renderSelects();
          window.loadDesktopOnlyTemplates();
          window.stickersReinit?.();

          if (document.body.classList.contains('tab-active') && window.theme?.settings.paginationLoadType === 'show_more') {
            this.paginationItems[lastIndex]?.querySelector('a')?.focus();
          }
        }, 300);

        // Update pagination controls
        this.updatePaginationControls(template);
      } catch (error) {
        console.error('Failed to load new items:', error);
      } finally {
        this.fetchInProgress = false;
        this.nextButton.removeAttribute('aria-disabled');
        this.nextButton.textContent = originalButtonText;
      }
    }

    // Updates pagination controls based on the fetched content
    updatePaginationControls(template) {
      const nextPagination = template.content.querySelector('.js-pagination');
      if (nextPagination && nextPagination.querySelector('.js-pagination__next-button[href]')) {
        this.paginationContainer.innerHTML = nextPagination.innerHTML;
        this.refreshNextButton();
      } else {
        this.cleanupAfterLastPage();
      }
    }

    // Refreshes the "Next" button event listener after content update
    refreshNextButton() {
      this.nextButton.removeEventListener('click', this.clickHandler);
      this.nextButton = this.querySelector('.js-pagination__next-button');
      this.nextButton.addEventListener('click', this.clickHandler);
    }

    // Removes pagination and related elements when no more pages are available
    cleanupAfterLastPage() {
      if (this.intersectionObserver) this.intersectionObserver.disconnect();
      clearInterval(this.nextButtonTimer);
      this.paginationContainer.remove();
      document.querySelectorAll('.js-when-paginated-only').forEach(elem => elem.remove());
    }
  }

  customElements.define('infinite-scroll', InfiniteScroll);
}