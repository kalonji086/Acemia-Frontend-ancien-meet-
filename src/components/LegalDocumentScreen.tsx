import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, ChevronRight, RefreshCw, Scale } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';

type LegalDocumentType = 'tos' | 'privacy';
export type LegalBlock = { type: 'heading' | 'paragraph' | 'bullet'; text: string };

interface LegalDocumentScreenProps {
  type: LegalDocumentType;
  navigation: any;
  isComponent?: boolean;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

export function parseLegalContent(content: string): LegalBlock[] {
  const plainText = content
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\s*h[1-6][^>]*>/gi, '\n## ')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(p|div|li|ul|ol|blockquote)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, entity => decodeEntities(entity))
    .replace(/\r/g, '');

  return plainText.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const markdownHeading = line.match(/^#{1,3}\s+(.+)$/);
    if (markdownHeading) return { type: 'heading', text: markdownHeading[1] };
    if (/^(?:\d+(?:\.\d+)*[.)]?\s+.{1,110}|[A-ZÀ-ÖØ-Þ][^.!?]{2,75})$/.test(line)) {
      return { type: 'heading', text: line };
    }
    if (/^(?:[•*-]|\d+[.)])\s+/.test(line)) {
      return { type: 'bullet', text: line.replace(/^(?:[•*-]|\d+[.)])\s+/, '') };
    }
    return { type: 'paragraph', text: line };
  });
}

export default function LegalDocumentScreen({
  type,
  navigation,
  isComponent = false,
}: LegalDocumentScreenProps) {
  const { colors, isDark, normalize } = useTheme();
  const [document, setDocument] = useState<{ content: string; version: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<number[]>([]);
  const documentCardOffset = useRef(0);
  const title = type === 'privacy' ? 'Politique de confidentialité' : 'Conditions d’utilisation';
  const blocks = useMemo(() => document ? parseLegalContent(document.content) : [], [document]);
  const headings = useMemo(
    () => blocks.flatMap((block, index) => block.type === 'heading' ? [{ index, text: block.text }] : []),
    [blocks],
  );

  const loadDocument = useCallback(async () => {
    try {
      const response = await apiService.getLegalDocs();
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('La réponse des documents légaux est invalide.');
      }
      const current = response.data.find((item: any) => item.type === type);
      if (!current || typeof current.content !== 'string' || !current.content.trim()) {
        setDocument(null);
        setError('Ce document n’est pas encore publié.');
        return;
      }
      setDocument({ content: current.content, version: String(current.version || '') });
      setError(null);
    } catch (loadError) {
      console.error(`Unable to load ${type} legal document:`, loadError);
      setError('Impossible de charger le document. Vérifiez votre connexion puis réessayez.');
    } finally {
      setLoading(false);
    }
  }, [type]);

  useFocusEffect(useCallback(() => {
    loadDocument();
    const refresh = setInterval(loadDocument, 30_000);
    return () => clearInterval(refresh);
  }, [loadDocument]));

  const background = isDark ? '#171520' : '#f7f5ff';
  const surface = isDark ? colors.surface : '#ffffff';
  const primaryText = colors.text.primary;
  const secondaryText = colors.text.secondary;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {!isComponent && (
        <View style={[styles.topbar, { borderBottomColor: colors.border, backgroundColor: surface }]}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retour"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={22} color={colors.primary} />
          </TouchableOpacity>
          <Image source={require('../../assets/AcemiaLogo.png')} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.brand, { color: primaryText }]}>Acemia</Text>
          <View style={styles.topbarSpacer} />
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.scrollContent, { paddingHorizontal: normalize(18) }]}
        showsVerticalScrollIndicator={false}
      >
        {isComponent && (
          <View style={styles.inlineBrand}>
            <Image source={require('../../assets/AcemiaLogo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.brand, { color: primaryText }]}>Acemia</Text>
          </View>
        )}

        <View style={styles.hero}>
          <View style={styles.heroIcon}><Scale size={23} color="#fff" /></View>
          <Text style={styles.eyebrow}>TRANSPARENCE ET CONFIANCE</Text>
          <Text style={[styles.title, { fontSize: normalize(30) }]}>{title}</Text>
          {!!document?.version && <Text style={styles.version}>Version {document.version}</Text>}
        </View>

        {loading && !document ? (
          <View style={[styles.stateCard, { backgroundColor: surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.stateText, { color: secondaryText }]}>Chargement du document…</Text>
          </View>
        ) : error && !document ? (
          <View style={[styles.stateCard, { backgroundColor: surface }]}>
            <Text style={[styles.stateText, { color: primaryText }]}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={loadDocument}>
              <RefreshCw size={16} color="#fff" />
              <Text style={styles.retryText}>Réessayer</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={[styles.tocCard, { backgroundColor: surface, borderColor: colors.border }]}>
              <Text style={[styles.tocTitle, { color: primaryText }]}>Sommaire</Text>
              {headings.length ? headings.map(heading => (
                <TouchableOpacity
                  key={`${heading.index}-${heading.text}`}
                  accessibilityRole="button"
                  style={styles.tocLink}
                  onPress={() => scrollRef.current?.scrollTo({ y: sectionOffsets.current[heading.index] || 0, animated: true })}
                >
                  <Text style={[styles.tocText, { color: secondaryText }]} numberOfLines={2}>{heading.text}</Text>
                  <ChevronRight size={16} color={colors.primary} />
                </TouchableOpacity>
              )) : (
                <Text style={[styles.tocText, { color: secondaryText }]}>Document complet</Text>
              )}
            </View>

            <View
              style={[styles.documentCard, { backgroundColor: surface, borderColor: colors.border }]}
              onLayout={event => { documentCardOffset.current = event.nativeEvent.layout.y; }}
            >
              {blocks.map((block, index) => (
                <View
                  key={`${index}-${block.type}`}
                  onLayout={event => { sectionOffsets.current[index] = documentCardOffset.current + event.nativeEvent.layout.y; }}
                >
                  {block.type === 'heading' ? (
                    <Text style={[styles.sectionHeading, { color: colors.primary, fontSize: normalize(19) }]}>
                      {block.text}
                    </Text>
                  ) : block.type === 'bullet' ? (
                    <View style={styles.bulletRow}>
                      <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
                      <Text style={[styles.bodyText, { color: primaryText, fontSize: normalize(15) }]}>{block.text}</Text>
                    </View>
                  ) : (
                    <Text style={[styles.bodyText, { color: primaryText, fontSize: normalize(15) }]}>{block.text}</Text>
                  )}
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.otherLink, { backgroundColor: surface, borderColor: colors.border }]}
              onPress={() => navigation.navigate(type === 'privacy' ? 'TermsOfService' : 'PrivacyPolicy')}
            >
              <Text style={[styles.otherLinkText, { color: colors.primary }]}>
                Consulter {type === 'privacy' ? 'les conditions d’utilisation' : 'la politique de confidentialité'}
              </Text>
              <ChevronRight size={18} color={colors.primary} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topbar: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  backButton: { width: 40, height: 42, justifyContent: 'center' },
  logo: { width: 34, height: 34 },
  brand: { marginLeft: 8, fontSize: 17, fontWeight: '800' },
  topbarSpacer: { flex: 1 },
  inlineBrand: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  scrollContent: { width: '100%', maxWidth: 850, alignSelf: 'center', paddingTop: 16, paddingBottom: 42 },
  hero: { padding: 24, marginBottom: 14, borderRadius: 22, backgroundColor: '#4d347f' },
  heroIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ffffff24', marginBottom: 16 },
  eyebrow: { color: '#e1d8ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  title: { color: '#fff', fontWeight: '900', lineHeight: 36 },
  version: { marginTop: 12, color: '#e7e0ff', fontSize: 12, fontWeight: '600' },
  tocCard: { padding: 18, marginBottom: 14, borderWidth: 1, borderRadius: 17 },
  tocTitle: { marginBottom: 8, fontSize: 15, fontWeight: '800' },
  tocLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 38, gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#90909030' },
  tocText: { flex: 1, fontSize: 13, fontWeight: '600' },
  documentCard: { padding: 21, borderWidth: 1, borderRadius: 18 },
  sectionHeading: { marginTop: 15, marginBottom: 9, fontWeight: '800' },
  bodyText: { marginBottom: 14, lineHeight: 24 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  bulletDot: { width: 22, fontSize: 18, lineHeight: 24 },
  otherLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginTop: 14, borderWidth: 1, borderRadius: 14 },
  otherLinkText: { flex: 1, fontSize: 13, fontWeight: '700' },
  stateCard: { padding: 24, alignItems: 'center', borderRadius: 17 },
  stateText: { marginTop: 12, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, backgroundColor: '#6546c4' },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
