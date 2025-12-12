import React, { createContext, useContext, useState, ReactNode } from 'react';
import { CustomAlert } from '../components/CustomAlert';
import { Ionicons } from '@expo/vector-icons';

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertContextType {
  showAlert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: {
      icon?: keyof typeof Ionicons.glyphMap;
      iconColor?: string;
    }
  ) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alertConfig, setAlertConfig] = useState<{
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
      buttons: buttons || [{ text: 'Entendido', style: 'default' }],
      icon: options?.icon || 'information-circle',
      iconColor: options?.iconColor,
    });
  };

  const hideAlert = () => {
    setAlertConfig((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onDismiss={hideAlert}
        icon={alertConfig.icon}
        iconColor={alertConfig.iconColor}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = (): AlertContextType => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within an AlertProvider');
  }
  return context;
};

