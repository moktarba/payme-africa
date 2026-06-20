import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.box}>
        <Text style={styles.emoji}>P</Text>
      </View>
      <Text style={styles.title}>PayMe Africa</Text>
      <Text style={styles.sub}>Chargement en cours...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  box: { width: 88, height: 88, borderRadius: 22, backgroundColor: '#38A169', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  emoji: { fontSize: 44, fontWeight: '800', color: '#fff' },
  title: { fontSize: 26, fontWeight: '800', color: '#38A169', marginBottom: 8 },
  sub: { fontSize: 14, color: '#718096' },
});
