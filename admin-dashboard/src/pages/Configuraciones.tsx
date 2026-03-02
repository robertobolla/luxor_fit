import React, { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from 'react-i18next';
import { useToastContext } from '../contexts/ToastContext';

export default function Configuraciones() {
    const { language, unitSystem, saveSettings } = useSettings();
    const { t } = useTranslation();
    const { success } = useToastContext();

    const [tempLang, setTempLang] = useState(language);
    const [tempUnits, setTempUnits] = useState(unitSystem);

    const handleSave = () => {
        saveSettings(tempLang, tempUnits);
        success(t('settings.saved'));
    };

    const S = {
        page: { padding: '2rem', maxWidth: 800, margin: '0 auto', width: '100%' } as React.CSSProperties,
        title: { fontSize: '1.8rem', fontWeight: 'bold', color: '#fff', marginBottom: '2rem', marginTop: 0 } as React.CSSProperties,
        card: { background: '#111', borderRadius: 12, padding: '1.5rem', border: '1px solid #222', display: 'flex', flexDirection: 'column', gap: '1.5rem' } as React.CSSProperties,
        field: { display: 'flex', flexDirection: 'column', gap: '0.5rem' } as React.CSSProperties,
        label: { color: '#888', fontSize: '0.9rem', fontWeight: 600 } as React.CSSProperties,
        select: { background: '#0a0a0a', border: '1px solid #333', color: '#fff', padding: '0.8rem', borderRadius: 8, fontSize: '1rem', outline: 'none', cursor: 'pointer' } as React.CSSProperties,
        btn: { background: '#ffb300', color: '#000', border: 'none', padding: '0.8rem 1.5rem', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', alignSelf: 'flex-start', fontSize: '1rem', marginTop: '1rem' } as React.CSSProperties,
    };

    return (
        <div style={S.page}>
            <h1 style={S.title}>⚙️ {t('settings.title')}</h1>

            <div style={S.card}>
                <div style={S.field}>
                    <label style={S.label}>{t('settings.language')}</label>
                    <select style={S.select} value={tempLang} onChange={e => setTempLang(e.target.value as any)}>
                        <option value="es">🇪🇸 {t('settings.spanish')}</option>
                        <option value="en">🇺🇸 {t('settings.english')}</option>
                    </select>
                </div>

                <div style={S.field}>
                    <label style={S.label}>{t('settings.units')}</label>
                    <select style={S.select} value={tempUnits} onChange={e => setTempUnits(e.target.value as any)}>
                        <option value="metric">{t('settings.metric')}</option>
                        <option value="imperial">{t('settings.imperial')}</option>
                    </select>
                </div>

                <button style={S.btn} onClick={handleSave}>
                    💾 {t('settings.save')}
                </button>
            </div>
        </div>
    );
}
