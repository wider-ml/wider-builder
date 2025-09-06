// app/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import fr from './locales/fr.json';

i18n
  .use(LanguageDetector) // detect language in browser (localStorage, navigator, htmlTag...)
  .use(initReactI18next) // connect with react
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    initImmediate: false,
    fallbackLng: 'en',
    debug: true, // set to true for debugging on console
    interpolation: { escapeValue: false },

    /*
     * detection: {
     *   order: ['localStorage', 'navigator', 'htmlTag'],
     *   caches: ['localStorage'], // cache user language on localStorage
     * },
     */
    detection: {
      order: ['navigator', 'htmlTag'],
      caches: [],
    },
  });

export default i18n;
