function markLargeImages() {
  const images = document.querySelectorAll('.article-template__content img');
  const captionArticle = document.querySelector('[data-image-captions]');
  const captions = captionArticle ? captionArticle.dataset.imageCaptions : null;

  images.forEach(image => {
    image.classList.remove('rte__large-image');
    if (image.complete) {
      addClassIfNecessary(image);
    } else {
      image.addEventListener('load', () => addClassIfNecessary(image), { once: true });
    }
  });

  function addClassIfNecessary(image) {
    const parentWidth = image.parentElement.offsetWidth;

    if (captions === 'all' && image.alt) {
      image.parentElement.setAttribute('data-image-caption', image.alt);
    }

    if (image.naturalWidth > parentWidth) {
      image.classList.add('rte__large-image');

      if (captions === 'large' && image.alt) {
        image.parentElement.setAttribute('data-image-caption', image.alt);
      }
    }
  }
}

markLargeImages();
window.addEventListener('resizeend', markLargeImages);

if (Shopify.designMode) {
  document.addEventListener('shopify:section:load', markLargeImages);
  document.addEventListener('shopify:block:select', markLargeImages);
}
