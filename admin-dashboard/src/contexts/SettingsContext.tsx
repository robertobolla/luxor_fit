import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type UnitSystem = 'metric' | 'imperial';
type Language = 'es' | 'en';

interface SettingsContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    unitSystem: UnitSystem;
    setUnitSystem: (system: UnitSystem) => void;
    saveSettings: (lang: Language, units: UnitSystem) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const { i18n } = useTranslation();

    const [language, setLanguageState] = useState<Language>(() => {
        return (localStorage.getItem('luxor_admin_language') as Language) || 'es';
    });

    const [unitSystem, setUnitSystemState] = useState<UnitSystem>(() => {
        return (localStorage.getItem('luxor_admin_units') as UnitSystem) || 'metric';
    });

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        i18n.changeLanguage(lang);
        localStorage.setItem('luxor_admin_language', lang);
    };

    const setUnitSystem = (system: UnitSystem) => {
        setUnitSystemState(system);
        localStorage.setItem('luxor_admin_units', system);
    };

    const saveSettings = (lang: Language, units: UnitSystem) => {
        setLanguage(lang);
        setUnitSystem(units);
    };

    // Sync initial render with i18n if needed
    useEffect(() => {
        if (i18n.language !== language) {
            i18n.changeLanguage(language);
        }
    }, []);

    return (
        <SettingsContext.Provider value={{ language, setLanguage, unitSystem, setUnitSystem, saveSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
