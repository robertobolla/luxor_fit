import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { useTranslation } from 'react-i18next';
import { TemplateSearchBar } from '../src/components/TemplateSearchBar';
import { TemplateCard } from '../src/components/TemplateCard';
import { TemplateFilters } from '../src/components/TemplateFilters';
import {
    getTemplates,
    toggleFavorite,
    type WorkoutTemplate,
    type TemplateFilters as TFilters,
} from '../src/services/templateService';
import { getCategories, type TemplateCategory } from '../src/services/templateCategoryService';
import { CategoryManagerModal } from '../src/components/CategoryManagerModal';

export default function TemplateLibraryScreen() {
    const { t } = useTranslation();
    const { user } = useUser();
    const params = useLocalSearchParams<{ action?: string }>();

    const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [filters, setFilters] = useState<TFilters>({});
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showCategoryManager, setShowCategoryManager] = useState(false);

    const loadData = useCallback(async () => {
        if (!user?.id) return;

        try {
            const [templatesResult, categoriesResult] = await Promise.all([
                getTemplates(user.id, filters),
                getCategories(user.id, 'user'),
            ]);

            if (templatesResult.success) {
                setTemplates(templatesResult.data || []);
            }
            if (categoriesResult.success) {
                setCategories(categoriesResult.data || []);
            }
        } catch (error) {
            console.error('Error loading template library:', error);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id, filters]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const handleFavoriteToggle = async (templateId: string, isFavorite: boolean) => {
        // Optimistic update
        setTemplates(prev =>
            prev.map(t => t.id === templateId ? { ...t, is_favorite: isFavorite } : t)
        );

        const result = await toggleFavorite(templateId, isFavorite);
        if (!result.success) {
            // Revert
            setTemplates(prev =>
                prev.map(t => t.id === templateId ? { ...t, is_favorite: !isFavorite } : t)
            );
        }
    };

    const handleSearchChange = (search: string) => {
        setFilters(prev => ({ ...prev, search }));
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity
                        onPress={() => router.back()}
                        style={styles.backButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#ffffff" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('templates.myLibrary')}</Text>
                    <TouchableOpacity
                        onPress={() => setShowCategoryManager(true)}
                        style={styles.addButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="options-outline" size={22} color="#999" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => router.push('/template-detail?mode=create' as any)}
                        style={styles.addButton}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="add" size={24} color="#ffb300" />
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <TemplateSearchBar
                    value={filters.search || ''}
                    onChangeText={handleSearchChange}
                    style={styles.searchBar}
                />

                {/* Filters */}
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
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#ffb300" />
                    </View>
                ) : templates.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="library-outline" size={48} color="#666" />
                        </View>
                        <Text style={styles.emptyTitle}>
                            {filters.search || filters.categoryId || filters.difficulty
                                ? t('templates.noResults')
                                : t('templates.emptyLibrary')}
                        </Text>
                        <Text style={styles.emptyDescription}>
                            {filters.search || filters.categoryId || filters.difficulty
                                ? t('templates.noResultsDesc')
                                : t('templates.emptyLibraryDesc')}
                        </Text>
                        {!filters.search && !filters.categoryId && !filters.difficulty && (
                            <TouchableOpacity
                                style={styles.createFirstButton}
                                onPress={() => router.push('/template-detail?mode=create' as any)}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="add" size={18} color="#1a1a1a" />
                                <Text style={styles.createFirstButtonText}>
                                    {t('templates.createFirst')}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <>
                        <Text style={styles.resultCount}>
                            {templates.length} {templates.length === 1 ? t('templates.template') : t('templates.templates')}
                        </Text>
                        {templates.map(template => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onPress={() => router.push(`/template-detail?id=${template.id}` as any)}
                                onFavoriteToggle={handleFavoriteToggle}
                            />
                        ))}
                    </>
                )}
            </ScrollView>

            {/* Category Manager Modal */}
            {user && (
                <CategoryManagerModal
                    visible={showCategoryManager}
                    onClose={() => setShowCategoryManager(false)}
                    userId={user.id}
                    ownerType="user"
                    onCategoriesChanged={loadData}
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
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#2a2a2a',
    },
    headerTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    addButton: {
        padding: 4,
    },
    searchBar: {
        marginBottom: 12,
    },
    content: {
        flex: 1,
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    loadingContainer: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 20,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#2a2a2a',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyDescription: {
        fontSize: 14,
        color: '#999',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    createFirstButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#ffb300',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    createFirstButtonText: {
        color: '#1a1a1a',
        fontSize: 15,
        fontWeight: '600',
    },
    resultCount: {
        fontSize: 13,
        color: '#666',
        marginBottom: 12,
    },
});
