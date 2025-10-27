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
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import {
  getUserPhotos,
  analyzePhotoWithAI,
  saveAIAnalysis,
} from '@/services/progressPhotos';
import { ProgressPhoto, AIAnalysis } from '@/types/progressPhotos';

const { width } = Dimensions.get('window');
const photoWidth = (width - 48) / 2;

export default function ComparePhotosScreen() {
  const { user } = useUser();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [selectedBefore, setSelectedBefore] = useState<ProgressPhoto | null>(null);
  const [selectedAfter, setSelectedAfter] = useState<ProgressPhoto | null>(null);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, [user]);

  const loadPhotos = async () => {
    if (!user?.id) return;

    setLoading(true);
    const photosData = await getUserPhotos(user.id);
    setPhotos(photosData);
    setLoading(false);
  };

  const handleSelectBefore = (photo: ProgressPhoto) => {
    setSelectedBefore(photo);
    setAnalysis(null);
  };

  const handleSelectAfter = (photo: ProgressPhoto) => {
    if (selectedBefore && new Date(photo.photo_date) <= new Date(selectedBefore.photo_date)) {
      Alert.alert(
        'Fecha inválida',
        'La foto "Después" debe ser posterior a la foto "Antes"'
      );
      return;
    }
    setSelectedAfter(photo);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!selectedBefore || !selectedAfter) {
      Alert.alert('Error', 'Selecciona dos fotos para comparar');
      return;
    }

    setAnalyzing(true);
    try {
      const result = await analyzePhotoWithAI(
        selectedBefore.photo_url,
        selectedAfter.photo_url
      );

      if (result) {
        setAnalysis(result);
        // Guardar análisis en la foto más reciente
        await saveAIAnalysis(selectedAfter.id, result);
      } else {
        Alert.alert(
          'Error',
          'No se pudo analizar las fotos. Intenta nuevamente.'
        );
      }
    } catch (error) {
      console.error('❌ Error analyzing:', error);
      Alert.alert('Error', 'Ocurrió un error al analizar las fotos');
    } finally {
      setAnalyzing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysBetween = () => {
    if (!selectedBefore || !selectedAfter) return 0;
    const diff =
      new Date(selectedAfter.photo_date).getTime() -
      new Date(selectedBefore.photo_date).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const getWeightChange = () => {
    if (!selectedBefore?.weight_kg || !selectedAfter?.weight_kg) return null;
    const change = selectedAfter.weight_kg - selectedBefore.weight_kg;
    return change;
  };

  const renderChangeIcon = (change: string) => {
    if (change === 'increased') return '📈';
    if (change === 'decreased') return '📉';
    return '➡️';
  };

  const renderChangeText = (change: string) => {
    if (change === 'increased') return 'Aumentado';
    if (change === 'decreased') return 'Reducido';
    if (change === 'maintained') return 'Mantenido';
    if (change === 'more_visible') return 'Más visibles';
    if (change === 'less_visible') return 'Menos visibles';
    return 'Sin cambios';
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
        <Text style={styles.headerTitle}>Comparar Fotos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Fotos seleccionadas */}
        <View style={styles.comparisonContainer}>
          <View style={styles.photoColumn}>
            <Text style={styles.columnTitle}>Antes</Text>
            {selectedBefore ? (
              <View>
                <Image
                  source={{ uri: selectedBefore.photo_url }}
                  style={styles.comparisonPhoto}
                  resizeMode="cover"
                />
                <Text style={styles.photoDateText}>
                  {formatDate(selectedBefore.photo_date)}
                </Text>
                {selectedBefore.weight_kg && (
                  <Text style={styles.photoWeightText}>
                    {selectedBefore.weight_kg} kg
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.placeholderPhoto}>
                <Ionicons name="image-outline" size={48} color="#666" />
                <Text style={styles.placeholderText}>Selecciona una foto</Text>
              </View>
            )}
          </View>

          <View style={styles.photoColumn}>
            <Text style={styles.columnTitle}>Después</Text>
            {selectedAfter ? (
              <View>
                <Image
                  source={{ uri: selectedAfter.photo_url }}
                  style={styles.comparisonPhoto}
                  resizeMode="cover"
                />
                <Text style={styles.photoDateText}>
                  {formatDate(selectedAfter.photo_date)}
                </Text>
                {selectedAfter.weight_kg && (
                  <Text style={styles.photoWeightText}>
                    {selectedAfter.weight_kg} kg
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.placeholderPhoto}>
                <Ionicons name="image-outline" size={48} color="#666" />
                <Text style={styles.placeholderText}>Selecciona una foto</Text>
              </View>
            )}
          </View>
        </View>

        {/* Info de comparación */}
        {selectedBefore && selectedAfter && (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Tiempo transcurrido:</Text>
            <Text style={styles.infoValue}>{getDaysBetween()} días</Text>
            {getWeightChange() !== null && (
              <>
                <Text style={styles.infoTitle}>Cambio de peso:</Text>
                <Text
                  style={[
                    styles.infoValue,
                    { color: getWeightChange()! > 0 ? '#FF9800' : '#00D4AA' },
                  ]}
                >
                  {getWeightChange()! > 0 ? '+' : ''}
                  {getWeightChange()?.toFixed(1)} kg
                </Text>
              </>
            )}
          </View>
        )}

        {/* Botón analizar con IA */}
        {selectedBefore && selectedAfter && !analysis && (
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={handleAnalyze}
            disabled={analyzing}
          >
            {analyzing ? (
              <ActivityIndicator size="small" color="#1a1a1a" />
            ) : (
              <>
                <Ionicons name="sparkles" size={24} color="#1a1a1a" />
                <Text style={styles.analyzeButtonText}>
                  Analizar con IA
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Análisis de IA */}
        {analysis && (
          <View style={styles.analysisCard}>
            <View style={styles.analysisHeader}>
              <Ionicons name="sparkles" size={24} color="#00D4AA" />
              <Text style={styles.analysisTitle}>Análisis de IA</Text>
            </View>

            {analysis.overallChange && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Resumen:</Text>
                <Text style={styles.analysisText}>{analysis.overallChange}</Text>
              </View>
            )}

            {analysis.detectedChanges && analysis.detectedChanges.length > 0 && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Cambios detectados:</Text>
                {analysis.detectedChanges.map((change, index) => (
                  <Text key={index} style={styles.changeItem}>
                    • {change}
                  </Text>
                ))}
              </View>
            )}

            {analysis.muscleGrowth && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Desarrollo muscular:</Text>
                {analysis.muscleGrowth.arms && (
                  <View style={styles.muscleRow}>
                    <Text style={styles.muscleLabel}>💪 Brazos:</Text>
                    <Text style={styles.muscleValue}>
                      {renderChangeIcon(analysis.muscleGrowth.arms)}{' '}
                      {renderChangeText(analysis.muscleGrowth.arms)}
                    </Text>
                  </View>
                )}
                {analysis.muscleGrowth.chest && (
                  <View style={styles.muscleRow}>
                    <Text style={styles.muscleLabel}>🫁 Pecho:</Text>
                    <Text style={styles.muscleValue}>
                      {renderChangeIcon(analysis.muscleGrowth.chest)}{' '}
                      {renderChangeText(analysis.muscleGrowth.chest)}
                    </Text>
                  </View>
                )}
                {analysis.muscleGrowth.shoulders && (
                  <View style={styles.muscleRow}>
                    <Text style={styles.muscleLabel}>🤸 Hombros:</Text>
                    <Text style={styles.muscleValue}>
                      {renderChangeIcon(analysis.muscleGrowth.shoulders)}{' '}
                      {renderChangeText(analysis.muscleGrowth.shoulders)}
                    </Text>
                  </View>
                )}
                {analysis.muscleGrowth.abs && (
                  <View style={styles.muscleRow}>
                    <Text style={styles.muscleLabel}>🏋️ Abdomen:</Text>
                    <Text style={styles.muscleValue}>
                      {renderChangeText(analysis.muscleGrowth.abs)}
                    </Text>
                  </View>
                )}
                {analysis.muscleGrowth.legs && (
                  <View style={styles.muscleRow}>
                    <Text style={styles.muscleLabel}>🦵 Piernas:</Text>
                    <Text style={styles.muscleValue}>
                      {renderChangeIcon(analysis.muscleGrowth.legs)}{' '}
                      {renderChangeText(analysis.muscleGrowth.legs)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {analysis.bodyFat && (
              <View style={styles.analysisSection}>
                <Text style={styles.analysisSectionTitle}>Grasa corporal:</Text>
                <Text style={styles.analysisText}>
                  {renderChangeIcon(analysis.bodyFat.change || 'maintained')}{' '}
                  {renderChangeText(analysis.bodyFat.change || 'maintained')}
                </Text>
              </View>
            )}

            {analysis.confidence && (
              <Text style={styles.confidenceText}>
                Confianza del análisis: {(analysis.confidence * 100).toFixed(0)}%
              </Text>
            )}
          </View>
        )}

        {/* Galería de fotos para seleccionar */}
        <View style={styles.gallerySection}>
          <Text style={styles.galleryTitle}>Selecciona fotos para comparar:</Text>
          <View style={styles.photosGrid}>
            {photos.map((photo) => (
              <TouchableOpacity
                key={photo.id}
                style={[
                  styles.galleryPhoto,
                  (selectedBefore?.id === photo.id || selectedAfter?.id === photo.id) &&
                    styles.selectedPhoto,
                ]}
                onPress={() => {
                  if (!selectedBefore) {
                    handleSelectBefore(photo);
                  } else if (!selectedAfter) {
                    handleSelectAfter(photo);
                  } else {
                    // Reset y seleccionar nuevo "antes"
                    setSelectedBefore(photo);
                    setSelectedAfter(null);
                    setAnalysis(null);
                  }
                }}
              >
                <Image
                  source={{ uri: photo.photo_url }}
                  style={styles.galleryPhotoImage}
                  resizeMode="cover"
                />
                <View style={styles.galleryPhotoOverlay}>
                  <Text style={styles.galleryPhotoDate}>
                    {formatDate(photo.photo_date)}
                  </Text>
                </View>
                {(selectedBefore?.id === photo.id || selectedAfter?.id === photo.id) && (
                  <View style={styles.selectionBadge}>
                    <Ionicons name="checkmark-circle" size={24} color="#00D4AA" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
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
  comparisonContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  photoColumn: {
    flex: 1,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  comparisonPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
  },
  placeholderPhoto: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#333',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  photoDateText: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
  },
  photoWeightText: {
    fontSize: 11,
    color: '#00D4AA',
    textAlign: 'center',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#2a2a2a',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoTitle: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00D4AA',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  analyzeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  analysisCard: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  analysisHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  analysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00D4AA',
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00D4AA',
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
  },
  changeItem: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 22,
  },
  muscleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  muscleLabel: {
    fontSize: 14,
    color: '#ccc',
  },
  muscleValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  confidenceText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  gallerySection: {
    padding: 16,
  },
  galleryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  galleryPhoto: {
    width: photoWidth,
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2a2a2a',
    position: 'relative',
  },
  selectedPhoto: {
    borderWidth: 3,
    borderColor: '#00D4AA',
  },
  galleryPhotoImage: {
    width: '100%',
    height: '100%',
  },
  galleryPhotoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 8,
  },
  galleryPhotoDate: {
    fontSize: 11,
    color: '#ffffff',
  },
  selectionBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
  },
});

