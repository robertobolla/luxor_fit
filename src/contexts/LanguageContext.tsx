import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage, languages, LanguageCode } from '../i18n';

const LANGUAGE_KEY = '@luxor_language';

interface LanguageContextType {
  currentLanguage: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  languages: typeof languages;
  isLoading: boolean;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>((i18n.language as LanguageCode) || 'es');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Cargar idioma guardado al iniciar
    const loadLanguage = async () => {
      try {
        const storedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (storedLang && (storedLang === 'es' || storedLang === 'en')) {
          setCurrentLanguage(storedLang);
          if (i18n.language !== storedLang) {
            await i18n.changeLanguage(storedLang);
          }
        }
      } catch (error) {
        console.warn('Error loading language:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadLanguage();
  }, [i18n]);

  const setLanguage = useCallback(async (lang: LanguageCode) => {
    try {
      setIsLoading(true);
      await changeLanguage(lang);
      setCurrentLanguage(lang);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage,
        languages,
        isLoading,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}


