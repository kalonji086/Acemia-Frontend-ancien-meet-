import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { Megaphone, X } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import socketService from '../services/socket.service';

interface Announcement {
  id: number | string;
  title: string;
  content: string;
  type: 'info' | 'update' | 'maintenance' | 'important';
}

const typeLabels: Record<Announcement['type'], string> = {
  info: 'INFORMATION',
  update: 'MISE À JOUR',
  maintenance: 'MAINTENANCE',
  important: 'IMPORTANT',
};

export default function AnnouncementBanner() {
  const { colors, normalize } = useTheme();
  const { width } = useWindowDimensions();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissedId, setDismissedId] = useState<string | number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const activeRef = useRef(true);
  const compact = width < 380;

  useEffect(() => {
    activeRef.current = true;
    const refresh = async () => {
      try {
        const response = await apiService.getAnnouncements();
        if (!activeRef.current) return;
        if (!response.success) {
          console.error('Unable to load Acemia announcements:', response.error);
          return;
        }
        const announcements = Array.isArray(response.data) ? response.data : [];
        setAnnouncement(announcements[0] || null);
      } catch (error) {
        if (activeRef.current) console.error('Unable to refresh Acemia announcement:', error);
      }
    };

    const handleAnnouncementUpdate = () => {
      setDismissedId(null);
      setExpanded(false);
      void refresh();
    };
    const appStateSubscription = AppState.addEventListener('change', state => {
      if (state === 'active') void refresh();
    });

    void refresh();
    socketService.on('announcement_updated', handleAnnouncementUpdate);
    return () => {
      activeRef.current = false;
      appStateSubscription.remove();
      socketService.off('announcement_updated', handleAnnouncementUpdate);
    };
  }, []);

  if (!announcement || announcement.id === dismissedId) return null;

  const tone = announcement.type === 'important' || announcement.type === 'maintenance'
    ? colors.warning
    : colors.primary;
  const canExpand = announcement.content.length > (compact ? 90 : 150);

  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: `${tone}55`,
          width: '100%',
          padding: normalize(compact ? 10 : 12),
          borderRadius: normalize(16),
        },
      ]}
    >
      <View style={[styles.icon, { backgroundColor: `${tone}18`, width: normalize(38), height: normalize(38) }]}>
        <Megaphone size={normalize(20)} color={tone} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: tone, fontSize: normalize(10) }]}>{typeLabels[announcement.type] || typeLabels.info} · ACEMIA</Text>
        <Text style={[styles.title, { color: colors.text.primary, fontSize: normalize(14) }]} numberOfLines={2}>{announcement.title}</Text>
        <Text
          style={[styles.message, { color: colors.text.secondary, fontSize: normalize(compact ? 12 : 13), lineHeight: normalize(compact ? 17 : 18) }]}
          numberOfLines={expanded ? undefined : compact ? 2 : 3}
        >
          {announcement.content}
        </Text>
        {canExpand && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Réduire cette annonce' : 'Lire l’annonce complète'}
            onPress={() => setExpanded(value => !value)}
            style={styles.expandButton}
          >
            <Text style={[styles.expandLabel, { color: tone }]}>
              {expanded ? 'Réduire' : 'Lire la suite'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Masquer cette annonce"
        onPress={() => {
          setDismissedId(announcement.id);
          setExpanded(false);
        }}
        style={styles.closeButton}
        hitSlop={8}
      >
        <X size={normalize(18)} color={colors.text.secondary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
    gap: 10,
    maxWidth: 1100,
    alignSelf: 'center',
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, marginBottom: 3 },
  title: { fontSize: 14, fontWeight: '800', marginBottom: 3 },
  message: { fontSize: 13, lineHeight: 18 },
  expandButton: { alignSelf: 'flex-start', marginTop: 4, paddingVertical: 2 },
  expandLabel: { fontSize: 12, fontWeight: '700' },
  closeButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
});
