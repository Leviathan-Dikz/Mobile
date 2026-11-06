
import { View, Text, StyleSheet } from 'react-native';

export default function NotesScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Notes</Text>
      <Text style={styles.subtitle}>Keep your ideas organized.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F8FC',
    padding: 25,
    paddingTop: 60,
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#20243A' },
  subtitle: { fontSize: 15, color: '#777E90', marginTop: 8 },
});
