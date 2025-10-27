
// Script para limpiar sesión de Clerk automáticamente
// Ejecutar en la consola del navegador

console.log('🧹 Limpiando sesión de Clerk...');

// Limpiar Local Storage
const localKeys = Object.keys(localStorage);
localKeys.forEach(key => {
  if (key.includes('clerk') || key.includes('Clerk')) {
    localStorage.removeItem(key);
    console.log('🗑️ Eliminado de localStorage:', key);
  }
});

// Limpiar Session Storage
const sessionKeys = Object.keys(sessionStorage);
sessionKeys.forEach(key => {
  if (key.includes('clerk') || key.includes('Clerk')) {
    sessionStorage.removeItem(key);
    console.log('🗑️ Eliminado de sessionStorage:', key);
  }
});

// Limpiar cookies
document.cookie.split(";").forEach(cookie => {
  const eqPos = cookie.indexOf("=");
  const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
  if (name.includes('clerk') || name.includes('Clerk')) {
    document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
    console.log('🗑️ Eliminada cookie:', name);
  }
});

console.log('✅ Limpieza de Clerk completada');
console.log('🔄 Recarga la página para aplicar los cambios');
