import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  Dimensions,
  InteractionManager,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser, useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../src/services/supabase';
import { UserProfile } from '../../src/types';
import { getClerkUserEmailSync } from '../../src/utils/clerkHelpers';
import { LoadingOverlay } from '../../src/components/LoadingOverlay';
import { useLoadingState } from '../../src/hooks/useLoadingState';
import { uploadProfilePhoto, deleteProfilePhoto } from '../../src/services/profilePhoto';

const { width } = Dimensions.get('window');

export default function ProfileScreen() {
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const { isLoading: loading, setLoading, executeAsync } = useLoadingState(true);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPhotoViewer, setShowPhotoViewer] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Cargar perfil de Supabase
  const loadProfile = async () => {
    if (!user?.id) return;
    
    await executeAsync(async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Error al cargar perfil:', error);
      } else if (data) {
        setProfile(data);
      }
    }, { showError: false });
  };

  // Seleccionar foto de galería
  const handleSelectFromGallery = async () => {
    if (!user?.id) return;
    
    try {
      console.log('📸 Abriendo galería...');
      
      // Verificar y solicitar permisos si es necesario
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Necesitamos acceso a tu galería para seleccionar una foto de perfil'
        );
        return;
      }
      
      console.log('📸 Permisos otorgados, abriendo ImagePicker...');
      
      // NO cerrar el modal antes - el ImagePicker debe abrirse primero
      // Usar exactamente el mismo formato que funciona en progress-photos.tsx
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      console.log('📸 ImagePicker retornó:', result);
      console.log('📸 Canceled:', result.canceled);
      console.log('📸 Assets:', result.assets?.length);

      // Cerrar el modal DESPUÉS de que el ImagePicker retorne
      setShowPhotoModal(false);

      if (!result.canceled && result.assets && result.assets[0]) {
        console.log('📸 Subiendo foto:', result.assets[0].uri);
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('❌ Error selecting image:', error);
      setShowPhotoModal(false);
      Alert.alert('Error', error?.message || 'No se pudo seleccionar la imagen');
    }
  };

  // Tomar foto con cámara
  const handleTakePhoto = async () => {
    if (!user?.id) return;
    
    try {
      console.log('📷 Abriendo cámara...');
      
      // Verificar y solicitar permisos si es necesario
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permiso necesario',
          'Necesitamos acceso a tu cámara para tomar una foto de perfil'
        );
        return;
      }
      
      console.log('📷 Permisos otorgados, abriendo cámara...');
      
      // NO cerrar el modal antes - la cámara debe abrirse primero
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      console.log('📷 Resultado de cámara:', result.canceled, result.assets?.length);

      // Cerrar el modal DESPUÉS de que la cámara retorne
      setShowPhotoModal(false);

      if (!result.canceled && result.assets && result.assets[0]) {
        await uploadPhoto(result.assets[0].uri);
      }
    } catch (error: any) {
      console.error('❌ Error taking photo:', error);
      setShowPhotoModal(false);
      Alert.alert('Error', error?.message || 'No se pudo tomar la foto');
    }
  };

  // Subir foto de perfil
  const uploadPhoto = async (photoUri: string) => {
    if (!user?.id) return;

    setUploadingPhoto(true);
    try {
      const result = await uploadProfilePhoto(user.id, photoUri);
      
      if (result.success) {
        console.log('✅ Foto subida exitosamente, URL:', result.photoUrl);
        
        // Recargar perfil para mostrar la nueva foto
        await loadProfile();
        
        // Forzar un pequeño delay para asegurar que el estado se actualice
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar que el perfil se actualizó
        const { data: updatedProfile } = await supabase
          .from('user_profiles')
          .select('profile_photo_url')
          .eq('user_id', user.id)
          .maybeSingle();
        
        console.log('📸 Perfil actualizado, nueva URL:', updatedProfile?.profile_photo_url);
        
        if (updatedProfile) {
          setProfile(prev => ({ ...prev, ...updatedProfile } as UserProfile));
        }
        
        Alert.alert('¡Éxito!', 'Foto de perfil actualizada');
      } else {
        Alert.alert('Error', result.error || 'No se pudo actualizar la foto de perfil');
      }
    } catch (error) {
      console.error('❌ Error uploading photo:', error);
      Alert.alert('Error', 'No se pudo subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Eliminar foto de perfil
  const handleDeletePhoto = () => {
    if (!user?.id) return;

    Alert.alert(
      'Eliminar foto de perfil',
      '¿Estás seguro de que quieres eliminar tu foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setUploadingPhoto(true);
            try {
              const result = await deleteProfilePhoto(user.id);
              
              if (result.success) {
                await loadProfile();
                setShowPhotoModal(false);
                Alert.alert('Foto eliminada', 'Tu foto de perfil ha sido eliminada');
              } else {
                Alert.alert('Error', result.error || 'No se pudo eliminar la foto');
              }
            } catch (error) {
              console.error('❌ Error deleting photo:', error);
              Alert.alert('Error', 'No se pudo eliminar la foto');
            } finally {
              setUploadingPhoto(false);
            }
          },
        },
      ]
    );
  };

  // Cargar al montar y al volver a enfocar
  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [user])
  );

  // Obtener nombre y email para mostrar
  const displayName = profile?.name || user?.firstName || user?.fullName || 'Usuario';
  
  // Prioridad: email de perfil Supabase (guardado en onboarding) > email de Clerk > No especificado
  // Nota: Si el usuario se registró con OAuth (como TikTok), el email puede no estar disponible en Clerk
  const clerkEmail = getClerkUserEmailSync(user);
  const displayEmail = profile?.email || clerkEmail || 'No especificado';
  const firstLetter = displayName.charAt(0).toUpperCase();
  const profilePhotoUrl = (profile as any)?.profile_photo_url;
  
  // Debug: Log para verificar la URL (debe estar antes de cualquier return)
  useEffect(() => {
    if (profilePhotoUrl) {
      console.log('🖼️ URL de foto de perfil cargada:', profilePhotoUrl);
    }
  }, [profilePhotoUrl]);

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Cerrar sesión', 
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
              Alert.alert('Error', 'No se pudo cerrar la sesión');
            }
          }
        },
      ]
    );
  };

  const menuItems = [
    {
      title: 'Editar perfil',
      icon: 'person-outline',
      onPress: () => router.push('/onboarding'),
    },
    {
      title: 'Configuración',
      icon: 'settings-outline',
      onPress: () => router.push('/settings'),
    },
    {
      title: 'Notificaciones',
      icon: 'notifications-outline',
      onPress: () => router.push('/notification-settings'),
    },
    {
      title: 'Ayuda y soporte',
      icon: 'help-circle-outline',
      onPress: () => router.push('/help'),
    },
    {
      title: 'Acerca de',
      icon: 'information-circle-outline',
      onPress: () => router.push('/about'),
    },
  ];

  // Mapeo de nivel de fitness a español
  const fitnessLevelMap: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  };

  // Mostrar loading
  if (loading) {
    return (
      <View style={styles.container}>
        <LoadingOverlay visible={true} message="Cargando perfil..." fullScreen />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.avatarContainer}
          onPress={() => {
            if (profilePhotoUrl) {
              setShowPhotoViewer(true);
            } else {
              setShowPhotoModal(true);
            }
          }}
          activeOpacity={0.7}
        >
          {profilePhotoUrl ? (
            <Image
              key={profilePhotoUrl} // Forzar re-render cuando cambia la URL
              source={{ uri: profilePhotoUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
              onError={(e) => {
                console.error('❌ Error cargando imagen de perfil:', e.nativeEvent.error);
                console.error('URL que falló:', profilePhotoUrl);
              }}
              onLoad={() => {
                console.log('✅ Imagen de perfil cargada exitosamente');
              }}
            />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{firstLetter}</Text>
            </View>
          )}
          <View style={styles.avatarEditBadge}>
            <Ionicons name="camera" size={16} color="#1a1a1a" />
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{displayEmail}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Información personal</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{displayEmail}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Nombre</Text>
            <Text style={styles.infoValue}>{displayName}</Text>
          </View>
          {profile && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Género</Text>
                <Text style={styles.infoValue}>
                  {profile.gender === 'male' ? 'Masculino' : 
                   profile.gender === 'female' ? 'Femenino' : 
                   profile.gender === 'other' ? 'Otro' : 'No especificado'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Edad</Text>
                <Text style={styles.infoValue}>{profile.age} años</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Altura</Text>
                <Text style={styles.infoValue}>{profile.height} cm</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Peso</Text>
                <Text style={styles.infoValue}>{profile.weight} kg</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Configuración</Text>
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <Ionicons name={item.icon as any} size={24} color="#ffb300" />
                <Text style={styles.menuItemText}>{item.title}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#666" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={24} color="#F44336" />
          <Text style={styles.signOutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Luxor Fitness v1.0.0</Text>
        <Text style={styles.footerText}>Hecho con ❤️ para tu fitness</Text>
      </View>

      {/* Modal para opciones de foto */}
      <Modal
        visible={showPhotoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Foto de perfil</Text>
            
            {profilePhotoUrl && (
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowPhotoModal(false);
                  setShowPhotoViewer(true);
                }}
              >
                <Ionicons name="eye-outline" size={24} color="#ffb300" />
                <Text style={styles.modalOptionText}>Ver foto</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleTakePhoto}
              disabled={uploadingPhoto}
            >
              <Ionicons name="camera-outline" size={24} color="#ffb300" />
              <Text style={styles.modalOptionText}>Tomar foto</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={handleSelectFromGallery}
              disabled={uploadingPhoto}
            >
              <Ionicons name="images-outline" size={24} color="#ffb300" />
              <Text style={styles.modalOptionText}>Elegir de galería</Text>
            </TouchableOpacity>

            {profilePhotoUrl && (
              <TouchableOpacity
                style={[styles.modalOption, styles.modalOptionDanger]}
                onPress={handleDeletePhoto}
                disabled={uploadingPhoto}
              >
                <Ionicons name="trash-outline" size={24} color="#F44336" />
                <Text style={[styles.modalOptionText, styles.modalOptionTextDanger]}>
                  Eliminar foto
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowPhotoModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>

            {uploadingPhoto && (
              <View style={styles.uploadingOverlay}>
                <Text style={styles.uploadingText}>Subiendo foto...</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal para ver foto en pantalla completa */}
      <Modal
        visible={showPhotoViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoViewer(false)}
      >
        <View style={styles.photoViewerOverlay}>
          <TouchableOpacity
            style={styles.photoViewerClose}
            onPress={() => setShowPhotoViewer(false)}
          >
            <Ionicons name="close" size={32} color="#ffffff" />
          </TouchableOpacity>
          
          {profilePhotoUrl && (
            <Image
              source={{ uri: profilePhotoUrl }}
              style={styles.photoViewerImage}
              resizeMode="contain"
            />
          )}

          <TouchableOpacity
            style={styles.photoViewerEditButton}
            onPress={() => {
              setShowPhotoViewer(false);
              setShowPhotoModal(true);
            }}
          >
            <Ionicons name="camera" size={20} color="#1a1a1a" />
            <Text style={styles.photoViewerEditText}>Editar foto</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    paddingTop: 0,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffb300',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  section: {
    padding: 20,
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#ccc',
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  goalsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  goalTag: {
    backgroundColor: '#ffb300',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  goalText: {
    color: '#1a1a1a',
    fontSize: 12,
    fontWeight: '600',
  },
  noGoalsText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  equipmentContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  equipmentTag: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  equipmentText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  noEquipmentText: {
    color: '#666',
    fontSize: 14,
    fontStyle: 'italic',
  },
  menuContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#ffb300',
  },
  editProfileText: {
    fontSize: 16,
    color: '#ffb300',
    fontWeight: '600',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F44336',
  },
  signOutText: {
    fontSize: 16,
    color: '#F44336',
    marginLeft: 8,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    padding: 20,
    paddingTop: 40,
  },
  footerText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#ffb300',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  modalOptionDanger: {
    borderColor: '#F44336',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#ffffff',
    marginLeft: 12,
    fontWeight: '500',
  },
  modalOptionTextDanger: {
    color: '#F44336',
  },
  modalCancelButton: {
    marginTop: 8,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
  },
  uploadingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  photoViewerOverlay: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoViewerImage: {
    width: width,
    height: width,
  },
  photoViewerEditButton: {
    position: 'absolute',
    bottom: 40,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffb300',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  photoViewerEditText: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
});
