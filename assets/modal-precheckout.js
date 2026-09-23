/**
 * Modal pre-checkout v5
 * Depende de `modal-precheckout-documents.js` → window.PrecheckoutDocuments
 * (catálogo de documentos + validación/normalización).
 *
 * Índice:
 *   1. Referencias DOM, constantes y estado
 *   2. Utilidades generales
 *   3. Provincias Shopify (Country Service)
 *   4. País activo
 *   5. Borrador (localStorage)
 *   6. Carrito pendiente (split cart)
 *   7. Niveles geográficos
 *   8. Modal — apertura y carga de datos
 *   9. Fulfillment groups
 *  10. Validación del formulario
 *  11. Checkout (guardar y redirección)
 *  12. Resumen de carrito en el modal
 *  13. Eventos (listeners)
 *  14. Floating labels
 *  15. Inicialización
 */
document.addEventListener("DOMContentLoaded", async function () {
    const Docs = window.PrecheckoutDocuments;
    if (!Docs || typeof Docs.getRule !== "function") {
        console.error(
            "[precheckout v5] Falta window.PrecheckoutDocuments. Carga modal-precheckout-documents.js antes de modal-precheckout.js."
        );
        return;
    }

    // ─── 1. Referencias DOM, constantes y estado ───────────────────────────────

    const modalElement = document.querySelector(".modal-checkout-address") || null;
    const closeModalButton = document.getElementById("close-modal-checkout") || null;
    const backModalButton = document.getElementById("btn-close-modal") || null;
    const saveCheckoutButton = document.getElementById("btn-save-pre-checkout") || null;

    const emailInput = document.getElementById("email-client");
    const firstNameInput = document.getElementById("first-name-client");
    const lastNameInput = document.getElementById("last-name-client");
    /** Documento de identidad: `RUT-client` o `dni-client` (mismo campo, ids distintos por tienda). */
    const dniInput = document.getElementById("RUT-client") || document.getElementById("dni-client");
    const docTypeSelect = document.getElementById("doc-type-client");
    const docNumberLabel = document.getElementById("doc-number-label");
    const addressInput = document.getElementById("address-client");
    const phoneInput = document.getElementById("phone-client");
    const level1Select = document.getElementById("level1-client");
    const level2Select = document.getElementById("level2-client");
    const level3Select = document.getElementById("level3-client");

    const termsClientCheckbox = document.querySelector("#terms-client");

    const itemsCartContainer = document.getElementById("items-cart-pop-up");
    const totalPriceContainer = document.getElementById("price-with-discount-cart-pop-up");

    const PRECHECKOUT_DRAFT_STORAGE_KEYS = ["modalPrecheckoutDraft", "modalPrecheckoutData"];
    const GEO_LEVELS_STORAGE_KEY = "geographicLevels";
    const SHOPIFY_COUNTRY_SERVICE_URL = "https://country-service.shopifycloud.com/graphql";
    const pendingCartMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

    let cartData = null;
    let productsArray = [];
    let geographicData = null;
    let cachedCountryCode = "";
    const shopifyProvincesMapCache = Object.create(null);
    const shopifyProvincesLoadPromises = Object.create(null);
    let precheckoutDraftSaveTimer = null;
    let geographicListenersBound = false;
    let validationListenersBound = false;
    let docTypeListenerBound = false;
    let modalOpenCartRefreshTimer = null;
    let geographicLevelsLoadPromise = null;
    let modalCartLoadPromise = null;

    // Documentos: catálogo/validación en window.PrecheckoutDocuments; aquí solo DOM/país activo.
    function docTypesForCountry(cc) {
        return Docs.getTypesForCountry(cc || getActiveCountryCode());
    }

    function getSelectedDocTypeId() {
        return gid(docTypeSelect?.value) || docTypesForCountry()[0]?.id || "DOC";
    }

    const docRule = (cc, typeId) =>
        Docs.getRule(cc || getActiveCountryCode(), typeId || getSelectedDocTypeId());
    const normDoc = (v, cc, typeId) =>
        Docs.normalize(v, cc || getActiveCountryCode(), typeId || getSelectedDocTypeId());
    const validDoc = (v) => Docs.isValid(v, getActiveCountryCode(), getSelectedDocTypeId());

    function getSelectedDocumentTypeExternalId() {
        return gid(docRule().typeId);
    }

    function getSelectedDocumentName() {
        return gid(docRule().label);
    }

    function syncDocumentTypeUI(preferredTypeId) {
        const types = docTypesForCountry();
        const preferred = String(preferredTypeId || getSelectedDocTypeId() || "").toUpperCase();
        const selected =
            types.find((t) => String(t.id).toUpperCase() === preferred)?.id || types[0]?.id || "DOC";

        if (docTypeSelect) {
            const frag = document.createDocumentFragment();
            types.forEach((t) => {
                const opt = document.createElement("option");
                opt.value = t.id;
                opt.textContent = t.label;
                frag.appendChild(opt);
            });
            docTypeSelect.replaceChildren(frag);
            applySelectValue(docTypeSelect, selected);
        }

        const rule = docRule(undefined, selected);
        if (docNumberLabel) docNumberLabel.textContent = rule.label || "Documento";
        if (dniInput) {
            dniInput.maxLength = rule.max;
            if (dniInput.value) dniInput.value = normDoc(dniInput.value, undefined, selected);
        }
    }

    function bindDocTypeListenerOnce() {
        if (docTypeListenerBound || !docTypeSelect) return;
        docTypeListenerBound = true;
        docTypeSelect.addEventListener("change", () => {
            applySelectValue(docTypeSelect, docTypeSelect.value);
            syncDocumentTypeUI(docTypeSelect.value);
            if (dniInput) dniInput.setAttribute("data-touched", "true");
            validateForm();
            schedulePrecheckoutDraftSave();
        });
    }

    function getFormFieldRules() {
        return [
            { element: termsClientCheckbox, type: "checked", message: "Debes aceptar los términos y condiciones" },
            { element: emailInput, type: "email", message: "Ingresa un correo electrónico válido" },
            { element: firstNameInput, type: "required", message: "El nombre es requerido" },
            { element: lastNameInput, type: "required", message: "Los apellidos son requeridos" },
            { element: docTypeSelect, type: "select", message: "Selecciona el tipo de documento" },
            { element: dniInput, type: "document", message: docRule().msg },
            { element: addressInput, type: "required", message: "Recuerda ingresar la direccion completa incluyendo calle, casa, apartamento." },
            { element: phoneInput, type: "phone", message: "Ingresa un número de teléfono válido" },
            { element: level3Select, type: "select", message: "Selecciona una opción" },
            { element: level2Select, type: "select", message: "Selecciona una opción" },
            { element: level1Select, type: "select", message: "Selecciona una opción" }
        ];
    }

    // ─── 2. Utilidades generales ─────────────────────────────────────────────────

    function gid(v) {
        return v == null || v === "" ? "" : String(v);
    }

    /**
     * Asigna la opción de un <select> de forma que el navegador muestre el texto elegido (no solo el placeholder).
     * `select.value = id` a veces no actualiza la vista; `selectedIndex` + segundo intento suele corregirlo.
     */
    function applySelectValue(selectEl, valueId) {
        if (!selectEl) return false;
        const v = gid(valueId);
        const opts = Array.from(selectEl.options);
        if (!v) {
            selectEl.selectedIndex = 0;
            opts.forEach((o, i) => {
                const on = i === 0;
                o.selected = on;
                if (on) o.setAttribute("selected", "selected");
                else o.removeAttribute("selected");
            });
            return true;
        }
        const idx = opts.findIndex((o) => gid(o.value) === v);
        if (idx < 0) return false;
        opts.forEach((o, i) => {
            const on = i === idx;
            o.selected = on;
            if (on) o.setAttribute("selected", "selected");
            else o.removeAttribute("selected");
        });
        selectEl.selectedIndex = idx;
        if (gid(selectEl.value) !== v) {
            selectEl.value = v;
        }
        const reassert = () => {
            if (!selectEl || !selectEl.isConnected) return;
            const fresh = Array.from(selectEl.options);
            const i2 = fresh.findIndex((o) => gid(o.value) === v);
            if (i2 < 0) return;
            selectEl.selectedIndex = i2;
            selectEl.value = v;
            fresh.forEach((o, i) => {
                o.selected = i === i2;
            });
        };
        requestAnimationFrame(reassert);
        requestAnimationFrame(() => requestAnimationFrame(reassert));
        return true;
    }

    function normName(s) {
        return String(s || "")
            .trim()
            .toUpperCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function looksLikeRegionCode(s) {
        const v = String(s || "").trim().toUpperCase();
        return /^[A-Z]{2}-[A-Z0-9]{1,4}$/.test(v);
    }

    function resolveProvinceCode(rawValue, map) {
        const raw = String(rawValue || "").trim();
        if (!raw) return "";

        const upper = raw.toUpperCase().replace(/_/g, "-");

        // 1) Si ya parece un código ISO, devolverlo normalizado.
        if (looksLikeRegionCode(upper)) return upper;

        // 2) Buscar en el diccionario probando ambas direcciones.
        if (map && typeof map === "object") {
            const target = normName(raw);
            for (const [k, v] of Object.entries(map)) {
                const keyUp = String(k || "").toUpperCase();
                const valStr = String(v == null ? "" : v);
                const valUp = valStr.toUpperCase();

                // Caso A: { código: nombre }  →  buscamos por nombre y devolvemos el código.
                if (looksLikeRegionCode(keyUp) && normName(valStr) === target) {
                    return keyUp;
                }
                // Caso B: { nombre: código }  →  buscamos por nombre (clave) y devolvemos el valor (código).
                if (looksLikeRegionCode(valUp) && normName(k) === target) {
                    return valUp;
                }
                // Caso C: { nombre: código } — GT usa códigos cortos (BVE, GUA), no PE-ICA / CR-A.
                if (normName(k) === target) {
                    if (looksLikeRegionCode(valUp)) return valUp;
                    if (looksLikeRegionCode(keyUp)) return keyUp;
                    if (valStr) return valStr;
                }
            }
        }

        return "";
    }

    // ─── 3. Provincias Shopify (Country Service) ─────────────────────────────────

    function getShopifyCountryServiceLocale() {
        const raw = (
            window.theme?.settings?.shopify_country_locale ||
            window.Shopify?.locale ||
            document.documentElement.lang ||
            "es"
        )
            .toString()
            .trim();
        const tag = raw.split(/[-_]/)[0].toUpperCase();
        return /^[A-Z]{2}$/.test(tag) ? tag : "ES";
    }

    // ─── 4. País activo ──────────────────────────────────────────────────────────

    function readCountryFromGeographicPayload(payload) {
        const code = payload?.countryAlfa2ISO3166;
        return code ? String(code).trim().toUpperCase() : "";
    }

    /** País activo: siempre dinámico (JSON geográfico, caché, borrador o Shopify). */
    function getActiveCountryCode() {
        if (cachedCountryCode) return cachedCountryCode;
        const fromLoaded = readCountryFromGeographicPayload(geographicData);
        if (fromLoaded) {
            cachedCountryCode = fromLoaded;
            return fromLoaded;
        }

        const draft = peekPrecheckoutDraft();
        if (draft?.geoCountry) return String(draft.geoCountry).trim().toUpperCase();

        try {
            const cached = localStorage.getItem(GEO_LEVELS_STORAGE_KEY);
            if (cached) {
                const fromCache = readCountryFromGeographicPayload(JSON.parse(cached));
                if (fromCache) return fromCache;
            }
        } catch (e) {
            /* ignore */
        }

        if (window.Shopify?.country) {
            return String(window.Shopify.country).trim().toUpperCase();
        }

        return "";
    }

    function shopifyProvincesStorageKey(countryCode) {
        return `shopifyProvinces:${countryCode}:${getShopifyCountryServiceLocale()}`;
    }

    function buildProvincesMapFromZones(zones) {
        const map = Object.create(null);
        for (const zone of zones || []) {
            const code = zone?.code ? String(zone.code).trim() : "";
            const name = zone?.name ? String(zone.name).trim() : "";
            if (!code) continue;
            map[code.toUpperCase()] = code;
            if (name) map[normName(name)] = code;
        }
        return map;
    }

    function findProvinceCodeInShopifyMap(name, map) {
        const direct =
            resolveProvinceCode(name, map) ||
            (map && map[normName(name)]) ||
            "";
        if (direct) return direct;
        const n = normName(name);
        if (!n || !map) return "";
        for (const [key, code] of Object.entries(map)) {
            if (!code || key === String(code).toUpperCase()) continue;
            if (key === n || key.includes(n) || n.includes(key)) return code;
        }
        return "";
    }

    /**
     * Provincias/zonas del checkout Shopify (Country Service). Mismo origen que el selector de región.
     * @see https://country-service.shopifycloud.com/graphql
     */
    function readShopifyProvincesMapFromStorage(countryCode) {
        const cc = String(countryCode || "").trim().toUpperCase();
        if (!cc || shopifyProvincesMapCache[cc]) return shopifyProvincesMapCache[cc] || null;
        try {
            const cached = localStorage.getItem(shopifyProvincesStorageKey(cc));
            if (!cached) return null;
            const parsed = JSON.parse(cached);
            if (parsed && typeof parsed === "object") {
                shopifyProvincesMapCache[cc] = parsed;
                return parsed;
            }
        } catch (e) {
            /* ignore */
        }
        return null;
    }

    async function loadShopifyProvincesMap(countryCode) {
        const cc = String(countryCode || "").trim().toUpperCase();
        if (!cc) return Object.create(null);
        if (shopifyProvincesMapCache[cc]) return shopifyProvincesMapCache[cc];

        const fromStorage = readShopifyProvincesMapFromStorage(cc);
        if (fromStorage) return fromStorage;

        if (shopifyProvincesLoadPromises[cc]) return shopifyProvincesLoadPromises[cc];

        shopifyProvincesLoadPromises[cc] = (async () => {
            const query = `query($locale: SupportedLocale!, $countryCode: SupportedCountry!) {
                country(countryCode: $countryCode, locale: $locale) {
                    zones { code name }
                }
            }`;
            const response = await fetch(SHOPIFY_COUNTRY_SERVICE_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({
                    query,
                    variables: { locale: getShopifyCountryServiceLocale(), countryCode: cc }
                })
            });
            if (!response.ok) {
                throw new Error(`Country service HTTP ${response.status}`);
            }
            const json = await response.json();
            if (json.errors?.length) {
                throw new Error(json.errors.map((e) => e.message).join("; "));
            }
            const map = buildProvincesMapFromZones(json?.data?.country?.zones);
            shopifyProvincesMapCache[cc] = map;
            try {
                localStorage.setItem(shopifyProvincesStorageKey(cc), JSON.stringify(map));
            } catch (e) {
                /* ignore */
            }
            return map;
        })();

        try {
            return await shopifyProvincesLoadPromises[cc];
        } finally {
            delete shopifyProvincesLoadPromises[cc];
        }
    }

    /** Precarga provincias en segundo plano (no bloquea UI). */
    function preloadShopifyProvinces(countryCode) {
        const cc = String(countryCode || "").trim().toUpperCase();
        if (!cc || shopifyProvincesMapCache[cc] || shopifyProvincesLoadPromises[cc]) return;
        if (readShopifyProvincesMapFromStorage(cc)) return;
        loadShopifyProvincesMap(cc).catch(() => { });
    }

    function enrichLevel3OptionsWithShopifyCodes(map) {
        if (!level3Select || !map) return;
        const opts = level3Select.options;
        for (let i = 0; i < opts.length; i++) {
            const opt = opts[i];
            if (!opt.value) continue;
            const code = findProvinceCodeInShopifyMap(opt.textContent || "", map);
            if (code) opt.dataset.shopifyProvinceCode = code;
            else delete opt.dataset.shopifyProvinceCode;
        }
    }

    function scheduleEnrichLevel3Options() {
        const cc = getActiveCountryCode();
        if (!cc || !level3Select) return;
        const cached = shopifyProvincesMapCache[cc];
        if (cached) {
            enrichLevel3OptionsWithShopifyCodes(cached);
            return;
        }
        loadShopifyProvincesMap(cc)
            .then((map) => enrichLevel3OptionsWithShopifyCodes(map))
            .catch(() => { });
    }

    // ─── 5. Borrador (localStorage) ──────────────────────────────────────────────

    function normalizePrecheckoutDraftShape(d) {
        if (!d || typeof d !== "object") return d;
        return {
            ...d,
            email: d.email ?? "",
            firstName: d.firstName ?? "",
            lastName: d.lastName ?? "",
            dni: gid(d.dni ?? d.dni2),
            docType: gid(d.docType ?? d.documentType ?? ""),
            address: d.address ?? "",
            phone: d.phone ?? "",
            level1: gid(d.level1 ?? d.level_1),
            level2: gid(d.level2 ?? d.level_2),
            level3: gid(d.level3 ?? d.level_3),
            level1Name: d.level1Name ?? d.level_1Name ?? "",
            level2Name: d.level2Name ?? d.level_2Name ?? "",
            level3Name: d.level3Name ?? d.level_3Name ?? "",
            geoCountry: d.geoCountry != null ? String(d.geoCountry) : ""
        };
    }

    function draftStorageCompleteness(d) {
        if (!d || typeof d !== "object") return 0;
        let n = 0;
        if (gid(d.email)) n += 1;
        if (gid(d.level3) || normName(d.level3Name)) n += 4;
        if (gid(d.level2) || normName(d.level2Name)) n += 2;
        if (gid(d.level1) || normName(d.level1Name)) n += 2;
        return n;
    }

    function peekPrecheckoutDraft() {
        let best = null;
        let bestScore = -1;
        for (const key of PRECHECKOUT_DRAFT_STORAGE_KEYS) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) continue;
                const parsed = JSON.parse(raw);
                if (!parsed || typeof parsed !== "object") continue;
                const sc = draftStorageCompleteness(parsed);
                if (sc > bestScore) {
                    bestScore = sc;
                    best = parsed;
                }
            } catch (e) {
                continue;
            }
        }
        if (!best) return null;
        return normalizePrecheckoutDraftShape(best);
    }

    if (modalElement) {
    }

    function savePrecheckoutDraft() {
        try {
            const optText = (sel) => {
                if (!sel || !sel.value || !sel.options || sel.selectedIndex < 0) return "";
                return (sel.options[sel.selectedIndex]?.text || "").trim();
            };
            const draft = {
                email: emailInput?.value ?? "",
                firstName: firstNameInput?.value ?? "",
                lastName: lastNameInput?.value ?? "",
                dni: dniInput?.value ?? "",
                docType: getSelectedDocTypeId(),
                docTypeId: getSelectedDocumentTypeExternalId(),
                docName: getSelectedDocumentName(),
                address: addressInput?.value ?? "",
                phone: phoneInput?.value ?? "",
                level3: level3Select?.value ?? "",
                level2: level2Select?.value ?? "",
                level1: level1Select?.value ?? "",
                level3Name: optText(level3Select),
                level2Name: optText(level2Select),
                level1Name: optText(level1Select),
                geoCountry: geographicData?.countryAlfa2ISO3166 ? String(geographicData.countryAlfa2ISO3166) : ""
            };
            const serialized = JSON.stringify(draft);
            for (const key of PRECHECKOUT_DRAFT_STORAGE_KEYS) {
                localStorage.setItem(key, serialized);
            }
        } catch (e) {
            console.warn("Modal pre-checkout: no se pudo guardar borrador", e);
        }
    }

    function schedulePrecheckoutDraftSave() {
        clearTimeout(precheckoutDraftSaveTimer);
        precheckoutDraftSaveTimer = setTimeout(savePrecheckoutDraft, 400);
    }

    // ─── 6. Carrito pendiente (split cart) ───────────────────────────────────────

    function getPendingCartStorageKeys() {
        const host = window.location.hostname;
        return [`precheckout-pending-cart:${host}`, `dockers-pending-cart:${host}`];
    }

    function getPendingCartStorageKey() {
        return getPendingCartStorageKeys()[0];
    }

    function parsePendingCartSnapshot(rawValue, storageKey) {
        const parsedValue = JSON.parse(rawValue);

        if (!parsedValue || !Array.isArray(parsedValue.items) || !parsedValue.items.length) {
            localStorage.removeItem(storageKey);
            return null;
        }

        if (parsedValue.createdAt && Date.now() - parsedValue.createdAt > pendingCartMaxAgeMs) {
            localStorage.removeItem(storageKey);
            return null;
        }

        return parsedValue;
    }

    function getPendingCartSnapshot() {
        const keys = getPendingCartStorageKeys();
        const primaryKey = getPendingCartStorageKey();

        for (const storageKey of keys) {
            try {
                const rawValue = localStorage.getItem(storageKey);
                if (!rawValue) continue;

                const parsedValue = parsePendingCartSnapshot(rawValue, storageKey);
                if (!parsedValue) continue;

                if (storageKey !== primaryKey) {
                    try {
                        localStorage.setItem(primaryKey, rawValue);
                        localStorage.removeItem(storageKey);
                    } catch (e) {
                        /* ignore */
                    }
                }

                return parsedValue;
            } catch (error) {
                console.error("Modal pre-checkout: No se pudo leer pending cart snapshot", error);
                try {
                    localStorage.removeItem(storageKey);
                } catch (e) {
                    /* ignore */
                }
            }
        }

        return null;
    }

    function clearPendingCartSnapshot() {
        try {
            getPendingCartStorageKeys().forEach((key) => localStorage.removeItem(key));
        } catch (error) {
            console.error("Modal pre-checkout: No se pudo limpiar pending cart snapshot", error);
        }
    }

    function normalizeLineItemProperties(properties) {
        if (!properties || typeof properties !== "object") {
            return null;
        }

        const normalizedProperties = {};

        Object.keys(properties).forEach((key) => {
            const value = properties[key];

            if (value === null || typeof value === "undefined" || value === "") {
                return;
            }

            normalizedProperties[key] = String(value);
        });

        return Object.keys(normalizedProperties).length ? normalizedProperties : null;
    }

    function buildPendingCartItems(allCartItems, checkoutItems) {
        const selectedQuantitiesByKey = {};

        checkoutItems.forEach((item) => {
            if (!item || !item.key) {
                return;
            }

            selectedQuantitiesByKey[item.key] = (selectedQuantitiesByKey[item.key] || 0) + (parseInt(item.quantity, 10) || 0);
        });

        return allCartItems.map((item) => {
            const selectedQuantity = selectedQuantitiesByKey[item.key] || 0;
            const remainingQuantity = Math.max(0, (parseInt(item.quantity, 10) || 0) - selectedQuantity);

            if (!remainingQuantity) {
                return null;
            }

            const pendingItem = {
                id: item.variant_id,
                quantity: remainingQuantity
            };

            const normalizedProperties = normalizeLineItemProperties(item.properties);

            if (normalizedProperties) {
                pendingItem.properties = normalizedProperties;
            }

            if (item.selling_plan_allocation && item.selling_plan_allocation.selling_plan && item.selling_plan_allocation.selling_plan.id) {
                pendingItem.selling_plan = item.selling_plan_allocation.selling_plan.id;
            } else if (item.selling_plan) {
                pendingItem.selling_plan = item.selling_plan;
            }

            return pendingItem;
        }).filter(Boolean);
    }

    function persistPendingCartItems(allCartItems, checkoutItems) {
        const pendingItems = buildPendingCartItems(allCartItems, checkoutItems);

        if (!pendingItems.length) {
            clearPendingCartSnapshot();
            return;
        }

        try {
            localStorage.setItem(getPendingCartStorageKey(), JSON.stringify({
                createdAt: Date.now(),
                items: pendingItems
            }));
            getPendingCartStorageKeys().slice(1).forEach((legacyKey) => {
                try {
                    localStorage.removeItem(legacyKey);
                } catch (e) {
                    /* ignore */
                }
            });
        } catch (error) {
            console.error("Modal pre-checkout: No se pudo guardar pending cart snapshot", error);
        }
    }

    async function restorePendingCartIfNeeded() {
        const pendingCartSnapshot = getPendingCartSnapshot();

        if (!pendingCartSnapshot) {
            return false;
        }

        try {
            const cartResponse = await fetch("/cart.js");

            if (!cartResponse.ok) {
                throw new Error(`Error al cargar el carrito para restore: ${cartResponse.statusText}`);
            }

            const currentCart = await cartResponse.json();

            if (currentCart && currentCart.item_count > 0) {
                return false;
            }

            const restoreResponse = await fetch("/cart/add.js", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },
                body: JSON.stringify({
                    items: pendingCartSnapshot.items
                })
            });

            if (!restoreResponse.ok) {
                throw new Error(`Error al restaurar carrito: ${restoreResponse.statusText}`);
            }

            clearPendingCartSnapshot();
            window.location.reload();
            return true;
        } catch (error) {
            console.error("Modal pre-checkout: No se pudo restaurar el carrito pendiente", error);
            return false;
        }
    }

    // ─── 7. Niveles geográficos ──────────────────────────────────────────────────

    function applyGeographicData(data) {
        const prev3 = level3Select ? gid(level3Select.value) : "";
        const prev2 = level2Select ? gid(level2Select.value) : "";
        const prev1 = level1Select ? gid(level1Select.value) : "";

        geographicData = data;
        cachedCountryCode = readCountryFromGeographicPayload(data);
        syncDocumentTypeUI(docTypeSelect?.value || peekPrecheckoutDraft()?.docType);
        populateSelect(level3Select, data.thirdLevel, "idLevels3", "level3Name");
        if (cachedCountryCode) {
            preloadShopifyProvinces(cachedCountryCode);
            scheduleEnrichLevel3Options();
        }

        const canKeep3 = prev3 && data.thirdLevel.some((t) => gid(t.idLevels3) === prev3);
        if (canKeep3 && level3Select) {
            applySelectValue(level3Select, prev3);
            handleLevelChange(geographicData, "level3");
            const level2Options = data.thirdLevel.find((item) => gid(item.idLevels3) === prev3)?.secondLevel || [];
            const canKeep2 = prev2 && level2Options.some((s) => gid(s.idLevel2) === prev2);
            if (canKeep2 && level2Select) {
                applySelectValue(level2Select, prev2);
                handleLevelChange(geographicData, "level2");
                const level3Data = data.thirdLevel.find((item) => gid(item.idLevels3) === prev3);
                const level1Options = level3Data?.secondLevel.find((item) => gid(item.idLevel2) === prev2)?.firstLevel || [];
                const canKeep1 = prev1 && level1Options.some((f) => gid(f.idLevel1) === prev1);
                if (canKeep1 && level1Select) {
                    applySelectValue(level1Select, prev1);
                }
            }
        } else {
            if (level2Select) {
                level2Select.innerHTML = `<option value="">Seleccione una opción</option>`;
            }
            if (level1Select) {
                level1Select.innerHTML = `<option value="">Seleccione una opción</option>`;
            }
        }
    }

    function bindGeographicListenersOnce() {
        if (geographicListenersBound || !level3Select || !level2Select) return;
        geographicListenersBound = true;
        level3Select.addEventListener("change", () => {
            handleLevelChange(geographicData, "level3");
            applySelectValue(level3Select, level3Select.value);
            schedulePrecheckoutDraftSave();
        });
        level2Select.addEventListener("change", () => {
            handleLevelChange(geographicData, "level2");
            applySelectValue(level2Select, level2Select.value);
            schedulePrecheckoutDraftSave();
        });
    }

    async function loadGeographicLevelsFromNetwork() {
        const geographicUrl = window.theme?.settings?.geographic_levels_url || "/assets/geographicLevels.json";
        const response = await fetch(geographicUrl);
        if (!response.ok) throw new Error(`Error al cargar archivo de niveles geográficos: ${response.statusText}`);
        const data = await response.json();
        applyGeographicData(data);
        try {
            localStorage.setItem(GEO_LEVELS_STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            /* ignore */
        }
        bindGeographicListenersOnce();
    }

    async function ensureGeographicMatchesDraft(draft) {
        if (!draft) return;
        const hasLevelHint = !!(gid(draft.level3) || normName(draft.level3Name));
        if (!hasLevelHint) return;

        let mismatch = false;
        const wantCountry = normName(draft.geoCountry);
        const haveCountry = normName(geographicData?.countryAlfa2ISO3166);

        if (wantCountry && haveCountry && wantCountry !== haveCountry) {
            mismatch = true;
        } else if (!geographicData?.thirdLevel) {
            mismatch = true;
        } else if (gid(draft.level3) && !geographicData.thirdLevel.some((t) => gid(t.idLevels3) === gid(draft.level3))) {
            mismatch = true;
        }

        if (!mismatch) return;

        try {
            localStorage.removeItem(GEO_LEVELS_STORAGE_KEY);
            await loadGeographicLevelsFromNetwork();
        } catch (e) {
            console.warn("Modal pre-checkout: no se pudo recargar niveles geográficos", e);
        }
    }

    function resolveLevel2Id(draft, level2Options) {
        let id2 = gid(draft.level2);
        if (id2 && !level2Options.some((s) => gid(s.idLevel2) === id2)) {
            id2 = "";
        }
        if (!id2 && normName(draft.level2Name)) {
            const n2 = normName(draft.level2Name);
            const hit2 = level2Options.find((s) => normName(s.level2Name) === n2);
            if (hit2) id2 = gid(hit2.idLevel2);
        }
        return id2;
    }

    function resolveLevel1Id(draft, level1Options) {
        let id1 = gid(draft.level1);
        if (id1 && !level1Options.some((f) => gid(f.idLevel1) === id1)) {
            id1 = "";
        }
        if (!id1 && normName(draft.level1Name)) {
            const n1 = normName(draft.level1Name);
            const hit1 = level1Options.find((f) => normName(f.level1Name) === n1);
            if (hit1) id1 = gid(hit1.idLevel1);
        }
        return id1;
    }

    function isDraftNameMatchingRegion(name) {
        const n = normName(name);
        if (!n || !geographicData?.thirdLevel) return false;
        return geographicData.thirdLevel.some((t) => normName(t.level3Name) === n);
    }

    /** Algunas integraciones guardan la región en level1 y la comuna en level3; nuestro modelo es level3=región. */
    function alignDraftLevelsForGeoModel(draft) {
        if (!draft || !geographicData?.thirdLevel) return draft;
        const l1IsRegion = isDraftNameMatchingRegion(draft.level1Name);
        const l3IsRegion = isDraftNameMatchingRegion(draft.level3Name);
        if (l1IsRegion && !l3IsRegion) {
            return {
                ...draft,
                level1: "",
                level1Name: draft.level3Name != null ? String(draft.level3Name) : "",
                level3: "",
                level3Name: draft.level1Name != null ? String(draft.level1Name) : ""
            };
        }
        return draft;
    }

    function scheduleGeoSelectSync(pairs) {
        const run = () => {
            pairs.forEach(({ el, id }) => {
                if (el && id) applySelectValue(el, id);
            });
        };
        queueMicrotask(run);
        requestAnimationFrame(run);
    }

    function restoreGeographicLevelsFromDraft(draft) {
        if (!geographicData?.thirdLevel || !level3Select) return;

        const aligned = alignDraftLevelsForGeoModel({ ...draft });
        let id3 = gid(aligned.level3);

        if (!id3 && normName(aligned.level3Name)) {
            const hit3 = geographicData.thirdLevel.find(
                (t) => normName(t.level3Name) === normName(aligned.level3Name)
            );
            if (hit3) id3 = gid(hit3.idLevels3);
        }
        if (!id3 || !geographicData.thirdLevel.some((t) => gid(t.idLevels3) === id3)) return;

        applySelectValue(level3Select, id3);
        handleLevelChange(geographicData, "level3");

        const level2Options =
            geographicData.thirdLevel.find((item) => gid(item.idLevels3) === id3)?.secondLevel || [];
        if (!level2Options.length || !level2Select) {
            scheduleGeoSelectSync([{ el: level3Select, id: id3 }]);
            return;
        }

        const id2 = resolveLevel2Id(aligned, level2Options);
        if (!id2) {
            scheduleGeoSelectSync([{ el: level3Select, id: id3 }]);
            return;
        }

        applySelectValue(level2Select, id2);
        handleLevelChange(geographicData, "level2");

        const level1Options =
            geographicData.thirdLevel
                .find((item) => gid(item.idLevels3) === id3)
                ?.secondLevel.find((item) => gid(item.idLevel2) === id2)?.firstLevel || [];

        if (!level1Options.length || !level1Select) {
            scheduleGeoSelectSync([
                { el: level3Select, id: id3 },
                { el: level2Select, id: id2 }
            ]);
            return;
        }

        const id1 = resolveLevel1Id(aligned, level1Options);
        if (!id1) {
            scheduleGeoSelectSync([
                { el: level3Select, id: id3 },
                { el: level2Select, id: id2 }
            ]);
            return;
        }

        applySelectValue(level1Select, id1);
        scheduleGeoSelectSync([
            { el: level3Select, id: id3 },
            { el: level2Select, id: id2 },
            { el: level1Select, id: id1 }
        ]);
    }

    function restorePrecheckoutDraft() {
        const draft = peekPrecheckoutDraft();
        if (!draft || typeof draft !== "object") return;

        if (emailInput) emailInput.value = draft.email || "";
        if (firstNameInput) firstNameInput.value = draft.firstName || "";
        if (lastNameInput) lastNameInput.value = draft.lastName || "";
        syncDocumentTypeUI(draft.docType);
        if (dniInput) dniInput.value = draft.dni ? normDoc(draft.dni) : "";
        if (addressInput) addressInput.value = draft.address || "";
        if (phoneInput) phoneInput.value = draft.phone || "";

        restoreGeographicLevelsFromDraft(draft);

        const markTouched = (el) => {
            if (el && el.value) el.setAttribute("data-touched", "true");
        };
        markTouched(emailInput);
        markTouched(firstNameInput);
        markTouched(lastNameInput);
        markTouched(docTypeSelect);
        markTouched(dniInput);
        markTouched(addressInput);
        markTouched(phoneInput);
        markTouched(level3Select);
        markTouched(level2Select);
        markTouched(level1Select);

        validateForm();
    }

    async function fetchGeographicLevels() {
        try {
            const cachedData = localStorage.getItem(GEO_LEVELS_STORAGE_KEY);
            if (cachedData) {
                applyGeographicData(JSON.parse(cachedData));
                bindGeographicListenersOnce();
                return;
            }

            await loadGeographicLevelsFromNetwork();
        } catch (error) {
            console.error("Error al cargar niveles geográficos:", error.message);
        }
    }

    function handleLevelChange(data, level) {
        if (!data?.thirdLevel) return;

        if (level === "level3") {
            const selectedLevel3 = gid(level3Select.value);
            const level2Options = data.thirdLevel.find((item) => gid(item.idLevels3) === selectedLevel3)?.secondLevel || [];
            populateSelect(level2Select, level2Options, "idLevel2", "level2Name");
            if (level1Select) {
                level1Select.innerHTML = `<option value="">Seleccione una opción</option>`;
            }
        } else if (level === "level2") {
            const selectedLevel3 = gid(level3Select.value);
            const selectedLevel2 = gid(level2Select.value);
            const level3Data = data.thirdLevel.find((item) => gid(item.idLevels3) === selectedLevel3);
            const level1Options = level3Data?.secondLevel.find((item) => gid(item.idLevel2) === selectedLevel2)?.firstLevel || [];
            populateSelect(level1Select, level1Options, "idLevel1", "level1Name");
        }
    }

    function populateSelect(selectElement, options, valueKey, labelKey) {
        if (!selectElement) return;
        const frag = document.createDocumentFragment();
        const emptyOpt = document.createElement("option");
        emptyOpt.value = "";
        emptyOpt.textContent = "Seleccione una opción";
        frag.appendChild(emptyOpt);
        (options || []).forEach((option) => {
            const newOption = document.createElement("option");
            newOption.value = gid(option[valueKey]);
            newOption.textContent = option[labelKey];
            frag.appendChild(newOption);
        });
        selectElement.replaceChildren(frag);
    }

    if (modalElement) {
        modalElement.style.display = "none";
    }

    // ─── 8. Modal — apertura y carga de datos ────────────────────────────────────

    function ensureGeographicLevelsLoaded() {
        if (geographicLevelsLoadPromise) return geographicLevelsLoadPromise;
        geographicLevelsLoadPromise = fetchGeographicLevels().catch((err) => {
            geographicLevelsLoadPromise = null;
            throw err;
        });
        return geographicLevelsLoadPromise;
    }

    function ensureModalCartLoaded() {
        if (modalCartLoadPromise) return modalCartLoadPromise;
        modalCartLoadPromise = loadCartData().catch((err) => {
            modalCartLoadPromise = null;
            throw err;
        });
        return modalCartLoadPromise;
    }

    async function showModal() {
        if (modalElement) {
            modalElement.style.display = "flex";
        }
        try {
            await ensureGeographicLevelsLoaded();
            modalCartLoadPromise = null;
            await ensureModalCartLoaded();
        } catch (e) {
            console.error("Modal pre-checkout: error al cargar datos del modal", e);
        }
        restorePrecheckoutDraft();
        const draft = peekPrecheckoutDraft();
        if (draft) await ensureGeographicMatchesDraft(draft);
        if (draft && geographicData?.thirdLevel) {
            restoreGeographicLevelsFromDraft(draft);
        }
        validateForm();
    }

    // Exponer función global por si se necesita abrir el modal desde otros scripts
    window.showModalPrecheckout = showModal;

    function closeModal() {
        if (modalElement) modalElement.style.display = "none";
    }

    // ─── 9. Fulfillment groups ───────────────────────────────────────────────────

    function getCartFulfillmentGroupsApi() {
        return window.theme && window.theme.cartFulfillmentGroupsApi
            ? window.theme.cartFulfillmentGroupsApi
            : null;
    }

    function canProceedWithSelectedGroup() {
        const groupingApi = getCartFulfillmentGroupsApi();

        if (!groupingApi || !groupingApi.isActive()) {
            return true;
        }

        if (groupingApi.canProceedToCheckout()) {
            return true;
        }

        groupingApi.showSelectionRequiredMessage();
        return false;
    }

    function getCheckoutItems(items) {
        const groupingApi = getCartFulfillmentGroupsApi();

        if (!groupingApi || !groupingApi.isActive()) {
            return items;
        }

        return groupingApi.getSelectedCartItems(items);
    }

    // ─── 10. Validación del formulario ───────────────────────────────────────────

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /** Teléfono genérico (7–15 dígitos; permite espacios, guiones y paréntesis en la captura). */
    function validatePhone(phone) {
        const digits = String(phone || "").replace(/\D/g, "");
        return digits.length >= 7 && digits.length <= 15;
    }

    function validateRequired(value) {
        return value.trim().length > 0;
    }

    function validateSelect(selectElement) {
        return selectElement.value && selectElement.value !== "";
    }

    function validateField(field, validationType, errorMessage) {
        if (!field?.parentNode) {
            return false;
        }

        let errorElement = field.parentNode.querySelector(".error-message");

        if (!errorElement) {
            errorElement = document.createElement("div");
            errorElement.classList.add("error-message");
            field.parentNode.appendChild(errorElement);
        }

        let isValid = false;
        const value = field.value ? field.value.trim() : "";

        if (value === "" && !field.hasAttribute('data-touched')) {
            field.classList.remove("input-error");
            errorElement.style.display = "none";
            errorElement.textContent = "";
            return false;
        }

        switch (validationType) {
            case 'email':
                isValid = validateEmail(value);
                break;
            case 'phone':
                isValid = validatePhone(value);
                break;
            case 'required':
                isValid = validateRequired(value);
                break;
            case 'select':
                isValid = validateSelect(field);
                break;
            case 'document':
                isValid = validDoc(value);
                break;
            case 'checked':
                isValid = field.checked === true;
                break;
            default:
                isValid = validateRequired(value);
        }

        if (!isValid) {
            field.classList.add("input-error");
            errorElement.textContent = errorMessage;
            errorElement.style.display = "block";
            return false;
        } else {
            field.classList.remove("input-error");
            errorElement.style.display = "none";
            errorElement.textContent = "";
            return true;
        }
    }

    function validateForm() {
        let allValid = true;
        getFormFieldRules().forEach((rule) => {
            if (rule.element && !validateField(rule.element, rule.type, rule.message)) {
                allValid = false;
            }
        });

        if (saveCheckoutButton) {
            if (allValid) {
                saveCheckoutButton.disabled = false;
                saveCheckoutButton.style.opacity = "1";
                saveCheckoutButton.style.cursor = "pointer";
            } else {
                saveCheckoutButton.disabled = true;
                saveCheckoutButton.style.opacity = "0.5";
                saveCheckoutButton.style.cursor = "not-allowed";
            }
        }

        return allValid;
    }

    function setupInputLimits() {
        syncDocumentTypeUI(docTypeSelect?.value);
        if (phoneInput) {
            phoneInput.setAttribute("maxlength", "24");
            phoneInput.removeAttribute("pattern");
            phoneInput.setAttribute("inputmode", "tel");
        }

        if (firstNameInput) {
            firstNameInput.setAttribute('maxlength', '50');
        }
        if (lastNameInput) {
            lastNameInput.setAttribute('maxlength', '50');
        }
        if (addressInput) {
            addressInput.setAttribute('maxlength', '200');
        }
    }

    function isPrecheckoutModalOpen() {
        if (!modalElement) return false;
        const d = String(modalElement.style.display || "").toLowerCase().trim();
        return d !== "none" && d !== "";
    }

    function addValidationListeners() {
        if (validationListenersBound) {
            return;
        }
        validationListenersBound = true;

        getFormFieldRules().forEach((field) => {
            if (!field.element) return;

            const runValidation = () => {
                field.element.setAttribute("data-touched", "true");
                const message =
                    field.type === "document" ? docRule().msg : field.message;
                validateField(field.element, field.type, message);
                validateForm();
                schedulePrecheckoutDraftSave();
            };

            if (field.element.tagName === "INPUT") {
                let timeout;
                field.element.addEventListener("input", () => {
                    if (field.type === "document") {
                        const v = normDoc(field.element.value);
                        if (field.element.value !== v) field.element.value = v;
                    }
                    clearTimeout(timeout);
                    if (field.type === "phone" || field.type === "document") {
                        runValidation();
                    } else {
                        timeout = setTimeout(runValidation, 300);
                    }
                });
                field.element.addEventListener("blur", () => {
                    clearTimeout(timeout);
                    runValidation();
                });
            } else if (field.element.tagName === "SELECT") {
                const onSelectUpdate = () => {
                    applySelectValue(field.element, field.element.value);
                    runValidation();
                };
                field.element.addEventListener("change", onSelectUpdate);
                field.element.addEventListener("input", onSelectUpdate);
            }
        });
    }

    // ─── 11. Checkout (guardar y redirección) ────────────────────────────────────

    window.savePreCheckout = async function () {
        if (!validateForm()) {
            alert("Por favor, completa todos los campos requeridos correctamente antes de continuar.");
            return;
        }

        const selectedProvinceText = level3Select?.options?.[level3Select.selectedIndex]?.text || "";
        const selectedOption = level3Select?.selectedOptions?.[0] || null;
        const selectedProvinceValue = level3Select?.value || "";
        let selectedProvince = selectedProvinceText.toUpperCase();
        const countryCode = getActiveCountryCode();
        if (!countryCode) {
            alert("No se pudo determinar el país. Verifica que geographicLevels.json esté cargado en la tienda.");
            return;
        }
        let provinceCode = selectedOption?.dataset?.shopifyProvinceCode || "";
        if (!provinceCode) {
            const provincesMap =
                shopifyProvincesMapCache[countryCode] ||
                readShopifyProvincesMapFromStorage(countryCode) ||
                Object.create(null);
            provinceCode =
                findProvinceCodeInShopifyMap(selectedProvinceValue, provincesMap) ||
                findProvinceCodeInShopifyMap(selectedProvinceText, provincesMap);
            if (!provinceCode) {
                try {
                    const map = await loadShopifyProvincesMap(countryCode);
                    provinceCode =
                        findProvinceCodeInShopifyMap(selectedProvinceValue, map) ||
                        findProvinceCodeInShopifyMap(selectedProvinceText, map);
                } catch (e) {
                    console.warn("Modal pre-checkout: fallo al cargar provincias Shopify", e);
                }
            }
        }
        schedulePrecheckoutDraftSave();

        if (selectedProvince === "LIMA" && countryCode === "PE") {
            selectedProvince = "LIMA (METROPOLITAN)";
            provinceCode = "PE-LMA";
        }

        const formData = {
            email: emailInput?.value ?? "",
            firstName: firstNameInput?.value ?? "",
            lastName: lastNameInput?.value ?? "",
            dni: dniInput?.value ?? "",
            docType: getSelectedDocTypeId(),
            docTypeId: getSelectedDocumentTypeExternalId(),
            docName: getSelectedDocumentName(),
            address: addressInput?.value ?? "",
            phone: phoneInput?.value ?? "",
            provinceCode: provinceCode,
            province: level3Select?.value ?? "",
            canton: level2Select?.value ?? "",
            level3String: selectedProvince,
            level2String: level2Select?.options?.[level2Select.selectedIndex]?.text?.toUpperCase(),
            district: level1Select?.value ?? "",
            level1String: level1Select?.options?.[level1Select.selectedIndex]?.text?.toUpperCase(),
            countryCode: countryCode
        };

        try {
            const checkoutUrl = buildCheckoutUrl(formData);
            await updateCartWithPrecheckoutAttributes(formData);
            const checkoutItems = getCheckoutItems((cartData && cartData.items) || []);
            persistPendingCartItems((cartData && cartData.items) || [], checkoutItems);
            window.location.href = checkoutUrl;
        } catch (error) {
            console.error("Error al procesar en el checkout:", error);
            alert("Hubo un problema al procesar el checkout. Por favor, inténtalo de nuevo.");
        }
    };

    function buildPrecheckoutCartAttributes(formData) {
        const phoneClean = String(formData.phone || "").replace(/\D/g, "");
        return {
            address_firstName: formData.firstName || "",
            address_lastName: formData.lastName || "",
            address_email: formData.email || "",
            address_phone: phoneClean,
            address_address: formData.address || "",
            address_identification_number: formData.dni || "",
            address_level3_CODE: formData.provinceCode || "",
            address_level3: formData.province || "",
            address_level2: formData.canton || "",
            address_level2_string: formData.level2String || "",
            address_level3_string: formData.level3String || "",
            address_level1: formData.district || "",
            address_level1_string: formData.level1String || "",
            dni: formData.dni || "",
            document_type: formData.docTypeId || "",
            document_name: formData.docName || "",
            country: formData.countryCode || getActiveCountryCode() || "",
            address_company: formData.dni || ""
        };
    }

    async function updateCartWithPrecheckoutAttributes(formData) {
        const base = buildPrecheckoutCartAttributes(formData);
        const attributes = {
            ...base,
            level_1: base.address_level1_string,
            level_2: base.address_level2_string,
            level_3: base.address_level3_string
        };
        const payload = { attributes: {} };
        for (const [key, value] of Object.entries(attributes)) {
            payload.attributes[key] = value == null ? "" : String(value);
        }

        const response = await fetch("/cart/update.js", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => "");
            throw new Error(errText || `Error al actualizar el carrito (${response.status})`);
        }

        return response.json();
    }

    function appendCheckoutAddressParams(params, prefix, attrs) {
        const city = `${attrs.address_level2_string} - ${attrs.address_level1_string}`;
        params.append(`checkout[${prefix}][first_name]`, attrs.address_firstName);
        params.append(`checkout[${prefix}][last_name]`, attrs.address_lastName);
        params.append(`checkout[${prefix}][address1]`, attrs.address_address);
        params.append(`checkout[${prefix}][address2]`, attrs.address_address);
        params.append(`checkout[${prefix}][country]`, attrs.country);
        params.append(`checkout[${prefix}][province]`, attrs.address_level3_CODE);
        params.append(`checkout[${prefix}][city]`, city);
        params.append(`checkout[${prefix}][phone]`, attrs.address_phone);
        params.append(`checkout[${prefix}][company]`, attrs.address_identification_number);

    }

    function buildCheckoutUrl(formData) {
        const attributes = buildPrecheckoutCartAttributes(formData);
        const params = new URLSearchParams();

        params.append("storefront", "false");
        ["shipping_address", "billing_address"].forEach((prefix) => {
            appendCheckoutAddressParams(params, prefix, attributes);
        });
        params.append("attributes[address_firstName]", attributes.address_firstName);
        params.append("attributes[address_lastName]", attributes.address_lastName);
        params.append("attributes[address_address]", attributes.address_address);
        params.append("attributes[country]", attributes.country);
        params.append("attributes[level_1]", attributes.address_level1_string);
        params.append("attributes[level_2]", attributes.address_level2_string);
        params.append("attributes[level_3]", attributes.address_level3_string);
        params.append("attributes[dni]", attributes.dni);
        params.append("attributes[document_type]", attributes.document_type);
        params.append("attributes[document_name]", attributes.document_name);
        params.append("attributes[address_phone]", attributes.address_phone);
        params.append("checkout[email]", attributes.address_email);

        if (!productsArray.length) {
            throw new Error("No hay productos seleccionados para checkout");
        }

        return `https://${window.location.hostname}/cart/${productsArray.join(",")}?${params.toString()}`;
    }

    // ─── 12. Resumen de carrito en el modal ─────────────────────────────────────

    async function loadCartData() {
        try {
            const response = await fetch("/cart.js");
            if (!response.ok) throw new Error(`Error al cargar el carrito: ${response.statusText}`);

            cartData = await response.json();
            const checkoutItems = getCheckoutItems(cartData.items);
            const checkoutTotal = checkoutItems.reduce((sum, item) => sum + item.line_price, 0);

            renderCartItems(checkoutItems);
            renderCartTotal(checkoutTotal);
        } catch (error) {
            console.error("Error al cargar el carrito:", error);
        }
    }

    function renderCartItems(items) {
        itemsCartContainer.innerHTML = "";
        if (items.length === 0) {
            itemsCartContainer.innerHTML = `<p>Tu carrito está vacío.</p>`;
            return;
        }

        productsArray = items.map(item => `${item.variant_id}:${item.quantity}`);
        items.forEach(item => {
            const itemElement = document.createElement("a");
            itemElement.classList.add("item-cart-summary-popup");
            itemElement.href = item.url;
            itemElement.innerHTML = `
                <div class="image-cart-summary-popup">
                    <img src="${item.image}" alt="${item.title}">
                </div>
                <div class="info-item-cart-summary-popup">
                    <span class="title-item-cart-pop-up">${item.title}</span>
                    <span class="price-item-cart-pop-up">${formatPrice(item.line_price)}</span>
                    <span class="variant-item-cart-pop-up">Talla: ${item.variant_title}</span>
                    <span class="cant-item-cart-pop-up">Cant: ${item.quantity}</span>
                </div>
            `;
            itemsCartContainer.appendChild(itemElement);
        });
    }

    function renderCartTotal(totalPrice) {
        totalPriceContainer.textContent = formatPrice(totalPrice);
    }

    function formatPrice(price) {
        const isChile = getActiveCountryCode() === "CL";
        if (isNaN(price)) {
            return isChile ? "$0CLP" : "$0";
        }

        const currencyCode = geographicData?.currency?.currencyCodeISO4217 || "CLP";
        const formatted = new Intl.NumberFormat("es-CL", {
            style: "currency",
            currency: currencyCode,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(price / 100);

        return isChile ? `${formatted}CLP` : formatted;
    }

    // ─── 13. Eventos (listeners) ────────────────────────────────────────────────


    document.addEventListener("click", async function (event) {
        const checkoutSelectors = [
            "#checkout",
            "button[name='checkout']",
            "input[name='checkout']",
            ".checkout-button",
            ".checkout-btn",
            ".shopify-payment-button__button",
            "a.button--checkout",
            "a[href*='/checkout']",
            "[data-cc-checkout-button]"
        ];

        // Botón "Comprar ahora" (Shopify Payment Button) en página de producto
        const buyNowButton = event.target.closest(".shopify-payment-button__button");

        // Flujo para botón "Comprar ahora": agregar al carrito por AJAX y luego abrir modal
        if (buyNowButton) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();

            const productForm = buyNowButton.closest('form[action^="/cart/add"]');
            if (!productForm) {
                console.error("Modal pre-checkout: No se encontró formulario de producto para 'Comprar ahora'");
                return;
            }

            try {
                const formData = new FormData(productForm);
                const body = new URLSearchParams(formData);

                const response = await fetch('/cart/add.js', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                    },
                    body: body.toString()
                });

                if (!response.ok) {
                    throw new Error('Error al agregar el producto al carrito');
                }

                // Notificar actualización del carrito para que el modal recargue los datos
                const cartItemAddedEvent = new CustomEvent('cart:item-added');
                document.dispatchEvent(cartItemAddedEvent);

                // Pequeña espera para asegurar que el carrito se haya actualizado antes de mostrar el modal
                setTimeout(() => {
                    showModal();
                }, 200);
            } catch (error) {
                console.error('Modal pre-checkout: Error en flujo "Comprar ahora" + modal', error);
            }

            return;
        }

        // Flujo normal de checkout (carrito, drawer, etc.)
        const isCheckoutButton = checkoutSelectors.some(sel => event.target.closest(sel));
        if (isCheckoutButton) {
            if (!canProceedWithSelectedGroup()) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                return;
            }

            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            showModal();
        }
    }, true);

    if (closeModalButton) closeModalButton.addEventListener("click", closeModal);
    if (backModalButton) backModalButton.addEventListener("click", closeModal);

    // ─── 14. Floating labels (v3) ───────────────────────────────────────────────

    function setupSTextFieldFloatingLabels() {
        const wrappers = Array.from(document.querySelectorAll('.modal-checkout-address .s-text-field'));

        function syncWrapper(wrapper) {
            const ctrl = wrapper.querySelector('.input-checkout');
            if (!ctrl) return;
            const hasValue = (ctrl.value ?? '').toString().trim().length > 0;
            wrapper.classList.toggle('is-filled', hasValue);
        }

        function syncAll() {
            wrappers.forEach(syncWrapper);
        }

        wrappers.forEach((wrapper) => {
            const ctrl = wrapper.querySelector('.input-checkout');
            if (!ctrl) return;
            const sync = () => syncWrapper(wrapper);

            ctrl.addEventListener('focus', () => wrapper.classList.add('is-focused'));
            ctrl.addEventListener('blur', () => wrapper.classList.remove('is-focused'));
            ctrl.addEventListener('input', sync);
            ctrl.addEventListener('change', sync);
            sync();

            const proto = Object.getPrototypeOf(ctrl);
            if (!proto) return;

            const patchSetter = (propName) => {
                const desc = Object.getOwnPropertyDescriptor(proto, propName);
                if (!desc || desc.configurable === false ||
                    typeof desc.set !== 'function' || typeof desc.get !== 'function') return;
                try {
                    Object.defineProperty(ctrl, propName, {
                        get() { return desc.get.call(this); },
                        set(v) { desc.set.call(this, v); sync(); },
                        configurable: true
                    });
                } catch (e) {
                    // Si la propiedad no puede ser redefinida, los listeners y el
                    // MutationObserver cubren la mayoría de transiciones.
                }
            };

            patchSetter('value');
            if (ctrl.tagName === 'SELECT') {
                patchSetter('selectedIndex');
                // populateSelect hace replaceChildren: tras reemplazar opciones,
                // re-sincronizar para reflejar el nuevo .value (normalmente "" hasta
                // que applySelectValue ajuste selectedIndex).
                if ('MutationObserver' in window) {
                    new MutationObserver(() => {
                        requestAnimationFrame(sync);
                    }).observe(ctrl, { childList: true });
                }
            }
        });

        // Re-sync al abrir/cerrar el modal (cubre asignaciones que ocurren durante
        // showModal antes de que cualquier evento del control se haya disparado).
        const modal = document.querySelector('.modal-checkout-address');
        if (modal && 'MutationObserver' in window) {
            new MutationObserver(() => {
                requestAnimationFrame(syncAll);
                requestAnimationFrame(() => requestAnimationFrame(syncAll));
            }).observe(modal, { attributes: true, attributeFilter: ['style'] });
        }
    }

    // ─── 15. Inicialización ─────────────────────────────────────────────────────

    if (saveCheckoutButton) {
        saveCheckoutButton.disabled = true;
        saveCheckoutButton.style.opacity = "0.5";
        saveCheckoutButton.style.cursor = "not-allowed";
    }

    const restoredPendingCart = await restorePendingCartIfNeeded();
    if (restoredPendingCart) {
        return;
    }

    ensureGeographicLevelsLoaded();
    bindDocTypeListenerOnce();
    setupInputLimits();
    addValidationListeners();
    setupSTextFieldFloatingLabels();

    window.reinitializeModalPrecheckout = async function () {
        if (!isPrecheckoutModalOpen()) return;
        if (modalOpenCartRefreshTimer) {
            clearTimeout(modalOpenCartRefreshTimer);
        }
        modalOpenCartRefreshTimer = setTimeout(async () => {
            modalOpenCartRefreshTimer = null;
            await loadCartData();
        }, 400);
    };

    document.addEventListener("cart:refresh", () => {
        if (!isPrecheckoutModalOpen()) return;
        setTimeout(() => window.reinitializeModalPrecheckout(), 100);
    });

    document.addEventListener("cart:item-added", () => {
        if (!isPrecheckoutModalOpen()) return;
        setTimeout(() => window.reinitializeModalPrecheckout(), 200);
    });
});
