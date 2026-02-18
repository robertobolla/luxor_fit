import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Modal,
    TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import {
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    toggleFavorite,
    type WorkoutTemplate,
} from '../src/services/templateService';
import { getCategories, type TemplateCategory } from '../src/services/templateCategoryService';
import { ShareTemplateModal } from '../src/components/ShareTemplateModal';

export default function TemplateDetailScreen() {
    const { t } = useTranslation();
    const { user } = useUser();
    const params = useLocalSearchParams<{ id?: string; mode?: string; planId?: string }>();

    const isCreateMode = params.mode === 'create';
    const [template, setTemplate] = useState<WorkoutTemplate | null>(null);
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [isLoading, setIsLoading] = useState(!isCreateMode);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showActionsModal, setShowActionsModal] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);

    useEffect(() => {
        loadData();
    }, [params.id]);

    const loadData = async () => {
        if (!user?.id) return;

        try {
            const catResult = await getCategories(user.id, 'user');
            if (catResult.success) {
                setCategories(catResult.data || []);
            }

            if (params.id) {
                const result = await getTemplateById(params.id);
                if (result.success && result.data) {
                    setTemplate(result.data);
                }
            }
        } catch (error) {
            console.error('Error loading template detail:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!template) return;
        setIsDeleting(true);
        try {
            const result = await deleteTemplate(template.id);
            if (result.success) {
                setShowDeleteModal(false);
                router.back();
            }
        } catch (error) {
            console.error('Error deleting template:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleDuplicate = async () => {
        if (!template || !user?.id) return;
        try {
            const result = await duplicateTemplate(template.id, user.id);
            if (result.success && result.data) {
                setShowActionsModal(false);
                router.push(`/template-detail?id=${result.data.id}` as any);
            }
        } catch (error) {
            console.error('Error duplicating template:', error);
        }
    };

    const handleToggleFavorite = async () => {
        if (!template) return;
        const newValue = !template.is_favorite;
        setTemplate(prev => prev ? { ...prev, is_favorite: newValue } : null);
        await toggleFavorite(template.id, newValue);
    };

    const handleShare = () => {
        if (!template) return;
        setShowActionsModal(false);
        setTimeout(() => setShowShareModal(true), 300);
    };

    const getDifficultyInfo = (difficulty: string | null) => {
        switch (difficulty) {
            case 'beginner': return { label: t('templates.difficultyBeginner'), color: '#4CAF50', icon: 'leaf-outline' as const };
            case 'intermediate': return { label: t('templates.difficultyIntermediate'), color: '#FF9800', icon: 'flame-outline' as const };
            case 'advanced': return { label: t('templates.difficultyAdvanced'), color: '#F44336', icon: 'skull-outline' as const };
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ffb300" />
            </View>
        );
    }

    if (!template && !isCreateMode) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={48} color="#666" />
                <Text style={styles.errorText}>{t('templates.notFound')}</Text>
                <TouchableOpacity
                    style={styles.goBackButton}
                    onPress={() => router.back()}
                >
                    <Text style={styles.goBackButtonText}>{t('common.goBack')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const difficultyInfo = template ? getDifficultyInfo(template.difficulty) : null;
    const planData = template?.plan_data;
    const weeklyStructure = planData?.weekly_structure || [];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.backButton}
                    activeOpacity={0.7}
                >
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>

                <Text style={styles.headerTitle} numberOfLines={1}>
                    {template?.template_name || t('templates.newTemplate')}
                </Text>

                <View style={styles.headerActions}>
                    {template && (
                        <>
                            <TouchableOpacity
                                onPress={handleToggleFavorite}
                                style={styles.headerIconButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons
                                    name={template.is_favorite ? 'star' : 'star-outline'}
                                    size={22}
                                    color={template.is_favorite ? '#ffb300' : '#666'}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => setShowActionsModal(true)}
                                style={styles.headerIconButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="ellipsis-vertical" size={22} color="#ffffff" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Template Info Card */}
                <View style={styles.infoCard}>
                    {template?.description && (
                        <Text style={styles.description}>{template.description}</Text>
                    )}

                    {/* Badges */}
                    <View style={styles.badgesRow}>
                        {template?.category && (
                            <View style={styles.badge}>
                                {template.category.icon && (
                                    <Ionicons name={template.category.icon as any} size={14} color="#ffb300" />
                                )}
                                <Text style={styles.badgeText}>{template.category.name}</Text>
                            </View>
                        )}
                        {difficultyInfo && (
                            <View style={[styles.badge, { backgroundColor: `${difficultyInfo.color}22` }]}>
                                <Ionicons name={difficultyInfo.icon} size={14} color={difficultyInfo.color} />
                                <Text style={[styles.badgeText, { color: difficultyInfo.color }]}>
                                    {difficultyInfo.label}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="fitness-outline" size={20} color="#ffb300" />
                            <Text style={styles.statValue}>{template?.exercise_count || 0}</Text>
                            <Text style={styles.statLabel}>{t('templates.exercises')}</Text>
                        </View>
                        {template?.duration_weeks && (
                            <View style={styles.statItem}>
                                <Ionicons name="calendar-outline" size={20} color="#ffb300" />
                                <Text style={styles.statValue}>{template.duration_weeks}</Text>
                                <Text style={styles.statLabel}>{t('common.weeks')}</Text>
                            </View>
                        )}
                        <View style={styles.statItem}>
                            <Ionicons name="repeat" size={20} color="#4CAF50" />
                            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
                                {template?.times_used || 0}
                            </Text>
                            <Text style={styles.statLabel}>{t('templates.timesUsed')}</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Ionicons name="calendar" size={20} color="#999" />
                            <Text style={[styles.statValue, { fontSize: 11, color: '#999' }]}>
                                {weeklyStructure.length}
                            </Text>
                            <Text style={styles.statLabel}>{t('templates.days')}</Text>
                        </View>
                    </View>
                </View>

                {/* Plan Structure */}
                {weeklyStructure.length > 0 && (
                    <View style={styles.structureSection}>
                        <Text style={styles.sectionTitle}>{t('templates.planStructure')}</Text>
                        {weeklyStructure.map((day: any, dayIndex: number) => (
                            <View key={dayIndex} style={styles.dayCard}>
                                <View style={styles.dayHeader}>
                                    <View style={styles.dayNumber}>
                                        <Text style={styles.dayNumberText}>{dayIndex + 1}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.dayTitle}>
                                            {day.day_name || day.name || `${t('templates.day')} ${dayIndex + 1}`}
                                        </Text>
                                        {day.focus && (
                                            <Text style={styles.dayFocus}>{day.focus}</Text>
                                        )}
                                    </View>
                                </View>

                                {day.exercises?.map((exercise: any, exIndex: number) => (
                                    <View key={exIndex} style={styles.exerciseItem}>
                                        <View style={styles.exerciseDot} />
                                        <View style={styles.exerciseInfo}>
                                            <Text style={styles.exerciseName}>
                                                {exercise.name || exercise.exercise_name}
                                            </Text>
                                            <Text style={styles.exerciseDetails}>
                                                {exercise.sets || exercise.series || 3}x{exercise.reps || exercise.repetitions || '12'}
                                                {exercise.weight ? ` • ${exercise.weight}kg` : ''}
                                                {exercise.rest_seconds ? ` • ${exercise.rest_seconds}s ${t('templates.rest')}` : ''}
                                            </Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        ))}
                    </View>
                )}

                {/* Tags */}
                {template?.tags && template.tags.length > 0 && (
                    <View style={styles.tagsSection}>
                        <Text style={styles.sectionTitle}>{t('templates.tags')}</Text>
                        <View style={styles.tagsRow}>
                            {template.tags.map((tag, i) => (
                                <View key={i} style={styles.tagChip}>
                                    <Text style={styles.tagText}>#{tag}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Actions Modal */}
            <Modal
                visible={showActionsModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowActionsModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowActionsModal(false)}
                    />
                    <View style={styles.actionsModalContent}>
                        <View style={styles.actionsModalHandle} />

                        <TouchableOpacity
                            style={styles.actionOption}
                            onPress={handleShare}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(33, 150, 243, 0.15)' }]}>
                                <Ionicons name="share-outline" size={22} color="#2196F3" />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>{t('templates.share')}</Text>
                                <Text style={styles.actionDesc}>{t('templates.shareDesc')}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionOption}
                            onPress={handleDuplicate}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(76, 175, 80, 0.15)' }]}>
                                <Ionicons name="copy-outline" size={22} color="#4CAF50" />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={styles.actionTitle}>{t('templates.duplicate')}</Text>
                                <Text style={styles.actionDesc}>{t('templates.duplicateDesc')}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionOption}
                            onPress={() => {
                                setShowActionsModal(false);
                                setShowDeleteModal(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.actionIconBg, { backgroundColor: 'rgba(244, 67, 54, 0.15)' }]}>
                                <Ionicons name="trash-outline" size={22} color="#F44336" />
                            </View>
                            <View style={styles.actionTextContainer}>
                                <Text style={[styles.actionTitle, { color: '#F44336' }]}>{t('templates.delete')}</Text>
                                <Text style={styles.actionDesc}>{t('templates.deleteDesc')}</Text>
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionsModalCloseButton}
                            onPress={() => setShowActionsModal(false)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.actionsModalCloseText}>{t('common.close')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.deleteModalContent}>
                        <View style={styles.deleteIconContainer}>
                            <Ionicons name="warning-outline" size={40} color="#F44336" />
                        </View>
                        <Text style={styles.deleteModalTitle}>{t('templates.deleteConfirmTitle')}</Text>
                        <Text style={styles.deleteModalDesc}>
                            {t('templates.deleteConfirmDesc', { name: template?.template_name })}
                        </Text>
                        <View style={styles.deleteModalActions}>
                            <TouchableOpacity
                                style={styles.deleteCancelButton}
                                onPress={() => setShowDeleteModal(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.deleteCancelButtonText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.deleteConfirmButton}
                                onPress={handleDelete}
                                disabled={isDeleting}
                                activeOpacity={0.7}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator size="small" color="#ffffff" />
                                ) : (
                                    <Text style={styles.deleteConfirmButtonText}>{t('templates.delete')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Share Template Modal */}
            {template && user && (
                <ShareTemplateModal
                    visible={showShareModal}
                    onClose={() => setShowShareModal(false)}
                    templateId={template.id}
                    templateName={template.template_name}
                    senderId={user.id}
                    sourceType="personal"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    errorText: {
        fontSize: 16,
        color: '#999',
    },
    goBackButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffb300',
    },
    goBackButtonText: {
        color: '#ffb300',
        fontWeight: '600',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    backButton: {
        padding: 4,
        marginRight: 12,
    },
    headerTitle: {
        flex: 1,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 4,
    },
    headerIconButton: {
        padding: 6,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    // Info Card
    infoCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    description: {
        fontSize: 14,
        color: '#ccc',
        lineHeight: 20,
        marginBottom: 14,
    },
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(255, 179, 0, 0.12)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 10,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#ffb300',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
        gap: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    statLabel: {
        fontSize: 11,
        color: '#999',
    },
    // Structure
    structureSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 14,
    },
    dayCard: {
        backgroundColor: '#2a2a2a',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#333',
    },
    dayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    dayNumber: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffb300',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayNumberText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    dayTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#ffffff',
    },
    dayFocus: {
        fontSize: 12,
        color: '#ffb300',
        marginTop: 2,
    },
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingLeft: 16,
        marginBottom: 8,
        gap: 10,
    },
    exerciseDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#ffb300',
        marginTop: 6,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 14,
        color: '#ffffff',
        fontWeight: '500',
    },
    exerciseDetails: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    // Tags
    tagsSection: {
        marginBottom: 20,
    },
    tagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tagChip: {
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    tagText: {
        fontSize: 12,
        color: '#ccc',
    },
    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    actionsModalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingBottom: 40,
        borderTopWidth: 2,
        borderTopColor: '#ffb300',
    },
    actionsModalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#444',
        alignSelf: 'center',
        marginBottom: 20,
    },
    actionOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingVertical: 14,
        paddingHorizontal: 4,
    },
    actionIconBg: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTextContainer: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ffffff',
    },
    actionDesc: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    actionsModalCloseButton: {
        marginTop: 16,
        paddingVertical: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 14,
    },
    actionsModalCloseText: {
        color: '#999',
        fontSize: 16,
        fontWeight: '600',
    },
    // Delete Modal
    deleteModalContent: {
        backgroundColor: '#2a2a2a',
        borderRadius: 20,
        padding: 28,
        margin: 20,
        alignItems: 'center',
        position: 'absolute',
        left: 0,
        right: 0,
        top: '30%',
    },
    deleteIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(244, 67, 54, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    deleteModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
    },
    deleteModalDesc: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    deleteModalActions: {
        flexDirection: 'row',
        gap: 12,
        width: '100%',
    },
    deleteCancelButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#444',
        alignItems: 'center',
    },
    deleteCancelButtonText: {
        color: '#ccc',
        fontSize: 15,
        fontWeight: '600',
    },
    deleteConfirmButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F44336',
        alignItems: 'center',
    },
    deleteConfirmButtonText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '600',
    },
});
