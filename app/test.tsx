import { View, Text } from 'react-native';

export default function TestScreen() {
  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#ff0000' 
    }}>
      <Text style={{ color: '#ffffff', fontSize: 24 }}>
        ¡FUNCIONA!
      </Text>
    </View>
  );
}
