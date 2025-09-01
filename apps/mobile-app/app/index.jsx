import { Stack, Link } from 'expo-router';

import { Text, View } from 'react-native';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <View>
        <Text>Hello world!</Text>
      </View>
    </>
  );
}
