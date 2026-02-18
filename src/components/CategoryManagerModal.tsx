import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    FlatList,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    type TemplateCategory,
} from '../services/templateCategoryService';

interface Props {
    visible: boolean;
    onClose: () => void;
    userId: string;
    ownerType?: 'user' | 'empresario';
    onCategoriesChanged?: () => void;
}

const ICONS = [
    'barbell', 'fitness', 'body', 'heart', 'medkit', 'flash',
    'man', 'woman', 'walk', 'bicycle', 'trophy', 'ribbon',
    'star', 'flame', 'water', 'leaf', 'snow', 'timer',
    'stopwatch', 'speedometer', 'pulse', 'calendar',
];

export function CategoryManagerModal({
    visible,
    onClose,
    userId,
    ownerType = 'user',
    onCategoriesChanged,
}: Props) {
    const { t } = useTranslation();
    const [categories, setCategories] = useState<TemplateCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showEditor, setShowEditor] = useState(false);
    const [editingCategory, setEditingCategory] = useState<TemplateCategory | null>(null);
    const [name, setName] = useState('');
    const [selectedIcon, setSelectedIcon] = useState('barbell');
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<TemplateCategory | null>(null);

    const loadCategories = useCallback(async () => {
        setIsLoading(true);
        const result = await getCategories(userId, ownerType);
        if (result.success) {
            setCategories(result.data || []);
        }
        setIsLoading(false);
    }, [userId, ownerType]);

    useEffect(() => {
        if (visible) loadCategories();
    }, [visible, loadCategories]);

    const handleOpenEditor = (category?: TemplateCategory) => {
        if (category) {
            setEditingCategory(category);
            setName(category.name);
            setSelectedIcon(category.icon || 'barbell');
        } else {
            setEditingCategory(null);
            setName('');
            setSelectedIcon('barbell');
        }
        setShowEditor(true);
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setIsSaving(true);
        try {
            if (editingCategory) {
                await updateCategory(editingCategory.id, { name: name.trim(), icon: selectedIcon });
            } else {
                await createCategory(userId, ownerType, name.trim(), selectedIcon);
            }
            setShowEditor(false);
            await loadCategories();
            onCategoriesChanged?.();
        } catch (error) {
            console.error('Error saving category:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!categoryToDelete) return;
        setIsSaving(true);
        try {
            await deleteCategory(categoryToDelete.id);
            setShowDeleteConfirm(false);
            setCategoryToDelete(null);
            await loadCategories();
            onCategoriesChanged?.();
        } catch (error) {
            console.error('Error deleting category:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const renderCategory = ({ item }: { item: TemplateCategory }) => {
        const isSystem = item.owner_type === 'system';
        return (
            <View style={styles.categoryRow}>
                <View style={styles.categoryIcon}>
                    <Ionicons name={(item.icon || 'ellipse') as any} size={20} color="#ffb300" />
                </View>
                <Text style={styles.categoryName}>{item.name}</Text>
                {isSystem ? (
                    <Text style={styles.systemBadge}>{t('templates.systemCategory')}</Text>
                ) : (
                    <View style={styles.categoryActions}>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => handleOpenEditor(item)}
                        >
                            <Ionicons name="pencil" size={16} color="#ccc" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => {
                                setCategoryToDelete(item);
                                setShowDeleteConfirm(true);
                            }}
                        >
                            <Ionicons name="trash" size={16} color="#ff4444" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={styles.modalContainer}
                >
                    <View style={styles.modal}>
                        <View style={styles.handle} />

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.title}>{t('templates.manageCategoriesTitle')}</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Ionicons name="close" size={24} color="#999" />
                            </TouchableOpacity>
                        </View>

                        {/* List */}
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#ffb300" style={{ paddingVertical: 40 }} />
                        ) : (
                            <FlatList
                                data={categories}
                                keyExtractor={(item) => item.id}
                                renderItem={renderCategory}
                                style={styles.list}
                                contentContainerStyle={{ paddingBottom: 20 }}
                                showsVerticalScrollIndicator={false}
                                ListEmptyComponent={
                                    <Text style={styles.emptyText}>No hay categorías</Text>
                                }
                            />
                        )}

                        {/* Add button */}
                        <TouchableOpacity style={styles.addButton} onPress={() => handleOpenEditor()}>
                            <Ionicons name="add" size={20} color="#1a1a1a" />
                            <Text style={styles.addButtonText}>{t('templates.addCategory')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Editor Sub-Modal */}
                    <Modal visible={showEditor} transparent animationType="fade">
                        <View style={styles.editorOverlay}>
                            <View style={styles.editorModal}>
                                <Text style={styles.editorTitle}>
                                    {editingCategory ? t('templates.editCategory') : t('templates.addCategory')}
                                </Text>

                                <TextInput
                                    style={styles.input}
                                    value={name}
                                    onChangeText={setName}
                                    placeholder={t('templates.categoryName')}
                                    placeholderTextColor="#666"
                                    autoFocus
                                />

                                {/* Icon selector */}
                                <Text style={styles.iconLabel}>Ícono</Text>
                                <View style={styles.iconGrid}>
                                    {ICONS.map((icon) => (
                                        <TouchableOpacity
                                            key={icon}
                                            style={[
                                                styles.iconOption,
                                                selectedIcon === icon && styles.iconOptionSelected,
                                            ]}
                                            onPress={() => setSelectedIcon(icon)}
                                        >
                                            <Ionicons
                                                name={icon as any}
                                                size={20}
                                                color={selectedIcon === icon ? '#ffb300' : '#999'}
                                            />
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <View style={styles.editorActions}>
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={() => setShowEditor(false)}
                                    >
                                        <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.saveBtn, !name.trim() && { opacity: 0.5 }]}
                                        onPress={handleSave}
                                        disabled={!name.trim() || isSaving}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator size="small" color="#1a1a1a" />
                                        ) : (
                                            <Text style={styles.saveBtnText}>{t('templates.saveCategory')}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    {/* Delete Confirm */}
                    <Modal visible={showDeleteConfirm} transparent animationType="fade">
                        <View style={styles.editorOverlay}>
                            <View style={styles.editorModal}>
                                <Ionicons name="warning" size={40} color="#ff4444" style={{ alignSelf: 'center', marginBottom: 12 }} />
                                <Text style={[styles.editorTitle, { textAlign: 'center' }]}>
                                    {t('templates.deleteCategory')}
                                </Text>
                                <Text style={styles.deleteDesc}>
                                    ¿Eliminar "{categoryToDelete?.name}"? Los templates con esta categoría quedarán sin categoría asignada.
                                </Text>
                                <View style={styles.editorActions}>
                                    <TouchableOpacity
                                        style={styles.cancelBtn}
                                        onPress={() => {
                                            setShowDeleteConfirm(false);
                                            setCategoryToDelete(null);
                                        }}
                                    >
                                        <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.saveBtn, { backgroundColor: '#ff4444' }]}
                                        onPress={handleDelete}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <ActivityIndicator size="small" color="#ffffff" />
                                        ) : (
                                            <Text style={[styles.saveBtnText, { color: '#ffffff' }]}>{t('common.delete')}</Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    modalContainer: { justifyContent: 'flex-end' },
    modal: {
        backgroundColor: '#1a1a1a', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        padding: 20, maxHeight: '80%',
        borderTopWidth: 2, borderTopColor: '#ffb300',
    },
    handle: {
        width: 40, height: 4, borderRadius: 2,
        backgroundColor: '#444', alignSelf: 'center', marginBottom: 16,
    },
    header: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
    },
    title: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
    list: { maxHeight: 350 },
    categoryRow: {
        flexDirection: 'row', alignItems: 'center', padding: 14,
        backgroundColor: '#2a2a2a', borderRadius: 12, marginBottom: 8,
    },
    categoryIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255, 179, 0, 0.12)',
        justifyContent: 'center', alignItems: 'center', marginRight: 12,
    },
    categoryName: { flex: 1, fontSize: 15, color: '#ffffff', fontWeight: '500' },
    systemBadge: {
        fontSize: 10, color: '#999', backgroundColor: '#333',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
    },
    categoryActions: { flexDirection: 'row', gap: 8 },
    iconBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#333', justifyContent: 'center', alignItems: 'center',
    },
    emptyText: { color: '#666', textAlign: 'center', paddingVertical: 30, fontSize: 14 },
    addButton: {
        backgroundColor: '#ffb300', flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12,
        marginTop: 8,
    },
    addButtonText: { color: '#1a1a1a', fontSize: 15, fontWeight: '700' },
    // Editor
    editorOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center', alignItems: 'center', padding: 30,
    },
    editorModal: {
        backgroundColor: '#1f1f1f', borderRadius: 20, padding: 24,
        width: '100%', borderWidth: 1, borderColor: '#333',
    },
    editorTitle: { fontSize: 17, fontWeight: 'bold', color: '#ffffff', marginBottom: 16 },
    input: {
        backgroundColor: '#2a2a2a', borderRadius: 10, padding: 14,
        color: '#ffffff', fontSize: 15, borderWidth: 1, borderColor: '#333',
        marginBottom: 16,
    },
    iconLabel: { fontSize: 13, color: '#999', marginBottom: 8 },
    iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
    iconOption: {
        width: 40, height: 40, borderRadius: 10,
        backgroundColor: '#2a2a2a', justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: '#333',
    },
    iconOptionSelected: {
        borderColor: '#ffb300', backgroundColor: 'rgba(255, 179, 0, 0.12)',
    },
    editorActions: { flexDirection: 'row', gap: 12 },
    cancelBtn: {
        flex: 1, paddingVertical: 12, borderRadius: 10,
        borderWidth: 1, borderColor: '#444', alignItems: 'center',
    },
    cancelBtnText: { color: '#ccc', fontSize: 14, fontWeight: '600' },
    saveBtn: {
        flex: 1, paddingVertical: 12, borderRadius: 10,
        backgroundColor: '#ffb300', alignItems: 'center',
    },
    saveBtnText: { color: '#1a1a1a', fontSize: 14, fontWeight: '700' },
    deleteDesc: {
        color: '#ccc', fontSize: 13, lineHeight: 20,
        textAlign: 'center', marginBottom: 20,
    },
});
