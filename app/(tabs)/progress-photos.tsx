import React, { useState, useEffect } from 'react';
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
import { useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import {
  getUserPhotos,
  uploadProgressPhoto,
  checkPhotoReminder,
  deleteProgressPhoto,
} from '@/services/progressPhotos';
import { ProgressPhoto, PhotoType, PhotoReminder } from '@/types/progressPhotos';

const { width } = Dimensions.get('window');
const photoSize = (width - 48) / 2; // 2 columnas con padding

export default function ProgressPhotosScreen() {
  const { user } = useUser();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [reminder, setReminder] = useState<PhotoReminder | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

  // Cargar fotos y verificar recordatorio
  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const [photosData, reminderData] = await Promise.all([
        getUserPhotos(user.id),
        checkPhotoReminder(user.id),
      ]);

      setPhotos(photosData);
      setReminder(reminderData);
      console.log('📸 Fotos cargadas:', photosData.length);
      console.log('📅 Recordatorio:', reminderData);
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
      Alert.alert(
        'Permisos necesarios',
        'Necesitamos acceso a tu cámara para tomar fotos de progreso'
      );
      return false;
    }
    return true;
  };

  // Tomar foto o seleccionar de galería
  const handleAddPhoto = async () => {
    Alert.alert(
      'Agregar foto de progreso',
      'Elige una opción',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: '📷 Tomar foto',
          onPress: () => takePhoto(),
        },
        {
          text: '🖼️ Elegir de galería',
          onPress: () => pickFromGallery(),
        },
      ]
    );
  };

  const takePhoto = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      await confirmAndUpload(result.assets[0].uri);
    }
  };

  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled) {
      await confirmAndUpload(result.assets[0].uri);
    }
  };

  const confirmAndUpload = async (uri: string) => {
    if (!user?.id) return;

    // Preguntar tipo de foto y notas
    Alert.prompt(
      'Agregar notas',
      'Agrega notas opcionales sobre esta foto (peso, cómo te sientes, etc.)',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Subir',
          onPress: async (notes) => {
            setUploading(true);
            const result = await uploadProgressPhoto(
              user.id,
              uri,
              'front', // Por defecto frontal
              undefined,
              notes
            );

            setUploading(false);

            if (result.success) {
              Alert.alert('✅ Éxito', 'Foto subida correctamente');
              loadData();
            } else {
              Alert.alert('❌ Error', result.error || 'No se pudo subir la foto');
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
    Alert.alert(
      'Eliminar foto',
      '¿Estás seguro de que quieres eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteProgressPhoto(photo.id, photo.photo_url);
            if (success) {
              Alert.alert('✅ Eliminada', 'Foto eliminada correctamente');
              setShowPhotoModal(false);
              loadData();
            } else {
              Alert.alert('❌ Error', 'No se pudo eliminar la foto');
            }
          },
        },
      ]
    );
  };

  const handleCompare = () => {
    if (photos.length < 2) {
      Alert.alert(
        'Necesitas más fotos',
        'Sube al menos 2 fotos para poder compararlas'
      );
      return;
    }
    router.push('/compare-photos' as any);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Cargando fotos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fotos de Progreso</Text>
        <TouchableOpacity onPress={handleCompare}>
          <Ionicons name="git-compare-outline" size={24} color="#00D4AA" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Recordatorio si es necesario */}
        {reminder?.shouldShowReminder && (
          <View style={styles.reminderCard}>
            <Ionicons name="camera" size={32} color="#00D4AA" />
            <View style={styles.reminderTextContainer}>
              <Text style={styles.reminderTitle}>📸 ¡Es hora de una foto!</Text>
              <Text style={styles.reminderText}>
                Han pasado {reminder.daysSinceLastPhoto} días desde tu última foto.
                Documenta tu progreso cada 2 semanas.
              </Text>
            </View>
          </View>
        )}

        {/* Botón agregar foto */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPhoto}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#1a1a1a" />
          ) : (
            <>
              <Ionicons name="add-circle" size={32} color="#1a1a1a" />
              <Text style={styles.addButtonText}>Agregar foto</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Grid de fotos */}
        {photos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="images-outline" size={64} color="#666" />
            <Text style={styles.emptyTitle}>No hay fotos aún</Text>
            <Text style={styles.emptyText}>
              Agrega tu primera foto para comenzar a documentar tu progreso
            </Text>
          </View>
        ) : (
          <View style={styles.photosGrid}>
            {photos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={styles.photoCard}
                onPress={() => handlePhotoPress(photo)}
              >
                <Image
                  source={{ uri: photo.photo_url }}
                  style={styles.photoImage}
                  resizeMode="cover"
                />
                <View style={styles.photoOverlay}>
                  <Text style={styles.photoDate}>{formatDate(photo.photo_date)}</Text>
                  {photo.weight_kg && (
                    <Text style={styles.photoWeight}>{photo.weight_kg} kg</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal de foto ampliada */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowPhotoModal(false)}
          />
          {selectedPhoto && (
            <View style={styles.modalContent}>
              <Image
                source={{ uri: selectedPhoto.photo_url }}
                style={styles.modalImage}
                resizeMode="contain"
              />
              <View style={styles.modalInfo}>
                <Text style={styles.modalDate}>
                  {formatDate(selectedPhoto.photo_date)}
                </Text>
                {selectedPhoto.weight_kg && (
                  <Text style={styles.modalWeight}>
                    Peso: {selectedPhoto.weight_kg} kg
                  </Text>
                )}
                {selectedPhoto.notes && (
                  <Text style={styles.modalNotes}>{selectedPhoto.notes}</Text>
                )}
              </View>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.deleteButton]}
                  onPress={() => handleDeletePhoto(selectedPhoto)}
                >
                  <Ionicons name="trash-outline" size={20} color="#ffffff" />
                  <Text style={styles.modalButtonText}>Eliminar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.closeButton]}
                  onPress={() => setShowPhotoModal(false)}
                >
                  <Text style={styles.modalButtonText}>Cerrar</Text>
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
    borderColor: '#00D4AA',
    alignItems: 'center',
  },
  reminderTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00D4AA',
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
    backgroundColor: '#00D4AA',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
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
    color: '#00D4AA',
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
    color: '#00D4AA',
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
});

