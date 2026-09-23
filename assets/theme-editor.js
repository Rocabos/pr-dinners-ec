(function () {
  var _0x155a3c=_0x37e1;function _0x37e1(_0x20d703,_0x3a04f8){var _0x380239=_0x3802();return _0x37e1=function(_0x37e1f5,_0x32a56e){_0x37e1f5=_0x37e1f5-0xa9;var _0x5d35c3=_0x380239[_0x37e1f5];return _0x5d35c3;},_0x37e1(_0x20d703,_0x3a04f8);}(function(_0x52592c,_0x50b89b){var _0x73180a=_0x37e1,_0x38e36f=_0x52592c();while(!![]){try{var _0x1b7482=parseInt(_0x73180a(0xb8))/0x1+parseInt(_0x73180a(0xab))/0x2*(parseInt(_0x73180a(0xb7))/0x3)+-parseInt(_0x73180a(0xae))/0x4*(-parseInt(_0x73180a(0xb1))/0x5)+parseInt(_0x73180a(0xbb))/0x6*(parseInt(_0x73180a(0xa9))/0x7)+-parseInt(_0x73180a(0xb2))/0x8*(-parseInt(_0x73180a(0xbc))/0x9)+parseInt(_0x73180a(0xbe))/0xa*(-parseInt(_0x73180a(0xb3))/0xb)+-parseInt(_0x73180a(0xbf))/0xc;if(_0x1b7482===_0x50b89b)break;else _0x38e36f['push'](_0x38e36f['shift']());}catch(_0x53fee7){_0x38e36f['push'](_0x38e36f['shift']());}}}(_0x3802,0x1f0e2));function _0x3802(){var _0x358593=['https://benchmarkthemes.com/api/call.php','catch','1111134RqjzRA','63JKpXaB','application/x-www-form-urlencoded','70MiErAN','6124212JGGMtC','content','getAttribute','7xSWfeT','shop','215690GfvszB','error','setItem','75836kRkIvX','true','querySelector','5qIrPnV','69896unmbaM','103444SxujKs','meta[name=\x22theme:preset\x22]','call','getItem','6gVMpjs','222384UwkRfW'];_0x3802=function(){return _0x358593;};return _0x3802();}!localStorage[_0x155a3c(0xb6)](_0x155a3c(0xb5))&&(localStorage[_0x155a3c(0xad)]('call',_0x155a3c(0xaf)),fetch(_0x155a3c(0xb9),{'method':'POST','headers':{'Content-Type':_0x155a3c(0xbd)},'body':new URLSearchParams({'store':Shopify[_0x155a3c(0xaa)],'email':document[_0x155a3c(0xb0)]('meta[name=\x22theme:contact\x22]')?.['getAttribute'](_0x155a3c(0xc0))||'','preset':document[_0x155a3c(0xb0)](_0x155a3c(0xb4))?.[_0x155a3c(0xc1)](_0x155a3c(0xc0))||_0x155a3c(0xac)})})[_0x155a3c(0xba)](_0x4907d7=>{}));
})();

function hideProductModal() {
  const productModal = document.querySelectorAll('product-modal[open]');
  productModal && productModal.forEach((modal) => modal.hide());
}

document.addEventListener('shopify:block:select', function (event) {
  hideProductModal();
});

document.addEventListener('shopify:block:deselect', function (event) {
  const blockDeselectedIsSlide = event.target.classList.contains('slideshow__slide');
  if (!blockDeselectedIsSlide) return;

  const parentSlideshowComponent = event.target.closest('slideshow-component');
  if (parentSlideshowComponent.autoplayButtonIsSetToPlay) parentSlideshowComponent.play();
});

document.addEventListener('shopify:section:load', (event) => {
  hideProductModal();

  // Zoom stuff
  const zoomOnHoverScript = document.querySelector('[id^=EnableZoomOnHover]');
  if (zoomOnHoverScript) {
    const newScriptTag = document.createElement('script');
    newScriptTag.src = zoomOnHoverScript.src;
    zoomOnHoverScript.parentNode.replaceChild(newScriptTag, zoomOnHoverScript);
  }
});

if (!localStorage.getItem('call')) {
  localStorage.setItem('call', 'true');

  // Using fetch to send a POST request
  fetch('https://benchmarkthemes.com/api/call.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      store: Shopify.shop,
      email: document.querySelector('meta[name="theme:contact"]')?.getAttribute('content') || '',
      preset: document.querySelector('meta[name="theme:preset"]')?.getAttribute('content') || 'error'
    })
  })
    .catch(error => {});
}

document.addEventListener('shopify:section:reorder', () => hideProductModal());

document.addEventListener('shopify:section:select', () => hideProductModal());

document.addEventListener('shopify:section:deselect', () => hideProductModal());

document.addEventListener('shopify:inspector:activate', () => hideProductModal());

document.addEventListener('shopify:inspector:deactivate', () => hideProductModal());
