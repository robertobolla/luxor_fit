import { User } from '@clerk/clerk-expo';

/**
 * Intenta obtener el email del usuario de Clerk de múltiples fuentes
 * Incluye logging detallado para debugging
 */
export async function getClerkUserEmail(user: User | null | undefined): Promise<string | null> {
  if (!user) {
    console.log('❌ No user provided to getClerkUserEmail');
    return null;
  }

  console.log('🔍 Buscando email en Clerk...');
  console.log('📋 Estructura completa del usuario:', JSON.stringify(user, null, 2));

  // 1. Desde primaryEmailAddress
  if (user.primaryEmailAddress?.emailAddress) {
    console.log('✅ Email encontrado en primaryEmailAddress:', user.primaryEmailAddress.emailAddress);
    return user.primaryEmailAddress.emailAddress;
  }

  // 2. Desde emailAddresses array
  if (user.emailAddresses && user.emailAddresses.length > 0) {
    const email = user.emailAddresses[0].emailAddress;
    console.log('✅ Email encontrado en emailAddresses[0]:', email);
    return email;
  }

  // 3. Intentar recargar usuario
  try {
    console.log('🔄 Intentando recargar usuario de Clerk...');
    await user.reload();
    console.log('✅ Usuario recargado');
    
    if (user.primaryEmailAddress?.emailAddress) {
      console.log('✅ Email encontrado después de reload:', user.primaryEmailAddress.emailAddress);
      return user.primaryEmailAddress.emailAddress;
    }
    
    if (user.emailAddresses && user.emailAddresses.length > 0) {
      const email = user.emailAddresses[0].emailAddress;
      console.log('✅ Email encontrado después de reload:', email);
      return email;
    }
  } catch (error) {
    console.error('❌ Error al recargar usuario:', error);
  }

  // 4. Desde unsafeMetadata (a veces Clerk guarda aquí)
  if ((user as any).unsafeMetadata?.email) {
    console.log('✅ Email encontrado en unsafeMetadata:', (user as any).unsafeMetadata.email);
    return (user as any).unsafeMetadata.email;
  }

  // 5. Desde publicMetadata
  if ((user as any).publicMetadata?.email) {
    console.log('✅ Email encontrado en publicMetadata:', (user as any).publicMetadata.email);
    return (user as any).publicMetadata.email;
  }

  // 6. Desde externalAccounts (OAuth)
  if ((user as any).externalAccounts && (user as any).externalAccounts.length > 0) {
    console.log('🔍 Buscando en externalAccounts...');
    const emailProvider = (user as any).externalAccounts.find((acc: any) => acc.emailAddress);
    if (emailProvider?.emailAddress) {
      console.log('✅ Email encontrado en externalAccounts:', emailProvider.emailAddress);
      return emailProvider.emailAddress;
    }
  }

  console.log('❌ No se pudo encontrar email en ninguna fuente de Clerk');
  return null;
}

/**
 * Versión sincrónica (sin reload) para usar en renders
 */
export function getClerkUserEmailSync(user: User | null | undefined): string | null {
  if (!user) return null;

  // 1. Desde primaryEmailAddress
  if (user.primaryEmailAddress?.emailAddress) {
    return user.primaryEmailAddress.emailAddress;
  }

  // 2. Desde emailAddresses array
  if (user.emailAddresses && user.emailAddresses.length > 0) {
    return user.emailAddresses[0].emailAddress;
  }

  // 3. Desde unsafeMetadata
  if ((user as any).unsafeMetadata?.email) {
    return (user as any).unsafeMetadata.email;
  }

  // 4. Desde publicMetadata
  if ((user as any).publicMetadata?.email) {
    return (user as any).publicMetadata.email;
  }

  // 5. Desde externalAccounts (OAuth)
  if ((user as any).externalAccounts && (user as any).externalAccounts.length > 0) {
    const emailProvider = (user as any).externalAccounts.find((acc: any) => acc.emailAddress);
    if (emailProvider?.emailAddress) {
      return emailProvider.emailAddress;
    }
  }

  return null;
}

