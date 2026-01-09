import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import es from './locales/es.json';
import en from './locales/en.json';

const LANGUAGE_KEY = '@luxor_language';

export const resources = {
  es: { translation: es },
  en: { translation: en },
};

export type LanguageCode = 'es' | 'en';

export const languages: { code: LanguageCode; name: string; nativeName: string; flag: string }[] = [
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
];

// Obtener el idioma guardado o el del dispositivo
const getStoredLanguage = async (): Promise<LanguageCode> => {
  try {
    const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (storedLang && (storedLang === 'es' || storedLang === 'en')) {
      return storedLang;
    }
  } catch (error) {
    console.warn('Error reading stored language:', error);
  }
  
  // Usar el idioma del dispositivo si no hay uno guardado
  const deviceLang = Localization.getLocales()[0]?.languageCode;
  return deviceLang === 'en' ? 'en' : 'es'; // Por defecto español si no es inglés
};

// Guardar el idioma seleccionado
export const setStoredLanguage = async (lang: LanguageCode): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch (error) {
    console.warn('Error storing language:', error);
  }
};

// Cambiar el idioma
export const changeLanguage = async (lang: LanguageCode): Promise<void> => {
  await i18n.changeLanguage(lang);
  await setStoredLanguage(lang);
};

// Inicializar i18n
const initI18n = async () => {
  const storedLanguage = await getStoredLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: storedLanguage,
      fallbackLng: 'es',
      compatibilityJSON: 'v4',
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
    });
};

// Inicializar al importar
initI18n();

export default i18n;


