/**
 * Precheckout document utils (v5)
 * Catálogo por país + normalización + validación (RUT CL, cédula/RUC EC).
 * Expone: window.PrecheckoutDocuments
 * Cargar ANTES de modal-precheckout.js
 */
(function (global) {
    "use strict";

    // EC: provincia 01–24|30; cédula módulo 10; RUC natural/público(6)/privado(9)
    const ecProv = (d) => {
        const p = +d.slice(0, 2);
        return (p >= 1 && p <= 24) || p === 30;
    };
    const ecMod11 = (d, c, i) => {
        let s = 0;
        for (let j = 0; j < c.length; j++) s += +d[j] * c[j];
        const v = s % 11 === 0 ? 0 : 11 - (s % 11);
        return v !== 10 && v === +d[i];
    };
    const validEcCedula = (d) => {
        if (!/^\d{10}$/.test(d) || !ecProv(d) || +d[2] > 5) return false;
        let s = 0;
        for (let i = 0; i < 9; i++) {
            let p = +d[i] * (i % 2 === 0 ? 2 : 1);
            if (p >= 10) p -= 9;
            s += p;
        }
        return (s % 10 === 0 ? 0 : 10 - (s % 10)) === +d[9];
    };
    const validEcRuc = (d) => {
        if (!/^\d{13}$/.test(d) || d.slice(10) === "000" || !ecProv(d)) return false;
        const t = +d[2];
        if (t <= 5) return validEcCedula(d.slice(0, 10));
        if (t === 6) return ecMod11(d, [3, 2, 7, 6, 5, 4, 3, 2], 8);
        if (t === 9) return ecMod11(d, [4, 3, 2, 7, 6, 5, 4, 3, 2], 9);
        return false;
    };

    const rutDv = (n) => {
        let s = 0;
        let m = 2;
        for (let i = n.length - 1; i >= 0; i--) {
            s += +n[i] * m;
            m = m === 7 ? 2 : m + 1;
        }
        const r = 11 - (s % 11);
        return r === 11 ? "0" : r === 10 ? "K" : String(r);
    };

    /**
     * Tipos de documento por país.
     * `typeId`: ID → se envía como `document_type` en checkout.
     * `label`: nombre → se envía como `document_name` en checkout.
     * Fuente: catálogo NetSuite + validaciones conocidas por país.
     */
    const DOC_TYPES_BY_COUNTRY = {
        CL: [
            { id: "RUT", typeId: "1", label: "RUT", msg: "Formato de RUT debe ser xxxxxxxx-X sin puntos", re: /^\d{7,8}-[\dK]$/, max: 10, rut: true }
        ],
        CO: [
            { id: "CEDULA", typeId: "2", label: "Cédula de ciudadanía", msg: "Ingresa una cédula válida (6 a 10 dígitos)", re: /^\d{6,10}$/, max: 10 }
        ],
        CR: [
            { id: "CEDULA", typeId: "3", label: "Cédula física", msg: "Ingresa una cédula física válida (9 dígitos)", re: /^\d{9}$/, max: 9 }
        ],
        EC: [
            { id: "CEDULA", typeId: "4", label: "Cédula", msg: "Ingresa una cédula ecuatoriana válida", re: /^\d{10}$/, max: 10, digitsOnly: true, validate: validEcCedula },
            { id: "RUC", typeId: "5", label: "RUC", msg: "Ingresa un RUC ecuatoriano válido", re: /^\d{13}$/, max: 13, digitsOnly: true, validate: validEcRuc }
        ],
        GT: [
            { id: "DPI", typeId: "7", label: "DPI", msg: "Ingresa un DPI válido (13 dígitos)", re: /^\d{13}$/, max: 13 },
            { id: "CF", typeId: "8", label: "CF", msg: "Ingresa un NIT/CF válido", re: /^[0-9K-]{5,15}$/, max: 15 }
        ],
        MX: [
            { id: "RFC", typeId: "9", label: "RFC", msg: "Ingresa un RFC válido (12 o 13 caracteres)", re: /^[A-Za-z0-9&Ññ]{12,13}$/, max: 13 }
        ],
        PA: [
            { id: "CF", typeId: "10", label: "Consumidor final", msg: "Ingresa un documento válido", re: /^[A-Za-z0-9-]{5,20}$/, max: 20 }
        ],
        PE: [
            { id: "DNI", typeId: "11", label: "DNI", msg: "Ingresa un DNI válido (8 dígitos)", re: /^\d{8}$/, max: 8 },
            { id: "CE", typeId: "12", label: "Carnet de extranjería", msg: "Ingresa un carnet de extranjería válido (9 a 12 caracteres)", re: /^[A-Za-z0-9]{9,12}$/, max: 12 },
            { id: "RUC", typeId: "13", label: "RUC", msg: "Ingresa un RUC válido (11 dígitos)", re: /^\d{11}$/, max: 11 }
        ],
        SV: [
            { id: "DUI", typeId: "14", label: "DUI", msg: "Ingresa un DUI válido (formato ########-#)", re: /^\d{8}-\d$/, max: 10 }
        ],
        UY: [
            { id: "RUC", typeId: "15", label: "RUC", msg: "Ingresa un RUC válido (12 dígitos)", re: /^\d{12}$/, max: 12 },
            { id: "CI", typeId: "16", label: "C.I.", msg: "Ingresa una cédula válida (7 u 8 dígitos)", re: /^\d{7,8}$/, max: 8 }
        ],
        _: [{ id: "DOC", typeId: "0", label: "Documento", msg: "Ingresa un documento válido", re: /^[A-Za-z0-9-]{5,20}$/, max: 32 }]
    };

    function getTypesForCountry(countryCode) {
        const key = String(countryCode || "").toUpperCase();
        return DOC_TYPES_BY_COUNTRY[key] || DOC_TYPES_BY_COUNTRY._;
    }

    function getRule(countryCode, typeId) {
        const types = getTypesForCountry(countryCode);
        const wanted = String(typeId || "").toUpperCase();
        return types.find((t) => String(t.id).toUpperCase() === wanted) || types[0] || DOC_TYPES_BY_COUNTRY._[0];
    }

    function normalize(value, countryCode, typeId) {
        const r = getRule(countryCode, typeId);
        if (r.rut) {
            let c = String(value || "")
                .replace(/\./g, "")
                .replace(/\s/g, "")
                .toUpperCase()
                .replace(/[^0-9K-]/g, "");
            const i = c.indexOf("-");
            if (i >= 0) c = c.slice(0, i + 1) + c.slice(i + 1).replace(/-/g, "");
            return c.slice(0, r.max);
        }
        if (r.digitsOnly) return String(value || "").replace(/\D/g, "").slice(0, r.max);
        return String(value || "").replace(/\s/g, "").trim().slice(0, r.max);
    }

    function isValid(value, countryCode, typeId) {
        const r = getRule(countryCode, typeId);
        const x = String(value || "").trim().toUpperCase();
        if (!r.re.test(x)) return false;
        if (r.rut && rutDv(x.split("-")[0]) !== x.split("-")[1]) return false;
        if (typeof r.validate === "function" && !r.validate(x)) return false;
        return true;
    }

    global.PrecheckoutDocuments = {
        DOC_TYPES_BY_COUNTRY,
        getTypesForCountry,
        getRule,
        normalize,
        isValid,
        validEcCedula,
        validEcRuc,
        rutDv
    };
})(typeof window !== "undefined" ? window : globalThis);
