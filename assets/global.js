/* DEVICE/BROWSER DETECTION */
window.themeDevice = {
  mobile: window.matchMedia('(max-width: 749.98px)'),
  touchDevice: window.matchMedia('(hover: none) and (pointer: coarse)'),

  get isMobile() {
    return this.mobile.matches;
  },

  get isTouchDevice() {
    return this.touchDevice.matches;
  },

  get isTablet() {
    return !this.isMobile && this.isTouchDevice;
  },

  isRTL(element) {
    return (element?.closest('[dir="rtl"]') || document.documentElement).dir === 'rtl';
  },
};

/* EVENTS/SUBSCRIPTIONS */
const ON_CHANGE_DEBOUNCE_TIMER = 300;

const PUB_SUB_EVENTS = {
  cartRemove: 'cart-remove',
  cartAdd: 'cart-add',
  cartOpen: 'cart-drawer-open',
  cartClose: 'cart-drawer-closed',
  cartUpdate: 'cart-update',
  quickViewOpen: 'quick-view-open',
  quickViewClose: 'quick-view-closed',
  quantityUpdate: 'quantity-update',
  variantChange: 'variant-change',
  cartError: 'cart-error',
  optionValueSelectionChange: 'option-value-selection-change'
};

let subscribers = {};

function subscribe(eventName, callback) {
  if (subscribers[eventName] === undefined) {
    subscribers[eventName] = [];
  }

  subscribers[eventName] = [...subscribers[eventName], callback];

  return function unsubscribe() {
    subscribers[eventName] = subscribers[eventName].filter((cb) => {
      return cb !== callback;
    });
  };
}

function publish(eventName, data) {
  let eventData = { ...data };

  if (eventName === PUB_SUB_EVENTS.cartUpdate) {
    if (data.source === 'product-form') {
      eventName = PUB_SUB_EVENTS.cartAdd;
    } else if (data.source === 'cart-items' && !data.variantId) {
      eventName = PUB_SUB_EVENTS.cartRemove;
    }
  }

  if (eventName === PUB_SUB_EVENTS.variantChange) {
    eventData =  { ...eventData.data };
    delete eventData.html;
  }

  if (eventName === PUB_SUB_EVENTS.cartAdd) {
    eventData.variantId = eventData.productVariantId;
    delete eventData.productVariantId;
  }

  // Remove the 'source' node from eventData
  delete eventData.source;

  // Broadcast the event with modified eventData
  document.dispatchEvent(new CustomEvent(eventName, {
    detail: eventData
  }));

  if (subscribers[eventName]) {
    const promises = subscribers[eventName]
      .map((callback) => callback(data))
    return Promise.all(promises);
  } else {
    return Promise.resolve()
  }
}

class SectionId {
  static #separator = '__';

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section id (e.g. 'template--22224696705326')
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[0];
  }

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section name (e.g. 'main')
  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[1];
  }

  // for a section id (e.g. 'template--22224696705326') and a section name (e.g. 'recommended-products'), return a qualified section id (e.g. 'template--22224696705326__recommended-products')
  static getIdForSection(sectionId, sectionName) {
    return `${sectionId}${SectionId.#separator}${sectionName}`;
  }
}

class HTMLUpdateUtility {
  /**
   * Used to swap an HTML node with a new node.
   * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
   *
   * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
   */
  static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
    preProcessCallbacks?.forEach((callback) => callback(newContent));

    const newNodeWrapper = document.createElement('div');
    HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();
    oldNode.querySelectorAll('[id], [form]').forEach((element) => {
      element.id && (element.id = `${element.id}-${uniqueKey}`);
      element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    postProcessCallbacks?.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html, stripTemplates = true) {
    element.innerHTML = html;
    element.querySelectorAll('script').forEach((oldScriptTag) => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach((attribute) => {
        newScriptTag.setAttribute(attribute.name, attribute.value);
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });

    setTimeout(() => {
      window.renderSelects();
      window.loadDesktopOnlyTemplates();
      window.stickersReinit?.();
    });
  }
}

/* Custom selects */
(function() {
  !function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.NiceSelect=t():e.NiceSelect=t()}(self,(()=>(()=>{"use strict";var e={d:(t,i)=>{for(var s in i)e.o(i,s)&&!e.o(t,s)&&Object.defineProperty(t,s,{enumerable:!0,get:i[s]})},o:(e,t)=>Object.prototype.hasOwnProperty.call(e,t),r:e=>{"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})}},t={};function i(e){var t=document.createEvent("MouseEvents");t.initEvent("click",!0,!1),e.dispatchEvent(t)}function s(e){var t=document.createEvent("HTMLEvents");t.initEvent("change",!0,!1),e.dispatchEvent(t)}function o(e){var t=document.createEvent("FocusEvent");t.initEvent("focusin",!0,!1),e.dispatchEvent(t)}function n(e){var t=document.createEvent("FocusEvent");t.initEvent("focusout",!0,!1),e.dispatchEvent(t)}function d(e){var t=document.createEvent("UIEvent");t.initEvent("modalclose",!0,!1),e.dispatchEvent(t)}function l(e,t){"invalid"==t?(c(this.dropdown,"invalid"),h(this.dropdown,"valid")):(c(this.dropdown,"valid"),h(this.dropdown,"invalid"))}function r(e,t){return null!=e[t]?e[t]:e.getAttribute(t)}function a(e,t){return!!e&&e.classList.contains(t)}function c(e,t){if(e)return e.classList.add(t)}function h(e,t){if(e)return e.classList.remove(t)}e.r(t),e.d(t,{bind:()=>f,default:()=>u});var p={data:null,searchable:!1,showSelectedItems:!1};function u(e,t){this.el=e,this.config=Object.assign({},p,t||{}),this.data=this.config.data,this.selectedOptions=[],this.placeholder=r(this.el,"placeholder")||this.config.placeholder||"Select an option",this.searchtext=r(this.el,"searchtext")||this.config.searchtext||"Search",this.selectedtext=r(this.el,"selectedtext")||this.config.selectedtext||"selected",this.dropdown=null,this.multiple=r(this.el,"multiple"),this.disabled=r(this.el,"disabled"),this.create()}function f(e,t){return new u(e,t)}return u.prototype.create=function(){this.el.style.opacity="0",this.el.style.minWidth="0",this.el.setAttribute('tabindex', '-1'),this.el.style.width="0",this.el.style.padding="0",this.el.style.height="0",this.data?this.processData(this.data):this.extractData(),this.renderDropdown(),this.bindEvent()},u.prototype.processData=function(e){var t=[];e.forEach((e=>{t.push({data:e,attributes:{selected:!!e.selected,disabled:!!e.disabled,optgroup:"optgroup"==e.value}})})),this.options=t},u.prototype.extractData=function(){var e=this.el.querySelectorAll("option,optgroup"),t=[],i=[],s=[];e.forEach((e=>{if("OPTGROUP"==e.tagName)var s={text:e.label,value:"optgroup"};else{let t=e.innerText;null!=e.dataset.display&&(t=e.dataset.display),s={text:t,value:e.value,selected:null!=e.getAttribute("selected"),disabled:null!=e.getAttribute("disabled")}}var o={selected:null!=e.getAttribute("selected"),disabled:null!=e.getAttribute("disabled"),optgroup:"OPTGROUP"==e.tagName};t.push(s),i.push({data:s,attributes:o})})),this.data=t,this.options=i,this.options.forEach((e=>{e.attributes.selected&&s.push(e)})),this.selectedOptions=s},u.prototype.renderDropdown=function(){var e=["nice-select",r(this.el,"class")||"",this.disabled?"disabled":"",this.multiple?"has-multiple":""];let t='<div class="nice-select-search-box field">';t+=`<input type="text" class="nice-select-search field__input visible-placeholder" placeholder="${this.searchtext}..." title="search"/>`,t+="</div>";var i=`<div class="${e.join(" ")}" tabindex="${this.disabled?null:0}">`;i+=`<span class="${this.multiple?"multiple-options":"current"}"></span>`,i+='<div class="nice-select-dropdown custom-scrollbar">',i+=`${this.config.searchable?t:""}`,i+='<ul class="nice-list"></ul>',i+="</div>",i+="</div>",this.el.insertAdjacentHTML("afterend",i),this.dropdown=this.el.nextElementSibling,this._renderSelectedItems(),this._renderItems()},u.prototype._renderSelectedItems=function(){if(this.multiple){var e="";this.config.showSelectedItems||this.config.showSelectedItems||"auto"==window.getComputedStyle(this.dropdown).width||this.selectedOptions.length<2?(this.selectedOptions.forEach((function(t){e+=`<span class="current">${t.data.text}</span>`})),e=""==e?this.placeholder:e):e=this.selectedOptions.length+" "+this.selectedtext,this.dropdown.querySelector(".multiple-options").innerHTML=e}else{var t=this.selectedOptions.length>0?this.selectedOptions[0].data.text:this.placeholder;this.dropdown.querySelector(".current").innerHTML=t}},u.prototype._renderItems=function(){var e=this.dropdown.querySelector("ul");this.options.forEach((t=>{e.appendChild(this._renderItem(t))}))},u.prototype._renderItem=function(e){var t=document.createElement("li");if(t.innerHTML=e.data.text,e.attributes.optgroup)c(t,"optgroup");else{t.setAttribute("data-value",e.data.value);var i=["option",e.attributes.selected?"selected":null,e.attributes.disabled?"disabled":null];t.addEventListener("click",this._onItemClicked.bind(this,e)),t.classList.add(...i)}return e.element=t,t},u.prototype.update=function(){if(this.extractData(),this.dropdown){var e=a(this.dropdown,"open");this.dropdown.parentNode.removeChild(this.dropdown),this.create(),e&&i(this.dropdown)}r(this.el,"disabled")?this.disable():this.enable()},u.prototype.disable=function(){this.disabled||(this.disabled=!0,c(this.dropdown,"disabled"))},u.prototype.enable=function(){this.disabled&&(this.disabled=!1,h(this.dropdown,"disabled"))},u.prototype.clear=function(){this.resetSelectValue(),this.selectedOptions=[],this._renderSelectedItems(),this.update(),s(this.el)},u.prototype.destroy=function(){this.dropdown&&(this.dropdown.parentNode.removeChild(this.dropdown),this.el.style.display="")},u.prototype.bindEvent=function(){this.dropdown.addEventListener("click",this._onClicked.bind(this)),this.dropdown.addEventListener("keydown",this._onKeyPressed.bind(this)),this.dropdown.addEventListener("focusin",o.bind(this,this.el)),this.dropdown.addEventListener("focusout",n.bind(this,this.el)),this.el.addEventListener("invalid",l.bind(this,this.el,"invalid")),window.addEventListener("click",this._onClickedOutside.bind(this)),this.config.searchable&&this._bindSearchEvent()},u.prototype._bindSearchEvent=function(){var e=this.dropdown.querySelector(".nice-select-search");e&&e.addEventListener("click",(function(e){return e.stopPropagation(),!1})),e.addEventListener("input",this._onSearchChanged.bind(this))},u.prototype._onClicked=function(e){var t,i;if(e.preventDefault(),a(this.dropdown,"open")?this.multiple||(h(this.dropdown,"open"),d(this.el)):(c(this.dropdown,"open"),t=this.el,(i=document.createEvent("UIEvent")).initEvent("modalopen",!0,!1),t.dispatchEvent(i)),a(this.dropdown,"open")){var s=this.dropdown.querySelector(".nice-select-search");s&&(s.value="",s.focus());var o=this.dropdown.querySelector(".focus");h(o,"focus"),c(o=this.dropdown.querySelector(".selected"),"focus"),this.dropdown.querySelectorAll("ul li").forEach((function(e){e.style.display=""}))}else this.dropdown.focus()},u.prototype._onItemClicked=function(e,t){var i=t.target;a(i,"disabled")||(this.multiple?a(i,"selected")?(h(i,"selected"),this.selectedOptions.splice(this.selectedOptions.indexOf(e),1),this.el.querySelector(`option[value="${i.dataset.value}"]`).removeAttribute("selected")):(c(i,"selected"),this.selectedOptions.push(e)):(this.selectedOptions.forEach((function(e){h(e.element,"selected")})),c(i,"selected"),this.selectedOptions=[e]),this._renderSelectedItems(),this.updateSelectValue())},u.prototype.updateSelectValue=function(){if(this.multiple){var e=this.el;this.selectedOptions.forEach((function(t){var i=e.querySelector(`option[value="${t.data.value}"]`);i&&i.setAttribute("selected",!0)}))}else this.selectedOptions.length>0&&(this.el.value=this.selectedOptions[0].data.value);s(this.el)},u.prototype.resetSelectValue=function(){if(this.multiple){var e=this.el;this.selectedOptions.forEach((function(t){var i=e.querySelector(`option[value="${t.data.value}"]`);i&&i.removeAttribute("selected")}))}else this.selectedOptions.length>0&&(this.el.selectedIndex=-1);s(this.el)},u.prototype._onClickedOutside=function(e){this.dropdown.contains(e.target)||(h(this.dropdown,"open"),d(this.el))},u.prototype._onKeyPressed=function(e){var t=this.dropdown.querySelector(".focus"),s=a(this.dropdown,"open");if(13==e.keyCode)i(s?t:this.dropdown);else if(40==e.keyCode){if(s){var o=this._findNext(t);o&&(h(this.dropdown.querySelector(".focus"),"focus"),c(o,"focus"))}else i(this.dropdown);e.preventDefault()}else if(38==e.keyCode){if(s){var n=this._findPrev(t);n&&(h(this.dropdown.querySelector(".focus"),"focus"),c(n,"focus"))}else i(this.dropdown);e.preventDefault()}else if(27==e.keyCode&&s)i(this.dropdown);else if(32===e.keyCode&&s)return!1;return!1},u.prototype._findNext=function(e){for(e=e?e.nextElementSibling:this.dropdown.querySelector(".list .option");e;){if(!a(e,"disabled")&&"none"!=e.style.display)return e;e=e.nextElementSibling}return null},u.prototype._findPrev=function(e){for(e=e?e.previousElementSibling:this.dropdown.querySelector(".list .option:last-child");e;){if(!a(e,"disabled")&&"none"!=e.style.display)return e;e=e.previousElementSibling}return null},u.prototype._onSearchChanged=function(e){var t=a(this.dropdown,"open"),i=e.target.value;if(""==(i=i.toLowerCase()))this.options.forEach((function(e){e.element.style.display=""}));else if(t){var s=new RegExp(i);this.options.forEach((function(e){var t=e.data.text.toLowerCase(),i=s.test(t);e.element.style.display=i?"":"none"}))}this.dropdown.querySelectorAll(".focus").forEach((function(e){h(e,"focus")})),c(this._findNext(null),"focus")},t})()));

  window.renderSelects = function() {
    if (window.matchMedia('(min-width: 750px)').matches) {
      document.querySelectorAll('select.styled-select').forEach(select => {
        select.classList.remove('styled-select');
        select.classList.remove('styled-select-xs');
        select.classList.add('nice__select');
        NiceSelect.bind(select);
      });
    } else {
      document.querySelectorAll('select.styled-select-xs').forEach(select => {
        select.classList.remove('styled-select');
        select.classList.remove('styled-select-xs');
        select.classList.add('nice__select');
        NiceSelect.bind(select);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', window.renderSelects);
  if (Shopify.designMode) {
    document.addEventListener('shopify:section:load', window.renderSelects);
  }
})();

window.sectionInstances = new WeakMap();

window.initScriptOnDemand = function (element, callback, threshold = 300) {
  if (window.theme?.settings.lazyLoadJs && 'IntersectionObserver' in window && window.self === window.top) {
    const observer = new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;

        if (typeof callback === 'function') {
          // Defer execution safely after paint, without forcing a layout
          requestAnimationFrame(() => {
            if ('requestIdleCallback' in window) {
              // Let the browser truly decide when it’s idle
              requestIdleCallback(() => callback(), { timeout: 300 });
            } else {
              // Fallback for browsers without requestIdleCallback
              setTimeout(() => callback(), 0);
            }
          });
        }

        obs.unobserve(entry.target);
      }
    }, { rootMargin: `0px 0px ${threshold}px 0px` });

    observer.observe(element);
  } else if (typeof callback === 'function') {
    requestAnimationFrame(() => callback());
  }
};

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
    )
  );
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container, lastElement) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = lastElement || elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  if (elementToFocus) {
    setTimeout(() => {
      elementToFocus.focus();

      if (
        elementToFocus.tagName === 'INPUT' &&
        ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
        elementToFocus.value
      ) {
        elementToFocus.setSelectionRange(0, elementToFocus.value.length);
      }
    }, 300);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube:not(.js-video-background)').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo:not(.js-video-background)').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video:not(.js-video-background)').forEach((video) => {
    if (!video.paused) {
      video.setAttribute('data-was-playing', 'true');
    }

    video.pause();
  });
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI && typeof model.modelViewerUI.pause === "function") {
      try { model.modelViewerUI.pause(); } catch(err) {}
    }
  });
}

function resumePreviouslyPlayingHTML5Video() {
  document.querySelectorAll('video[data-was-playing="true"]').forEach((video) => {
    video.muted = true;
    video.play().catch(() => {});
    video.removeAttribute('data-was-playing');
  });
}

// Load <template> content if needed
function loadTemplateContent(elem) {
  elem.querySelectorAll('template.deferred').forEach(template => {
    if (template?.content?.childNodes) {
      // Create a DocumentFragment to hold the template content
      const fragment = document.createDocumentFragment();

      // Replace <lazy-script> elements with <script> elements
      template.content.querySelectorAll('lazy-script').forEach(lazyScript => {
        const script = document.createElement('script');
        script.textContent = lazyScript.textContent;
        Array.from(lazyScript.attributes).forEach(attr => {
          script.setAttribute(attr.name, attr.value);
        });
        lazyScript.replaceWith(script);
      });

      // Append all child nodes of the template content to the DocumentFragment
      while (template.content.firstChild) {
        fragment.appendChild(template.content.firstChild);
      }

      // Insert the DocumentFragment after the <template> tag
      template.parentNode.insertBefore(fragment, template.nextSibling);

      // Remove the <template> element
      template.remove();

      // Rerun DOM things
      window.makeTablesResponsive();
      window.renderSelects();
      window.stickersReinit?.();
    }
  });
  return elem;
}

// Utility to selectively load certain elements on demand
document.addEventListener('DOMContentLoaded', () => {
  // Load templates on click of certain other DOM elements
  document.body.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-load-trigger]');
    if (!trigger) return;

    const selector = trigger.getAttribute('data-load-trigger');
    const template = document.querySelector(selector);

    if (template) {
      window.loadTemplateContent(template.parentNode);
    }
  });

  // Load templates immediately if IntersectionObserver is not supported
  if (!("IntersectionObserver" in window) || window.self !== window.top) {
    document.querySelectorAll("template.lazy-template").forEach(template => {
      window.loadTemplateContent(template.parentNode);
    });
  } else {
    // Load templates when scrolling near to them
    document.querySelectorAll("template.lazy-template").forEach(template => {
      const margin = template.getAttribute("data-observe-margin") || "400px";

      const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            window.loadTemplateContent(entry.target.parentNode);
            observer.unobserve(entry.target);
          }
        });
      }, {
        root: null, // Observe relative to the viewport
        rootMargin: margin, // Use the data attribute or default to 400px
        threshold: 0 // Trigger as soon as any part is visible
      });

      observer.observe(template);
    });
  }
});


function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus && !elementToFocus.matches('.product__media-toggle')) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

// Load template scripts on desktop
function loadDesktopOnlyTemplates() {
  // Load desktop only template content
  document.querySelectorAll('template.js-load-desktop-only').forEach(template => {
    if (window.innerWidth >= 750) {
      const clone = document.importNode(template.content, true);
      template.parentNode.replaceChild(clone, template);
    }
  });
}

/* SHOPIFY COMMON JS */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};


/* COMMON WEB COMPONENTS */
// Extendable web component watch for the rendering of a <template> element, and calling the init function
class HTMLElementLazyInit extends HTMLElement {
  constructor() {
    super();
    this.template = this.querySelector(`template`);
  }

  connectedCallback() {
    if (this.template) {
      this.observeTemplateRemoval();
    } else {
      this.init();
    }
  }

  observeTemplateRemoval() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.removedNodes.forEach((node) => {
          if (node === this.template) {
            this.onTemplateRendered();
            observer.disconnect();
          }
        });
      });
    });

    if (this.template.parentNode) {
      observer.observe(this.template.parentNode, { childList: true });
    }
  }

  onTemplateRendered() {
    this.init();
  }
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this))
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}
customElements.define('quantity-input', QuantityInput);

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));

    document.addEventListener('shopify:section:load', () => {
      this.mainDetailsToggle.classList.remove('menu-opening');
      document.body.classList.remove(`overflow-hidden`);
    });

    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this))
    );
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      const menuDrawer = summaryElement.closest('#menu-drawer');
      if (menuDrawer) {
        // Designate the very last 'summary' element within the last <li> to be the last element. This should trigger focus to wrap round to the beginning again
        const lastLi = summaryElement.nextElementSibling.querySelector('.menu-drawer__inner-submenu > .menu-drawer__menu > li:last-child');
        trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'), lastLi?.querySelector('summary'));
      }

      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 989.98px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches ? addTrapFocus() : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');

    document.body.classList.remove(`overflow-hidden`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    if (detailsElement.classList.contains('menu-drawer-container')) {
      this.mainDetailsToggle.querySelector('summary').click();
    } else {
      this.closeSubmenu(detailsElement);
    }
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));

    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        const closestDetails = detailsElement.closest('details[open]');
        if (closestDetails) {

          if (closestDetails.matches('.js-header-drawer-sub')) {
            // Designate the very last 'summary' element within the last <li> to be the last element. This should trigger focus to wrap round to the beginning again
            const lastLi = closestDetails.querySelector('.menu-drawer__inner-submenu > .menu-drawer__menu > li:last-child');
            trapFocus(closestDetails.querySelector('summary').nextElementSibling, detailsElement.querySelector('summary'), lastLi?.querySelector('summary'));

          } else if (closestDetails.matches('.js-header-drawer-main')) {
            const menuDrawer = document.getElementById('menu-drawer');
            const menuDrawerDisclosure = menuDrawer.querySelector('header-drawer .disclosure__button');
            trapFocus(menuDrawer, detailsElement.querySelector('summary'), menuDrawerDisclosure);

          } else {
            trapFocus(closestDetails, detailsElement.querySelector('summary'));
          }
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}
customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  bindEvents() {
    super.bindEvents();
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)'
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this))
    );
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    this.borderOffset =
      this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty(
      '--header-bottom-position',
      `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
    );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    const menuDrawerDisclosure = this.header.querySelector('header-drawer .disclosure__button')
    trapFocus(document.getElementById('menu-drawer'), summaryElement, menuDrawerDisclosure);
    document.body.classList.add(`overflow-hidden`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
    event.target.setAttribute('aria-expanded', false);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}
customElements.define('header-drawer', HeaderDrawer);

class CustomNav extends HTMLElement {
  constructor() {
    super();
    if (window.matchMedia('(hover: hover)').matches) {
      this.listMenu = this.querySelector('.list-menu');
      if (this.listMenu) {
        this.mouseLeaveMenuHandler = this.onMouseMenuLeave.bind(this);
        this.listMenu.addEventListener('mouseleave', this.mouseLeaveMenuHandler);
      }
    }
  }

  disconnectedCallback() {
    if (this.listMenu && this.mouseLeaveMenuHandler) {
      this.listMenu.removeEventListener('mouseleave', this.mouseLeaveMenuHandler);
    }
  }

  onMouseMenuLeave() {
    window.menuHoverIntentDelay = 50;
  }
}
customElements.define('custom-nav', CustomNav);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.isSocialVideoPopup = this.classList.contains('popup-modal--social-video');
    // Handle close events
    this.addEventListener('click', this.handleComponentClick.bind(this));

    if (!this.dataset.preventClose) {
      this.addEventListener('keyup', (event) => {
        if (event.code?.toUpperCase() === 'ESCAPE') this.hide();
      });

      if (this.classList.contains('media-modal')) {
        this.addEventListener('pointerup', (event) => {
          if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
        });
      } else {
        this.addEventListener('click', (event) => {
          if (event.target === this) this.hide();
        });
      }
    }
  }

  connectedCallback() {
    window.addEventListener('browserIsVeryIdle', () => {
      this.dataset.section = this.closest('.shopify-section')?.id.replace('shopify-section-', '');
      // this.moveModal();
      window.loadTemplateContent(this);
    });
  }

  handleComponentClick(event) {
    if (event.target.closest('[id^="ModalClose-"]') || event.target.closest('[data-modal-close]')) {
      this.hide(false);
    }
  }

  moveModal() {
    // Initialize the array if it doesn't exist
    if (!window.movedModals) {
      window.movedModals = [];
    }

    // Check if this modal has already been moved
    if (window.movedModals.includes(this.id)) return;

    window.requestAnimationFrame(() => {
      const noMove = this.closest('.shopify-section.no-move');
      if (!noMove) {
        window.movedModals.push(this.id);
        document.body.appendChild(this);
        window.loadTemplateContent(this);
      }
    });
  }

  show(opener, modalClass) {
    // Load any dynamic content
    if (this.dataset.contentSelector) {
      const content = [...document.querySelectorAll(this.dataset.contentSelector)];
      const sectionContent = this.querySelector('.section-content');

      if (content.length && sectionContent) {
        const clonedContent = content.map((item) => {
          const clone = item.cloneNode(true);
          const videos = clone.matches('video') ? [clone] : [...clone.querySelectorAll('video')];

          videos.forEach((video) => {
            video.muted = false;
            video.removeAttribute('muted');

            video.autoplay = false;
            video.removeAttribute('autoplay');
          });

          return clone;
        });

        sectionContent.append(...clonedContent);
      }

      this.removeAttribute('data-content-selector');
    }

    this.moveModal();
    window.loadTemplateContent(this);

    // Load all lazy scripts immediately
    this.querySelectorAll('lazy-script').forEach(script => script.loadScript());

    // Load all deferred media immediately
    this.querySelectorAll('deferred-media').forEach(deferredMedia => {
      deferredMedia.loadContent?.();
    });

    if (this.dataset.isAlert) {
      this.setAttribute('open', '');
    } else {
      if (opener) this.openedBy = opener;
      setTimeout(() => {
        const popup = this.querySelector('.template-popup');
        document.body.classList.add('overflow-hidden');
        this.setAttribute('open', '');
        if (popup) popup.loadContent();
        trapFocus(this, this.querySelector('[role="dialog"]'));
        window.pauseAllMedia();

        if (this.classList.contains('quick-add-modal')) {
          publish('quick-buy-action-complete');
        }

        if (modalClass) this.classList.add(modalClass);

        window.makeTablesResponsive();

        if (this.isSocialVideoPopup) {
          // Scroll to relevant element
          const openerVideo = opener.querySelector('video') || opener.closest('video');
          const sourceVideo = opener.querySelector('source')?.getAttribute('src');
          const seekTime = openerVideo?.currentTime || 0;

          if (sourceVideo) {
            const matchingVideo = [...this.querySelectorAll('video')].find((video) => {
              return [...video.querySelectorAll('source')].some((source) => {
                return source.getAttribute('src') === sourceVideo;
              });
            });

            if (matchingVideo) {
              matchingVideo.scrollIntoView({
                block: 'start',
                behavior: 'instant',
              });

              const playMatchingVideo = () => {
                matchingVideo.currentTime = seekTime;

                const playPromise = matchingVideo.play();

                if (playPromise !== undefined) {
                  playPromise.catch(() => {});
                }
              };

              if (matchingVideo.readyState >= 1) {
                playMatchingVideo();
              } else {
                matchingVideo.addEventListener('loadedmetadata', playMatchingVideo, { once: true });
                matchingVideo.load();
              }
            }
          }
        }
      }, 100);
    }
  }

  hide(preventAnimation) {
    const doHide = () => {
      if (!this.dataset.isAlert) {
        this.setAttribute('open', '');
        document.body.classList.remove('overflow-hidden');
        if (this.openedBy) removeTrapFocus(this.openedBy);
        window.pauseAllMedia();
      }

      document.body.dispatchEvent(new CustomEvent('modalClosed'));
      this.removeAttribute('open');
      this.classList.remove('popup-modal--closing');
      window.resumePreviouslyPlayingHTML5Video();
    }

    if (preventAnimation) {
      doHide();
    } else {
      this.classList.add('popup-modal--closing');
      setTimeout(doHide, 320);
    }
  }
}
customElements.define('modal-dialog', ModalDialog);

class ProductCard extends HTMLElement {
  constructor() {
    super();

    this.mouseEnterHandler = this.mouseEnterHandler || this.handleMouseEnter.bind(this);
    this.showSwatchHandler = this.showSwatchHandler || this.showSwatchImage.bind(this);
    this.hideSwatchHandler = this.hideSwatchHandler || this.hideSwatchImage.bind(this);
    this.hoverButtonHandler = this.hoverButtonHandler || this.clickHoverButton.bind(this);

    this.swatchesPreloaded = false;
    this.hasSwatches = this.querySelector('.swatch[data-variant-media]') !== null;

    this.hoverButton = this.querySelector('.card__hover-button');
    this.productForm = this.querySelector('product-form');
    this.productBulkForm = this.querySelector('quick-add-bulk');

    window.initScriptOnDemand(this, this.init.bind(this), 0);
  }

  init() {
    if (this.hoverButton) {
      this.hoverButton.addEventListener('click', this.hoverButtonHandler);
    }

    if (this.hasSwatches) {
      this.createSwatchHoverImage();
      this.addEventListener('mouseenter', this.mouseEnterHandler, { passive: true });
      this.addEventListener('mouseover', this.showSwatchHandler, { passive: true });
      this.addEventListener('mouseleave', this.hideSwatchHandler, { passive: true });

      // Add focus and blur events for keyboard navigation
      this.addEventListener('focusin', this.showSwatchHandler, { passive: true });
      this.addEventListener('focusout', this.hideSwatchHandler, { passive: true });

      // Add touchstart event for mobile interactions
      this.addEventListener('touchstart', this.showSwatchHandler, { passive: true });
    }

    if (this.productForm) {
      customElements.whenDefined('product-form').then(() => {
        this.productForm.init();
      });
    }

    if (this.productBulkForm) {
      customElements.whenDefined('quick-add-bulk').then(() => {
        this.productBulkForm.init();
      });
    }
  }

  disconnectedCallback() {
    if (this.hoverButton) {
      this.hoverButton.removeEventListener('click', this.hoverButtonHandler);
    }

    if (this.hasSwatches) {
      this.removeEventListener('mouseenter', this.mouseEnterHandler);
      this.removeEventListener('mouseover', this.showSwatchHandler);
      this.removeEventListener('mouseleave', this.hideSwatchHandler);
      this.removeEventListener('focusin', this.showSwatchHandler);
      this.removeEventListener('focusout', this.hideSwatchHandler);
      this.removeEventListener('touchstart', this.showSwatchHandler);
    }
  }

  clickHoverButton() {
    this.hoverButton.setAttribute('aria-disabled', true);
    this.hoverButton.classList.add('loading');
    this.hoverButton.querySelector('.loading__spinner').classList.remove('hidden', 'spinning-complete');

    document.addEventListener('quick-buy-action-complete', () => {
      this.hoverButton.removeAttribute('aria-disabled');
      this.hoverButton.classList.remove('loading');
      this.hoverButton.querySelector('.loading__spinner').classList.add('hidden', 'spinning-complete');
    }, { once: true });

    const quickAddOpenButton = this.querySelector('modal-opener .quick-add__submit') || this.querySelector('product-form .quick-add__submit') || this.querySelector('quick-add-bulk .quantity__button-increase');
    quickAddOpenButton?.click();
  }

  createSwatchHoverImage() {
    // Create an empty img tag within .card__media div.media
    this.mediaContainer = this.querySelector('.card__media .media');
    if (this.mediaContainer) {
      // Find the first existing img in the container
      const existingImg = this.mediaContainer.querySelector('img');

      // Create a new img tag with the same class as the existing img
      this.swatchHoverImg = document.createElement('img');
      this.swatchHoverImg.className = existingImg ? existingImg.className : '';
      this.swatchHoverImg.style.display = 'none';
      this.swatchHoverImg.classList.add('swatch-hover-image');
      this.swatchHoverImg.alt = existingImg ? existingImg.alt : '';

      this.mediaContainer.appendChild(this.swatchHoverImg);
    }
  }

  handleMouseEnter(event) {
    // Preload swatch images when mouse first enters
    if (!this.swatchesPreloaded) this.preloadSwatchImages();
  }

  hideSwatchImage(event) {
    if (this.swatchHoverImg) {
      this.swatchHoverImg.style.display = 'none';
      this.swatchHoverImg.classList.remove('show-swatch-image');
    }
  }

  showSwatchImage(event) {
    if (event.target.matches('button.swatch[data-variant-media]')) {
      const imageUrl = event.target.dataset.variantMedia;
      if (imageUrl && this.swatchHoverImg) {
        this.swatchHoverImg.src = imageUrl;
        this.swatchHoverImg.style.display = 'block';
        this.swatchHoverImg.classList.add('show-swatch-image');
      }
    }
  }

  preloadSwatchImages() {
    const swatches = this.querySelectorAll('.swatch[data-variant-media]');
    swatches.forEach(swatch => {
      if (swatch.dataset.variantMedia) {
        const img = new Image();
        img.src = swatch.dataset.variantMedia;
      }
    });
    this.swatchesPreloaded = true;
  }
}
customElements.define('product-card', ProductCard);

class CustomPopup extends ModalDialog {
  constructor() {
    super();
    this.delaySeconds = parseInt(this.dataset.delaySeconds);
    this.timeToShow = this.dataset.timeOfDayToShow;

    if (Shopify.designMode && !this.isSocialVideoPopup) {
      if (!this.dataset.teOnly) {
        document.addEventListener('shopify:section:select', (event) => {
          if (event.target === this.closest('.shopify-section')) {
            this.show();
          } else {
            this.hide(true);
          }
        });

        document.addEventListener('shopify:section:load', (event) => {
          if (event.target === this.closest('.shopify-section')) this.show();
        });

        document.addEventListener('shopify:section:deselect', () => {
          this.hide(true);
        });

        // Bind click triggered popups in the Theme Editor
        if (
          (this.dataset.visibility === "mobile" && window.matchMedia('(max-width: 749.98px)').matches) ||
          (this.dataset.visibility === "desktop" && window.matchMedia('(min-width: 750px)').matches) ||
          (this.dataset.visibility === "both")
        ) {
          if (this.dataset.trigger && this.dataset.trigger === 'click') {
            // Listen for clicks on any anchor links which end with this.dataset.popupTriggerId. Do a this.show() for those clicks.
            this.bindGlobalClickTrigger();
          }
        }
      } else {
        const closedElements = JSON.parse(localStorage.getItem('theme-closed-elements')) || [];
        if (!closedElements.includes(this.dataset.popupId)) {
          this.setAttribute('open', '');
        }
      }
    } else {
      const now = new Date();
      const hour = now.getHours();
      let timeOfDay = "";

      if (hour >= 5 && hour < 12) {
        timeOfDay = "morning";
      } else if (hour >= 12 && hour < 17) {
        timeOfDay = "afternoon";
      } else if (hour >= 17 && hour < 21) {
        timeOfDay = "evening";
      } else {
        timeOfDay = "night";
      }

      if (
        (
          (this.dataset.visibility === "mobile" && window.matchMedia('(max-width: 749.98px)').matches) ||
          (this.dataset.visibility === "desktop" && window.matchMedia('(min-width: 750px)').matches) ||
          (this.dataset.visibility === "both")
        ) &&
        (
          !this.timeToShow || this.timeToShow.split(',').map(s => s.trim()).includes(timeOfDay)
        )
      ) {
        const closedElements = JSON.parse(localStorage.getItem('theme-closed-elements')) || [];

        if (
          this.dataset.mode === "test" ||
          (this.dataset.trigger && this.dataset.trigger === 'click') ||
          !closedElements.includes(this.dataset.popupId)
        ) {
          if (!this.dataset.trigger || this.dataset.trigger.length === 0 || this.dataset.trigger === 'delay') {
            setTimeout(() => {
              this.show();

              if (this.dataset.autoClose && this.dataset.autoClose > 0) {
                setTimeout(() => {
                  this.hide();
                }, this.dataset.autoClose * 1000);
              }
            }, this.delaySeconds * 1000);

          } else if (this.dataset.trigger === 'exit_intent') {
            // Listen for exit intent
            this.storeLeaveHandler = this.storeLeaveHandler || this.handleStoreLeave.bind(this);
            document.body.addEventListener('mouseleave', this.storeLeaveHandler);

          } else if (this.dataset.trigger === 'copy_to_clipboard') {
            // Listen for copy to clipboard
            this.copyToClipboardHandler = this.copyToClipboardHandler || this.handleCopyToClipboard.bind(this);
            document.addEventListener('copy', this.copyToClipboardHandler);

          } else if (this.dataset.trigger === 'click') {
            // Listen for clicks on any anchor links which end with this.dataset.popupTriggerId. Do a this.show() for those clicks.
            this.bindGlobalClickTrigger();
          }
        }
      }
    }

    // Age verifier 'no' button
    const ageVerifierNoButton = this.querySelector('.age_verifier__no-button');
    if (ageVerifierNoButton) {
      ageVerifierNoButton.addEventListener('click', (event) => {
        event.target.classList.add('no-active');
      });
    }
  }

  bindGlobalClickTrigger() {
    if (window.themeCustomPopupClickTriggerHandler) return;

    window.themeCustomPopupClickTriggerHandler = (event) => {
      document.querySelectorAll('custom-popup').forEach((popup) => {
        popup.handleClickTrigger(event);
      });
    };

    document.addEventListener('click', window.themeCustomPopupClickTriggerHandler);
  }

  handleClickTrigger(event) {
    const id = this.dataset.popupTriggerId;
    if (!id) return;

    const trigger = event.target.closest(`a[href="#${id}"], button[data-open-popup="${id}"]`);
    if (!trigger) return;

    event.preventDefault();
    this.show(trigger);
  }

  handleCopyToClipboard() {
    const closedElements = JSON.parse(localStorage.getItem('theme-closed-elements')) || [];
    if (this.dataset.mode === "test" || !closedElements.includes(this.dataset.popupId)) this.show();
  }

  handleStoreLeave(event) {
    const closedElements = JSON.parse(localStorage.getItem('theme-closed-elements')) || [];
    if ((this.dataset.mode === "test" || !closedElements.includes(this.dataset.popupId)) && event.clientY < 0) this.show();
  }

  hide(preventAnimation) {
    if (!Shopify.designMode || this.dataset.teOnly) {
      const closedElements = JSON.parse(localStorage.getItem('theme-closed-elements')) || [];
      if (!closedElements.includes(this.dataset.popupId)) {
        closedElements.push(this.dataset.popupId);
      }
      localStorage.setItem('theme-closed-elements', JSON.stringify(closedElements));
    }
    super.hide(preventAnimation);
  }
}
customElements.define('custom-popup', CustomPopup);

class ModalOpener extends HTMLElement {
  constructor() {
    super();
    const button = this.querySelector('button:not(.product__media-toggle-play)');

    if (!button) return;
    button.addEventListener('click', () => {
      const elements = document.querySelectorAll(this.getAttribute('data-modal'));
      const modal = elements.length ? elements[elements.length - 1] : null;
      if (modal) modal.show(button, this.dataset.modalClass);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class ScriptLoader {
  static loadedScripts = {};

  static loadScript(url, onloadCallback) {
    if (ScriptLoader.loadedScripts[url]) {
      return;
    }

    const scriptTag = document.createElement('script');
    scriptTag.src = url;

    if (onloadCallback && typeof onloadCallback === 'function') {
      scriptTag.onload = onloadCallback;
    }

    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(scriptTag, firstScriptTag);

    ScriptLoader.loadedScripts[url] = true;
  }
}

window.onYouTubeIframeAPIReady = () => {
  document.dispatchEvent(new CustomEvent('youtubeApiLoaded'));
}

class CustomVideo extends HTMLElement {
  constructor() {
    super();
    this.video = this.querySelector('.js-video');
    this.contentTimerElem = this.closest('[data-content-timer]');

    if (this.contentTimerElem) {
      if (this.closest('.banner--mobile-bottom') && window.matchMedia('(max-width: 749.98px)').matches) {
        // Show immediately if we're on mobile and text is below
        this.contentTimerElem.setAttribute('data-content-timer', 'show');
      } else {
        this.playTime = 0;
        this.timerCompleted = false;
        this.contentTimer = parseInt(this.contentTimerElem.dataset.contentTimer);
      }
    }

    if (this.video.classList.contains('js-youtube')) {
      this.type = 'youtube';
      this.aspectRatio = parseFloat(this.video.dataset.aspectRatio);
    } else if (this.video.classList.contains('js-vimeo')) {
      this.type = 'vimeo';
      this.aspectRatio = parseFloat(this.video.dataset.aspectRatio);
    } else {
      this.type = 'html5';
    }

    this.deferredMedia = this.closest('.deferred-media');
    this.playButton = this.closest('.section').querySelector('.deferred-media__poster-button');
    if (this.playButton) {
      this.playButton.addEventListener('click', this.playPause.bind(this));

      if (this.type === 'youtube' && document.body.classList.contains('tab-active')) {
        setTimeout(() => {
          const focusableElements = getFocusableElements(this.closest('.section'));
          if (focusableElements && focusableElements.length > 0) focusableElements[0].focus();
        }, 1000);
      }
    }
  }

  connectedCallback() {
    if (this.type === 'html5') {
      this.bindHtmlVideoListeners();
    } else if (this.type === 'youtube') {
      this.bindYoutubeVideoListeners();
    } else if (this.type === 'vimeo') {
      this.bindVimeoVideoListeners();
    }
  }

  scaleIframe() {
    const width = this.video.clientHeight * this.aspectRatio;
    const divisor = this.video.clientWidth > width ? this.video.clientWidth / width : width / this.video.clientWidth;
    const scale = (Math.ceil(divisor * 100) / 100) + 0.2;
    this.style.setProperty('--scale-factor', scale.toString());
  }

  playbackStarted(isInit) {
    if (isInit !== true) {
      this.deferredMedia.setAttribute('data-state', 'loaded');
    }

    if (this.playButton && isInit !== true) {
      this.playButton.setAttribute('data-state', 'playing');
    }

    if (this.contentTimer && !this.isTimedContent && !this.timerCompleted) {
      this.logInterval = setInterval(() => {
        if (this.isVideoPlaying) {
          this.playTime++;
          if (this.playTime >= this.contentTimer) {
            this.contentTimerElem.setAttribute('data-content-timer', 'show');
            this.timerCompleted = true;
            clearInterval(this.logInterval);
            this.isTimedContent = false;
          }
        }
      }, 1000);
      this.isTimedContent = true;
      this.isVideoPlaying = true;
    } else {
      this.isVideoPlaying = true;
    }
  }

  playbackPaused() {
    if (this.playButton) this.playButton.setAttribute('data-state', 'paused');
    if (this.contentTimer) this.isVideoPlaying = false;
  }

  playbackEnded() {
    if (this.playButton) this.playButton.setAttribute('data-state', 'ended');

    if (this.dataset.endState === 'pause_and_cover') {
      this.closest('deferred-media')?.classList.remove('deferred-media__poster-button--active');
      const stateElem = this.closest('[data-state]');
      if (stateElem) {
        stateElem.setAttribute('data-state', 'ended');
      }

    } else if (this.dataset.endState === 'loop') {
      this.playPause();
    }

    if (this.contentTimer) {
      clearInterval(this.logInterval);
      this.logInterval = null;
      this.isTimedContent = false;
    }
  }

  playPause() {
    if (this.type === 'html5') {
      if (this.video.paused) {
        requestAnimationFrame(() => this.video.play());
        if (this.playButton) this.playButton.setAttribute('data-state', 'playing');
      } else {
        this.video.pause();
        if (this.playButton) this.playButton.setAttribute('data-state', 'paused');
      }
    } else if (this.type === 'youtube') {
      const playerState = this.player.getPlayerState();
      if (playerState === YT.PlayerState.PLAYING) {
        this.player.pauseVideo();
      } else {
        requestAnimationFrame(() => this.player.playVideo());
      }
    } else if (this.type === 'vimeo') {
      this.player.getPaused().then((paused) => {
        if (paused) {
          requestAnimationFrame(() => this.player.play());
        } else {
          this.player.pause();
        }
      }).catch(function(error) {
        console.error('Error with Vimeo Player:', error);
      });
    }
  }

  bindHtmlVideoListeners() {
    setTimeout(this.playbackStarted.bind(this, true), 500);
    this.video.addEventListener('playing', this.playbackStarted.bind(this));
    this.video.addEventListener('pause', this.playbackPaused.bind(this));
    this.video.addEventListener('ended', this.playbackEnded.bind(this));
  }

  bindYoutubeVideoListeners() {
    const initYoutubePlayer = () => {
      setTimeout(this.playbackStarted.bind(this, true), 500);

      this.player = new YT.Player(this.dataset.videoId, {
        events: {
          'onStateChange': (event) => {
            switch (event.data) {
              case YT.PlayerState.PLAYING:
                this.playbackStarted();
                break;
              case YT.PlayerState.PAUSED:
                this.playbackPaused();
                break;
              case YT.PlayerState.ENDED:
                this.playbackEnded();
                break;
            }
          }
        }
      });

      this.scaleIframe();
      window.addEventListener('resizeend', this.scaleIframe.bind(this));
    }

    if (typeof YT === 'undefined') {
      document.addEventListener('youtubeApiLoaded', initYoutubePlayer, { once: true });
      ScriptLoader.loadScript("https://www.youtube.com/iframe_api");
    } else {
      initYoutubePlayer();
    }
  }

  bindVimeoVideoListeners() {
    const initVimeoPlayer = () => {
      setTimeout(this.playbackStarted.bind(this, true), 500);
      this.player = new Vimeo.Player(this.dataset.videoId);
      this.player.on('play', this.playbackStarted.bind(this));
      this.player.on('pause', this.playbackPaused.bind(this));
      this.player.on('ended', this.playbackEnded.bind(this));
      this.scaleIframe();
      window.addEventListener('resizeend', this.scaleIframe.bind(this));
    }

    if (typeof Vimeo === 'undefined') {
      document.addEventListener('vimeoApiLoaded', initVimeoPlayer, { once: true });
      ScriptLoader.loadScript("https://player.vimeo.com/api/player.js", () => {
        document.dispatchEvent(new CustomEvent('vimeoApiLoaded'));
      });
    } else {
      initVimeoPlayer();
    }
  }
}
customElements.define('custom-video', CustomVideo);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (poster) {
      poster.addEventListener('click', () => {
        this.classList.add('deferred-media__poster-button--active');
        this.loadContent();
        }, {once: true});
    }

    if ((!this.closest('.product') || this.closest('.product__social-videos')) && !Shopify.designMode) {
      this.addIntersectionObserver();
    }
  }

  addIntersectionObserver() {
    if ('IntersectionObserver' in window === false) return;

    const rootMargin = this.classList.contains('social-video-wrapper') ? 400 : 900;

    const rootMarginValue = window.innerWidth < 750 ? '0px 0px 500px 0px' : `0px 0px ${rootMargin}px 0px`;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          this.loadContent(false, false);
          observer.unobserve(this);
        }
      });
    }, { rootMargin: rootMarginValue });

    observer.observe(this);
  }

  loadContent(focus = true, pauseExistingMedia = true) {
    if (pauseExistingMedia) window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      let content;
      let media;

      if (this.tagName === "PRODUCT-MODEL") {
        window.pauseAllMedia();
        content = document.createElement('div');
        content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));
        media = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      } else {
        content = this.querySelector('template').content.firstElementChild.cloneNode(true);
        this.appendChild(content);
        media = content.querySelector('video, model-viewer, iframe');
      }

      this.setAttribute('loaded', true);

      if (media) {
        if (focus) media.focus();
        if (media.nodeName == 'VIDEO' && media.getAttribute('autoplay')) {
          // force autoplay for safari
          media.play();
        }
      }

      // Workaround for safari iframe bug
      // const formerStyle = media.getAttribute('style');
      // media.setAttribute('style', 'display: block;');
      // window.setTimeout(() => {
      //   media.setAttribute('style', formerStyle);
      // }, 0);

      window.makeTablesResponsive();
    } else if (this.classList.contains('social-video-wrapper') && window.matchMedia('(max-width: 749.98px)').matches) {
      this.querySelector('video')?.play();
    }
  }
}
customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.DEBOUNCE_TIMEOUT = this.closest('media-gallery') ? 20 : 100;
    window.initScriptOnDemand(this, this.init.bind(this));
  }

  init() {
    // ----- Internal state -----
    this._layoutMode = null;
    this._layoutRAF = null;
    this._suppressLayoutUpdate = false;
    this._isResizing = false;
    this._scrollRAF = null;
    this._isFirstRun = true;

    // Cache context checks (avoid closest() in hot paths)
    this.isQuickBuy = !!this.closest('quick-add-modal');

    // ----- Elements -----
    this.slider = this.querySelector('[id^="Slider-"]');
    if (!this.slider) return;

    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;

    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    this.isStacked = this.slider.dataset.slideType === 'stacked';
    this.isRTL = (this.closest('[dir="rtl"]') || document.documentElement).dir === 'rtl';
    if (this.isRTL) this._rtlScrollType = this.detectRtlScrollType();

    this.scrollTrack = this.querySelector('.slider-scrollbar__track');
    this.scrollIndicator = this.querySelector('.slider-scrollbar__indicator');

    // ----- Debouncers -----
    this.debouncedInitPages = debounce(this.initPages.bind(this), Shopify.designMode ? 200 : 0);
    this.debouncedUpdate = window.debounce(this.update.bind(this), this.DEBOUNCE_TIMEOUT);

    // ----- Bind handlers once (performance + removable) -----
    this._onScroll = this.debouncedUpdate.bind(this);
    this._onButtonClick = this.onButtonClick.bind(this);

    this._onResize = () => {
      this._isResizing = true;
    };

    this._onResizeEnd = () => {
      this._isResizing = false;
      // Recalculate measurements once after resize settles
      this.initPages();
      this.update();
      // Also refresh indicator position once
      if (this.sliderScrollHandler) this.sliderScrollHandler();
    };

    // Scrollbar / indicator update (RAF-throttled inside onSliderScroll)
    this.sliderScrollHandler = this.onSliderScroll.bind(this);

    // Mouse drag handlers (bound once)
    this.sliderMousedownHandler = this.onSliderMouseDown.bind(this);
    this.sliderMousemoveHandler = this.onSliderMouseMove.bind(this);
    this.sliderMouseupHandler = this.onSliderMouseUp.bind(this);

    // Scroll indicator drag handlers (bound once)
    this.scrollIndicatorMousedownHandler = this.onScrollIndicatorMouseDown.bind(this);
    this.scrollIndicatorMousemoveHandler = this.onScrollIndicatorMouseMove.bind(this);
    this.scrollIndicatorMouseupHandler = this.onScrollIndicatorMouseUp.bind(this);

    // Touch handlers (bound once)
    this._onTouchStart = this.onTouchStart.bind(this);
    this._onTouchMove = debounce(this.onTouchMove.bind(this), 200);

    // ------------------------------
    // Drag/click discrimination FIX
    // ------------------------------
    this.DRAG_THRESHOLD_PX = 6; // tweak 4–10 as desired
    this._dragMoved = false;
    this._downX = 0;
    this._downY = 0;
    this._suppressClick = false;

    // Prevent native browser drag (anchors/images) from hijacking our drag-to-scroll
    this._onDragStart = (e) => {
      // Only relevant in fine pointer mode / our mouse-drag flow
      e.preventDefault();
    };

    // Capture-phase click suppression (only when a drag happened)
    this._onCaptureClick = (e) => {
      if (!this._suppressClick) return;

      // Only suppress clicks that happen inside the slider
      if (this.slider && this.slider.contains(e.target)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };

    // ----- Init pages + observe -----
    this.initPages();

    this.resizeObserver = new ResizeObserver(() => this.debouncedInitPages());
    this.resizeObserver.observe(this.slider);

    // ----- Events -----
    this.slider.addEventListener('scroll', this._onScroll, { passive: true });

    // Capture click listener (must be capture:true)
    this.slider.addEventListener('click', this._onCaptureClick, true);
    this.slider.addEventListener('dragstart', this._onDragStart);

    if (this.nextButton && this.prevButton) {
      this.prevButton.addEventListener('click', this._onButtonClick);
      this.nextButton.addEventListener('click', this._onButtonClick);
    }

    // Track scroll bar progress
    if (this.scrollTrack && this.scrollIndicator) {
      this.slider.addEventListener('scroll', this.sliderScrollHandler, { passive: true });
      window.addEventListener('resizeend', this.sliderScrollHandler);
    }

    // Scroll bits (mouse drag)
    if (this.scrollTrack && window.matchMedia('(pointer: fine)').matches) {
      this.sliderLeft = window.innerWidth - this.slider.getBoundingClientRect().right;
      if (!this.sliderLeft) this.sliderLeft = 0;

      this.slider.addEventListener('mousedown', this.sliderMousedownHandler);
      this.slider.addEventListener('mouseup', this.sliderMouseupHandler);
      this.slider.addEventListener('mouseleave', this.sliderMouseupHandler);
      this.slider.addEventListener('mousemove', this.sliderMousemoveHandler);

      if (this.scrollIndicator && !this.isRTL) {
        this.scrollIndicatorLeft = window.innerWidth - this.scrollIndicator.getBoundingClientRect().right;
        if (!this.scrollIndicatorLeft) this.scrollIndicatorLeft = 0;

        const numSlides = parseInt(this.scrollTrack.dataset.numSlides, 10);
        if (Number.isFinite(numSlides) && numSlides > 0) {
          this.scrollMultiplier = 100 / (100 - (100 / numSlides));
        } else {
          this.scrollMultiplier = 1;
        }

        this.scrollIndicator.addEventListener('mousedown', this.scrollIndicatorMousedownHandler);
        document.addEventListener('mouseup', this.scrollIndicatorMouseupHandler);
        document.addEventListener('mousemove', this.scrollIndicatorMousemoveHandler);
      }
    }

    // Stacked swipe
    if (this.isStacked) {
      this.addEventListener('touchstart', this._onTouchStart, { passive: true });
      this.addEventListener('touchmove', this._onTouchMove, { passive: true });

      // Watch for size change
      if (this.slider.dataset.slideMobile === 'true') {
        this._updateMobileSlideSettings = () => {
          if (window.themeDevice.isMobile) {
            if (this.slider.dataset.slideType !== 'slide') {
              this.isStacked = false;
              this.oldSlideAnimation = this.slider.dataset.slideAnimation;
              this.oldSlideType = this.slider.dataset.slideType;
              this.slider.setAttribute('data-slide-animation', 'slide');
              this.slider.setAttribute('data-slide-type', 'slide');
              this.resetPages();
            }
          } else if (this.slider.dataset.slideType === 'slide') {
            this.isStacked = true;
            this.slider.setAttribute('data-slide-animation', this.oldSlideAnimation);
            this.slider.setAttribute('data-slide-type', this.oldSlideType);
            this.resetPages();
          }
        };

        window.addEventListener('resizeend', this._updateMobileSlideSettings);
        this._updateMobileSlideSettings();
      }
    }

    // Mark resizing as active immediately + settle on resizeend (hooks into your global resizeend)
    window.addEventListener('resize', this._onResize, { passive: true });
    window.addEventListener('resizeend', this._onResizeEnd);

    // Load all images after a few seconds
    this._revealTimer = setTimeout(() => {
      this.querySelectorAll('.slideshow__media.hidden').forEach((media) => media.classList.remove('hidden'));
    }, 4000);
    this._isFirstRun = false;
  }

  disconnectedCallback() {
    if (this.resizeObserver) this.resizeObserver.disconnect();
    if (this._layoutRAF) cancelAnimationFrame(this._layoutRAF);
    if (this._scrollRAF) cancelAnimationFrame(this._scrollRAF);
    if (this._revealTimer) clearTimeout(this._revealTimer);

    // Slider listeners
    this.slider?.removeEventListener('scroll', this._onScroll);
    if (this._onCaptureClick) this.slider?.removeEventListener('click', this._onCaptureClick, true);
    if (this._onDragStart) this.slider?.removeEventListener('dragstart', this._onDragStart);

    if (this.sliderScrollHandler) {
      this.slider?.removeEventListener('scroll', this.sliderScrollHandler);
      window.removeEventListener('resizeend', this.sliderScrollHandler);
    }

    // Buttons
    if (this.prevButton) this.prevButton.removeEventListener('click', this._onButtonClick);
    if (this.nextButton) this.nextButton.removeEventListener('click', this._onButtonClick);

    // Resize flags
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('resizeend', this._onResizeEnd);

    // Mouse drag
    if (this.sliderMousedownHandler) this.slider?.removeEventListener('mousedown', this.sliderMousedownHandler);
    if (this.sliderMouseupHandler) {
      this.slider?.removeEventListener('mouseup', this.sliderMouseupHandler);
      this.slider?.removeEventListener('mouseleave', this.sliderMouseupHandler);
    }
    if (this.sliderMousemoveHandler) this.slider?.removeEventListener('mousemove', this.sliderMousemoveHandler);

    // Indicator drag
    if (this.scrollIndicatorMousedownHandler)
      this.scrollIndicator?.removeEventListener('mousedown', this.scrollIndicatorMousedownHandler);
    if (this.scrollIndicatorMouseupHandler)
      document.removeEventListener('mouseup', this.scrollIndicatorMouseupHandler);
    if (this.scrollIndicatorMousemoveHandler)
      document.removeEventListener('mousemove', this.scrollIndicatorMousemoveHandler);

    // Touch
    this.removeEventListener('touchstart', this._onTouchStart);
    this.removeEventListener('touchmove', this._onTouchMove);

    if (this._updateMobileSlideSettings) {
      window.removeEventListener('resizeend', this._updateMobileSlideSettings);
    }
  }

  detectRtlScrollType() {
    const scroller = document.createElement('div');
    scroller.dir = 'rtl';
    scroller.style.width = '100px';
    scroller.style.height = '1px';
    scroller.style.overflow = 'scroll';
    scroller.style.visibility = 'hidden';
    const inner = document.createElement('div');
    inner.style.width = '200px';
    scroller.appendChild(inner);
    document.body.appendChild(scroller);

    let type;
    if (scroller.scrollLeft > 0) {
      type = 'default';
    } else {
      scroller.scrollLeft = 1;
      type = scroller.scrollLeft === 0 ? 'negative' : 'reverse';
    }

    document.body.removeChild(scroller);
    return type;
  }

  getEffectiveClientWidth() {
    const baseWidth = this.slider.clientWidth;
    const style = getComputedStyle(this);

    const inlineStart = parseFloat(style.marginInlineStart) || 0;
    const inlineEnd = parseFloat(style.marginInlineEnd) || 0;

    // Only adjust if either logical margin is negative
    if (inlineStart < 0 || inlineEnd < 0) {
      const negStart = inlineStart < 0 ? inlineStart : 0;
      const negEnd = inlineEnd < 0 ? inlineEnd : 0;

      // Negative margins visually increase the viewport
      return baseWidth - negStart - negEnd;
    }

    // Default behaviour (no negative margins)
    return baseWidth;
  }

  getScrollMax() {
    const effectiveClientWidth = this.getEffectiveClientWidth();
    return Math.max(0, this.slider.scrollWidth - effectiveClientWidth);
  }

  getNormalizedScrollLeft() {
    if (!this.isRTL) return this.slider.scrollLeft;
    const max = this.getScrollMax();
    switch (this._rtlScrollType) {
      case 'negative':
        return -this.slider.scrollLeft;
      case 'reverse':
        return max - this.slider.scrollLeft;
      case 'default':
      default:
        return this.slider.scrollLeft;
    }
  }

  applyIndicatorPos(px) {
    const maxPx = this.scrollTrack.clientWidth - this.scrollIndicator.clientWidth;
    const clamped = Math.max(0, Math.min(maxPx, px));
    if (this.isRTL) {
      this.scrollIndicator.style.right = `${clamped}px`;
      this.scrollIndicator.style.left = 'auto';
    } else {
      this.scrollIndicator.style.left = `${clamped}px`;
      this.scrollIndicator.style.right = 'auto';
    }
  }

  onSliderScroll() {
    // RAF throttle: max once per frame
    if (this._scrollRAF) return;

    this._scrollRAF = requestAnimationFrame(() => {
      this._scrollRAF = null;

      if (!this.scrollTrack || !this.scrollIndicator) return;

      if (this.isRTL) {
        if (!this.indicatorMousedown) {
          const maxScroll = this.getScrollMax();
          const normLeft = this.getNormalizedScrollLeft();
          const maxPx = this.scrollTrack.clientWidth - this.scrollIndicator.clientWidth;
          const px = maxScroll > 0 ? (normLeft / maxScroll) * maxPx : 0;
          this.applyIndicatorPos(px);
        }
      } else {
        if (!this.indicatorMousedown) {
          const scrollableWidth = this.slider.scrollWidth - this.slider.clientWidth;
          const scrollPosition = this.slider.scrollLeft;
          const scrollPercentage = scrollableWidth > 0 ? (scrollPosition / scrollableWidth) * 100 : 0;

          const maxLeft = this.scrollTrack.clientWidth - this.scrollIndicator.clientWidth;
          const leftPosition = (scrollPercentage * maxLeft) / 100;
          this.scrollIndicator.style.left = `${leftPosition}px`;
        }
      }
    });
  }

  // ------------------------------
  // UPDATED mouse drag handlers
  // ------------------------------
  onSliderMouseDown(event) {
    // Only left click
    if (event.button !== 0) return;

    this.mousedown = true;
    this._dragMoved = false;
    this._suppressClick = false;

    this._downX = event.pageX;
    this._downY = event.pageY;

    this.slider.classList.add('drag-active');
    this.sliderScrollLeft = this.slider.scrollLeft;
    this.sliderX = event.pageX - this.sliderLeft;
  }

  onSliderMouseUp() {
    this.slider.classList.remove('is-dragging');
    this.mousedown = false;

    // If we dragged, suppress the click that often follows mouseup
    if (this._dragMoved) {
      this._suppressClick = true;
      setTimeout(() => {
        this._suppressClick = false;
      }, 0);
    }
  }

  onSliderMouseMove(event) {
    if (!this.mousedown) return;

    const dxFromDown = event.pageX - this._downX;
    const dyFromDown = event.pageY - this._downY;

    // Don’t start a drag until threshold exceeded
    if (!this._dragMoved) {
      const distance = Math.hypot(dxFromDown, dyFromDown);
      if (distance < this.DRAG_THRESHOLD_PX) return;

      this._dragMoved = true;
      this.slider.classList.add('is-dragging');
    }

    // Only prevent default once we *are* dragging
    event.preventDefault();

    this.slider.scrollLeft = this.sliderScrollLeft - (event.pageX - this.sliderLeft - this.sliderX);
  }

  onScrollIndicatorMouseDown(event) {
    document.body.classList.add('body-drag-active');
    this.slider.classList.add('drag-active');
    this.indicatorMousedown = true;
    this.scrollIndicatorScrollLeft = parseInt(this.scrollIndicator.style.left.replace('px', ''), 10) || 0;
    this.scrollIndicatorX = event.pageX - this.scrollIndicatorLeft;
  }

  onScrollIndicatorMouseUp() {
    document.body.classList.remove('body-drag-active');
    this.indicatorMousedown = false;
  }

  onScrollIndicatorMouseMove(event) {
    if (!this.indicatorMousedown) return;
    event.preventDefault();

    const left = this.scrollIndicatorScrollLeft + (event.pageX - this.scrollIndicatorLeft - this.scrollIndicatorX);

    let actualLeft;
    const maxLeft = this.scrollTrack.clientWidth - this.scrollIndicator.clientWidth;
    if (left <= 0) actualLeft = 0;
    else if (left > maxLeft) actualLeft = maxLeft;
    else actualLeft = left;

    this.scrollIndicator.style.left = `${actualLeft}px`;

    const scrollableWidth = this.scrollTrack.clientWidth;
    const scrollPercentage = (scrollableWidth > 0 ? (actualLeft / scrollableWidth) * 100 : 0) * this.scrollMultiplier;
    const scrollableSliderWidth = this.slider.scrollWidth - this.slider.clientWidth;
    this.slider.scrollLeft = (scrollableSliderWidth * scrollPercentage) / 100;
  }

  onTouchStart(event) {
    if (this.isStacked) this.touchStart = event.changedTouches[0].screenX;
  }

  onTouchMove(event) {
    if (this.isStacked && this.prevButton && this.nextButton) {
      if (event.changedTouches[0].screenX < this.touchStart - 100) this.nextButton.click();
      if (event.changedTouches[0].screenX > this.touchStart + 100) this.prevButton.click();
    } else {
      this.pause?.();
    }
  }

  initPages() {
    // Recompute visible slides
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;

    if (this.isStacked) {
      this.slidesPerPage = 1;
    } else {
      this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
      this.slidesPerPage = Math.floor(
        (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset
      );
    }

    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  setLayoutMode(mode) {
    if (this._layoutMode === mode) return;

    if (this._layoutRAF) cancelAnimationFrame(this._layoutRAF);

    this._layoutRAF = requestAnimationFrame(() => {
      this._layoutMode = mode;
      this._suppressLayoutUpdate = true;

      const isCarousel = mode === 'carousel';

      // IMPORTANT:
      // Only replace classes if they already exist.
      // Do NOT introduce desktop classes where they were never present.

      if (isCarousel) {
        if (this.classList.contains('slider-component-desktop_')) {
          this.classList.replace('slider-component-desktop_', 'slider-component-desktop');
        }

        if (this.slider.classList.contains('slider--desktop_')) {
          this.slider.classList.replace('slider--desktop_', 'slider--desktop');
        }
      } else {
        if (this.classList.contains('slider-component-desktop')) {
          this.classList.replace('slider-component-desktop', 'slider-component-desktop_');
        }

        if (this.slider.classList.contains('slider--desktop')) {
          this.slider.classList.replace('slider--desktop', 'slider--desktop_');
        }
      }

      // Allow layout decisions again once styles settle
      requestAnimationFrame(() => {
        this._suppressLayoutUpdate = false;
      });
    });
  }

  getCurrentPageFromCenteredSnap() {
    const items = this.sliderItemsToShow;
    if (!items?.length) return 1;

    const EPSILON = 1;
    const scrollPos = this.isRTL ? this.getNormalizedScrollLeft() : this.slider.scrollLeft;
    const scrollMax = this.getScrollMax();

    if (scrollPos <= EPSILON) return 1;
    if (scrollMax > 0 && scrollPos >= scrollMax - EPSILON) return items.length;

    const sliderRect = this.slider.getBoundingClientRect();
    const sliderCenter = sliderRect.left + sliderRect.width / 2;

    let closestIndex = 0;
    let closestDistance = Infinity;

    items.forEach((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const itemCenter = itemRect.left + itemRect.width / 2;
      const distance = Math.abs(itemCenter - sliderCenter);

      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    return closestIndex + 1;
  }

  update() {
    if (!this.slider || this._isResizing) return;

    const previousPage = this.currentPage;

    if (this.isStacked) {
      const visible = this.querySelector('.slideshow__slide[aria-hidden="false"]');
      if (visible) this.currentPage = parseInt(visible.dataset.slideIndex, 10);
    } else if (this.sliderItemsToShow.some((item) => getComputedStyle(item).scrollSnapAlign.includes('center'))) {
      this.currentPage = this.getCurrentPageFromCenteredSnap();
    } else {
      this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;
    }

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      if (!this.isRTL) this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      const currentSlideElem = this.sliderItemsToShow[this.currentPage - 1];

      // Eager load the next set of images (one slide ahead)
      if (currentSlideElem?.nextElementSibling) {
        const nextHiddenMedia = currentSlideElem.nextElementSibling.querySelector('.slideshow__media.hidden');
        if (nextHiddenMedia) nextHiddenMedia.classList.remove('hidden');
      }

      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: currentSlideElem,
          },
        })
      );
    }

    if (this.enableSliderLooping) {
      this.slider.classList.add('slider--scroll-active');
      return;
    }

    // Snapshot layout reads once (avoid repeated layout queries)
    const { scrollWidth, clientWidth } = this.slider;

    const items = this.sliderItemsToShow;
    const firstItem = items[0];
    const lastItem = items[items.length - 1];

    const EPSILON = 1; // px guard against sub-pixel rounding
    const hasHorizontalOverflow = scrollWidth - clientWidth > EPSILON;
    const isWrapped = firstItem && lastItem && firstItem.offsetTop !== lastItem.offsetTop;

    const isStillCarousel =
      this.isQuickBuy || // hard override
      hasHorizontalOverflow ||
      isWrapped ||
      this.isStacked;

    // Button enable/disable (does NOT drive layout mode)
    if (this.prevButton && this.nextButton) {
      const scrollMax = this.getScrollMax();
      const scrollPos = this.isRTL ? this.getNormalizedScrollLeft() : this.slider.scrollLeft;

      const hasScrollRange = scrollMax > 0 || this.tagName !== 'SLIDESHOW-COMPONENT';
      const atStart = scrollPos <= EPSILON;
      const atEnd = hasScrollRange && scrollPos >= scrollMax - EPSILON;

      if (atStart) {
        this.prevButton.setAttribute('disabled', 'disabled');
      } else {
        this.prevButton.removeAttribute('disabled');
      }

      if (atEnd && !this.isQuickBuy) {
        this.nextButton.setAttribute('disabled', 'disabled');
      } else {
        this.nextButton.removeAttribute('disabled');
      }
    }

    this.slider.classList.toggle('slider--scroll-active', isStillCarousel);

    if (this._suppressLayoutUpdate) return;

    if (this.slider.classList.contains('grid--scaled') || this._isFirstRun) {
      this.setLayoutMode(isStillCarousel ? 'carousel' : 'wrapped');
    }
  }

  isSlideVisible(element, offset = 0) {
    if (!element) return false;

    if (this.isStacked) {
      return element.getAttribute('aria-hidden') === 'false';
    }

    if (this._layoutMode === 'wrapped') {
      // Wrapped grid: slide is "visible" if it's on the first row
      return this.sliderItemsToShow[0].offsetTop === element.offsetTop;
    }

    // Carousel: geometric visibility
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return (
      element.offsetLeft + element.clientWidth <= lastVisibleSlide &&
      element.offsetLeft >= this.slider.scrollLeft
    );
  }

  getClosestElementToLeft(position) {
    let closest = null;
    let closestDistance = Infinity;

    for (const child of this.sliderItems) {
      const childLeft = child.offsetLeft;
      const distance = Math.abs(childLeft - position);

      if (distance < closestDistance) {
        closest = child;
        closestDistance = distance;
      }
    }

    return closest;
  }

  setSlidePosition(position, nextPageElem) {
    this.slider.classList.remove('drag-active');

    if (this.isStacked && nextPageElem) {
      const previousPageElem = this.sliderItemsToShow[this.currentPage - 1];

      if (this.sliderItemsToShow.length === 2 && this.prevButton && this.nextButton) {
        this.nextButton.classList.add('pointer-events-none');
        this.prevButton.classList.add('pointer-events-none');
      }

      this.slider.classList.add('pause-transition');
      requestAnimationFrame(() => this.slider.classList.remove('pause-transition'));

      // Let styles apply, then switch slides
      requestAnimationFrame(() => {
        previousPageElem?.classList.add('leaving');
        nextPageElem.classList.remove('leaving');

        previousPageElem?.setAttribute('aria-hidden', 'true');
        nextPageElem.setAttribute('aria-hidden', 'false');

        setTimeout(() => previousPageElem?.classList.remove('leaving'), 700);

        if (this.sliderItemsToShow.length === 2 && this.prevButton && this.nextButton) {
          setTimeout(() => {
            this.nextButton.classList.remove('pointer-events-none');
            this.prevButton.classList.remove('pointer-events-none');
          }, 1000);
        }

        this.debouncedUpdate();
      });
    } else {
      if (this.lastSlide) this.lastSlide.classList.remove('is-incoming');
      const nextSlide = this.getClosestElementToLeft(position);
      nextSlide?.classList.add('is-incoming');
      this.lastSlide = nextSlide;

      this.slider.scrollTo({ left: position });
    }

    this.dispatchEvent(new CustomEvent('slideChange'));
  }

  onButtonClick(event) {
    event.preventDefault();
    this.setSlide(event);
  }

  setSlide(event, isNext) {
    const step = (event && event.currentTarget.dataset.step) || 1;

    if (this.isStacked) {
      let nextPage;

      if ((event && event.currentTarget.name === 'next') || isNext) {
        this.slider.setAttribute('data-slide-direction', 'forwards');
        nextPage = this.currentPage < this.sliderItemsToShow.length ? this.currentPage + 1 : 1;
      } else {
        this.slider.setAttribute('data-slide-direction', 'backwards');
        nextPage = this.currentPage > 1 ? this.currentPage - 1 : this.sliderItemsToShow.length;
      }

      const nextPageElem = this.sliderItemsToShow[nextPage - 1];
      this.setSlidePosition(null, nextPageElem);
    } else {
      const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

      if (isLastSlide && (!event || event.currentTarget.name === 'next')) {
        this.slideScrollPosition = 0;
      } else {
        this.slideScrollPosition =
          ((event && event.currentTarget.name === 'next') || isNext)
            ? this.slider.scrollLeft + step * this.sliderItemOffset
            : this.slider.scrollLeft - step * this.sliderItemOffset;
      }

      this.setSlidePosition(this.slideScrollPosition);
    }
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.debouncedSetSlideVisibility = window.debounce(this.setSlideVisibility.bind(this), this.DEBOUNCE_TIMEOUT);

    if (Shopify.designMode) {
      document.addEventListener('shopify:block:select', event => {
        if (this.contains(event.target)) {
          this.init();

          // Attempt to not animate the slide
          this.slider.classList.add('pause-transition');
          this.pause();
          this.slider.setAttribute('data-slide-direction', 'forwards');

          setTimeout(() => {
            super.setSlidePosition(event.target.offsetLeft, event.target);
          }, 100);

          // Attempt to reanimate the slide
          setTimeout(() => {
            this.slider.classList.remove('pause-transition');
          }, 300);
        }
      });
    }
  }

  init() {
    super.init();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector('.announcement-bar-slider');
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach((link) => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.debouncedSetSlideVisibility.bind(this), { passive: true });
    this.setSlideVisibility();

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion.addEventListener('change', () => {
      if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
    });

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;
    }

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.querySelectorAll('.banner__box').forEach(slideContent => slideContent.addEventListener('mouseover', this.focusInHandling.bind(this)));
    this.querySelectorAll('.banner__box').forEach(slideContent => slideContent.addEventListener('mouseleave', this.focusOutHandling.bind(this)));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked
        ? this.pause()
        : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);

    event.target.classList.add('pointer-events-none');
    setTimeout(() => event.target.classList.remove('pointer-events-none'), 1000);

    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (!this.isStacked) {
      if (isFirstSlide && event.currentTarget.name === 'previous') {
        this.slider.setAttribute('data-slide-direction', 'backwards');
        this.slideScrollPosition =
          this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
      } else if (isLastSlide && event.currentTarget.name === 'next') {
        this.slider.setAttribute('data-slide-direction', 'forwards');
        this.slideScrollPosition = 0;
      }

      this.setSlidePosition(this.slideScrollPosition);
    }

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position, nextPageElem) {
    this.slider.classList.remove('drag-active');
    if (nextPageElem) {
     super.setSlidePosition(null, nextPageElem);
    } else {
      if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
      this.setPositionTimeout = setTimeout(() => {
        this.slider.scrollTo({
          left: position,
        });
      }, this.announcerBarAnimationDelay);
    }
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    if (this.prevButton) this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (
      !this.reducedMotion.matches &&
      !this.announcementBarArrowButtonWasClicked
    ) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        // Do nothing
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider && this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    this.setAttribute('data-paused', 'false');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    this.setAttribute('data-paused', 'true');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    this.setSlide(null, true);

    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a,button');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');

        if (this.announcementBarSlider) {
          const announcementBar = this.closest('.utility-bar');
          announcementBar.classList.forEach(className => {
            if (className.startsWith('color-')) {
              announcementBar.classList.remove(className);
              announcementBar.classList.add(item.dataset.colorScheme);
            }
          });
        }
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = 'next') {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === 'next' ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = 'announcement-bar-slider--fade-in';
    const animationClassOut = 'announcement-bar-slider--fade-out';

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext = (button === 'next' && !isLastSlide) || (button === 'previous' && isFirstSlide);
    const direction = shouldMoveNext ? 'next' : 'previous';

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    if (this.isStacked) {
      const slideIndex = parseInt(event.target.dataset.slideIndexTarget);
      super.setSlidePosition(null, this.sliderItemsToShow[slideIndex - 1]);
    } else {
      const slideScrollPosition =
        this.slider.scrollLeft +
        this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
      this.slider.scrollTo({
        left: slideScrollPosition,
      });
    }
  }
}
customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
    this.variantChangeHandler = this.onVariantChange.bind(this);
  }

  connectedCallback() {
    this.addEventListener('change', this.variantChangeHandler);
  }

  disconnectedCallback() {
    this.removeEventListener('change', this.variantChangeHandler);
  }

  onVariantChange(event) {
    const target = this.getInputForEventTarget(event.target);
    this.updateSelectionMetadata(event);

    publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
      data: {
        event,
        target,
        selectedOptionValues: this.selectedOptionValues,
      },
    });
  }

  updateSelectionMetadata({ target }) {
    const { value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      Array.from(target.options)
        .find((option) => option.getAttribute('selected'))
        .removeAttribute('selected');
      target.selectedOptions[0].setAttribute('selected', 'selected');

      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = target
        .closest('.product-form__input')
        .querySelector('[data-selected-value] > .swatch');
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }

      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = target.closest(`.product-form__input`).querySelector('[data-selected-value]');
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  get selectedOptionValues() {
    return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
      ({ dataset }) => dataset.optionValueId
    );
  }
}
customElements.define('variant-selects', VariantSelects);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (this.closest('.product')) {
      window.addEventListener('DOMContentLoaded', () => {
        setTimeout(this.fetchProductRecommendations.bind(this), 500);
      });
    }

    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      this.fetchProductRecommendations();
    };
    new IntersectionObserver(handleIntersection.bind(this), { rootMargin: '0px 0px 400px 0px' }).observe(this);
  };

  fetchProductRecommendations() {
    fetch(`${this.dataset.url}&product_id=${this.dataset.productId}&section_id=${this.dataset.sectionId}`)
      .then((response) => response.text())
      .then((text) => {
        let html = document.createElement('div');
        html.innerHTML = text.replace(/<template\b[^>]*>|<\/template>/g, '');
        const recommendations = html.querySelector('product-recommendations');

        if (recommendations && recommendations.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML.replace(/<template(?![^>]*\bdata-prevent-interpolation\b)[^>]*>[\s\S]*?<\/template>/g, '');;
        }

        if (!this.querySelector('.has-complementary-products') && this.classList.contains('complementary-products')) {
          this.remove();
        }

        if (html.querySelector('.grid__item')) {
          this.classList.add('product-recommendations--loaded');
        }

        window.loadDesktopOnlyTemplates();
        window.stickersReinit?.();
      })
      .catch((e) => {
        console.error(e);
      });
  }
}
customElements.define('product-recommendations', ProductRecommendations);

class AccountIcon extends HTMLElement {
  constructor() {
    super();

    this.icon = this.querySelector('.icon');
  }

  connectedCallback() {
    document.addEventListener('storefront:signincompleted', this.handleStorefrontSignInCompleted.bind(this));
  }

  handleStorefrontSignInCompleted(event) {
    if (event?.detail?.avatar) {
      this.icon?.replaceWith(event.detail.avatar.cloneNode());
    }
  }
}
customElements.define('account-icon', AccountIcon);

class BulkAdd extends HTMLElement {
  constructor() {
    super();
    this.queue = [];
    this.requestStarted = false;
    this.ids = [];
    this.cart = document.querySelector('cart-drawer');
  }

  startQueue(id, quantity, element) {
    this.queue.push({ id, quantity });
    const interval = setInterval(() => {
      if (this.queue.length > 0) {
        if (!this.requestStarted) {
          this.sendRequest(this.queue, element);
        }
      } else {
        clearInterval(interval);
      }
    }, 250);
  }

  sendRequest(queue, element) {
    this.requestStarted = true;
    const items = {};
    queue.forEach((queueItem) => {
      items[parseInt(queueItem.id)] = queueItem.quantity;
    });
    this.queue = this.queue.filter((queueElement) => !queue.includes(queueElement));
    const quickBulkElement = this.closest('quick-order-list') || this.closest('quick-add-bulk');
    quickBulkElement.updateMultipleQty(items, element);
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;

    if (inputValue < event.target.dataset.min) {
      this.setValidity(event, index, window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min));
    } else if (inputValue > parseInt(event.target.max)) {
      this.setValidity(event, index, window.quickOrderListStrings.max_error.replace('[max]', event.target.max));
    } else if (inputValue % parseInt(event.target.step) != 0) {
      this.setValidity(event, index, window.quickOrderListStrings.step_error.replace('[step]', event.target.step));
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.startQueue(index, inputValue, event.target);
    }
  }

  getSectionsUrl() {
    if (window.pageNumber) {
      return `${window.location.pathname}?page=${window.pageNumber}`;
    } else if (window.location.href.includes(window.routes.search_url)) {
      // Preserve the search parameters in the url
      return `${window.location.pathname}${window.location.search}`
    } else {
      return window.location.pathname;
    }
  }

  getSectionInnerHTML(html, selector) {
    html = html.replace(/<template\b[^>]*>|<\/template>/g, '');
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }
}
if (!customElements.get('bulk-add')) {
  customElements.define('bulk-add', BulkAdd);
}

class LazyScript extends HTMLElement {
  constructor() {
    super();
    this.scriptLoaded = false;
    this.isEnabled = window.theme?.settings.lazyLoadJs && window.self === window.top;
  }

  connectedCallback() {
    if (!this.isEnabled) {
      // Load script immediately if lazy loading is disabled
      this.loadScript();
      return;
    }

    // If the `data-watch-element` attribute is not present, use default lazy-load logic
    const watchElementSelector = this.getAttribute('data-watch-element');

    if (watchElementSelector) {
      // If IntersectionObserver is supported, observe the target element
      if ('IntersectionObserver' in window) {
        this.observeElementVisibility(watchElementSelector);
      } else {
        // If not supported, load the script immediately
        this.loadScript();
      }
    } else {
      // If IntersectionObserver is supported, observe the lazy-script element itself
      if ('IntersectionObserver' in window) {
        this.observeScriptVisibility();
      } else {
        // If not supported, load the script immediately
        this.loadScript();
      }
    }
  }

  observeScriptVisibility() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.scriptLoaded) {
          this.loadScript();
          observer.disconnect(); // Disconnect observer after loading the script
        }
      });
    }, {
      rootMargin: `0px 0px ${ this.dataset.customThreshold || 400 }px 0px`
    });

    observer.observe(this);
  }

  observeElementVisibility(selector) {
    const targetElements = document.querySelectorAll(selector);
    if (!targetElements.length) {
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.scriptLoaded) {
          this.loadScript();
          obs.disconnect(); // Stop observing once the script is loaded
        }
      });
    }, {
      rootMargin: `0px 0px ${ this.dataset.customThreshold || 0 }px 0px`
    });

    targetElements.forEach((element) => observer.observe(element));
  }

  loadScript() {
    const scriptUrl = this.getAttribute('src');
    if (!scriptUrl) {
      console.warn('Load lazy script: Script source URL missing in the "src" attribute.');
      return;
    }

    // Check if the script has already been loaded
    if (window.loadedScripts && window.loadedScripts.includes(scriptUrl)) {
      // console.log(`Load lazy script: Script already loaded: ${scriptUrl}`);
      return; // Don't load the script again
    }

    // Add the script URL to the list of loaded scripts
    if (!window.loadedScripts) {
      window.loadedScripts = []; // Initialize if not already initialized
    }
    window.loadedScripts.push(scriptUrl);

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.defer = true;
    script.onload = () => {
      this.scriptLoaded = true;
      // console.log(`Load lazy script: Script loaded successfully: ${scriptUrl}`);
    };
    script.onerror = (error) => {
      console.error('Load lazy script: Error loading the script ', error);
    };

    document.body.appendChild(script); // Append the script to load it
  }
}
customElements.define('lazy-script', LazyScript);

class CustomAccordion extends HTMLElement {
  constructor() {
    super();

    this.detailsElem = this.querySelector('details');
    this.summaryElem = this.querySelector('summary');
    this.container = this.summaryElem.nextElementSibling;
    this.oneAtATime = this.dataset.oneAtATime;

    window.initScriptOnDemand(this, this.init.bind(this));
  }

  init() {
    if (!this.clickListener && window.getComputedStyle(this.container).transitionDuration !== '0s') {
      this.closeListener = this.handleDetailsClose.bind(this);
      this.clickListener = this.handleSummaryClick.bind(this)
      this.detailsElem.addEventListener('transitionend', this.closeListener);
      this.summaryElem.addEventListener('click', this.clickListener);
    }
  }

  reinit() {
    this.detailsElem.removeEventListener('transitionend', this.closeListener);
    this.summaryElem.removeEventListener('click', this.clickListener);
    this.init();
  }

  handleDetailsClose(evt, force) {
    if (force !== true && evt.target !== this.container) return;

    if (this.detailsElem.classList.contains('closing')) {
      this.detailsElem.open = false;
      this.detailsElem.classList.remove('closing');
    }

    this.container.removeAttribute('style');
  }

  close(preventAnimation) {
    if (this.detailsElem.open) {
      if (preventAnimation) {
        this.detailsElem.open = false;
      } else {
        this.container.style.height = `${this.container.scrollHeight}px`;
        this.detailsElem.classList.add('closing');
        requestAnimationFrame(() => this.container.style.height = '0');
        setTimeout(this.closeListener.bind(this, null, true), 450);
      }
    }
  }

  open(preventAnimation) {
    if (!this.detailsElem.open) {
      if (preventAnimation) {
        this.detailsElem.open = true;
      } else {
        this.container.style.height = '0';
        this.detailsElem.open = true;
        this.container.style.height = `${this.container.scrollHeight}px`;
        setTimeout(this.closeListener.bind(this, null, true), 450);
      }

      if (this.dataset.revealsImage) {
        const section = this.closest('.section');
        section.classList.add('interacted-with');
        const image = section.querySelector(this.dataset.revealsImage);
        const currentImage = section.querySelector('.revealed-image.reveal');
        if (image) {
          if (currentImage) currentImage.classList.remove('reveal');
          image.classList.add('reveal');
        }
      }
    }
  }

  handleSummaryClick(evt) {
    evt.preventDefault();

    if (!this.detailsElem.open) {
      // Close existing accordions
      if (this.oneAtATime) {
        this.closest(this.oneAtATime).querySelectorAll('custom-accordion').forEach(customAccordion => {
          if (customAccordion.detailsElem.open) customAccordion.close();
        });
      }

      this.open();
    } else {
      this.close();
    }
  }
}
customElements.define('custom-accordion', CustomAccordion);

class DetailsDisclosure extends HTMLElement {
  constructor() {
    super();
    this.mainDetailsToggle = this.querySelector('details');
    this.summary = this.mainDetailsToggle.querySelector('summary');
    this.content = this.summary.nextElementSibling;
    window.initScriptOnDemand(this, this.init.bind(this));
  }

  init() {
    this.mainDetailsToggle.addEventListener('focusout', this.onFocusOut.bind(this));
    this.mainDetailsToggle.addEventListener('toggle', this.onToggle.bind(this));
  }

  onFocusOut() {
    setTimeout(() => {
      if (!this.contains(document.activeElement)) this.close();
    });
  }

  onToggle() {
    if (!this.animations) this.animations = this.content.getAnimations();

    if (this.mainDetailsToggle.hasAttribute('open')) {
      this.animations.forEach((animation) => animation.play());
    } else {
      this.animations.forEach((animation) => animation.cancel());
    }
  }

  close() {
    this.mainDetailsToggle.removeAttribute('open');
    this.mainDetailsToggle.querySelector('summary').setAttribute('aria-expanded', false);
  }
}
customElements.define('details-disclosure', DetailsDisclosure);

class AccordionSearch extends HTMLElement {
  constructor() {
    super();
    window.initScriptOnDemand(this, this.init.bind(this));
  }

  init() {
    this.section = this.closest('.section');
    this.accordionContainer = this.section.querySelector('.accordion-container');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
  }

  onKeyUp(evt) {
    let hiddenFields = 0;
    let shownFields = 0;
    let isFirst = true;

    const noMatches = this.accordionContainer.querySelector('.no-matches');
    if (noMatches) noMatches.remove();

    this.section.querySelectorAll('.accordion').forEach(searchableBlock => {
      if (searchableBlock.textContent.trim().toLowerCase().includes(evt.target.value.toLowerCase())) {
        searchableBlock.removeAttribute('aria-hidden');
        shownFields++;

        if (isFirst) {
          searchableBlock.querySelector('custom-accordion').open(true);
          searchableBlock.classList.add('first-accordion');
          isFirst = false;
        } else {
          searchableBlock.classList.remove('first-accordion');
          searchableBlock.querySelector('custom-accordion').close(true);
        }
      } else {
        searchableBlock.classList.remove('first-accordion');
        searchableBlock.querySelector('custom-accordion').close(true);
        searchableBlock.setAttribute('aria-hidden', 'true');
        hiddenFields++;
      }
    });

    if (hiddenFields === 0) {
      this.section.querySelectorAll('.accordion').forEach(searchableBlock => searchableBlock.classList.remove('first-accordion'));
    }

    if (shownFields === 0) {
      this.accordionContainer.innerHTML += `<p class="no-matches mb-0 mt-0 t1">${window.strings.sections.collapsibleRows.noResults}</p>`;
    }

    this.section.querySelectorAll('.collapsible-content__heading,.collapsible-content__text,.collapsible-content__spacer').forEach(elem => {
      elem.classList.toggle('hidden', hiddenFields > 0);
    });
  }
}
customElements.define('accordion-search', AccordionSearch);

class HeaderMenu extends DetailsDisclosure {
  constructor() {
    super();

    if (Shopify.designMode) {
      this.blockSelectHandler = this.blockSelectHandler || this.onBlockSelect.bind(this);
      this.blockDeselectHandler = this.blockDeselectHandler || this.onBlockDeselect.bind(this);
      document.addEventListener('shopify:block:select', this.blockSelectHandler);
      document.addEventListener('shopify:block:deselect', this.blockDeselectHandler);
    }
  }

  init() {
    this.header = document.querySelector('.header-wrapper');

    if (window.matchMedia('(hover: hover)').matches && this.header) {
      this.mouseEnterHandler = this.onMouseEnter.bind(this);
      this.mouseLeaveHandler = this.onMouseLeave.bind(this);
      this.mouseLeaveSummaryHandler = this.onMouseLeaveSummary.bind(this);
      this.mouseOverSummaryHandler = this.onMouseOverSummary.bind(this);
      this.addEventListener('mouseenter', this.mouseEnterHandler);
      this.addEventListener('mouseleave', this.mouseLeaveHandler);
      this.summary.addEventListener('mouseleave', this.mouseLeaveSummaryHandler);
      this.summary.addEventListener('mouseover', this.mouseOverSummaryHandler);
    } else if(this.header) {
      this.clickHandler = this.onClick.bind(this);
      this.addEventListener('click', this.clickHandler);
    }
  }

  disconnectedCallback() {
    if (Shopify.designMode) {
      document.removeEventListener('shopify:block:select', this.blockSelectHandler);
      document.removeEventListener('shopify:block:deselect', this.blockDeselectHandler);
    }

    if (this.mouseEnterHandler) {
      this.removeEventListener('mouseenter', this.mouseEnterHandler);
      this.removeEventListener('mouseleave', this.mouseLeaveHandler);
      this.summary.removeEventListener('mouseleave', this.mouseLeaveSummaryHandler);
      this.summary.removeEventListener('mouseover', this.mouseOverSummaryHandler);
    }

    if (this.clickHandler) {
      this.removeEventListener('click', this.clickHandler);
    }
  }

  onBlockSelect(evt) {
    const closestHeaderMenu = evt.target.closest('header-menu');
    if (closestHeaderMenu === this && this.mainDetailsToggle.open === false) {
      this.summary.click();
      this.preventHoverClose = true;
      document.querySelector('.drawer-menu--on-scroll')?.classList.add('drawer-menu--on-scroll--paused');
    }
  }

  onBlockDeselect(evt) {
    const closestHeaderMenu = evt.target.closest('header-menu');
    if (closestHeaderMenu === this && this.mainDetailsToggle.open) {
      this.summary.click();
      this.preventHoverClose = false;
    }
    document.querySelector('.drawer-menu--on-scroll')?.classList.remove('drawer-menu--on-scroll--paused');
  }

  closeAnyOpenMenus(exceptThisOne) {
    this.header.querySelectorAll('header-menu > details[open]').forEach(menu => {
      if (menu === exceptThisOne) return;
      const headerMenu = menu.closest('header-menu');
      if (headerMenu) headerMenu.summary.click();
    });
  }

  closeAnyOpenMegaMenus() {
    this.header.querySelectorAll('.mega-menu[open]').forEach(megaMenu => {
      const headerMenu = megaMenu.closest('header-menu');
      if (headerMenu) headerMenu.summary.click();
    });
    document.querySelector('.drawer-menu--on-scroll')?.classList.remove('drawer-menu--on-scroll--paused');
  }

  onClick(evt) {
    if(!evt.target.closest('custom-accordion')) {
      this.closeAnyOpenMenus(evt.target.closest('details'));
    }
  }

  onMouseEnter() {
    window.menuHoverIntentDelay = typeof window.menuHoverIntentDelay === undefined ? 100 : window.menuHoverIntentDelay;

    this.hoverIntentTimer = setTimeout(() => {
      window.menuHoverIntentDelay = 0;

      if (this.mainDetailsToggle.open === false) {
        this.closeAnyOpenMegaMenus();
        this.classList.add('open');
        this.style.setProperty('--link-end',
          `${Number.parseInt(this.offsetTop + this.getBoundingClientRect().height) - 1}px`);
        this.style.setProperty('--header-zindex', '1');
        this.summary.click();
      }
    }, window.menuHoverIntentDelay);
  }

  onMouseLeave() {
    clearTimeout(this.hoverIntentTimer);

    if (this.mainDetailsToggle.open && !this.preventHoverClose) {
      this.classList.remove('open');
      this.summary.click();
    }
  }

  onMouseLeaveSummary() {
    this.mouseOverSummary = false;
    setTimeout(() => {
      if (!this.mouseOverSummary) {
        this.style.setProperty('--header-zindex', '0');
      }
    }, 300);
  }

  onMouseOverSummary() {
    this.mouseOverSummary = true;
  }

  onToggle() {
    if (!this.header) return;
    this.header.preventHide = this.mainDetailsToggle.open;

    if (document.documentElement.style.getPropertyValue('--header-bottom-position-desktop') !== '') return;
    document.documentElement.style.setProperty(
      '--header-bottom-position-desktop',
      `${Math.floor(this.header.getBoundingClientRect().bottom)}px`
    );
  }
}
customElements.define('header-menu', HeaderMenu);



/* CUSTOM THEME UTILITIES */
// Utility function broadcast when resizing the browser has finished
(function() {
  function dispatchResizeEndEvent() {
    const resizeEndEvent = new Event('resizeend');
    window.dispatchEvent(resizeEndEvent);
  }

  window.addEventListener('resize', debounce(dispatchResizeEndEvent, 250));
})();

// Utility function to record the tallest elements
(function() {
  window.findTallestHeight = function () {
    const elementsWithDataAttr = document.querySelectorAll('[data-find-tallest]');

    elementsWithDataAttr.forEach(element => {
      const selector = element.getAttribute('data-find-tallest');
      const childElements = element.querySelectorAll(selector);

      let tallestHeight = 0;
      childElements.forEach(child => { tallestHeight = Math.max(tallestHeight, child.offsetHeight) });

      // Set CSS variable on the original element with the tallest height
      element.style.setProperty(`--${selector.replace(/\./g, '')}-tallest`, `${tallestHeight}px`);
    });
  }

  document.addEventListener('DOMContentLoaded', window.findTallestHeight);
  window.addEventListener('resizeend', window.findTallestHeight);
  if (Shopify.designMode) document.addEventListener('shopify:section:load', window.findTallestHeight);
})();

// Attempt to maintain the height of the visible screen (including on-screen keyboard)
if (window.visualViewport) {
  (() => {
    let resizeScheduled = false;

    const updateViewportSize = () => {
      resizeScheduled = false;
      // Read visualViewport height safely after layout has settled
      const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--bvh', `${height}px`);
      });
    };

    const scheduleUpdate = () => {
      if (!resizeScheduled) {
        resizeScheduled = true;
        requestAnimationFrame(updateViewportSize);
      }
    };

    // Initial update
    document.addEventListener('DOMContentLoaded', updateViewportSize);

    // Schedule updates, not immediate recalcs
    window.addEventListener('orientationchange', scheduleUpdate);
    window.addEventListener('resizeend', scheduleUpdate);

    // On some browsers (iOS Safari) visualViewport emits resize events more precisely
    if ('visualViewport' in window) {
      visualViewport.addEventListener('resize', scheduleUpdate);
    }
  })();
}

// Utility to help make tables scrollable on mobile
window.makeTablesResponsive = function() {
  document.querySelectorAll('.rte table').forEach(table => {
    if (!table.closest('.responsive-table')) {
      const scroller = document.createElement('div');
      scroller.className = 'responsive-table';
      table.parentNode.insertBefore(scroller, table);
      scroller.appendChild(table);
    }
  });
}
makeTablesResponsive();
if (Shopify.designMode) document.addEventListener('shopify:section:load', makeTablesResponsive);

// Listen for 'overflow-hidden' being toggled on the body tag and compensate for the lack of scrollbar width
(function() {
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  // Function to toggle scrollbar compensation
  function adjustBodyPadding(hasOverflowHidden) {
    const body = document.body;
    if (hasOverflowHidden) {
      // If overflow-hidden is applied, add padding to compensate for the scrollbar width
      if (scrollbarWidth > 0 && scrollbarWidth < 25) {
        body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.style.setProperty('--temp-scrollbar-width', `${scrollbarWidth}px`);
      }
    } else {
      // Remove the added padding when overflow-hidden is removed
      body.style.paddingRight = '';
      document.body.style.setProperty('--temp-scrollbar-width', '');
    }
  }

  // Create an observer instance linked to a callback function
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.attributeName === "class") {
        const hasOverflowHidden = document.body.classList.contains('overflow-hidden');
        adjustBodyPadding(hasOverflowHidden);
      }
    });
  });

  // Start observing the body for attribute changes
  observer.observe(document.body, {
    attributes: true
  });
})();

// Observe changes to cart-icon-bubble and animate it when it changes
(function() {
  const bubble = document.getElementById('cart-icon-bubble');
  if (bubble) {
    const callback = function(mutationsList, observer) {
      for (let mutation of mutationsList) {
        if (mutation.type === 'childList') {
          const cartCount = bubble.querySelector('.cart-count-bubble');
          if (cartCount) {
            cartCount.classList.add('animate--pop');
            setTimeout(() => { cartCount.classList.remove('animate--pop') }, 250);
          }
          break;
        }
      }
    };
    const observer = new MutationObserver(callback);
    observer.observe(bubble, { childList: true, subtree: true });
  }
})();

// Anything required to hook into page scrolling
(function() {
  const header = document.querySelector('.section-header');
  if (header) {
    document.documentElement.style.setProperty('--header-start-live', `${header.getBoundingClientRect().top < 0 ? 0 : header.getBoundingClientRect().top}px`);

    window.addEventListener('scroll', () => {
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty('--header-start-live', `${header.getBoundingClientRect().top < 0 ? 0 : header.getBoundingClientRect().top}px`);
      });
    } , { passive: true });
  }
})();

// Broadcast events to indicate the browser is idle
(function () {
  const dispatchIdleEvent = () => {
    window.dispatchEvent(new Event('browserIsIdle'));
    if ('requestIdleCallback' in window) {
      setTimeout(() => {
        window.dispatchEvent(new Event('browserIsVeryIdle'));
      }, 8000);
    }
  };

  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(() => dispatchIdleEvent());
  } else {
    window.setTimeout(() => dispatchIdleEvent(), 8000);
  }
})();


/* BIND VARIOUS DOCUMENT EVENTS */
// Tab states
document.addEventListener('keydown', (evt) => {
  if (evt.code === 'Tab') {
    document.body.classList.add('tab-active');
    // setTimeout(() => { console.log(document.activeElement); }, 0);
  }
});

// General dom loaded bits
document.addEventListener('DOMContentLoaded', () => {
  loadDesktopOnlyTemplates();
  if (Shopify.designMode) document.addEventListener('shopify:section:load', window.loadDesktopOnlyTemplates);

  // General utility classes
  document.body.classList.remove('page-is-loading');

  setTimeout(() => {
    document.body.classList.remove('page-is-not-idle');
    document.body.classList.add('page-is-idle');
  }, 1000);

  // Links to other websites
  if (window.theme?.settings.externalDomainLinks) {
    document.addEventListener('click', (event) => {
      const target = event.target.tagName !== 'A' ? event.target.closest('a') : event.target;
      const ignorePrefixes = ['mailto:', 'tel:', 'file:', 'javascript:', '#'];
      if (target && target.tagName === 'A' && window.location.hostname !== new URL(target.href).hostname && !ignorePrefixes.some(prefix => target.href.startsWith(prefix)) && ['http:', 'https:'].includes(new URL(target.href).protocol)) {
        target.target = '_blank';
      }
    });
  }

  // Browser tab messages
  if (window.theme?.settings.browserTab.length > 0) {
    const originalTitle = document.title;
    let isBlurred = false;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        isBlurred = true;
        setTimeout(() => {
          if (isBlurred) document.title = window.theme?.settings.browserTab;
        }, 2000);
      } else {
        isBlurred = false;
        document.title = originalTitle;
      }
    });
  }

  // Smooth scroll to the relevant section when appropriate
  const url = new URL(window.location.href);
  if (url.search.includes('customer_posted')) {
    const anchor = url.hash;

    if (anchor) {
      // Wait a bit to let browser finish any native scrolling first
      setTimeout(() => {
        const target = document.querySelector(anchor);
        if (target && !target.closest('.section-popup')) {
          const offset = 200;
          const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      }, 500);
    }
  }
});

// Util to prevent form submit on .js-prevent-enter-submit elements
document.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && event.target.classList.contains('js-prevent-enter-submit')) {
    event.preventDefault(); // Prevent the default form submission
  }
});

// Smooth anchor scrolling
document.addEventListener('click', function (event) {
  // Check if the clicked element is an anchor link
  const anchor = event.target.closest('a[href^="#"]:not(.no-scroll)');
  if (!anchor) return;

  const targetId = anchor.getAttribute('href').slice(1);
  const targetElement = document.getElementById(targetId);

  // If the target element exists, perform smooth scrolling
  if (targetElement) {
    // Prevent the default anchor behavior
    event.preventDefault();

    // Get the header height from the CSS variable, defaulting to 0 if not set
    const headerHeight = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--header-height-live') || '0'
    );

    window.scrollTo({
      top: targetElement.getBoundingClientRect().top + window.scrollY - headerHeight,
      behavior: 'smooth',
    });
  }
});
