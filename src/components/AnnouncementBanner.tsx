import React, { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [dismissedId, setDismissedId] = useState<string | number | null>(null);
  const activeRef = useRef(true);

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

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: `${tone}55` }]}>
      <View style={[styles.icon, { backgroundColor: `${tone}18` }]}>
        <Megaphone size={normalize(20)} color={tone} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.eyebrow, { color: tone }]}>{typeLabels[announcement.type] || typeLabels.info} · ACEMIA</Text>
        <Text style={[styles.title, { color: colors.text.primary }]} numberOfLines={2}>{announcement.title}</Text>
        <Text style={[styles.message, { color: colors.text.secondary }]} numberOfLines={3}>{announcement.content}</Text>
      </View>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Masquer cette annonce"
        onPress={() => setDismissedId(announcement.id)}
        style={styles.closeButton}
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
  closeButton: { padding: 4 },
});
