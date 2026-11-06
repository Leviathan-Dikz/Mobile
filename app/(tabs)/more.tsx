
import { View, Text, StyleSheet } from 'react-native';

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>More Features</Text>
      <Text style={styles.subtitle}>
        Habits, Pomodoro, Progress and Settings.
      </Text>
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
