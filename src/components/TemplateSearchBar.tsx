import React from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface TemplateSearchBarProps {
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    style?: any;
}

export function TemplateSearchBar({
    value,
    onChangeText,
    placeholder,
    style,
}: TemplateSearchBarProps) {
    const { t } = useTranslation();

    return (
        <View style={[styles.container, style]}>
            <Ionicons name="search" size={18} color="#999" style={styles.icon} />
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder || t('templates.searchPlaceholder')}
                placeholderTextColor="#666"
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
            />
            {value.length > 0 && (
                <TouchableOpacity
                    onPress={() => onChangeText('')}
                    style={styles.clearButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close-circle" size={18} color="#666" />
                </TouchableOpacity>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 12,
        paddingHorizontal: 14,
        height: 44,
        borderWidth: 1,
        borderColor: '#333',
    },
    icon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#ffffff',
        paddingVertical: 0,
    },
    clearButton: {
        padding: 4,
        marginLeft: 4,
    },
});
