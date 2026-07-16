"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Setup i18next multilingue. Importe ce fichier une fois (ex: dans un Providers client).
// Ajoute tes namespaces dans `resources`.
const resources = {
  fr: { translation: { welcome: "Bienvenue" } },
  en: { translation: { welcome: "Welcome" } },
};

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources,
      fallbackLng: "fr",
      interpolation: { escapeValue: false },
    });
}

export default i18n;
