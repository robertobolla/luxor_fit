import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  Dimensions,
  Modal,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import {
  getUserPhotos,
  uploadProgressPhoto,
  checkPhotoReminder,
  deleteProgressPhoto,
  canUploadPhoto,
} from '@/services/progressPhotos';
import { ProgressPhoto, PhotoType, PhotoReminder } from '@/types/progressPhotos';
import { useRetry } from '@/hooks/useRetry';

const { width } = Dimensions.get('window');
const photoSize = (width - 48) / 2; // 2 columnas con padding

// ✅ Tipos seguros para sesión (solo las 3 vistas válidas)
type SessionPhotoType = Extract<PhotoType, 'front' | 'side' | 'back'>;

export default function ProgressPhotosScreen() {
  const { t } = useTranslation();
  const { user } = useUser();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reminder, setReminder] = useState<PhotoReminder | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [sessionModalVisible, setSessionModalVisible] = useState(false);

  // ✅ Evita error de indexado cuando PhotoType incluye "other"
  const [currentSession, setCurrentSession] = useState<
    Partial<Record<SessionPhotoType, ProgressPhoto>>
  >({});

  const [sessionUploading, setSessionUploading] = useState<
    Partial<Record<SessionPhotoType, boolean>>
  >({});

  const [uploadRestriction, setUploadRestriction] = useState<{
    canUpload: boolean;
    message: string;
    daysUntilNext: number;
  }>({
    canUpload: true,
    message: '',
    daysUntilNext: 0,
  });

  const requiredViews: SessionPhotoType[] = ['front', 'side', 'back'];
  const uploadParamsRef = useRef<{ uri: string; type: PhotoType; notes?: string } | null>(null);

  // Hook para retry en subida de fotos
  const uploadPhotoWithRetry = useRetry(
    async () => {
      if (!user?.id || !uploadParamsRef.current) {
        throw new Error('Usuario no autenticado o parámetros faltantes');
      }

      const params = uploadParamsRef.current;
      const result = await uploadProgressPhoto(user.id, params.uri, params.type, undefined, params.notes);

      if (!result.success) {
        throw new Error(result.error || 'No se pudo subir la foto');
      }

      return result;
    },
    {
      maxRetries: 2,
      retryDelay: 2000,
      showAlert: true,
    }
  );

  // Cargar fotos y verificar recordatorio
  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [photosData, reminderData, uploadStatus] = await Promise.all([
        getUserPhotos(user.id),
        checkPhotoReminder(user.id),
        canUploadPhoto(user.id),
      ]);

      setPhotos(photosData);
      setReminder(reminderData);
      setUploadRestriction(uploadStatus);
      console.log('📸 Fotos cargadas:', photosData.length);
      console.log('📅 Recordatorio:', reminderData);
      console.log('🔒 Restricción de subida:', uploadStatus);
    } catch (error) {
      console.error('❌ Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [user])
  );

  // Solicitar permisos de cámara
  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('progressPhotos.cameraPermissionTitle'), t('progressPhotos.cameraPermissionText'));
      return false;
    }
    return true;
  };

  // Tomar foto o seleccionar de galería (flujo simple)
  const handleAddPhoto = async () => {
    // Verificar si puede subir fotos
    if (!uploadRestriction.canUpload) {
      Alert.alert(
        t('progressPhotos.uploadRestrictionTitle'),
        uploadRestriction.message + '\n\n' + t('progressPhotos.uploadRestrictionNote'),
        [{ text: t('progressPhotos.understood') }]
      );
      return;
    }

    Alert.alert(t('progressPhotos.newPhotoSession'), t('progressPhotos.captureInstructions'), [
      { text: t('progressPhotos.cancel'), style: 'cancel' },
      { text: t('progressPhotos.sessionMode'), onPress: () => setSessionModalVisible(true) },
      { text: t('progressPhotos.quickMode'), onPress: () => takePhoto('front') },
    ]);
  };

  const takePhoto = async (type: PhotoType) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      await confirmAndUpload(result.assets[0].uri, type);
    }
  };

  const pickFromGallery = async (type: PhotoType) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      await confirmAndUpload(result.assets[0].uri, type);
    }
  };

  const confirmAndUpload = async (uri: string, type: PhotoType) => {
    if (!user?.id) return;

    // Preguntar tipo de foto y notas
    Alert.prompt(
      t('progressPhotos.addNotes'),
      t('progressPhotos.notesPlaceholder'),
      [
        { text: t('progressPhotos.cancel'), style: 'cancel' },
        {
          text: t('progressPhotos.upload'),
          // ✅ Evita "notes implicitly has an 'any' type"
          onPress: async (notes?: string) => {
            setUploading(true);
            try {
              // Configurar parámetros en ref para el hook
              uploadParamsRef.current = { uri, type, notes };

              const result = await uploadPhotoWithRetry.executeWithRetry();

              if (result) {
                Alert.alert(t('progressPhotos.successTitle'), t('progressPhotos.photoUploadedSuccess'));
                // Actualizar estado de sesión si está abierta (solo para tipos de sesión)
                if (
                  sessionModalVisible &&
                  result.photo &&
                  (type === 'front' || type === 'side' || type === 'back')
                ) {
                  setCurrentSession((prev) => ({ ...prev, [type]: result.photo! }));
                }
                loadData();
              }
            } catch (err) {
              // El error ya se maneja en useRetry con showAlert
              console.error('Error uploading photo:', err);
            } finally {
              setUploading(false);
              uploadParamsRef.current = null;
            }
          },
        },
      ],
      'plain-text'
    );
  };

  const handlePhotoPress = (photo: ProgressPhoto) => {
    setSelectedPhoto(photo);
    setShowPhotoModal(true);
  };

  const handleDeletePhoto = async (photo: ProgressPhoto) => {
    Alert.alert(t('progressPhotos.deletePhotoTitle'), t('progressPhotos.deletePhotoConfirm'), [
      { text: t('progressPhotos.cancel'), style: 'cancel' },
      {
        text: t('progressPhotos.delete'),
        style: 'destructive',
        onPress: async () => {
          const success = await deleteProgressPhoto(photo.id, photo.photo_url);
          if (success) {
            Alert.alert(t('progressPhotos.photoDeletedTitle'), t('progressPhotos.photoDeletedSuccess'));
            setShowPhotoModal(false);
            loadData();
          } else {
            Alert.alert(t('progressPhotos.deleteErrorTitle'), t('progressPhotos.deleteErrorMsg'));
          }
        },
      },
    ]);
  };

  const handleCompare = () => {
    if (photos.length < 2) {
      Alert.alert(t('progressPhotos.needMorePhotosTitle'), t('progressPhotos.needMorePhotosText'));
      return;
    }
    router.push('/compare-photos' as any);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(t('common.locale') || 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateShort = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const photoDate = new Date(dateString);
    photoDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - photoDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('progressPhotos.today');
    if (diffDays === 1) return t('progressPhotos.yesterday');

    // ✅ Faltaba el return acá
    if (diffDays < 7) return t('progressPhotos.daysAgo', { count: diffDays });

    return date.toLocaleDateString(t('common.locale') || 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  };

  // Agrupar fotos por fecha
  const groupPhotosByDate = () => {
    const grouped: { [date: string]: ProgressPhoto[] } = {};

    photos.forEach((photo) => {
      const date = photo.photo_date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(photo);
    });

    // Ordenar fechas de más reciente a más antigua
    const sortedDates = Object.keys(grouped).sort((a, b) => {
      return new Date(b).getTime() - new Date(a).getTime();
    });

    return sortedDates.map((date) => ({
      date,
      photos: grouped[date],
    }));
  };

  const getPhotoByType = (photos: ProgressPhoto[], type: PhotoType) => {
    return photos.find((p) => p.photo_type === type);
  };

  const getTypeIcon = (type: PhotoType) => {
    if (type === 'front') return '📷';
    if (type === 'back') return '🔄';
    if (type === 'side') return '↔️';
    return '📸';
  };

  const getTypeLabel = (type: PhotoType) => {
    if (type === 'front') return t('progressPhotos.typeFront');
    if (type === 'back') return t('progressPhotos.typeBack');
    if (type === 'side') return t('progressPhotos.typeSide');
    return t('progressPhotos.typeOther');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>{t('progressPhotos.loadingPhotos')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)/progress' as any)}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('progressPhotos.title')}</Text>
        <TouchableOpacity onPress={handleCompare}>
          <Ionicons name="git-compare-outline" size={24} color="#ffb300" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Recordatorio si es necesario */}
        {reminder?.shouldShowReminder && (
          <View style={styles.reminderCard}>
            <Ionicons name="camera" size={32} color="#ffb300" />
            <View style={styles.reminderTextContainer}>
              <Text style={styles.reminderTitle}>📸 {t('progressPhotos.reminderTitle')}</Text>
              <Text style={styles.reminderText}>
                {t('progressPhotos.reminderText', { days: reminder.daysSinceLastPhoto })}
              </Text>
            </View>
          </View>
        )}

        {/* Banner para completar vistas faltantes del día */}
        {(() => {
          const today = new Date().toISOString().split('T')[0];
          const todays = photos.filter((p) => p.photo_date === today);
          const missing = requiredViews.filter((tpe) => !todays.some((p) => p.photo_type === tpe));
          if (missing.length === 0) return null;
          const label = (tpe: PhotoType) =>
            tpe === 'front'
              ? t('progressPhotos.typeFront')
              : tpe === 'back'
              ? t('progressPhotos.typeBack')
              : t('progressPhotos.typeSide');
          return (
            <View style={styles.missingCard}>
              <Ionicons name="alert-circle" size={24} color="#ffd54a" />
              <View style={{ flex: 1 }}>
                <Text style={styles.missingTitle}>{t('progressPhotos.completeTodayViewsTitle')}</Text>
                <Text style={styles.missingText}>
                  {t('progressPhotos.missingViews', { views: missing.map(label).join(', ') })}
                </Text>
              </View>
              <View style={styles.missingActions}>
                {missing.map((tpe) => (
                  <TouchableOpacity
                    key={tpe}
                    style={styles.missingBtn}
                    onPress={() => {
                      setSessionModalVisible(true);
                    }}
                  >
                    <Text style={styles.missingBtnText}>{label(tpe)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        })()}

        {/* Botón agregar foto */}
        <TouchableOpacity
          style={[styles.addButton, !uploadRestriction.canUpload && styles.addButtonDisabled]}
          onPress={handleAddPhoto}
          disabled={uploading || !uploadRestriction.canUpload}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <>
              <Ionicons
                name={uploadRestriction.canUpload ? 'add-circle' : 'time'}
                size={32}
                color={uploadRestriction.canUpload ? '#1a1a1a' : '#666'}
              />
              <Text style={[styles.addButtonText, !uploadRestriction.canUpload && styles.addButtonTextDisabled]}>
                {uploadRestriction.canUpload ? t('progressPhotos.newSessionButton') : uploadRestriction.message}
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Grid de fotos agrupadas por fecha */}
        {photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>{t('progressPhotos.emptyTitle')}</Text>
            <Text style={styles.emptyText}>{t('progressPhotos.emptyText')}</Text>
          </View>
        ) : (
          <View style={styles.photosContainer}>
            {groupPhotosByDate().map((group) => (
              <View key={group.date} style={styles.dateGroup}>
                {/* Header de fecha */}
                <View style={styles.dateHeader}>
                  <Text style={styles.dateHeaderText}>{formatDate(group.date)}</Text>
                  <Text style={styles.dateHeaderSubtext}>{formatDateShort(group.date)}</Text>
                </View>

                {/* Fila con 3 columnas (Frente, Costado, Espalda) */}
                <View style={styles.photoRow}>
                  {(['front', 'side', 'back'] as SessionPhotoType[]).map((type) => {
                    const photo = getPhotoByType(group.photos, type);
                    return (
                      <View key={type} style={styles.photoColumn}>
                        {/* Etiqueta del ángulo */}
                        <View style={styles.angleLabel}>
                          <Text style={styles.angleIcon}>{getTypeIcon(type)}</Text>
                          <Text style={styles.angleText}>{getTypeLabel(type)}</Text>
                        </View>

                        {/* Foto o placeholder */}
                        {photo ? (
                          <TouchableOpacity style={styles.photoCardGrouped} onPress={() => handlePhotoPress(photo)}>
                            <Image source={{ uri: photo.photo_url }} style={styles.photoImageGrouped} resizeMode="cover" />
                            {photo.weight_kg && (
                              <View style={styles.photoWeightBadge}>
                                <Text style={styles.photoWeightText}>{photo.weight_kg} kg</Text>
                              </View>
                            )}
                            <View style={styles.photoCheckmark}>
                              <Ionicons name="checkmark-circle" size={16} color="#ffb300" />
                            </View>
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.photoPlaceholder}>
                            <Ionicons name="image-outline" size={32} color="#555" />
                            <Text style={styles.placeholderText}>{t('progressPhotos.noPhoto')}</Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de sesión (3 vistas) */}
      <Modal
        visible={sessionModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSessionModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setSessionModalVisible(false)}
          />
          <View style={styles.sessionContent}>
            <View style={styles.sessionHeader}>
              <TouchableOpacity onPress={() => setSessionModalVisible(false)} style={styles.sessionCloseBtn}>
                <Ionicons name="close" size={22} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.sessionTitle}>{t('progressPhotos.sessionTitle')}</Text>
              <View style={{ width: 22 }} />
            </View>
            <Text style={styles.sessionSubtitle}>{t('progressPhotos.sessionSubtitle')}</Text>

            {/* Tips del asistente */}
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>{t('progressPhotos.quickTipsTitle')}</Text>
              <Text style={styles.tipItem}>• 📐 {t('progressPhotos.tip1')}</Text>
              <Text style={styles.tipItem}>• 🦶 {t('progressPhotos.tip2')}</Text>
              <Text style={styles.tipItem}>• 👕 {t('progressPhotos.tip3')}</Text>
              <Text style={styles.tipItem}>• 🔁 {t('progressPhotos.tip4')}</Text>
            </View>

            <View style={styles.sessionGrid}>
              {(['front', 'side', 'back'] as SessionPhotoType[]).map((type) => (
                <View key={type} style={styles.sessionItem}>
                  <Text style={styles.sessionLabel}>
                    {type === 'front' ? 'Frente' : type === 'back' ? 'Espalda' : 'Costado'}
                  </Text>
                  <View style={styles.sessionActions}>
                    <TouchableOpacity
                      style={[styles.sessionButton, currentSession[type] && styles.sessionDone]}
                      onPress={() => takePhoto(type)}
                      disabled={!!sessionUploading[type]}
                    >
                      <Ionicons
                        name={currentSession[type] ? 'checkmark-circle' : 'camera'}
                        size={20}
                        color="#1a1a1a"
                      />
                      <Text style={styles.sessionButtonText}>
                        {currentSession[type] ? t('progressPhotos.done') : t('progressPhotos.take')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.sessionSecondary} onPress={() => pickFromGallery(type)}>
                      <Ionicons name="image" size={18} color="#ffb300" />
                      <Text style={styles.sessionSecondaryText}>{t('progressPhotos.gallery')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <TouchableOpacity
                style={[
                  styles.finishButton,
                  { flex: 1 },
                  !(currentSession.front || currentSession.side || currentSession.back) && { opacity: 0.5 },
                ]}
                disabled={!(currentSession.front || currentSession.side || currentSession.back)}
                onPress={() => {
                  setSessionModalVisible(false);
                  setCurrentSession({});
                }}
              >
                <Text style={styles.finishButtonText}>{t('progressPhotos.finishSession')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.cancelButton, { flex: 1 }]}
                onPress={() => {
                  setSessionModalVisible(false);
                  setCurrentSession({});
                }}
              >
                <Text style={styles.cancelButtonText}>{t('progressPhotos.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de foto ampliada */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowPhotoModal(false)} />
          {selectedPhoto && (
            <View style={styles.modalContent}>
              <Image source={{ uri: selectedPhoto.photo_url }} style={styles.modalImage} resizeMode="contain" />
              <View style={styles.modalInfo}>
                <Text style={styles.modalDate}>{formatDate(selectedPhoto.photo_date)}</Text>
                {selectedPhoto.weight_kg && (
                  <Text style={styles.modalWeight}>{t('progressPhotos.weightLabel', { weight: selectedPhoto.weight_kg })}</Text>
                )}
                {selectedPhoto.notes && <Text style={styles.modalNotes}>{selectedPhoto.notes}</Text>}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.modalButton, styles.deleteButton]} onPress={() => handleDeletePhoto(selectedPhoto)}>
                  <Ionicons name="trash-outline" size={20} color="#ffffff" />
                  <Text style={styles.modalButtonText}>{t('progressPhotos.delete')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.closeButton]} onPress={() => setShowPhotoModal(false)}>
                  <Text style={styles.modalButtonText}>{t('progressPhotos.close')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#ffffff',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  reminderCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffb300',
    alignItems: 'center',
  },
  reminderTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffb300',
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonDisabled: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  addButtonTextDisabled: {
    color: '#888',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    marginTop: 64,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  photosContainer: {
    padding: 16,
    gap: 24,
  },
  dateGroup: {
    marginBottom: 8,
  },
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dateHeaderSubtext: {
    fontSize: 13,
    color: '#888',
    marginLeft: 8,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 8,
  },
  photoColumn: {
    flex: 1,
    gap: 6,
  },
  angleLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 4,
  },
  angleIcon: {
    fontSize: 14,
  },
  angleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ccc',
    textTransform: 'uppercase',
  },
  photoCardGrouped: {
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#ffb300',
  },
  photoImageGrouped: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#1f1f1f',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  photoWeightBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  photoWeightText: {
    fontSize: 11,
    color: '#ffb300',
    fontWeight: '600',
  },
  photoCheckmark: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  // Estilos antiguos (mantener para compatibilidad)
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
  },
  photoCard: {
    width: photoSize,
    height: photoSize,
    margin: 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  photoDate: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  photoWeight: {
    fontSize: 11,
    color: '#ffb300',
    marginTop: 2,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalImage: {
    width: '100%',
    height: 400,
    backgroundColor: '#1a1a1a',
  },
  modalInfo: {
    padding: 16,
  },
  modalDate: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  modalWeight: {
    fontSize: 14,
    color: '#ffb300',
    marginBottom: 8,
  },
  modalNotes: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  closeButton: {
    backgroundColor: '#333',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Session modal styles
  sessionContent: {
    width: '90%',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sessionCloseBtn: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  sessionSubtitle: {
    fontSize: 13,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 12,
  },
  sessionGrid: {
    gap: 12,
  },
  sessionItem: {
    backgroundColor: '#1f1f1f',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  sessionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  sessionActions: {
    flexDirection: 'row',
    gap: 10,
  },
  sessionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffb300',
    borderRadius: 8,
    paddingVertical: 10,
    gap: 8,
  },
  sessionDone: {
    backgroundColor: '#ffd54a',
  },
  sessionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  sessionSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ffb300',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 6,
  },
  sessionSecondaryText: {
    fontSize: 13,
    color: '#ffb300',
    fontWeight: '500',
  },
  finishButton: {
    marginTop: 12,
    backgroundColor: '#ffb300',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  finishButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cancelButton: {
    marginTop: 12,
    backgroundColor: '#333',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  missingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 213, 74, 0.08)',
    borderWidth: 1,
    borderColor: '#ffd54a',
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 12,
  },
  missingTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffd54a',
    marginBottom: 4,
  },
  missingText: {
    fontSize: 13,
    color: '#ddd',
  },
  missingActions: {
    flexDirection: 'row',
    gap: 6,
  },
  missingBtn: {
    backgroundColor: '#ffd54a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  missingBtnText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '700',
  },
  tipsBox: {
    backgroundColor: '#1f1f1f',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  tipsTitle: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
  },
  tipItem: {
    color: '#ccc',
    fontSize: 13,
    marginBottom: 4,
  },
});
