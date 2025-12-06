import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  StatusBar,
  LogBox,
} from 'react-native';
import { Video, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// Suprimir warning de deprecación de expo-av (migración a expo-video pendiente)
LogBox.ignoreLogs([
  'expo-av',
  'Video component from `expo-av` is deprecated',
]);

interface ExerciseVideoModalProps {
  visible: boolean;
  videoUrl: string | null;
  exerciseName: string;
  onClose: () => void;
}

export default function ExerciseVideoModal({
  visible,
  videoUrl,
  exerciseName,
  onClose,
}: ExerciseVideoModalProps) {
  const videoRef = useRef<Video>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const loadAttemptRef = useRef(0);
  const playTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setError(null); // Limpiar errores transitorios cuando se carga correctamente
      
      if (status.error) {
        console.error('Video playback error:', status.error);
        // Solo mostrar error después de múltiples intentos fallidos
        if (retryCount >= 2) {
          setError('Error al reproducir el video');
        }
      }
    }
  };

  const handleClose = () => {
    // Limpiar timeout pendiente
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    
    // Pausar el video antes de cerrar (sin descargar para evitar errores)
    if (videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
    }
    setIsLoading(true);
    setError(null);
    setIsReady(false);
    setRetryCount(0);
    loadAttemptRef.current = 0;
    onClose();
  };
  
  const handleRetry = () => {
    console.log('🔄 Retry triggered');
    setError(null);
    setIsLoading(true);
    setIsReady(false);
    setRetryCount(prev => prev + 1);
    loadAttemptRef.current += 1;
  };
  
  // Reintento automático cuando hay error
  React.useEffect(() => {
    if (error && retryCount < 2 && videoUrl && visible) {
      console.log(`⚠️ Error detectado, reintento automático ${retryCount + 1}/2`);
      const timer = setTimeout(() => {
        handleRetry();
      }, 1000); // Esperar 1 segundo antes de reintentar
      
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, videoUrl, visible]);
  
  // Resetear estado cuando cambia la visibilidad o el video
  React.useEffect(() => {
    if (visible && videoUrl) {
      console.log('📺 Video modal opened:', videoUrl);
      loadAttemptRef.current += 1;
      setIsLoading(true);
      setError(null);
      setIsReady(false);
      setRetryCount(0);
    } else if (!visible) {
      // Limpiar completamente al cerrar
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
      setRetryCount(0);
      loadAttemptRef.current = 0;
    }
  }, [visible, videoUrl]);

  if (!videoUrl) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <StatusBar hidden />
      <View style={styles.container}>
        {/* Header con botón de cerrar */}
        <View style={styles.header}>
          <Text style={styles.exerciseName} numberOfLines={1}>
            {exerciseName}
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Video player */}
        <View style={styles.videoContainer}>
          {isLoading && !error && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffb300" />
              <Text style={styles.loadingText}>Cargando video...</Text>
              <Text style={styles.loadingSubtext}>Esto puede tardar unos segundos</Text>
            </View>
          )}
          
          {error && retryCount >= 2 && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={48} color="#ff4444" />
              <Text style={styles.errorText}>Video no disponible</Text>
              <Text style={styles.errorSubtext}>
                Verifica tu conexión a internet e intenta nuevamente
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={handleRetry}
              >
                <Ionicons name="refresh" size={20} color="#fff" />
                <Text style={styles.retryButtonText}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          )}
          
          {error && retryCount < 2 && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#ffb300" />
              <Text style={styles.loadingText}>Reintentando...</Text>
              <Text style={styles.loadingSubtext}>Intento {retryCount + 1} de 2</Text>
            </View>
          )}

          {visible && videoUrl && (
            <Video
              key={`video_${videoUrl}_${retryCount}`}
              ref={videoRef}
              source={{ uri: videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode="contain"
              shouldPlay={true}
              isLooping={true}
              isMuted={false}
              volume={1.0}
              rate={1.0}
              progressUpdateIntervalMillis={500}
              usePoster={false}
              posterSource={undefined}
              allowsExternalPlayback={false}
            onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
            onError={(error) => {
              console.error('❌ Video error:', error);
              // Solo marcar error si hemos intentado varias veces
              if (retryCount < 2) {
                console.log('⚠️ Error transitorio, se reintentará automáticamente');
                setError('Error transitorio');
              } else {
                setError('Video no disponible');
              }
              setIsLoading(false);
            }}
            onLoadStart={() => {
              console.log('⏳ Video load started');
              setIsLoading(true);
              setIsReady(false);
              setError(null); // Limpiar errores previos al iniciar carga
            }}
            onLoad={(status) => {
              console.log('✅ Video loaded successfully');
              setIsLoading(false);
              setError(null); // Limpiar errores al cargar correctamente
              setRetryCount(0); // Resetear contador de reintentos
            }}
            onReadyForDisplay={() => {
              console.log('🎬 Video ready for display');
              
              // Limpiar timeout anterior si existe
              if (playTimeoutRef.current) {
                clearTimeout(playTimeoutRef.current);
              }
              
              // Esperar un momento para que el video se estabilice
              playTimeoutRef.current = setTimeout(async () => {
                if (videoRef.current && visible) {
                  try {
                    console.log('⚡ Aplicando seek trick...');
                    // Seek pequeño para despertar el video
                    await videoRef.current.setPositionAsync(10);
                    // Pequeña pausa para que se estabilice
                    await new Promise(resolve => setTimeout(resolve, 50));
                    // Volver al inicio
                    await videoRef.current.setPositionAsync(0);
                    // Reproducir
                    await videoRef.current.playAsync();
                    console.log('▶️ Video iniciado correctamente');
                  } catch (err) {
                    console.error('Error starting video:', err);
                    // Fallback: intentar reproducir sin seek
                    try {
                      await videoRef.current?.playAsync();
                    } catch (e) {
                      console.error('Fallback también falló:', e);
                    }
                  }
                }
                playTimeoutRef.current = null;
              }, 300); // Esperar 300ms para que todo esté listo
            }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#000',
  },
  exerciseName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 15,
  },
  closeButton: {
    padding: 5,
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 15,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    marginTop: 8,
    color: '#999',
    fontSize: 14,
  },
  errorContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 1,
  },
  errorText: {
    marginTop: 15,
    color: '#ff4444',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorSubtext: {
    marginTop: 10,
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffb300',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

