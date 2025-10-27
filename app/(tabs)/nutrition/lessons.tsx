// ============================================================================
// LESSONS SCREEN (Academia)
// ============================================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';
import { supabase } from '../../../src/services/supabase';
import { Lesson, LessonProgress, QuizQuestion } from '../../../src/types/nutrition';

export default function LessonsScreen() {
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(true);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<Record<number, LessonProgress>>({});
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [showQuizResults, setShowQuizResults] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadLessons();
    }
  }, [user]);

  const loadLessons = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      // Cargar lecciones
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('*')
        .order('id', { ascending: true });

      if (lessonsError) {
        console.error('Error loading lessons:', lessonsError);
      } else {
        setLessons((lessonsData || []) as Lesson[]);
      }

      // Cargar progreso
      const { data: progressData, error: progressError } = await supabase
        .from('lesson_progress')
        .select('*')
        .eq('user_id', user.id);

      if (progressError) {
        console.error('Error loading progress:', progressError);
      } else {
        const progressMap: Record<number, LessonProgress> = {};
        (progressData || []).forEach((p: any) => {
          progressMap[p.lesson_id] = p;
        });
        setProgress(progressMap);
      }
    } catch (err) {
      console.error('Error in loadLessons:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const openLesson = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setQuizAnswers([]);
    setShowQuizResults(false);
  };

  const closeLesson = () => {
    setSelectedLesson(null);
    setQuizAnswers([]);
    setShowQuizResults(false);
  };

  const submitQuiz = async () => {
    if (!selectedLesson || !user?.id) return;

    const quiz = selectedLesson.quiz_json as QuizQuestion[];
    if (!quiz || quiz.length === 0) return;

    // Calcular score
    let correct = 0;
    quizAnswers.forEach((answer, index) => {
      if (answer === quiz[index].correct_index) {
        correct++;
      }
    });
    const score = Math.round((correct / quiz.length) * 100);

    // Guardar progreso
    try {
      await supabase.from('lesson_progress').upsert(
        {
          user_id: user.id,
          lesson_id: selectedLesson.id,
          completed_at: new Date().toISOString(),
          score,
        },
        { onConflict: 'user_id,lesson_id' }
      );

      setShowQuizResults(true);
      await loadLessons(); // Recargar para actualizar progreso
    } catch (err) {
      console.error('Error saving lesson progress:', err);
      Alert.alert('Error', 'No se pudo guardar tu progreso.');
    }
  };

  const completedCount = Object.keys(progress).length;

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Cargando lecciones...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backIconButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Academia</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Progress */}
      <View style={styles.progressContainer}>
        <Ionicons name="school" size={40} color="#00D4AA" />
        <Text style={styles.progressText}>
          {completedCount} / {lessons.length} lecciones completadas
        </Text>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: lessons.length > 0 ? `${(completedCount / lessons.length) * 100}%` : '0%' },
            ]}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {lessons.map((lesson, index) => {
          const isCompleted = !!progress[lesson.id];
          const score = progress[lesson.id]?.score;

          return (
            <TouchableOpacity
              key={lesson.id}
              style={[styles.lessonCard, isCompleted && styles.lessonCardCompleted]}
              onPress={() => openLesson(lesson)}
            >
              <View style={styles.lessonNumber}>
                <Text style={styles.lessonNumberText}>{index + 1}</Text>
              </View>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                {isCompleted && (
                  <View style={styles.completedBadge}>
                    <Ionicons name="checkmark-circle" size={16} color="#00D4AA" />
                    <Text style={styles.completedText}>
                      Completada {score !== undefined && `(${score}%)`}
                    </Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={24} color="#888888" />
            </TouchableOpacity>
          );
        })}

        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Lesson Modal */}
      {selectedLesson && (
        <Modal
          visible={true}
          animationType="slide"
          onRequestClose={closeLesson}
        >
          <SafeAreaView style={styles.modalContainer}>
            <StatusBar barStyle="light-content" />
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={closeLesson}>
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>{selectedLesson.title}</Text>
              <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              {/* Content (simple markdown rendering) */}
              <Text style={styles.lessonContent}>{selectedLesson.content_md}</Text>

              {/* Quiz */}
              {selectedLesson.quiz_json && !showQuizResults && (
                <View style={styles.quizSection}>
                  <Text style={styles.quizTitle}>📝 Mini Quiz</Text>
                  {(selectedLesson.quiz_json as QuizQuestion[]).map((question, qIndex) => (
                    <View key={qIndex} style={styles.questionCard}>
                      <Text style={styles.questionText}>
                        {qIndex + 1}. {question.question}
                      </Text>
                      {question.options.map((option, oIndex) => (
                        <TouchableOpacity
                          key={oIndex}
                          style={[
                            styles.optionButton,
                            quizAnswers[qIndex] === oIndex && styles.optionButtonSelected,
                          ]}
                          onPress={() => {
                            const newAnswers = [...quizAnswers];
                            newAnswers[qIndex] = oIndex;
                            setQuizAnswers(newAnswers);
                          }}
                        >
                          <View style={styles.optionRadio}>
                            {quizAnswers[qIndex] === oIndex && (
                              <View style={styles.optionRadioInner} />
                            )}
                          </View>
                          <Text style={styles.optionText}>{option}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      quizAnswers.length !== (selectedLesson.quiz_json as QuizQuestion[]).length &&
                        styles.submitButtonDisabled,
                    ]}
                    onPress={submitQuiz}
                    disabled={
                      quizAnswers.length !== (selectedLesson.quiz_json as QuizQuestion[]).length
                    }
                  >
                    <Text style={styles.submitButtonText}>Enviar Respuestas</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Quiz Results */}
              {showQuizResults && (
                <View style={styles.resultsSection}>
                  <Ionicons name="trophy" size={60} color="#FFD700" />
                  <Text style={styles.resultsTitle}>¡Lección Completada!</Text>
                  <Text style={styles.resultsScore}>
                    Tu puntaje:{' '}
                    {Math.round(
                      (quizAnswers.filter(
                        (a, i) => a === (selectedLesson.quiz_json as QuizQuestion[])[i].correct_index
                      ).length /
                        (selectedLesson.quiz_json as QuizQuestion[]).length) *
                        100
                    )}
                    %
                  </Text>
                  <TouchableOpacity style={styles.closeButton} onPress={closeLesson}>
                    <Text style={styles.closeButtonText}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              )}

              <View style={{ height: 50 }} />
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  backIconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#ffffff',
  },
  progressContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  progressText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 12,
  },
  progressBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  lessonCardCompleted: {
    borderColor: '#00D4AA',
  },
  lessonNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00D4AA',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  lessonNumberText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  completedText: {
    fontSize: 12,
    color: '#00D4AA',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  lessonContent: {
    fontSize: 15,
    color: '#cccccc',
    lineHeight: 24,
    marginBottom: 32,
  },
  quizSection: {
    marginTop: 24,
  },
  quizTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
  },
  questionCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  questionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333333',
  },
  optionButtonSelected: {
    borderColor: '#00D4AA',
    backgroundColor: '#1a3a34',
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#00D4AA',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#00D4AA',
  },
  optionText: {
    fontSize: 14,
    color: '#ffffff',
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  resultsSection: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 12,
  },
  resultsScore: {
    fontSize: 18,
    color: '#00D4AA',
    marginBottom: 32,
  },
  closeButton: {
    backgroundColor: '#00D4AA',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});

