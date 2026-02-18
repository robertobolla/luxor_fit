import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import type { WorkoutTemplate } from '../services/templateService';

interface TemplateCardProps {
    template: WorkoutTemplate;
    onPress: () => void;
    onFavoriteToggle?: (id: string, isFavorite: boolean) => void;
    showFavorite?: boolean;
    showUsageCount?: boolean;
}

export function TemplateCard({
    template,
    onPress,
    onFavoriteToggle,
    showFavorite = true,
    showUsageCount = true,
}: TemplateCardProps) {
    const { t } = useTranslation();

    const getDifficultyLabel = (difficulty: string | null) => {
        switch (difficulty) {
            case 'beginner': return { label: t('templates.difficultyBeginner'), color: '#4CAF50' };
            case 'intermediate': return { label: t('templates.difficultyIntermediate'), color: '#FF9800' };
            case 'advanced': return { label: t('templates.difficultyAdvanced'), color: '#F44336' };
            default: return null;
        }
    };

    const difficulty = getDifficultyLabel(template.difficulty);

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Header Row */}
            <View style={styles.headerRow}>
                <View style={styles.titleContainer}>
                    <Text style={styles.templateName} numberOfLines={1}>
                        {template.template_name}
                    </Text>
                </View>
                {showFavorite && onFavoriteToggle && (
                    <TouchableOpacity
                        onPress={() => onFavoriteToggle(template.id, !template.is_favorite)}
                        style={styles.favoriteButton}
                        activeOpacity={0.6}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <Ionicons
                            name={template.is_favorite ? 'star' : 'star-outline'}
                            size={20}
                            color={template.is_favorite ? '#ffb300' : '#666'}
                        />
                    </TouchableOpacity>
                )}
            </View>

            {/* Description */}
            {template.description && (
                <Text style={styles.description} numberOfLines={2}>
                    {template.description}
                </Text>
            )}

            {/* Badges Row */}
            <View style={styles.badgesRow}>
                {/* Category Badge */}
                {template.category && (
                    <View style={styles.categoryBadge}>
                        {template.category.icon && (
                            <Ionicons name={template.category.icon as any} size={12} color="#ffb300" />
                        )}
                        <Text style={styles.categoryBadgeText}>{template.category.name}</Text>
                    </View>
                )}

                {/* Difficulty Badge */}
                {difficulty && (
                    <View style={[styles.difficultyBadge, { backgroundColor: `${difficulty.color}22` }]}>
                        <Text style={[styles.difficultyBadgeText, { color: difficulty.color }]}>
                            {difficulty.label}
                        </Text>
                    </View>
                )}
            </View>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                <View style={styles.stat}>
                    <Ionicons name="fitness-outline" size={14} color="#ffb300" />
                    <Text style={styles.statText}>
                        {template.exercise_count} {t('templates.exercises')}
                    </Text>
                </View>

                {template.duration_weeks && (
                    <View style={styles.stat}>
                        <Ionicons name="calendar-outline" size={14} color="#ffb300" />
                        <Text style={styles.statText}>
                            {template.duration_weeks} {t('common.weeks')}
                        </Text>
                    </View>
                )}

                {showUsageCount && template.times_used > 0 && (
                    <View style={styles.stat}>
                        <Ionicons name="repeat" size={14} color="#4CAF50" />
                        <Text style={[styles.statText, { color: '#4CAF50' }]}>
                            {template.times_used}x
                        </Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#2a2a2a',
        borderRadius: 14,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#333',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    titleContainer: {
        flex: 1,
        marginRight: 8,
    },
    templateName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#ffffff',
    },
    favoriteButton: {
        padding: 4,
    },
    description: {
        fontSize: 13,
        color: '#999',
        marginBottom: 10,
        lineHeight: 18,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 10,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 179, 0, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#ffb300',
    },
    difficultyBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    difficultyBadgeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 14,
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    statText: {
        fontSize: 12,
        color: '#ccc',
    },
});
