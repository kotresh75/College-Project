import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from '../i18n'; // Import the i18n instance
import en from '../translations/en.json';
import kn from '../translations/kn.json';
import { usePreferences } from './PreferencesContext';

const LanguageContext = createContext();

const translations = {
    en,
    kn
};

export const LanguageProvider = ({ children }) => {
    // We can sync with PreferencesContext or manage independently. 
    // Since PreferencesContext already has 'language', let's just use it/sync with it if needed,
    // or ideally, LanguageContext should be the source of truth for "active language" 
    // and PreferencesContext handles persistence via settings API.

    // For now, let's keep it simple and use local state initialized from localStorage,
    // but looking at the codebase, PreferencesContext seems to handle appearance settings.
    // Let's hook into PreferencesContext if possible, or just read from localStorage directly.

    const [language, setLanguage] = useState(localStorage.getItem('app_language') || 'en');

    useEffect(() => {
        localStorage.setItem('app_language', language);
        // Also update the document lang attribute
        document.documentElement.lang = language;
        // Sync with i18next
        if (i18n.language !== language) {
            i18n.changeLanguage(language);
        }
    }, [language]);

    // Translation function
    const t = (key, params = {}) => {
        const keys = key.split('.');
        let value = translations[language];

        for (const k of keys) {
            value = value?.[k];
            if (!value) break;
        }

        // Fallback to English if missing
        if (!value && language !== 'en') {
            let fallback = translations['en'];
            for (const k of keys) {
                fallback = fallback?.[k];
                if (!fallback) break;
            }
            value = fallback || key;
        }

        // If value is not a string (e.g. key not found or it's an object), return key or value as is
        if (typeof value !== 'string') {
            return value || key;
        }

        // Interpolation
        if (params && Object.keys(params).length > 0) {
            return value.replace(/{(\w+)}/g, (match, p1) => {
                return params[p1] !== undefined ? params[p1] : match;
            });
        }

        return value;
    };

    // Toggle function
    const toggleLanguage = () => {
        setLanguage(prev => prev === 'en' ? 'kn' : 'en');
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
