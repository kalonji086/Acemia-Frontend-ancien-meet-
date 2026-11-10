import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface SimpleChartProps {
  title: string;
  data: number[];
  labels?: string[];
  color?: string;
  height?: number;
}

export default function SimpleChart({ title, data, labels, color, height = 150 }: SimpleChartProps) {
  const { colors, normalize } = useTheme();
  const chartColor = color || colors.primary;
  const maxValue = Math.max(...data, 1);
  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      
      <View style={[styles.chartContainer, { height }]}>
        {data.map((value, index) => {
          const barHeight = (value / maxValue) * (height - 40);
          const label = labels?.[index] || `Jour ${index + 1}`;
          
          return (
            <View key={index} style={styles.barColumn}>
              <View style={styles.barWrapper}>
                <View 
                  style={[
                    styles.bar, 
                    { 
                      height: barHeight,
                      backgroundColor: chartColor,
                      opacity: 0.7 + (index * 0.1)
                    }
                  ]} 
                />
              </View>
              <Text style={[styles.label, { color: colors.text.secondary }]} numberOfLines={1}>
                {label}
              </Text>
            </View>
          );
        })}
      </View>
      
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>
            {Math.max(...data)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Max</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>
            {Math.round(data.reduce((a, b) => a + b, 0) / data.length)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Moyenne</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: colors.text.primary }]}>
            {data.reduce((a, b) => a + b, 0)}
          </Text>
          <Text style={[styles.statLabel, { color: colors.text.secondary }]}>Total</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 8
  },
  barColumn: {
    alignItems: 'center',
    flex: 1
  },
  barWrapper: {
    height: '100%',
    justifyContent: 'flex-end',
    paddingBottom: 20
  },
  bar: {
    width: 20,
    borderRadius: 6,
    marginHorizontal: 4
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    textAlign: 'center'
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee'
  },
  statItem: {
    alignItems: 'center'
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2
  }
});