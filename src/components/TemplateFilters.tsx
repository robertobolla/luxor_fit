import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { TemplateCategory } from '../services/templateCategoryService';
import type { TemplateFilters as TFilters } from '../services/templateService';

interface TemplateFiltersProps {
    filters: TFilters;
    onFiltersChange: (filters: TFilters) => void;
    categories: TemplateCategory[];
    style?: any;
}

export function TemplateFilters({
    filters,
    onFiltersChange,
    categories,
    style,
}: TemplateFiltersProps) {
    const { t } = useTranslation();
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showExerciseModal, setShowExerciseModal] = useState(false);

    const activeFiltersCount = [
        filters.categoryId,
        filters.difficulty,
        filters.favoritesOnly,
        filters.minExercises !== undefined || filters.maxExercises !== undefined,
    ].filter(Boolean).length;

    const getDifficultyLabel = (key: string) => {
        switch (key) {
            case 'beginner': return t('templates.difficultyBeginner');
            case 'intermediate': return t('templates.difficultyIntermediate');
            case 'advanced': return t('templates.difficultyAdvanced');
            default: return key;
        }
    };

    const selectedCategory = categories.find(c => c.id === filters.categoryId);

    const exerciseRanges = [
        { label: '1-5', min: 1, max: 5 },
        { label: '6-10', min: 6, max: 10 },
        { label: '11-15', min: 11, max: 15 },
        { label: '16+', min: 16, max: undefined },
    ];

    const selectedRange = exerciseRanges.find(
        r => r.min === filters.minExercises && r.max === filters.maxExercises
    );

    return (
        <View style={[styles.container, style]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Fav filter */}
                <TouchableOpacity
                    style={[styles.chipButton, filters.favoritesOnly && styles.chipButtonActive]}
                    onPress={() => onFiltersChange({ ...filters, favoritesOnly: !filters.favoritesOnly })}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={filters.favoritesOnly ? 'star' : 'star-outline'}
                        size={14}
                        color={filters.favoritesOnly ? '#1a1a1a' : '#ffb300'}
                    />
                    <Text style={[styles.chipText, filters.favoritesOnly && styles.chipTextActive]}>
                        {t('templates.favorites')}
                    </Text>
                </TouchableOpacity>

                {/* Category filter */}
                <TouchableOpacity
                    style={[styles.chipButton, filters.categoryId && styles.chipButtonActive]}
                    onPress={() => setShowCategoryModal(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="pricetag-outline"
                        size={14}
                        color={filters.categoryId ? '#1a1a1a' : '#ffb300'}
                    />
                    <Text style={[styles.chipText, filters.categoryId && styles.chipTextActive]}>
                        {selectedCategory?.name || t('templates.category')}
                    </Text>
                    {filters.categoryId && (
                        <TouchableOpacity
                            onPress={() => onFiltersChange({ ...filters, categoryId: undefined })}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle" size={14} color="#1a1a1a" />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>

                {/* Difficulty filter */}
                {(['beginner', 'intermediate', 'advanced'] as const).map(diff => (
                    <TouchableOpacity
                        key={diff}
                        style={[styles.chipButton, filters.difficulty === diff && styles.chipButtonActive]}
                        onPress={() => onFiltersChange({
                            ...filters,
                            difficulty: filters.difficulty === diff ? undefined : diff,
                        })}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.chipText, filters.difficulty === diff && styles.chipTextActive]}>
                            {getDifficultyLabel(diff)}
                        </Text>
                    </TouchableOpacity>
                ))}

                {/* Exercise count filter */}
                <TouchableOpacity
                    style={[
                        styles.chipButton,
                        (filters.minExercises !== undefined) && styles.chipButtonActive,
                    ]}
                    onPress={() => setShowExerciseModal(true)}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name="fitness-outline"
                        size={14}
                        color={filters.minExercises !== undefined ? '#1a1a1a' : '#ffb300'}
                    />
                    <Text style={[
                        styles.chipText,
                        (filters.minExercises !== undefined) && styles.chipTextActive,
                    ]}>
                        {selectedRange ? `${selectedRange.label} ${t('templates.exercises')}` : t('templates.exerciseCount')}
                    </Text>
                    {filters.minExercises !== undefined && (
                        <TouchableOpacity
                            onPress={() => onFiltersChange({ ...filters, minExercises: undefined, maxExercises: undefined })}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                            <Ionicons name="close-circle" size={14} color="#1a1a1a" />
                        </TouchableOpacity>
                    )}
                </TouchableOpacity>

                {/* Clear all */}
                {activeFiltersCount > 0 && (
                    <TouchableOpacity
                        style={styles.clearAllButton}
                        onPress={() => onFiltersChange({})}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="close" size={14} color="#ff4444" />
                        <Text style={styles.clearAllText}>{t('templates.clearFilters')}</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>

            {/* Category Selection Modal */}
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('templates.selectCategory')}</Text>
                        <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
                            {categories.map(cat => (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.modalOption,
                                        filters.categoryId === cat.id && styles.modalOptionActive,
                                    ]}
                                    onPress={() => {
                                        onFiltersChange({
                                            ...filters,
                                            categoryId: filters.categoryId === cat.id ? undefined : cat.id,
                                        });
                                        setShowCategoryModal(false);
                                    }}
                                    activeOpacity={0.7}
                                >
                                    {cat.icon && (
                                        <Ionicons
                                            name={cat.icon as any}
                                            size={18}
                                            color={filters.categoryId === cat.id ? '#1a1a1a' : '#ffb300'}
                                        />
                                    )}
                                    <Text style={[
                                        styles.modalOptionText,
                                        filters.categoryId === cat.id && styles.modalOptionTextActive,
                                    ]}>
                                        {cat.name}
                                    </Text>
                                    {filters.categoryId === cat.id && (
                                        <Ionicons name="checkmark" size={18} color="#1a1a1a" />
                                    )}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowCategoryModal(false)}
                        >
                            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Exercise Count Modal */}
            <Modal
                visible={showExerciseModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowExerciseModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>{t('templates.exerciseCount')}</Text>
                        {exerciseRanges.map(range => (
                            <TouchableOpacity
                                key={range.label}
                                style={[
                                    styles.modalOption,
                                    selectedRange?.label === range.label && styles.modalOptionActive,
                                ]}
                                onPress={() => {
                                    if (selectedRange?.label === range.label) {
                                        onFiltersChange({ ...filters, minExercises: undefined, maxExercises: undefined });
                                    } else {
                                        onFiltersChange({ ...filters, minExercises: range.min, maxExercises: range.max });
                                    }
                                    setShowExerciseModal(false);
                                }}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.modalOptionText,
                                    selectedRange?.label === range.label && styles.modalOptionTextActive,
                                ]}>
                                    {range.label} {t('templates.exercises')}
                                </Text>
                                {selectedRange?.label === range.label && (
                                    <Ionicons name="checkmark" size={18} color="#1a1a1a" />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowExerciseModal(false)}
                        >
                            <Text style={styles.modalCloseText}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 12,
    },
    scrollContent: {
        paddingHorizontal: 0,
        gap: 8,
    },
    chipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    chipButtonActive: {
        backgroundColor: '#ffb300',
        borderColor: '#ffb300',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ccc',
    },
    chipTextActive: {
        color: '#1a1a1a',
    },
    clearAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#ff4444',
    },
    clearAllText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ff4444',
    },
    // Modal styles (consistent with app's design)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#2a2a2a',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 360,
        maxHeight: '70%',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 16,
        textAlign: 'center',
    },
    modalList: {
        maxHeight: 350,
    },
    modalOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 6,
        backgroundColor: '#1f1f1f',
    },
    modalOptionActive: {
        backgroundColor: '#ffb300',
    },
    modalOptionText: {
        flex: 1,
        fontSize: 15,
        color: '#ffffff',
        fontWeight: '500',
    },
    modalOptionTextActive: {
        color: '#1a1a1a',
        fontWeight: '700',
    },
    modalCloseButton: {
        marginTop: 16,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
    },
    modalCloseText: {
        color: '#999',
        fontSize: 16,
        fontWeight: '600',
    },
});
