import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface CustomAlertProps {
  visible: boolean;
  title: string;
  message?: string;
  buttons?: AlertButton[];
  onDismiss?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
}

export const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK', style: 'default' }],
  onDismiss,
  icon,
  iconColor = '#ffb300',
}) => {
  const handleButtonPress = (button: AlertButton) => {
    if (button.onPress) {
      button.onPress();
    }
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onDismiss}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.alertContainer}>
            {icon && (
              <View style={styles.iconContainer}>
                <Ionicons name={icon} size={48} color={iconColor} />
              </View>
            )}
            
            <Text style={styles.title}>{title}</Text>
            
            {message && <Text style={styles.message}>{message}</Text>}
            
            <View style={styles.buttonsContainer}>
              {buttons.map((button, index) => {
                const isDestructive = button.style === 'destructive';
                const isCancel = button.style === 'cancel';
                const isLast = index === buttons.length - 1;
                
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.button,
                      isDestructive && styles.buttonDestructive,
                      isCancel && styles.buttonCancel,
                      !isLast && styles.buttonNotLast,
                    ]}
                    onPress={() => handleButtonPress(button)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isDestructive && styles.buttonTextDestructive,
                        isCancel && styles.buttonTextCancel,
                      ]}
                    >
                      {button.text}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 24,
    width: Dimensions.get('window').width - 80,
    maxWidth: 400,
    borderWidth: 2,
    borderColor: '#ffb300',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 15,
    color: '#cccccc',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#ffb300',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonNotLast: {
    // Para mantener el gap consistente
  },
  buttonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#666',
  },
  buttonDestructive: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  buttonTextCancel: {
    color: '#999',
  },
  buttonTextDestructive: {
    color: '#ffffff',
  },
});

// Hook para usar el alert personalizado
export const useCustomAlert = () => {
  const [alertConfig, setAlertConfig] = React.useState<{
    visible: boolean;
    title: string;
    message?: string;
    buttons?: AlertButton[];
    icon?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({
    visible: false,
    title: '',
  });

  const showAlert = (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: {
      icon?: keyof typeof Ionicons.glyphMap;
      iconColor?: string;
    }
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      buttons,
      icon: options?.icon,
      iconColor: options?.iconColor,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  const AlertComponent = () => (
    <CustomAlert
      visible={alertConfig.visible}
      title={alertConfig.title}
      message={alertConfig.message}
      buttons={alertConfig.buttons}
      onDismiss={hideAlert}
      icon={alertConfig.icon}
      iconColor={alertConfig.iconColor}
    />
  );

  return { showAlert, AlertComponent };
};

