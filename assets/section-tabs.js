if (!customElements.get('section-tabs')) {
  customElements.define('section-tabs', class SectionTabs extends HTMLElement {
      constructor() {
        super();
        this.crazySelector = ".section-section-tabs:has([data-num-sections]) + .shopify-section,\n" +
          ".section-section-tabs:has([data-num-sections='2']) + .shopify-section + .shopify-section,\n" +
          ".section-section-tabs:has([data-num-sections='3']) + .shopify-section + .shopify-section,\n" +
          ".section-section-tabs:has([data-num-sections='4']) + .shopify-section + .shopify-section,\n" +
          ".section-section-tabs:has([data-num-sections='3']) + .shopify-section + .shopify-section + .shopify-section,\n" +
          ".section-section-tabs:has([data-num-sections='4']) + .shopify-section + .shopify-section + .shopify-section,\n" +
          ".section-section-tabs:has([data-num-sections='4']) + .shopify-section + .shopify-section + .shopify-section + .shopify-section";

        window.initScriptOnDemand(this, this.init.bind(this));
      }

      init() {
        if (Shopify.designMode) {
          this.checkboxes = this.querySelectorAll('.field__checkbox');
          this.section = this.closest('.shopify-section');

          if (this.checkboxes) {
            document.addEventListener('shopify:section:select', this.updateTabSelection.bind(this));
            document.addEventListener('shopify:section:reorder', this.updateTabSelection.bind(this));
          }
        } else {
          setTimeout(() => {
            document.querySelectorAll(this.crazySelector).forEach((section, index) => {
              const ariaElem = this.querySelector(`div[role='tab']:has(input[value="${index + 1}"])`);
              const checkbox = this.querySelector(`input[value="${index + 1}"]`);
              if (checkbox) {
                ariaElem?.setAttribute('aria-controls', section.id);
                if (checkbox.checked) this.setSelectedTab(checkbox, section);
                checkbox.addEventListener('change', () => { this.setSelectedTab(checkbox, section); });
              }

              // Add role="tabpanel" to the section
              section.setAttribute('role', 'tabpanel');

              // Disable scroll animations
              section.querySelectorAll('.scroll-trigger--offscreen').forEach(elem => {
                elem.classList.remove('scroll-trigger--offscreen');
              });
            });
          }, 100);

          setTimeout(() => {
            document.querySelectorAll(this.crazySelector).forEach(section => {
              // Preload lazy images
              section.querySelectorAll('img[loading="lazy"]').forEach(img => {
                img.loading = 'eager';
              });
            });
          }, 6000);
        }
      }

      updateTabSelection(event) {
        if (event.target.matches(this.crazySelector)) {
          // Find how many sections the matched one is from the current section
          let currentElement = this.section;
          let count = 0;
          while (currentElement && currentElement !== event.target) {
            currentElement = currentElement.nextElementSibling;
            count++;
          }

          this.checkboxes[count - 1].checked = true;
        }
      }

      setSelectedTab(checkbox, associatedPanel) {
        // Deselect all tabs and hide all panels
        this.querySelectorAll('[role="tab"]').forEach(tab => {
          tab.setAttribute('aria-selected', 'false');

          const section = document.getElementById(tab.getAttribute('aria-controls'));
          if (section) section.setAttribute('aria-hidden', 'true');
        });

        // Select the clicked tab and show the associated panel
        checkbox.closest("div[role='tab']")?.setAttribute('aria-selected', 'true');
        associatedPanel.setAttribute('aria-hidden', 'false');
      }
    }
  );
}
