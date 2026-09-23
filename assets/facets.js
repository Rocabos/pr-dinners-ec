if (!customElements.get('facet-filters-form')) {
  class FacetFiltersForm extends HTMLElement {
    constructor() {
      super();
      this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

      this.debouncedOnSubmit = debounce((event) => {
        this.onSubmitHandler(event);
      }, 800);

      const facetForm = this.querySelector('form');
      facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

      // Bind change for sort by dropdown
      facetForm.addEventListener('change', (event) => {
        if (event.target.tagName === 'SELECT' && event.target.classList.contains('facet-filters__sort')) {
          this.debouncedOnSubmit(event);
        }
      });

      const facetWrapper = this.querySelector('#FacetsWrapperDesktop');
      if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
    }

    static setListeners() {
      const onHistoryChange = (event) => {
        const searchParams = event.state ? event.state.searchParams : FacetFiltersForm.searchParamsInitial;
        if (searchParams === FacetFiltersForm.searchParamsPrev) return;
        FacetFiltersForm.renderPage(searchParams, null, false);
      };
      window.addEventListener('popstate', onHistoryChange);
    }

    static savedScrollY = 0;
    static restoredFromBFCache = false;
    static initBFCacheScrollHandling() {
      // Capture scroll position before leaving
      window.addEventListener('pagehide', () => {
        FacetFiltersForm.savedScrollY = window.scrollY;
      });

      // Restore scroll after bfcache restore
      window.addEventListener('pageshow', (event) => {
        if (!event.persisted) return;

        FacetFiltersForm.restoredFromBFCache = true;

        // Disable smooth scrolling (important on iOS)
        const root = document.documentElement;
        const previousScrollBehavior = root.style.scrollBehavior;
        root.style.scrollBehavior = 'auto';

        // Wait for layout + async DOM mutations
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            window.scrollTo(0, FacetFiltersForm.savedScrollY);
            root.style.scrollBehavior = previousScrollBehavior;
          });
        });
      });
    }

    static toggleActiveFacets(disable = true) {
      document.querySelectorAll('.js-facet-remove').forEach((element) => {
        element.classList.toggle('disabled', disable);
      });
    }

    static renderPage(searchParams, event, updateURLHash = true) {
      FacetFiltersForm.searchParamsPrev = searchParams;
      const sections = FacetFiltersForm.getSections();
      const loadingSpinners = document.querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner');
      loadingSpinners.forEach((spinner) => spinner.classList.remove('hidden', 'spinning-complete'));
      document.getElementById('ProductGridContainer').querySelector('.collection').classList.add('loading');
      document.querySelectorAll('.js-product-count').forEach((countElem) => countElem.classList.add('loading'));

      sections.forEach((section) => {
        const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
        const filterDataUrl = (element) => element.url === url;

        FacetFiltersForm.filterData.some(filterDataUrl)
          ? FacetFiltersForm.renderSectionFromCache(filterDataUrl, event)
          : FacetFiltersForm.renderSectionFromFetch(url, event);
      });

      if (updateURLHash) FacetFiltersForm.updateURLHash(searchParams);
    }

    static scrollToResults() {
      // Scroll to the results
      const results = document.getElementById('product-grid').closest('.section__inner');
      if (results.getBoundingClientRect().top < 0) {
        const headerHeightValue = getComputedStyle(document.body).getPropertyValue('--header-height').trim();
        let headerHeightNum = headerHeightValue ? parseFloat(headerHeightValue) : 0;
        window.scrollTo({
          top: results.getBoundingClientRect().top + window.scrollY - headerHeightNum,
          behavior: 'smooth'
        });
      }
    }

    static renderSectionFromFetch(url, event) {
      fetch(url)
        .then((response) => response.text())
        .then((responseText) => {
          const html = responseText;
          FacetFiltersForm.filterData = [...FacetFiltersForm.filterData, {html, url}];
          FacetFiltersForm.renderFilters(html, event);
          FacetFiltersForm.renderProductGridContainer(html);
          FacetFiltersForm.renderProductCount(html);
          if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
          window.renderSelects();
          window.loadDesktopOnlyTemplates();
          document.querySelectorAll('facet-filters-form custom-accordion').forEach(accordion => accordion.reinit());

          // Reinit infinite scroll
          const infiniteScroll = document.querySelector('infinite-scroll');
          if (infiniteScroll && typeof infiniteScroll.destroy === 'function') {
            infiniteScroll.destroy();
            infiniteScroll.init();
          }
        });

      FacetFiltersForm.scrollToResults();
    }

    static renderSectionFromCache(filterDataUrl, event) {
      const html = FacetFiltersForm.filterData.find(filterDataUrl).html;
      FacetFiltersForm.renderFilters(html, event);
      FacetFiltersForm.renderProductGridContainer(html);
      FacetFiltersForm.renderProductCount(html);
      if (typeof initializeScrollAnimationTrigger === 'function') initializeScrollAnimationTrigger(html.innerHTML);
      window.renderSelects();
      window.loadDesktopOnlyTemplates();
      document.querySelectorAll('facet-filters-form custom-accordion').forEach(accordion => accordion.reinit());
      FacetFiltersForm.scrollToResults();
    }

    static renderProductGridContainer(html) {
      document.getElementById('ProductGridContainer').innerHTML = new DOMParser()
        .parseFromString(html, 'text/html')
        .getElementById('ProductGridContainer').innerHTML;

      document
        .getElementById('ProductGridContainer')
        .querySelectorAll('.scroll-trigger')
        .forEach((element) => {
          element.classList.add('scroll-trigger--cancel');
        });
    }

    static renderProductCount(html) {
      const count = new DOMParser().parseFromString(html, 'text/html').querySelector('.js-product-count')?.innerHTML;
      if (count) {
        document.querySelectorAll('.js-product-count').forEach((countElem) => {
          countElem.innerHTML = count;
          countElem.classList.remove('loading');
        });
      }

      const loadingSpinners = document.querySelectorAll('.facets-container .loading__spinner, facet-filters-form .loading__spinner');
      loadingSpinners.forEach((spinner) => spinner.classList.add('hidden', 'spinning-complete'));
    }

    static renderFilters(html, event) {
      const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

      const facetDetailsElementsFromFetch = parsedHTML.querySelectorAll('#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter');
      const facetDetailsElementsFromDom = document.querySelectorAll('#FacetFiltersForm .js-filter, #FacetFiltersFormMobile .js-filter');

      // Remove facets that are no longer returned from the server
      Array.from(facetDetailsElementsFromDom).forEach((currentElement) => {
        if (!Array.from(facetDetailsElementsFromFetch).some(({id}) => currentElement.id === id)) {
          currentElement.remove();
        }
      });

      const matchesId = (element) => {
        const jsFilter = event ? event.target.closest('.js-filter') : undefined;
        return jsFilter ? element.id === jsFilter.id : false;
      };
      const facetsToRender = Array.from(facetDetailsElementsFromFetch).filter((element) => !matchesId(element));
      const countsToRender = Array.from(facetDetailsElementsFromFetch).find(matchesId);

      facetsToRender.forEach((elementToRender, index) => {
        const currentElement = document.getElementById(elementToRender.id);
        // Element already rendered in the DOM so just update the innerHTML
        if (currentElement) {
          const accordionContents = document.getElementById(elementToRender.id).querySelector('.custom-accordion__panel');
          if (accordionContents) {
            // Replace just the accordion content where possible
            accordionContents.innerHTML = elementToRender.querySelector('.custom-accordion__panel').innerHTML;
          } else {
            document.getElementById(elementToRender.id).innerHTML = elementToRender.innerHTML;
          }
        } else {
          if (index > 0) {
            const {className: previousElementClassName, id: previousElementId} = facetsToRender[index - 1];
            // Same facet type (eg horizontal/vertical or drawer/mobile)
            if (elementToRender.className === previousElementClassName) {
              document.getElementById(previousElementId).after(elementToRender);
              return;
            }
          }

          if (elementToRender.parentElement) {
            document.querySelector(`#${elementToRender.parentElement.id} .js-filter`).before(elementToRender);
          }
        }
      });

      FacetFiltersForm.renderActiveFacets(parsedHTML);
      FacetFiltersForm.renderAdditionalElements(parsedHTML);

      if (countsToRender) {
        const closestJSFilterID = event.target.closest('.js-filter').id;

        if (closestJSFilterID) {
          FacetFiltersForm.renderCounts(countsToRender, event.target.closest('.js-filter'));
        }
      }
    }

    static renderActiveFacets(html) {
      const newFacets = html.querySelector('.active-facets');
      if (newFacets) {
        document.querySelectorAll('.active-facets').forEach(pageFacets => {
          pageFacets.innerHTML = newFacets.innerHTML;
        });
      }
      FacetFiltersForm.toggleActiveFacets(false);
    }

    static renderAdditionalElements(html) {
      const mobileElementSelectors = ['.mobile-facets__open', '.js-apply-button', '.sorting'];

      mobileElementSelectors.forEach((selector) => {
        if (!html.querySelector(selector)) return;
        document.querySelector(selector).innerHTML = html.querySelector(selector).innerHTML;
      });

      document.getElementById('FacetFiltersFormMobile').closest('menu-drawer').bindEvents();
    }

    static renderCounts(source, target) {
      const targetSummary = target.querySelector('.facets__summary');
      const sourceSummary = source.querySelector('.facets__summary');

      if (sourceSummary && targetSummary) {
        targetSummary.outerHTML = sourceSummary.outerHTML;
      }

      const targetHeaderElement = target.querySelector('.facets__header');
      const sourceHeaderElement = source.querySelector('.facets__header');

      if (sourceHeaderElement && targetHeaderElement) {
        targetHeaderElement.outerHTML = sourceHeaderElement.outerHTML;
      }

      const targetWrapElement = target.querySelector('.facets-wrap');
      const sourceWrapElement = source.querySelector('.facets-wrap');

      if (sourceWrapElement && targetWrapElement) {
        const isShowingMore = Boolean(target.querySelector('show-more-button .label-show-more.hidden'));
        if (isShowingMore) {
          sourceWrapElement
            .querySelectorAll('.facets__item.hidden')
            .forEach((hiddenItem) => hiddenItem.classList.replace('hidden', 'show-more-item'));
        }

        targetWrapElement.outerHTML = sourceWrapElement.outerHTML;
      }
    }

    static updateURLHash(searchParams) {
      history.pushState({searchParams}, '', `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`);
    }

    static getSections() {
      return [
        {
          section: document.getElementById('product-grid').dataset.id,
        },
      ];
    }

    createSearchParams(form, isMobile) {
      const formData = new FormData(form);

      // Delete the mobile on sort_by param if desktop
      if (form.id === 'FacetFiltersForm' && isMobile === false && formData.has('sort_by') && form.classList.contains('facets__form--vertical')) {
        formData.delete('sort_by');
      }

      return new URLSearchParams(formData).toString();
    }

    onSubmitForm(searchParams, event) {
      FacetFiltersForm.renderPage(searchParams, event);
    }

    onSubmitHandler(event) {
      // const noJsElements = document.querySelectorAll('.no-js-list');
      // noJsElements.forEach((el) => el.remove());

      event.preventDefault();
      const sortFilterForms = document.querySelectorAll('facet-filters-form form');
      const thisForm = event.target.closest('form');

      if (thisForm) {
        if (thisForm.classList.contains('mobile-facets')) {
          const searchParams = this.createSearchParams(thisForm);
          this.onSubmitForm(searchParams, event);
        } else {
          const forms = [];
          const isMobile = event.target.closest('form').id === 'FacetFiltersFormMobile';

          sortFilterForms.forEach((form) => {
            if (!isMobile) {
              if (form.id === 'FacetSortForm' || form.id === 'FacetFiltersForm' || form.id === 'FacetSortDrawerForm' ||
                (form.id === 'FacetFiltersFormMobile' && document.querySelector('.facets-container-drawer'))) {
                forms.push(this.createSearchParams(form, isMobile));
              }
            } else if (form.id === 'FacetFiltersFormMobile') {
              forms.push(this.createSearchParams(form));
            }
          });
          this.onSubmitForm(forms.join('&'), event);
        }
      }
    }

    onActiveFilterClick(event) {
      event.preventDefault();
      FacetFiltersForm.toggleActiveFacets();
      const url =
        event.currentTarget.href.indexOf('?') == -1
          ? ''
          : event.currentTarget.href.slice(event.currentTarget.href.indexOf('?') + 1);
      FacetFiltersForm.renderPage(url);
    }
  }

  FacetFiltersForm.filterData = [];
  FacetFiltersForm.searchParamsInitial = window.location.search.slice(1);
  FacetFiltersForm.searchParamsPrev = window.location.search.slice(1);
  customElements.define('facet-filters-form', FacetFiltersForm);
  FacetFiltersForm.initBFCacheScrollHandling();
  FacetFiltersForm.setListeners();
}

if (!customElements.get('price-range')) {
  class PriceRange extends HTMLElement {
    constructor() {
      super();
      this.timer = null;
      this.setMinAndMaxValues();
      this.updateBarFill();
      this.addEventListener('input', this.onInputUpdate.bind(this));
    }

    onInputUpdate(event) {
      if (event.detail !== undefined) {
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
          this.setInputValue(event);
          this.updateBarFill();
        }, 600);
      } else {
        this.setInputValue(event);
        this.updateBarFill();
      }
    }

    setInputValue(event) {
      let rangeValue = parseInt(event.target.value, 10);

      if (event.target === this.minPriceRangeElem) {
        rangeValue = Math.min(rangeValue, parseInt(this.maxPriceRangeElem.value, 10) - 1);
        rangeValue = Math.max(this.minValue, Math.round(rangeValue));
      } else if (event.target === this.maxPriceRangeElem) {
        rangeValue = Math.max(rangeValue, parseInt(this.minPriceRangeElem.value, 10) + 1);
        rangeValue = Math.min(this.maxValue, Math.round(rangeValue));
      }

      if (event.target === this.minPriceRangeElem && this.priceMinElem.value !== rangeValue) {
        this.priceMinElem.value = event.target.value === this.priceMinElem.placeholder ? '' : rangeValue;
      } else if (event.target === this.maxPriceRangeElem && this.priceMaxElem.value !== rangeValue) {
        this.priceMaxElem.value = event.target.value === this.priceMaxElem.placeholder ? '' : rangeValue;
      }

      event.target.value = rangeValue;

      // If the number input has been typed
      if (event.target === this.priceMinElem) this.minPriceRangeElem.value = event.target.value;
      if (event.target === this.priceMaxElem) this.maxPriceRangeElem.value = event.target.value;
    }

    updateBarFill() {
      const lowerValue = parseInt(this.priceMinElem.value || 0, 10);
      const upperValue = parseInt(this.priceMaxElem.value || this.maxValue, 10);
      const percentageLower = (lowerValue / this.maxValue) * 100;
      const percentageUpper = (upperValue / this.maxValue) * 100;
      this.querySelector('.price-range').style.setProperty('--range-gap-start', `${percentageLower}%`);
      this.querySelector('.price-range').style.setProperty('--range-gap-end', `${100 - percentageUpper}%`);

      if (percentageLower === 0 && (100 - percentageUpper) === 0) {
        this.classList.add('facets__price--unset');
        this.parentElement.querySelector('facet-remove a')?.setAttribute('tabindex', '-1');
      } else {
        this.classList.remove('facets__price--unset');
        this.parentElement.querySelector('facet-remove a')?.setAttribute('tabindex', '0');
      }
    }

    setMinAndMaxValues() {
      this.priceMinElem = this.querySelector('.js-price-min');
      this.priceMaxElem = this.querySelector('.js-price-max');
      this.minPriceRangeElem = this.querySelector('.js-price-range-min');
      this.maxPriceRangeElem = this.querySelector('.js-price-range-max');

      this.minValue = parseInt(this.priceMinElem.min, 10);
      this.maxValue = parseInt(this.priceMaxElem.max, 10);

      if (this.priceMaxElem.value) this.priceMinElem.setAttribute('max', this.priceMaxElem.value);
      if (this.priceMinElem.value) this.priceMaxElem.setAttribute('min', this.priceMinElem.value);
      if (this.priceMinElem.value === '') this.priceMaxElem.setAttribute('min', this.minValue);
      if (this.priceMaxElem.value === '') this.priceMinElem.setAttribute('max', this.maxValue);
    }
  }

  customElements.define('price-range', PriceRange);
}

if (!customElements.get('facet-remove')) {
  class FacetRemove extends HTMLElement {
    constructor() {
      super();
      const facetLink = this.querySelector('a');
      facetLink.setAttribute('role', 'button');
      facetLink.addEventListener('click', this.closeFilter.bind(this));
      facetLink.addEventListener('keyup', (event) => {
        event.preventDefault();
        if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
      });
    }

    closeFilter(event) {
      event.preventDefault();
      const form = this.closest('facet-filters-form') || document.querySelector('facet-filters-form');
      form.onActiveFilterClick(event);
    }
  }

  customElements.define('facet-remove', FacetRemove);
}
