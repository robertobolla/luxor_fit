import React, { useEffect, useRef, useState } from 'react';
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
import { Video, AVPlaybackStatus, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';

// Suprimir warning de deprecación de expo-av (migración a expo-video pendiente)
LogBox.ignoreLogs(['expo-av', 'Video component from `expo-av` is deprecated']);

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
  const videoRef = useRef<Video | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const loadAttemptRef = useRef(0);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      // En este branch, status puede traer "error"
      if (status.error) {
        console.error('Video status error:', status.error);
        if (retryCount >= 2) setError('Video no disponible');
      }
      setIsLoading(false);
      return;
    }

    // isLoaded === true
    setIsLoading(false);
    setError(null);
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setRetryCount((prev) => prev + 1);
    loadAttemptRef.current += 1;
  };

  const handleClose = () => {
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pauseAsync().catch(() => {});
      videoRef.current.setPositionAsync(0).catch(() => {});
    }

    setIsLoading(true);
    setError(null);
    setRetryCount(0);
    loadAttemptRef.current = 0;
    onClose();
  };

  // Reintento automático si hay error “transitorio”
  useEffect(() => {
    if (error && retryCount < 2 && videoUrl && visible) {
      const timer = setTimeout(() => handleRetry(), 1000);
      return () => clearTimeout(timer);
    }
  }, [error, retryCount, videoUrl, visible]);

  // Reset cuando cambia visibilidad o URL
  useEffect(() => {
    if (visible && videoUrl) {
      loadAttemptRef.current += 1;
      setIsLoading(true);
      setError(null);
      setRetryCount(0);
    } else if (!visible) {
      if (playTimeoutRef.current) {
        clearTimeout(playTimeoutRef.current);
        playTimeoutRef.current = null;
      }
      setRetryCount(0);
      loadAttemptRef.current = 0;
    }
  }, [visible, videoUrl]);

  if (!videoUrl) return null;

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
        {/* Header */}
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

        {/* Player */}
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
              <Text style={styles.errorSubtext}>Verifica tu conexión e intenta nuevamente</Text>
              <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
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
              ref={(ref) => {
                videoRef.current = ref;
              }}
              source={{ uri: videoUrl }}
              style={styles.video}
              useNativeControls
              resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isLooping
              isMuted={false}
              volume={1.0}
              rate={1.0}
              progressUpdateIntervalMillis={500}
              usePoster={false}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              onError={(e) => {
                console.error('❌ Video error:', e);
                if (retryCount < 2) {
                  setError('Error transitorio');
                } else {
                  setError('Video no disponible');
                }
                setIsLoading(false);
              }}
              onLoadStart={() => {
                setIsLoading(true);
                setError(null);
              }}
              onLoad={() => {
                setIsLoading(false);
                setError(null);
                setRetryCount(0);
              }}
              onReadyForDisplay={() => {
                // “Seek trick” para despertar algunos streams
                if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);

                playTimeoutRef.current = setTimeout(async () => {
                  if (videoRef.current && visible) {
                    try {
                      await videoRef.current.setPositionAsync(10);
                      await new Promise((r) => setTimeout(r, 50));
                      await videoRef.current.setPositionAsync(0);
                      await videoRef.current.playAsync();
                    } catch (err) {
                      console.error('Error starting video:', err);
                      try {
                        await videoRef.current.playAsync();
                      } catch {}
                    }
                  }
                  playTimeoutRef.current = null;
                }, 300);
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
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
  closeButton: { padding: 5 },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  video: { width: '100%', height: '100%' },
  loadingContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: { marginTop: 15, color: '#fff', fontSize: 16, fontWeight: '600' },
  loadingSubtext: { marginTop: 8, color: '#999', fontSize: 14 },
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
  errorSubtext: { marginTop: 10, color: '#999', fontSize: 14, textAlign: 'center' },
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
  retryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
