import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import he from './locales/he.json';

export const defaultNS = 'common';

export const resources = {
  he: { common: he },
  en: { common: en },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: 'he',
  fallbackLng: 'he',
  supportedLngs: ['he'],
  defaultNS,
  ns: ['common'],
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
