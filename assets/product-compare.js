if (!customElements.get('product-compare')) {
  class ProductCompare extends HTMLElement {
    constructor() {
      super();
      this.init = debounce(this.doInit.bind(this), 300);
    }

    disconnectedCallback() {
      this.detachObservers();
      clearTimeout(this.rowHeightCheckTimeout);
      this.removeEventListener('change', this.productChangeHandler);
    }

    connectedCallback() {
      if (window.sectionInstances.has(this)) {
        return; // Already initialized, ignore
      }

      window.sectionInstances.set(this, true);
      window.initScriptOnDemand(this, this.init.bind(this), 1500);
    }

    doInit() {
      this.fetchAttempts = 0;
      this.rowHeightCheckTimeout = null;

      if (this.dataset.products) {
        this.products = this.dataset.products.split(',').map(Number);
      } else {
        // this.products = JSON.parse(localStorage.getItem('theme-product-compare') || '[]');
      }

      if (this.products && this.products.length > 0) {
        this.excludeProduct = Number(this.dataset.excludeProduct);
        this.productLimit = this.products.length;
        this.searchUrl = this.dataset.searchUrl;

        this.fetchProducts();

        window.addEventListener('resizeend', this.checkRowHeights.bind(this, 0));

        this.productChangeHandler = this.productChangeHandler || this.handleProductSwitcherChange.bind(this);
        this.addEventListener('change', this.productChangeHandler);
      } else {
        this.setAttribute('data-compare-is-loading', 'false');
      }
    }

    handleProductSwitcherChange(evt) {
      if (evt.target.matches('.js-compare-switcher')) {
        const oldProductId = Number(evt.target.dataset.originalProductId);
        const newProductId = Number(evt.target.value);

        if (!isNaN(newProductId)) {
          // Replace oldProductId within this.products with newProductId
          const index = this.products.indexOf(oldProductId);

          if (index !== -1) {
            this.products[index] = newProductId;
          } else {
            console.error(`Product ID ${oldProductId} not found in the array.`);
          }

          this.fetchProducts();
        }
      }
    }

    async fetchProducts() {
      this.setAttribute('data-compare-is-loading', 'true');

      try {
        // Exclude specified product from list if it exists
        if (this.excludeProduct && this.products.includes(this.excludeProduct)) {
          this.products.splice(this.products.indexOf(this.excludeProduct), 1);
        }

        // Prepare the search query
        const searchQuery = this.products
          .map((product) => `id:${product}`)
          .slice(0, this.productLimit)
          .join(' OR ');

        const response = await fetch(`${this.searchUrl}&q=${searchQuery}`);
        if (!response.ok) throw new Error(response.status);

        // Fetch response template and insert sorted product items
        const tmpl = document.createElement('template');
        let responseText = await response.text();
        responseText = responseText.replace(/<template\b[^>]*>|<\/template>/g, '');
        tmpl.innerHTML = responseText;

        const el = tmpl.content.querySelector('product-compare');
        if (el && el.hasChildNodes()) {
          const productIDs = this.products;
          const ul = el.querySelector('ul.compare-grid');

          // Sort list items based on the order of product IDs
          const sortedListItems = [
            ...productIDs
              .map(id => Array.from(ul.querySelectorAll('li[data-product-id]'))
                .find(li => parseInt(li.getAttribute('data-product-id')) === id))
              .filter(Boolean),
            ...Array.from(ul.querySelectorAll('li[data-product-id]'))
              .filter(li => !li.hasAttribute('data-product-id'))
          ];

          // Clear and append sorted list items
          const currentCompareGrid = this.querySelector('ul.compare-grid');
          const scrollLeft = currentCompareGrid?.scrollLeft || 0;

          ul.innerHTML = '';
          sortedListItems.forEach(li => ul.appendChild(li));

          if (this.initialized) {
            ul.querySelectorAll('.scroll-trigger').forEach(elem => elem.classList.remove('scroll-trigger'));
          }

          this.innerHTML = el.innerHTML;
          this.querySelector('ul.compare-grid').scrollLeft = scrollLeft;

          // Call external functions to render and reinitialize
          window.renderSelects();
          window.loadDesktopOnlyTemplates();
          window.stickersReinit?.();

          // Do some rendering updates after content has had a chance to load
          this.scheduleCheckRowHeights(this.initialized ? 600 : 300);

          requestAnimationFrame(() => {
            setTimeout(() => {
              this.setAttribute('data-compare-is-loading', 'false');
            }, this.initialized ? 400 : 100);
          });

          this.attachObservers();

          this.initialized = true;
        }
      } catch (error) {
        this.fetchAttempts += 1;

        if (this.fetchAttempts > 4) {
          console.log('Product compare section error:', error);
        } else {
          this.fetchProducts(); // Retry
        }
      } finally {
        this.checkRowHeights(3000);
      }
    }

    debouncedCheckRowHeights = debounce(() => {
      this.checkRowHeights();
    }, 600);

    scheduleCheckRowHeights(delay = 600) {
      clearTimeout(this.rowHeightCheckTimeout);

      this.rowHeightCheckTimeout = setTimeout(() => {
        requestAnimationFrame(() => {
          this.checkRowHeights();
        });
      }, delay);
    }

    attachObservers() {
      // Attach a 'load' event listener to each image within 'this'
      this.rowCheckHandler = this.rowCheckHandler || this.debouncedCheckRowHeights.bind(this);
      this.querySelectorAll('.product__metafield img').forEach(img => {
        img.addEventListener('load', this.rowCheckHandler);
      });
    }

    detachObservers() {
      this.querySelectorAll('.product__metafield img').forEach(img => {
        img.removeEventListener('load', this.rowCheckHandler);
      });
    }

    // Function to set uniform row heights
    checkRowHeights(delay = 0) {
      // Reset heights before recalculating
      this.querySelectorAll('.compare-cell').forEach(cell => {
        cell.style.height = 'auto';
      });

      if (delay === 0) {
        this.setRowHeights();
      } else {
        requestAnimationFrame(() => {
          setTimeout(this.setRowHeights.bind(this), delay);
        });
      }
    }

    setRowHeights() {
      const columns = Array.from(this.querySelectorAll('.section-grid > li'));
      if (columns && columns[0] && columns[0].children) {
        const rowCount = columns[0].children.length;

        // Loop through each row index
        for (let i = 0; i < rowCount; i++) {
          // Get all cells in the current row across columns
          const rowCells = columns.map(column => column.children[i]);

          // Find the maximum height in the row
          const maxHeight = Math.max(...rowCells.map(cell => cell.offsetHeight));

          // Set each cell in the row to the max height
          rowCells.forEach(cell => {
            cell.style.height = `${maxHeight}px`;
          });
        }
      }
    }
  }

  customElements.define('product-compare', ProductCompare);
}