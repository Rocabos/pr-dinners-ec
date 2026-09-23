window.renderStickers = function () {
  const stickerSelectors = [];
  stickerSelectors['header'] = 'a.mega-menu__link,.header .list-menu__item span,.header__submenu .header__menu-item';
  stickerSelectors['footer'] = '.footer__link';
  stickerSelectors['promo'] = '.promo-card--text__heading';
  stickerSelectors['article'] = '.article-card__title';

  document.querySelectorAll('.sticker-definition').forEach(stickerDefinition => {
    let selectors, stickerMatches;

    // Get the required selectors and words to match
    if (stickerDefinition.dataset.matchLinks) {
      selectors = stickerSelectors[stickerDefinition.dataset.type];
      stickerMatches = stickerDefinition.dataset.matchLinks.split('||');
    } else if (stickerDefinition.dataset.matchCollections) {
      const collectionIds = stickerDefinition.dataset.matchCollections.split('||');
      selectors = (collectionIds.map(id => `[data-collection-title-id="${id.trim()}"]`)).join(',');
    } else if (stickerDefinition.dataset.matchProducts) {
      const productIds = stickerDefinition.dataset.matchProducts.split('||');
      selectors = (productIds.map(id => `[data-product-card-title-id="${id.trim()}"]`)).join(',');
      if (stickerDefinition.dataset.showProductPage) {
        const ppSelectors = (productIds.map(id => `[data-product-title-id="${id.trim()}"]`)).join(',');
        if (ppSelectors) selectors += "," + ppSelectors;
      }
    }

    const matchedElems = []; // Reset matchedElems for each stickerDefinition

    function addStickerMarkup(elem) {
      if (!elem.classList.contains('stickerified')) {
        elem.innerHTML = `
          <span class="sticker-wrapper-above"></span>
          <span>
            <span class="sticker-text">${elem.innerHTML}</span>
            <span class="sticker-wrapper-inline"></span>
          </span>
          <span class="sticker-wrapper-below"></span>
        `;
        elem.classList.add('stickerified');
      }
    }

    function injectSticker(elem) {
      const aboveElem = elem.querySelector('.sticker-wrapper-above');
      const inlineElem = elem.querySelector('.sticker-wrapper-inline');
      const belowElem = elem.querySelector('.sticker-wrapper-below');

      const spacer = `<span class="sticker-spacer"></span>`;
      if (stickerDefinition.dataset.placement === "above") {
        aboveElem.innerHTML += `${stickerDefinition.innerHTML}`;
      } else if (stickerDefinition.dataset.placement === "below") {
        belowElem.innerHTML += `${stickerDefinition.innerHTML}`;
      } else {
        inlineElem.innerHTML += `${spacer}${stickerDefinition.innerHTML}`;
      }
    }

    // Find the elements which contain the desired text and add the desired markup
    document.querySelectorAll(selectors).forEach(elem => {
      let matches = true;
      if (stickerMatches) {
        matches = stickerMatches.some(match => elem.textContent.toLowerCase().trim() === (match.trim()));
      } else {
        addStickerMarkup(elem);
        injectSticker(elem);
      }

      if (matches) {
        if (!matchedElems.includes(elem)) {
          matchedElems.push(elem);
        }
      }
    });

    // Add the necessary markup to each matched element
    matchedElems.forEach(elem => addStickerMarkup(elem));

    // Inject stickers into matched elements
    if (matchedElems && stickerMatches) {
      matchedElems.forEach(elem => {
        stickerMatches.forEach(match => {
          if (elem.querySelector('.sticker-text')?.textContent.toLowerCase().trim() === match.trim().toLowerCase() &&
            !elem.querySelector(`.${stickerDefinition.id}`)) {
            injectSticker(elem);
          }
        });
      });
    }
  });
}

window.stickersReinit = function () {
  // Remove any existing stickers
  document.querySelectorAll('.stickerified').forEach(sticker => {
    sticker.classList.remove('stickerified');
    const originalElem = sticker.querySelector('.sticker-text');
    sticker.innerHTML = originalElem.innerHTML;
  });

  document.querySelectorAll('.sticker-wrapper-above,.sticker-wrapper-inline,.sticker-wrapper-below').forEach(elem => {
    elem.remove();
  });

  window.renderStickers();
}

window.addEventListener('DOMContentLoaded', window.renderStickers);

if (Shopify.designMode) {
  document.addEventListener('shopify:section:load', window.stickersReinit);
  document.addEventListener('shopify:block:select', window.stickersReinit);
  document.addEventListener('shopify:block:deselect', window.stickersReinit);
}
