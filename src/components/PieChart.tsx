import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

interface PieChartData {
  label: string;
  value: number;
  color: string;
}

interface PieChartProps {
  title: string;
  data: PieChartData[];
  size?: number;
}

export default function PieChart({ title, data, size = 120 }: PieChartProps) {
  const { colors, normalize } = useTheme();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  
  // Calculer les angles pour le diagramme circulaire
  let currentAngle = 0;
  const segments = data.map((item, index) => {
    const percentage = (item.value / total) * 100;
    const angle = (item.value / total) * 360;
    const segment = {
      ...item,
      percentage,
      angle,
      startAngle: currentAngle,
      endAngle: currentAngle + angle
    };
    currentAngle += angle;
    return segment;
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>{title}</Text>
      
      <View style={styles.chartRow}>
        <View style={[styles.pieContainer, { width: size, height: size }]}>
          {/* Diagramme circulaire simplifié - version visuelle */}
          <View style={styles.pieChart}>
            {segments.map((segment, index) => (
              <View
                key={index}
                style={[
                  styles.pieSegment,
                  {
                    backgroundColor: segment.color,
                    width: '100%',
                    height: '100%',
                    borderRadius: size / 2,
                    position: 'absolute',
                    transform: [
                      { rotate: `${segment.startAngle}deg` }
                    ]
                  }
                ]}
              >
                <View
                  style={[
                    styles.pieSegmentInner,
                    {
                      backgroundColor: colors.surface,
                      width: '50%',
                      height: '100%',
                      position: 'absolute',
                      right: 0
                    }
                  ]}
                />
              </View>
            ))}
            <View style={[styles.pieCenter, { 
              backgroundColor: colors.surface,
              width: size * 0.6,
              height: size * 0.6,
              borderRadius: (size * 0.6) / 2
            }]}>
              <Text style={[styles.centerText, { color: colors.text.primary }]}>
                {total}
              </Text>
              <Text style={[styles.centerSubtext, { color: colors.text.secondary }]}>
                Total
              </Text>
            </View>
          </View>
        </View>
        
        <View style={styles.legend}>
          {segments.map((segment, index) => (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: segment.color }]} />
              <View style={styles.legendText}>
                <Text style={[styles.legendLabel, { color: colors.text.primary }]} numberOfLines={1}>
                  {segment.label}
                </Text>
                <Text style={[styles.legendValue, { color: colors.text.secondary }]}>
                  {segment.value} ({segment.percentage.toFixed(1)}%)
                </Text>
              </View>
            </View>
          ))}
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
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  pieContainer: {
    marginRight: 20
  },
  pieChart: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center'
  },
  pieSegment: {
    overflow: 'hidden'
  },
  pieSegmentInner: {
    transform: [{ rotate: '180deg' }]
  },
  pieCenter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center'
  },
  centerText: {
    fontSize: 20,
    fontWeight: 'bold'
  },
  centerSubtext: {
    fontSize: 10,
    marginTop: 2
  },
  legend: {
    flex: 1
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8
  },
  legendText: {
    flex: 1
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500'
  },
  legendValue: {
    fontSize: 11,
    marginTop: 1
  }
});