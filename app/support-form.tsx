// ============================================================================
// SUPPORT FORM SCREEN - Formulario de soporte
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from 'react-native';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '@clerk/clerk-expo';

export default function SupportFormScreen() {
  const { type, title, placeholder } = useLocalSearchParams<{
    type: string;
    title: string;
    placeholder: string;
  }>();
  const { user } = useUser();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const getIcon = () => {
    switch (type) {
      case 'suggestion':
        return 'bulb-outline';
      case 'bug':
        return 'bug-outline';
      case 'help':
        return 'help-circle-outline';
      default:
        return 'chatbubble-outline';
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert('Campo vacío', 'Por favor escribe tu consulta antes de enviar.');
      return;
    }

    setIsSending(true);

    try {
      // Preparar el asunto del email según el tipo
      const subject = encodeURIComponent(`[${title}] - ${user?.emailAddresses?.[0]?.emailAddress || 'Usuario'}`);
      
      // Preparar el cuerpo del email con información del usuario
      const body = encodeURIComponent(
        `${message}\n\n` +
        `---\n` +
        `Usuario: ${user?.fullName || 'No disponible'}\n` +
        `Email: ${user?.emailAddresses?.[0]?.emailAddress || 'No disponible'}\n` +
        `ID: ${user?.id || 'No disponible'}\n` +
        `Tipo de consulta: ${title}\n` +
        `Fecha: ${new Date().toLocaleString('es-ES')}`
      );

      // Crear el enlace mailto
      const mailtoUrl = `mailto:soporte@luxorfitnessapp.com?subject=${subject}&body=${body}`;

      // Verificar si se puede abrir el enlace
      const canOpen = await Linking.canOpenURL(mailtoUrl);

      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        
        // Mostrar confirmación después de abrir el cliente de email
        setTimeout(() => {
          Alert.alert(
            '¡Gracias!',
            'Se ha abierto tu aplicación de email. Por favor envía el mensaje para que podamos ayudarte.',
            [
              {
                text: 'Entendido',
                onPress: () => {
                  setMessage('');
                  router.back();
                },
              },
            ]
          );
        }, 500);
      } else {
        // Si no puede abrir el cliente de email, mostrar instrucciones manuales
        Alert.alert(
          'No se pudo abrir el email',
          `Por favor envía tu consulta manualmente a:\nsoporte@luxorfitnessapp.com\n\nAsunto: ${decodeURIComponent(subject)}`,
          [
            {
              text: 'Copiar email',
              onPress: () => {
                // En una app real, aquí usarías Clipboard.setString
                Alert.alert('Email copiado', 'soporte@luxorfitnessapp.com');
              },
            },
            { text: 'OK' },
          ]
        );
      }
    } catch (error) {
      console.error('Error al abrir email:', error);
      Alert.alert(
        'Error',
        'No se pudo abrir la aplicación de email. Por favor envía tu consulta manualmente a soporte@luxorfitnessapp.com'
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: title || 'Soporte',
          headerStyle: { backgroundColor: '#1a1a1a' },
          headerTintColor: '#ffffff',
          headerTitleStyle: { fontWeight: 'bold' },
          headerBackTitle: ' ',
          headerBackTitleVisible: false,
        }}
      />
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Header */}
            <View style={styles.headerSection}>
              <View style={styles.iconContainer}>
                <Ionicons name={getIcon() as any} size={48} color="#ffb300" />
              </View>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>
                Escribe tu mensaje y nos pondremos en contacto contigo lo antes posible
              </Text>
            </View>

            {/* Form */}
            <View style={styles.formContainer}>
              <Text style={styles.label}>Tu mensaje</Text>
              <TextInput
                style={styles.textArea}
                placeholder={placeholder}
                placeholderTextColor="#555555"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={styles.charCount}>
                {message.length}/1000 caracteres
              </Text>
            </View>

            {/* User Info Preview */}
            <View style={styles.infoCard}>
              <Ionicons name="information-circle" size={20} color="#ffb300" />
              <Text style={styles.infoText}>
                Se incluirá tu información de usuario para que podamos ayudarte mejor
              </Text>
            </View>
          </ScrollView>

          {/* Send Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.sendButton, (!message.trim() || isSending) && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!message.trim() || isSending}
              activeOpacity={0.8}
            >
              {isSending ? (
                <Text style={styles.sendButtonText}>Abriendo...</Text>
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#1a1a1a" />
                  <Text style={styles.sendButtonText}>Enviar mensaje</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100, // Espacio para el botón fijo
  },
  headerSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1a1a',
    borderWidth: 2,
    borderColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888888',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  formContainer: {
    marginTop: 16,
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    color: '#ffffff',
    fontSize: 16,
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#333333',
  },
  charCount: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'right',
    marginTop: 8,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffb30033',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#cccccc',
    lineHeight: 18,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#0a0a0a',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: '#ffb300',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#444444',
    opacity: 0.5,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
});

