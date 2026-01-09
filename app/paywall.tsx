import React, { useCallback, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  ScrollView,
  Linking,
  Platform,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../src/hooks/useSubscription';
import {
  initializeRevenueCat,
  identifyUser,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getManagementURL,
  PRODUCT_IDS,
} from '../src/services/revenueCatService';
import { PurchasesPackage } from 'react-native-purchases';

export default function PaywallScreen() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const { user, isSignedIn } = useUser();
  const { signOut } = useAuth();
  const router = useRouter();
  const { isActive, loading: subLoading, refresh } = useSubscription();

  // Inicializar RevenueCat y cargar ofertas
  useEffect(() => {
    async function init() {
      try {
        // Inicializar RevenueCat
        await initializeRevenueCat(user?.id);
        
        // Identificar usuario si está logueado
        if (user?.id) {
          await identifyUser(user.id);
        }
        
        // Cargar ofertas
        const offering = await getOfferings();
        if (offering?.availablePackages) {
          setPackages(offering.availablePackages);
          // Seleccionar el mensual por defecto
          const monthly = offering.availablePackages.find(
            pkg => pkg.product.identifier === PRODUCT_IDS.MONTHLY
          );
          setSelectedPackage(monthly || offering.availablePackages[0]);
        }
      } catch (error) {
        console.error('Error inicializando paywall:', error);
      } finally {
        setLoading(false);
      }
    }
    
    init();
  }, [user?.id]);

  // Redirigir si ya tiene suscripción activa
  useEffect(() => {
    if (!subLoading && isActive) {
      const timer = setTimeout(() => {
        router.replace('/(tabs)/home');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isActive, subLoading, router]);

  const handlePurchase = useCallback(async () => {
    if (!selectedPackage) {
      Alert.alert(t('common.error'), t('paywall.selectPlan'));
      return;
    }

    setPurchasing(true);
    try {
      const result = await purchasePackage(selectedPackage);
      
      if (result.success) {
        Alert.alert(
          t('paywall.purchaseSuccess'),
          t('paywall.purchaseSuccessMessage'),
          [
            {
              text: t('common.start'),
              onPress: () => {
                refresh();
                router.replace('/(tabs)/home');
              },
            },
          ]
        );
      } else if (result.error === 'cancelled') {
        // Usuario canceló, no mostrar error
      } else {
        Alert.alert(t('common.error'), result.error || t('paywall.purchaseError'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('paywall.purchaseError'));
    } finally {
      setPurchasing(false);
    }
  }, [selectedPackage, refresh, router, t]);

  const handleRestore = useCallback(async () => {
    setPurchasing(true);
    try {
      const result = await restorePurchases();
      
      if (result.isPremium) {
        Alert.alert(
          t('paywall.restoreSuccess'),
          t('paywall.restoreSuccessMessage'),
          [
            {
              text: t('common.continue'),
              onPress: () => {
                refresh();
                router.replace('/(tabs)/home');
              },
            },
          ]
        );
      } else {
        Alert.alert(
          t('paywall.noPurchases'),
          t('paywall.noPurchasesMessage')
        );
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('errors.unknownError'));
    } finally {
      setPurchasing(false);
    }
  }, [refresh, router, t]);

  const handleManageSubscription = useCallback(async () => {
    const url = await getManagementURL();
    if (url) {
      Linking.openURL(url);
    } else {
      // Fallback a la configuración de suscripciones de iOS
      if (Platform.OS === 'ios') {
        Linking.openURL('https://apps.apple.com/account/subscriptions');
      }
    }
  }, []);

  const handleLogout = useCallback(() => {
    Alert.alert(
      t('settings.logout'),
      '¿Estás seguro de que quieres cerrar sesión?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.logout'),
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error al cerrar sesión:', error);
            }
          },
        },
      ]
    );
  }, [signOut, router, t]);

  const formatPrice = (pkg: PurchasesPackage) => {
    const price = pkg.product.priceString;
    const period = pkg.product.subscriptionPeriod;
    
    if (period === 'P1M') return `${price}${t('paywall.perMonth')}`;
    if (period === 'P1Y') return `${price}${t('paywall.perYear')}`;
    return price;
  };

  const getSavingsText = (pkg: PurchasesPackage) => {
    if (pkg.product.identifier === PRODUCT_IDS.YEARLY) {
      return t('paywall.save', { percentage: '31' });
    }
    return null;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#ffb300" />
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón de cerrar sesión */}
      <TouchableOpacity 
        style={styles.logoutButton}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={24} color="#999" />
      </TouchableOpacity>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="fitness" size={64} color="#ffb300" />
          <Text style={styles.title}>{t('paywall.title')}</Text>
          <Text style={styles.subtitle}>{t('paywall.subtitle')}</Text>
        </View>

      {/* Beneficios */}
      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>{t('paywall.includes')}</Text>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          <Text style={styles.benefitText}>{t('paywall.feature1')}</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          <Text style={styles.benefitText}>{t('paywall.feature2')}</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          <Text style={styles.benefitText}>{t('paywall.feature3')}</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          <Text style={styles.benefitText}>{t('paywall.feature4')}</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          <Text style={styles.benefitText}>{t('paywall.feature5')}</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={24} color="#4caf50" />
          <Text style={styles.benefitText}>{t('paywall.feature6')}</Text>
        </View>
      </View>

      {/* Planes */}
      <View style={styles.plansContainer}>
        <Text style={styles.plansTitle}>{t('paywall.choosePlan')}</Text>
        
        {packages.map((pkg) => {
          const isSelected = selectedPackage?.identifier === pkg.identifier;
          const savings = getSavingsText(pkg);
          
          return (
            <TouchableOpacity
              key={pkg.identifier}
              style={[
                styles.planCard,
                isSelected && styles.planCardSelected,
              ]}
              onPress={() => setSelectedPackage(pkg)}
              activeOpacity={0.8}
            >
              {savings && (
                <View style={styles.savingsBadge}>
                  <Text style={styles.savingsText}>{savings}</Text>
                </View>
              )}
              
              <View style={styles.planContent}>
                <View style={styles.planInfo}>
                  <Text style={[styles.planName, isSelected && styles.planNameSelected]}>
                    {pkg.product.identifier === PRODUCT_IDS.YEARLY ? t('paywall.yearly') : t('paywall.monthly')}
                  </Text>
                  <Text style={styles.planDescription}>
                    {pkg.product.identifier === PRODUCT_IDS.YEARLY 
                      ? t('paywall.bestValue')
                      : t('paywall.fullFlexibility')}
                  </Text>
                </View>
                
                <View style={styles.planPricing}>
                  <Text style={[styles.planPrice, isSelected && styles.planPriceSelected]}>
                    {formatPrice(pkg)}
                  </Text>
                </View>
              </View>
              
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Prueba gratuita */}
      <View style={styles.trialInfo}>
        <Ionicons name="gift" size={20} color="#ffb300" />
        <Text style={styles.trialText}>
          {t('paywall.freeTrial')}
        </Text>
      </View>

      {/* Botón de compra */}
      <TouchableOpacity
        style={[styles.purchaseButton, purchasing && styles.purchaseButtonDisabled]}
        onPress={handlePurchase}
        disabled={purchasing || !selectedPackage}
      >
        {purchasing ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.purchaseButtonText}>
            {t('paywall.startTrial')}
          </Text>
        )}
      </TouchableOpacity>

      {/* Restaurar compras */}
      <TouchableOpacity
        style={styles.restoreButton}
        onPress={handleRestore}
        disabled={purchasing}
      >
        <Text style={styles.restoreButtonText}>{t('paywall.restorePurchases')}</Text>
      </TouchableOpacity>

      {/* Legal */}
      <View style={styles.legalContainer}>
        <Text style={styles.legalText}>
          {t('paywall.legalText', { platform: Platform.OS === 'ios' ? 'Apple ID' : 'Google Play' })}
        </Text>
        
        <View style={styles.legalLinks}>
          <TouchableOpacity onPress={() => Linking.openURL('https://luxor-fitness.gitbook.io/docs/legal/politica-de-privacidad')}>
            <Text style={styles.legalLink}>{t('profile.privacyPolicy')}</Text>
          </TouchableOpacity>
          <Text style={styles.legalSeparator}>•</Text>
          <TouchableOpacity onPress={() => Linking.openURL('https://luxor-fitness.gitbook.io/docs/legal/terminos-y-condiciones')}>
            <Text style={styles.legalLink}>{t('profile.termsOfService')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Debug solo en desarrollo */}
      {__DEV__ && (
        <TouchableOpacity 
          style={styles.debugButton}
          onPress={async () => {
            try {
              await refresh();
              Alert.alert('Debug', 'Suscripción refrescada');
            } catch (e) {
              Alert.alert('Error', 'No se pudo refrescar');
            }
          }}
        >
          <Text style={styles.debugButtonText}>🔄 Debug: Refrescar</Text>
        </TouchableOpacity>
      )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoutButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    borderRadius: 22,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#999',
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    marginTop: 8,
  },
  benefitsCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#333',
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 15,
    color: '#ccc',
    lineHeight: 22,
  },
  plansContainer: {
    marginBottom: 20,
  },
  plansTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#ffb300',
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
  },
  savingsBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: '#4caf50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  planContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  planNameSelected: {
    color: '#ffb300',
  },
  planDescription: {
    fontSize: 13,
    color: '#999',
  },
  planPricing: {
    alignItems: 'flex-end',
    marginRight: 16,
  },
  planPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  planPriceSelected: {
    color: '#ffb300',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#666',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#ffb300',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffb300',
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: 12,
  },
  trialText: {
    color: '#ffb300',
    fontSize: 14,
    fontWeight: '500',
  },
  purchaseButton: {
    backgroundColor: '#ffb300',
    paddingVertical: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  purchaseButtonDisabled: {
    opacity: 0.6,
  },
  purchaseButtonText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 17,
  },
  restoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  restoreButtonText: {
    color: '#ffb300',
    fontSize: 15,
    textDecorationLine: 'underline',
  },
  legalContainer: {
    marginTop: 8,
  },
  legalText: {
    color: '#666',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    marginBottom: 12,
  },
  legalLinks: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  legalLink: {
    color: '#999',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  legalSeparator: {
    color: '#666',
  },
  debugButton: {
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  debugButtonText: {
    color: '#fff',
    fontSize: 14,
  },
});
