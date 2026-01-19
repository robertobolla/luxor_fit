import { Stack } from 'expo-router';

export default function NutritionLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#1a1a1a',
        },
        headerTintColor: '#ffffff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Nutrición',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="plan"
        options={{
          title: 'Plan de Comidas',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="log"
        options={{
          title: 'Registrar Comida',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="grocery"
        options={{
          title: 'Lista de Compras',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Configuración',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="today-detail"
        options={{
          title: 'Detalle del Día',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="custom-plan-setup"
        options={{
          title: 'Crear Plan Personalizado',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-day"
        options={{
          title: 'Editar Día',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="plans-library"
        options={{
          title: 'Biblioteca de Planes',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="plan-detail"
        options={{
          title: 'Detalle del Plan',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="edit-plan"
        options={{
          title: 'Editar Plan',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="select-plan-type"
        options={{
          title: 'Crear Plan',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="generate-ai-plan"
        options={{
          title: 'Generar Plan con IA',
          headerShown: false,
        }}
      />
    </Stack>
  );
}

