import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ViewAsUser {
  user_id: string;
  name: string | null;
  email: string | null;
  role_type: 'admin' | 'socio' | 'empresario' | 'user';
}

interface ViewAsContextType {
  currentUser: ViewAsUser | null;
  isViewingAs: boolean;
  setViewAsUser: (user: ViewAsUser | null) => void;
  exitViewAs: () => void;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

export const ViewAsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<ViewAsUser | null>(null);

  const setViewAsUser = (user: ViewAsUser | null) => {
    setCurrentUser(user);
    if (user) {
      console.log('👁️ Viewing as:', user.email, '- Role:', user.role_type);
    }
  };

  const exitViewAs = () => {
    console.log('🔙 Exiting view as mode');
    setCurrentUser(null);
  };

  return (
    <ViewAsContext.Provider
      value={{
        currentUser,
        isViewingAs: currentUser !== null,
        setViewAsUser,
        exitViewAs,
      }}
    >
      {children}
    </ViewAsContext.Provider>
  );
};

export const useViewAs = () => {
  const context = useContext(ViewAsContext);
  if (context === undefined) {
    throw new Error('useViewAs must be used within a ViewAsProvider');
  }
  return context;
};


