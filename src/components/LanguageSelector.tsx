import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { LanguageCode } from '../i18n';

interface LanguageSelectorProps {
  style?: 'compact' | 'full' | 'minimal';
  showLabel?: boolean;
}

export function LanguageSelector({ style = 'compact', showLabel = true }: LanguageSelectorProps) {
  const { t } = useTranslation();
  const { currentLanguage, setLanguage, languages } = useLanguage();
  const [modalVisible, setModalVisible] = useState(false);

  const currentLangData = languages.find(l => l.code === currentLanguage);

  const handleSelectLanguage = async (lang: LanguageCode) => {
    await setLanguage(lang);
    setModalVisible(false);
  };

  if (style === 'minimal') {
    return (
      <TouchableOpacity
        style={styles.minimalButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.minimalFlag}>{currentLangData?.flag}</Text>
        <Ionicons name="chevron-down" size={14} color="#888" />

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('common.selectLanguage')}</Text>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    currentLanguage === lang.code && styles.languageNameSelected,
                  ]}>
                    {lang.nativeName}
                  </Text>
                  {currentLanguage === lang.code && (
                    <Ionicons name="checkmark-circle" size={22} color="#ffb300" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>
      </TouchableOpacity>
    );
  }

  if (style === 'compact') {
    return (
      <TouchableOpacity
        style={styles.compactButton}
        onPress={() => setModalVisible(true)}
      >
        <Text style={styles.compactFlag}>{currentLangData?.flag}</Text>
        <Text style={styles.compactText}>{currentLangData?.nativeName}</Text>
        <Ionicons name="chevron-down" size={16} color="#ffb300" />

        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{t('common.selectLanguage')}</Text>
              {languages.map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageOption,
                    currentLanguage === lang.code && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleSelectLanguage(lang.code)}
                >
                  <Text style={styles.languageFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.languageName,
                    currentLanguage === lang.code && styles.languageNameSelected,
                  ]}>
                    {lang.nativeName}
                  </Text>
                  {currentLanguage === lang.code && (
                    <Ionicons name="checkmark-circle" size={22} color="#ffb300" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Modal>
      </TouchableOpacity>
    );
  }

  // style === 'full'
  return (
    <View style={styles.fullContainer}>
      {showLabel && (
        <Text style={styles.fullLabel}>{t('common.language')}</Text>
      )}
      <View style={styles.fullOptions}>
        {languages.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.fullOption,
              currentLanguage === lang.code && styles.fullOptionSelected,
            ]}
            onPress={() => setLanguage(lang.code)}
          >
            <Text style={styles.fullFlag}>{lang.flag}</Text>
            <Text style={[
              styles.fullOptionText,
              currentLanguage === lang.code && styles.fullOptionTextSelected,
            ]}>
              {lang.nativeName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Minimal style
  minimalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    gap: 4,
  },
  minimalFlag: {
    fontSize: 20,
  },

  // Compact style
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  compactFlag: {
    fontSize: 18,
  },
  compactText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },

  // Full style
  fullContainer: {
    marginBottom: 16,
  },
  fullLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  fullOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  fullOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    gap: 8,
  },
  fullOptionSelected: {
    borderColor: '#ffb300',
    backgroundColor: '#1a1a00',
  },
  fullFlag: {
    fontSize: 22,
  },
  fullOptionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  fullOptionTextSelected: {
    color: '#ffb300',
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#0a0a0a',
    gap: 12,
  },
  languageOptionSelected: {
    backgroundColor: '#1a1a00',
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  languageFlag: {
    fontSize: 24,
  },
  languageName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  languageNameSelected: {
    color: '#ffb300',
  },
});


