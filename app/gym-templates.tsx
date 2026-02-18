import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { TemplateSearchBar } from '../src/components/TemplateSearchBar';
import { TemplateFilters } from '../src/components/TemplateFilters';
import {
    getGymTemplatesForMember,
    saveGymTemplateToPersonal,
    type GymPublicTemplate,
    type GymTemplateFilters,
} from '../src/services/gymTemplateService';
import { getCategories, type TemplateCategory } from '../src/services/templateCategoryService';
import { useAlert } from '../src/contexts/AlertContext';

export default function GymTemplatesScreen() {
    const { t } = useTranslation();
    const { user } = useUser();
    const { showAlert } = useAlert();

    const [templates, setTemplates] = useState<GymPublicTemplate[]>([]);
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [gymName, setGymName] = useState('');
    const [filters, setFilters] = useState<GymTemplateFilters>({});
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState<GymPublicTemplate | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const loadData = useCallback(async () => {
        if (!user?.id) return;
        try {
            const [templatesResult, categoriesResult] = await Promise.all([
                getGymTemplatesForMember(user.id, filters),
                getCategories(user.id, 'user'),
            ]);
            if (templatesResult.success) {
                setTemplates(templatesResult.data || []);
                if (templatesResult.gymName) setGymName(templatesResult.gymName);
            }
            if (categoriesResult.success) {
                setCategories(categoriesResult.data || []);
            }
        } catch (error) {
            console.error('Error loading gym templates:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, filters]);

    useEffect(() => { loadData(); }, [loadData]);
    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleSaveToPersonal = async (template: GymPublicTemplate) => {
        if (!user?.id) return;
        setIsSaving(true);
        try {
            const result = await saveGymTemplateToPersonal(user.id, template.id);
            if (result.success) {
                showAlert(
                    t('common.success'),
                    t('templates.savedToPersonal'),
                    [{ text: t('common.ok'), style: 'default' }],
                    { icon: 'checkmark-circle', iconColor: '#4CAF50' }
                );
            } else {
                showAlert(
                    t('common.error'),
                    result.error || 'Error',
                    [{ text: t('common.ok'), style: 'default' }]
                );
            }
        } catch (error) {
            console.error('Error saving template:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleOpenDetail = (template: GymPublicTemplate) => {
        setSelectedTemplate(template);
        setShowDetailModal(true);
    };

    const getDifficultyInfo = (difficulty: string | null) => {
        switch (difficulty) {
            case 'beginner': return { label: t('templates.difficultyBeginner'), color: '#4CAF50' };
            case 'intermediate': return { label: t('templates.difficultyIntermediate'), color: '#FF9800' };
            case 'advanced': return { label: t('templates.difficultyAdvanced'), color: '#F44336' };
            default: return null;
        }
    };

    const weeklyStructure = selectedTemplate?.plan_data?.weekly_structure || [];

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                    <Ionicons name="arrow-back" size={24} color="#ffffff" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>{t('templates.gymLibrary')}</Text>
                    {gymName ? <Text style={styles.gymNameSubtitle}>{gymName}</Text> : null}
                </View>
                <View style={{ width: 32 }} />
            </View>

            {/* Search & Filters */}
            <View style={styles.filtersContainer}>
                <TemplateSearchBar
                    value={filters.search || ''}
                    onChangeText={(search) => setFilters(prev => ({ ...prev, search }))}
                    style={styles.searchBar}
                />
                <TemplateFilters
                    filters={filters}
                    onFiltersChange={setFilters}
                    categories={categories}
                />
            </View>

            {/* Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={styles.contentContainer}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#ffb300" />
                    </View>
                ) : templates.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconBg}>
                            <Ionicons name="business-outline" size={48} color="#666" />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {gymName
                                ? t('templates.noResults')
                                : 'No perteneces a ningún gimnasio'}
                        </Text>
                        <Text style={styles.emptyDesc}>
                            {gymName
                                ? t('templates.noResultsDesc')
                                : 'Pide a tu entrenador que te agregue a su gimnasio'}
                        </Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.resultCount}>
                            {templates.length} {templates.length === 1 ? t('templates.template') : t('templates.templates')}
                        </Text>
                        {templates.map(template => {
                            const diff = getDifficultyInfo(template.difficulty);
                            return (
                                <TouchableOpacity
                                    key={template.id}
                                    style={styles.templateCard}
                                    onPress={() => handleOpenDetail(template)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.templateName} numberOfLines={1}>{template.template_name}</Text>
                                    {template.description && (
                                        <Text style={styles.templateDesc} numberOfLines={2}>{template.description}</Text>
                                    )}
                                    <View style={styles.badgesRow}>
                                        {template.category && (
                                            <View style={styles.badge}>
                                                <Text style={styles.badgeText}>{template.category.name}</Text>
                                            </View>
                                        )}
                                        {diff && (
                                            <View style={[styles.badge, { backgroundColor: `${diff.color}22` }]}>
                                                <Text style={[styles.badgeText, { color: diff.color }]}>{diff.label}</Text>
                                            </View>
                                        )}
                                    </View>
                                    <View style={styles.statsRow}>
                                        <View style={styles.stat}>
                                            <Ionicons name="fitness-outline" size={14} color="#ffb300" />
                                            <Text style={styles.statText}>{template.exercise_count} {t('templates.exercises')}</Text>
                                        </View>
                                        {template.times_used > 0 && (
                                            <View style={styles.stat}>
                                                <Ionicons name="repeat" size={14} color="#4CAF50" />
                                                <Text style={[styles.statText, { color: '#4CAF50' }]}>{template.times_used}x</Text>
                                            </View>
                                        )}
                                    </View>
                                    {/* Quick save button */}
                                    <TouchableOpacity
                                        style={styles.quickSaveButton}
                                        onPress={(e) => {
                                            e.stopPropagation();
                                            handleSaveToPersonal(template);
                                        }}
                                        activeOpacity={0.7}
                                        disabled={isSaving}
                                    >
                                        <Ionicons name="download-outline" size={16} color="#ffb300" />
                                        <Text style={styles.quickSaveText}>{t('templates.saveToPersonal')}</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            );
                        })}
                    </>
                )}
            </ScrollView>

            {/* Template Detail Modal */}
            <Modal
                visible={showDetailModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowDetailModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackdrop}
                        activeOpacity={1}
                        onPress={() => setShowDetailModal(false)}
                    />
                    <View style={styles.detailModalContent}>
                        <View style={styles.modalHandle} />
                        {selectedTemplate && (
                            <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScroll}>
                                <Text style={styles.detailTitle}>{selectedTemplate.template_name}</Text>
                                {selectedTemplate.description && (
                                    <Text style={styles.detailDesc}>{selectedTemplate.description}</Text>
                                )}

                                {/* Stats */}
                                <View style={styles.detailStatsRow}>
                                    <View style={styles.detailStat}>
                                        <Ionicons name="fitness-outline" size={20} color="#ffb300" />
                                        <Text style={styles.detailStatValue}>{selectedTemplate.exercise_count}</Text>
                                        <Text style={styles.detailStatLabel}>{t('templates.exercises')}</Text>
                                    </View>
                                    {selectedTemplate.duration_weeks && (
                                        <View style={styles.detailStat}>
                                            <Ionicons name="calendar-outline" size={20} color="#ffb300" />
                                            <Text style={styles.detailStatValue}>{selectedTemplate.duration_weeks}</Text>
                                            <Text style={styles.detailStatLabel}>{t('common.weeks')}</Text>
                                        </View>
                                    )}
                                    <View style={styles.detailStat}>
                                        <Ionicons name="repeat" size={20} color="#4CAF50" />
                                        <Text style={[styles.detailStatValue, { color: '#4CAF50' }]}>{selectedTemplate.times_used}</Text>
                                        <Text style={styles.detailStatLabel}>{t('templates.timesUsed')}</Text>
                                    </View>
                                </View>

                                {/* Days */}
                                {weeklyStructure.map((day: any, i: number) => (
                                    <View key={i} style={styles.dayCard}>
                                        <View style={styles.dayHeader}>
                                            <View style={styles.dayNum}><Text style={styles.dayNumText}>{i + 1}</Text></View>
                                            <Text style={styles.dayName}>{day.day_name || day.name || `${t('templates.day')} ${i + 1}`}</Text>
                                        </View>
                                        {day.exercises?.map((ex: any, j: number) => (
                                            <View key={j} style={styles.exerciseRow}>
                                                <View style={styles.exDot} />
                                                <Text style={styles.exName}>{ex.name || ex.exercise_name}</Text>
                                                <Text style={styles.exDetail}>
                                                    {ex.sets || ex.series || 3}x{ex.reps || ex.repetitions || '12'}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ))}

                                {/* Action Button */}
                                <TouchableOpacity
                                    style={styles.saveButton}
                                    onPress={() => {
                                        handleSaveToPersonal(selectedTemplate);
                                        setShowDetailModal(false);
                                    }}
                                    activeOpacity={0.7}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <ActivityIndicator size="small" color="#1a1a1a" />
                                    ) : (
                                        <>
                                            <Ionicons name="download-outline" size={20} color="#1a1a1a" />
                                            <Text style={styles.saveButtonText}>{t('templates.saveToPersonal')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#1a1a1a' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    backButton: { padding: 4, marginRight: 12 },
    headerTitleContainer: { flex: 1 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
    gymNameSubtitle: { fontSize: 12, color: '#ffb300', marginTop: 2 },
    filtersContainer: { paddingHorizontal: 20, paddingTop: 12 },
    searchBar: { marginBottom: 12 },
    content: { flex: 1 },
    contentContainer: { padding: 20, paddingBottom: 40 },
    loadingContainer: { paddingVertical: 60, alignItems: 'center' },
    emptyState: { alignItems: 'center', paddingVertical: 60 },
    emptyIconBg: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', marginBottom: 8, textAlign: 'center' },
    emptyDesc: { fontSize: 14, color: '#999', textAlign: 'center', lineHeight: 20 },
    resultCount: { fontSize: 13, color: '#666', marginBottom: 12 },
    templateCard: {
        backgroundColor: '#2a2a2a', borderRadius: 14, padding: 16,
        marginBottom: 12, borderWidth: 1, borderColor: '#333',
    },
    templateName: { fontSize: 16, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
    templateDesc: { fontSize: 13, color: '#999', marginBottom: 10, lineHeight: 18 },
    badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
    badge: {
        backgroundColor: 'rgba(255, 179, 0, 0.12)',
        paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    },
    badgeText: { fontSize: 11, fontWeight: '600', color: '#ffb300' },
    statsRow: { flexDirection: 'row', gap: 14, marginBottom: 12 },
    stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statText: { fontSize: 12, color: '#ccc' },
    quickSaveButton: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, borderRadius: 10,
        borderWidth: 1, borderColor: '#ffb300',
    },
    quickSaveText: { fontSize: 13, fontWeight: '600', color: '#ffb300' },
    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    detailModalContent: {
        backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 24, paddingBottom: 40, maxHeight: '85%',
        borderTopWidth: 2, borderTopColor: '#ffb300',
    },
    modalHandle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#444', alignSelf: 'center', marginBottom: 20,
    },
    detailScroll: { flex: 1 },
    detailTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
    detailDesc: { fontSize: 14, color: '#ccc', lineHeight: 20, marginBottom: 16 },
    detailStatsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    detailStat: { alignItems: 'center', gap: 4 },
    detailStatValue: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
    detailStatLabel: { fontSize: 11, color: '#999' },
    dayCard: {
        backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14,
        marginBottom: 10, borderWidth: 1, borderColor: '#333',
    },
    dayHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
    dayNum: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#ffb300', justifyContent: 'center', alignItems: 'center',
    },
    dayNumText: { fontSize: 13, fontWeight: 'bold', color: '#1a1a1a' },
    dayName: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
    exerciseRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 14, marginBottom: 6, gap: 8 },
    exDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#ffb300' },
    exName: { flex: 1, fontSize: 13, color: '#ffffff' },
    exDetail: { fontSize: 12, color: '#999' },
    saveButton: {
        backgroundColor: '#ffb300', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12, marginTop: 16,
    },
    saveButtonText: { color: '#1a1a1a', fontSize: 16, fontWeight: '700' },
});
