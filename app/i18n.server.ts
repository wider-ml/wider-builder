import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import fr from './locales/fr.json';

export function createServerI18n() {
  const instance = i18next.createInstance();
  instance.use(initReactI18next).init({
    resources: { en: { translation: en }, fr: { translation: fr } },
    fallbackLng: 'en',
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    initImmediate: false, // <- synchronous init for SSR
  });

  return instance;
}
