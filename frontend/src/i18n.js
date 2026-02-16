import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './translations/en.json';
import kn from './translations/kn.json';

const resources = {
    en: {
        translation: en
    },
    kn: {
        translation: kn
    }
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: localStorage.getItem('app_language') || 'en', // Use the same storage key as LanguageContext
        fallbackLng: 'en',
        interpolation: {
            escapeValue: false // react already safes from xss
        }
    });

export default i18n;
