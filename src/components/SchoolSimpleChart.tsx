import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function SchoolSimpleChart({ 
  title, 
  data, 
  height = 200 
}: any) {
  const { colors } = useTheme();
  
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { height }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={{ color: colors.text.disabled }}>Aucune donnée</Text>
        </View>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((d: any) => d.value), 1);

  return (
    <View style={[styles.container, { height }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      <View style={styles.chartContainer}>
        {data.map((item: any, index: number) => {
          const barHeight = (item.value / maxValue) * (height - 60);
          return (
            <View key={index} style={styles.barWrapper}>
              <Text style={[styles.valueText, { color: colors.text.primary }]}>{item.value}</Text>
              <View 
                style={[
                  styles.bar, 
                  { 
                    height: Math.max(barHeight, 4),
                    backgroundColor: item.color || colors.primary 
                  }
                ]} 
              />
              <Text style={[styles.labelText, { color: colors.text.secondary }]} numberOfLines={1}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 15 },
  chartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: '85%' },
  barWrapper: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '60%', borderRadius: 6, minHeight: 4 },
  valueText: { fontSize: 11, fontWeight: '600', marginBottom: 5 },
  labelText: { fontSize: 10, marginTop: 8, textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});