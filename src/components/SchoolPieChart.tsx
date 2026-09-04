import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const COLORS = ['#4CAF50', '#2196F3', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#607D8B'];

export default function SchoolPieChart({ 
  title, 
  data, 
  size = 180 
}: any) {
  const { colors } = useTheme();
  
  if (!data || data.length === 0) {
    return (
      <View style={[styles.container, { minHeight: size + 60 }]}>
        <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={{ color: colors.text.disabled }}>Aucune donnée</Text>
        </View>
      </View>
    );
  }

  const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
  const radius = size / 2;
  const circumference = 2 * Math.PI * (radius - 10);

  let accumulatedAngle = 0;
  
  return (
    <View style={[styles.container, { minHeight: size + 80 }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      <View style={styles.chartRow}>
        <View style={[styles.pieContainer, { width: size, height: size }]}>
          {data.map((item: any, index: number) => {
            const percentage = total > 0 ? item.value / total : 0;
            const angle = percentage * 360;
            const startAngle = accumulatedAngle;
            accumulatedAngle += angle;
            
            return (
              <View
                key={index}
                style={[
                  styles.pieSlice,
                  {
                    width: size,
                    height: size,
                    borderRadius: radius,
                    borderWidth: radius - 10,
                    borderColor: item.color || COLORS[index % COLORS.length],
                    transform: [{ rotate: `${startAngle - 90}deg` }],
                  }
                ]}
              />
            );
          })}
          <View style={[styles.pieCenter, { backgroundColor: colors.surface }]}>
            <Text style={[styles.centerText, { color: colors.text.primary }]}>{total}</Text>
            <Text style={[styles.centerLabel, { color: colors.text.secondary }]}>Total</Text>
          </View>
        </View>
        
        <View style={styles.legendContainer}>
          {data.map((item: any, index: number) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: item.color || COLORS[index % COLORS.length] }]} />
              <Text style={[styles.legendLabel, { color: colors.text.primary }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.legendValue, { color: colors.text.secondary }]}>
                {total > 0 ? Math.round((item.value / total) * 100) : 0}%
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 10 },
  title: { fontSize: 16, fontWeight: '700', marginBottom: 15 },
  chartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  pieContainer: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
  pieSlice: { position: 'absolute', borderStyle: 'solid' },
  pieCenter: { position: 'absolute', width: '60%', height: '60%', borderRadius: 1000, justifyContent: 'center', alignItems: 'center' },
  centerText: { fontSize: 22, fontWeight: '900' },
  centerLabel: { fontSize: 11 },
  legendContainer: { flex: 1, marginLeft: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendLabel: { flex: 1, fontSize: 12 },
  legendValue: { fontSize: 12, fontWeight: '600' },
  emptyContainer: { height: 150, justifyContent: 'center', alignItems: 'center' }
});