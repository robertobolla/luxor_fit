import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { supabase } from '../../src/services/supabase';
import { UserProfile } from '../../src/types';
import { getClerkUserEmailSync } from '../../src/utils/clerkHelpers';

export default function ProfileScreen() {
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Cargar perfil de Supabase
  const loadProfile = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('❌ Error al cargar perfil:', error);
      } else {
        console.log('✅ Perfil cargado:', data);
        setProfile(data);
      }
    } catch (error) {
      console.error('❌ Error inesperado:', error);
    } finally {
      setLoading(false);
    }
  };

  // Cargar al montar y al volver a enfocar
  useFocusEffect(
    React.useCallback(() => {
      loadProfile();
    }, [user])
  );

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
      onPress: () => router.push('/profile-edit'),
    },
    {
      title: 'Configuración',
      icon: 'settings-outline',
      onPress: () => router.push('/settings'),
    },
    {
      title: 'Notificaciones',
      icon: 'notifications-outline',
      onPress: () => router.push('/notifications'),
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

  // Mostrar loading
  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#00D4AA" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  // Obtener nombre y email para mostrar
  const displayName = profile?.name || user?.firstName || user?.fullName || 'Usuario';
  
  // Prioridad: email de perfil Supabase (guardado en onboarding) > email de Clerk > No especificado
  const clerkEmail = getClerkUserEmailSync(user);
  const displayEmail = profile?.email || clerkEmail || 'No especificado';
  const firstLetter = displayName.charAt(0).toUpperCase();
  
  console.log('📊 Datos finales en Profile:');
  console.log('  - Nombre:', displayName);
  console.log('  - Email Supabase:', profile?.email);
  console.log('  - Email Clerk:', clerkEmail);
  console.log('  - Email mostrado:', displayEmail);
  
  // Mapeo de nivel de fitness a español
  const fitnessLevelMap: Record<string, string> = {
    beginner: 'Principiante',
    intermediate: 'Intermedio',
    advanced: 'Avanzado',
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{firstLetter}</Text>
          </View>
        </View>
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.email}>{displayEmail}</Text>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {profile ? fitnessLevelMap[profile.fitness_level] || 'N/A' : 'N/A'}
          </Text>
          <Text style={styles.statLabel}>Nivel</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile?.available_days || 0}</Text>
          <Text style={styles.statLabel}>Días/semana</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{profile?.goals?.length || 0}</Text>
          <Text style={styles.statLabel}>Objetivos</Text>
        </View>
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
        <TouchableOpacity 
          style={styles.editProfileButton}
          onPress={() => router.push('/onboarding')}
        >
          <Text style={styles.editProfileText}>Completar perfil</Text>
          <Ionicons name="arrow-forward" size={20} color="#00D4AA" />
        </TouchableOpacity>
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
                <Ionicons name={item.icon as any} size={24} color="#00D4AA" />
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
        <Text style={styles.footerText}>FitMind v1.0.0</Text>
        <Text style={styles.footerText}>Hecho con ❤️ para tu fitness</Text>
      </View>
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
    backgroundColor: '#00D4AA',
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
    color: '#00D4AA',
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
    backgroundColor: '#00D4AA',
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
    borderColor: '#00D4AA',
  },
  editProfileText: {
    fontSize: 16,
    color: '#00D4AA',
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
});
