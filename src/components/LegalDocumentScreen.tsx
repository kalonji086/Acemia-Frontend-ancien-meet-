import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, ChevronRight, RefreshCw, Scale } from 'lucide-react-native';
import io from 'socket.io-client';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import { SOCKET_URL } from '../utils/constants';

type LegalDocumentType = 'tos' | 'privacy';
export type LegalBlock = {
  type: 'heading' | 'paragraph' | 'bullet';
  text: string;
  segments?: Array<{ text: string; href?: string }>;
};

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
  const links: Array<{ text: string; href: string }> = [];
  const plainText = content
    .replace(/<a\b[^>]*href\s*=\s*(["'])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi, (_match, _quote: string, href: string, label: string) => {
      const text = decodeEntities(label.replace(/<[^>]*>/g, '').trim());
      const linkIndex = links.push({ text, href: decodeEntities(href) }) - 1;
      return `LEGAL_LINK_TOKEN_${linkIndex}_END`;
    })
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\s*h[1-6][^>]*>/gi, '\n## ')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/\s*(p|div|li|ul|ol|blockquote)\s*>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt|#\d+|#x[0-9a-f]+);/gi, entity => decodeEntities(entity))
    .replace(/\r/g, '');

  const getSegments = (line: string) => {
    const segments: Array<{ text: string; href?: string }> = [];
    const tokenPattern = /LEGAL_LINK_TOKEN_(\d+)_END/g;
    let lastIndex = 0;
    let match;
    while ((match = tokenPattern.exec(line)) !== null) {
      if (match.index > lastIndex) segments.push({ text: line.slice(lastIndex, match.index) });
      const link = links[Number(match[1])];
      if (link) segments.push(link);
      lastIndex = tokenPattern.lastIndex;
    }
    if (lastIndex < line.length) segments.push({ text: line.slice(lastIndex) });
    return segments;
  };

  return plainText.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
    const markdownHeading = line.match(/^#{1,3}\s+(.+)$/);
    if (markdownHeading) {
      const text = markdownHeading[1];
      return { type: 'heading', text: getSegments(text).map(segment => segment.text).join(''), segments: getSegments(text) };
    }
    if (/^(?:\d+(?:\.\d+)*[.)]?\s+.{1,110}|[A-ZÀ-ÖØ-Þ][^.!?]{2,75})$/.test(line)) {
      const segments = getSegments(line);
      return { type: 'heading', text: segments.map(segment => segment.text).join(''), segments };
    }
    if (/^(?:[•*-]|\d+[.)])\s+/.test(line)) {
      const text = line.replace(/^(?:[•*-]|\d+[.)])\s+/, '');
      const segments = getSegments(text);
      return { type: 'bullet', text: segments.map(segment => segment.text).join(''), segments };
    }
    const segments = getSegments(line);
    return { type: 'paragraph', text: segments.map(segment => segment.text).join(''), segments };
  });
}

export default function LegalDocumentScreen({
  type,
  navigation,
  isComponent = false,
}: LegalDocumentScreenProps) {
  const { colors, isDark, normalize } = useTheme();
  const { width } = useWindowDimensions();
  const [containerWidth, setContainerWidth] = useState(0);
  const [document, setDocument] = useState<{ content: string; version: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const loadRequest = useRef(0);
  const sectionOffsets = useRef<number[]>([]);
  const documentLayoutOffset = useRef(0);
  const documentCardOffset = useRef(0);
  const title = type === 'privacy' ? 'Politique de confidentialité' : 'Conditions d’utilisation';
  const blocks = useMemo(() => document ? parseLegalContent(document.content) : [], [document]);
  const headings = useMemo(
    () => blocks.flatMap((block, index) => block.type === 'heading' ? [{ index, text: block.text }] : []),
    [blocks],
  );
  const introBlockIndex = blocks[0]?.type === 'paragraph' ? 0 : -1;
  const introBlock = introBlockIndex >= 0 ? blocks[introBlockIndex] : null;
  const contentBlocks = blocks
    .map((block, index) => ({ block, index }))
    .filter(({ index }) => index !== introBlockIndex);
  const availableWidth = containerWidth || width;
  const isWideLayout = availableWidth > 760;

  const handleLegalLink = (href: string) => {
    const localPath = href.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/, 1)[0].toLowerCase();
    if (localPath === '/privacy') {
      navigation.navigate('PrivacyPolicy');
      return;
    }
    if (localPath === '/terms') {
      navigation.navigate('TermsOfService');
      return;
    }
    void Linking.openURL(href).catch(linkError => {
      console.error('Unable to open legal document link:', linkError);
    });
  };

  const renderBlockText = (block: LegalBlock, textStyle: any) => (
    <Text style={textStyle}>
      {block.segments?.length
        ? block.segments.map((segment, index) => segment.href
          ? (
            <Text
              key={`${index}-${segment.href}`}
              accessibilityRole="link"
              onPress={() => handleLegalLink(segment.href!)}
              style={styles.inlineLink}
            >
              {segment.text}
            </Text>
          )
          : <Text key={index}>{segment.text}</Text>)
        : block.text}
    </Text>
  );

  const loadDocument = useCallback(async () => {
    const requestId = ++loadRequest.current;
    try {
      const response = await apiService.getLegalDocs();
      if (!response.success || !Array.isArray(response.data)) {
        throw new Error('La réponse des documents légaux est invalide.');
      }
      const current = response.data.find((item: any) => item.type === type);
      if (!current || typeof current.content !== 'string' || !current.content.trim()) {
        if (requestId !== loadRequest.current) return;
        setDocument(null);
        setError('Ce document n’est pas encore publié.');
        return;
      }
      if (requestId !== loadRequest.current) return;
      setDocument({ content: current.content, version: String(current.version || '') });
      setError(null);
    } catch (loadError) {
      if (requestId !== loadRequest.current) return;
      console.error(`Unable to load ${type} legal document:`, loadError);
      setError('Impossible de charger le document. Vérifiez votre connexion puis réessayez.');
    } finally {
      if (requestId === loadRequest.current) setLoading(false);
    }
  }, [type]);

  useFocusEffect(useCallback(() => {
    const socket = io(`${SOCKET_URL.replace(/\/$/, '')}/legal`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
    });
    const handleLegalUpdate = (updated: any) => {
      if (updated?.type !== type || typeof updated.content !== 'string' || !updated.content.trim()) return;
      loadRequest.current += 1;
      setDocument({ content: updated.content, version: String(updated.version || '') });
      setError(null);
      setLoading(false);
    };
    const handleLegalRemoval = (removed: any) => {
      if (removed?.type !== type) return;
      loadRequest.current += 1;
      setDocument(null);
      setError('Ce document n’est pas encore publié.');
      setLoading(false);
    };

    socket.on('legal_update', handleLegalUpdate);
    socket.on('legal_removed', handleLegalRemoval);
    socket.on('connect', loadDocument);
    loadDocument();
    const refresh = setInterval(loadDocument, 30_000);
    return () => {
      clearInterval(refresh);
      loadRequest.current += 1;
      socket.disconnect();
    };
  }, [loadDocument, type]));

  const background = isDark ? '#171520' : '#f7f5ff';
  const surface = isDark ? colors.surface : '#ffffff';
  const primaryText = colors.text.primary;
  const secondaryText = colors.text.secondary;

  return (
    <View
      style={[styles.container, { backgroundColor: background }]}
      onLayout={event => {
        const nextWidth = Math.round(event.nativeEvent.layout.width);
        if (nextWidth !== containerWidth) setContainerWidth(nextWidth);
      }}
    >
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
        contentContainerStyle={[
          styles.scrollContent,
          { paddingHorizontal: normalize(availableWidth < 360 ? 10 : availableWidth < 420 ? 12 : 18) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {isComponent && (
          <View style={[styles.inlineBrand, { backgroundColor: surface }]}>
            <Image source={require('../../assets/AcemiaLogo.png')} style={styles.logo} resizeMode="contain" />
            <Text style={[styles.brand, { color: primaryText }]}>Acemia</Text>
          </View>
        )}

        <View style={styles.documentNav}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'tos' }}
            onPress={() => type !== 'tos' && navigation.navigate('TermsOfService')}
            style={[
              styles.documentNavItem,
              { backgroundColor: type === 'tos' ? '#f0ebff' : surface, borderColor: type === 'tos' ? '#d7cdf8' : colors.border },
            ]}
          >
            <Text style={[styles.documentNavText, { color: type === 'tos' ? '#6546c4' : secondaryText }]}>
              Conditions d’utilisation
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityState={{ selected: type === 'privacy' }}
            onPress={() => type !== 'privacy' && navigation.navigate('PrivacyPolicy')}
            style={[
              styles.documentNavItem,
              { backgroundColor: type === 'privacy' ? '#f0ebff' : surface, borderColor: type === 'privacy' ? '#d7cdf8' : colors.border },
            ]}
          >
            <Text style={[styles.documentNavText, { color: type === 'privacy' ? '#6546c4' : secondaryText }]}>
              Confidentialité
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroDecoration} />
          <View style={styles.heroIcon}><Scale size={23} color="#fff" /></View>
          <Text style={styles.eyebrow}>TRANSPARENCE ET CONFIANCE</Text>
          <Text
            style={[
              styles.title,
              {
                fontSize: normalize(availableWidth < 360 ? 25 : availableWidth < 420 ? 27 : 30),
                lineHeight: normalize(availableWidth < 360 ? 31 : 36),
              },
            ]}
          >
            {title}
          </Text>
          <Text style={[styles.heroCopy, { fontSize: normalize(availableWidth < 360 ? 13 : availableWidth < 420 ? 14 : 16) }]}>
            {type === 'privacy'
              ? 'Cette page explique quelles informations Acemia utilise, pourquoi elles le sont, comment elles sont protégées et quels choix vous pouvez exercer.'
              : 'Ces conditions expliquent les règles applicables lorsque vous créez un compte ou utilisez les services et fonctionnalités proposés par Acemia.'}
          </Text>
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
            <View
              style={[styles.documentLayout, isWideLayout && styles.wideDocumentLayout]}
              onLayout={event => { documentLayoutOffset.current = event.nativeEvent.layout.y; }}
            >
              <View
                style={[
                  styles.tocCard,
                  isWideLayout && styles.wideTocCard,
                  { backgroundColor: surface, borderColor: colors.border },
                ]}
              >
                <Text style={[styles.tocTitle, { color: primaryText }]}>Sommaire</Text>
                {headings.length ? (
                  <View style={styles.tocLinks}>
                    {headings.map((heading, index) => (
                      <TouchableOpacity
                        key={`${heading.index}-${heading.text}`}
                        accessibilityRole="button"
                        style={[
                          styles.tocLink,
                          { borderTopColor: colors.border, width: '100%' },
                          index === 0 && styles.firstTocLink,
                        ]}
                        onPress={() => scrollRef.current?.scrollTo({ y: sectionOffsets.current[heading.index] || 0, animated: true })}
                      >
                        <Text style={[styles.tocNumber, { color: '#a4a9b5' }]}>{index + 1}.</Text>
                        <Text style={[styles.tocText, { color: secondaryText }]}>{heading.text}</Text>
                        <ChevronRight size={16} color={colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.tocText, { color: secondaryText }]}>Document complet</Text>
                )}
              </View>

              <View
                style={[styles.documentCard, isWideLayout && styles.wideDocumentCard, { backgroundColor: surface, borderColor: colors.border }]}
                onLayout={event => { documentCardOffset.current = documentLayoutOffset.current + event.nativeEvent.layout.y; }}
              >
                {introBlock && (
                  <View style={[styles.introBox, { backgroundColor: isDark ? '#29233a' : '#f5f1ff', borderLeftColor: '#6546c4' }]}>
                    {renderBlockText(introBlock, [styles.bodyText, styles.introText, { color: isDark ? '#e7e0ff' : '#414b61', fontSize: normalize(15) }])}
                  </View>
                )}
                {contentBlocks.map(({ block, index }) => (
                  <View
                    key={`${index}-${block.type}`}
                    onLayout={event => { sectionOffsets.current[index] = documentCardOffset.current + event.nativeEvent.layout.y; }}
                  >
                    {block.type === 'heading' ? (
                      <View style={[styles.section, { borderTopColor: colors.border }]}>
                        <Text style={[styles.sectionHeading, { color: isDark ? '#cbbdff' : '#30215f', fontSize: normalize(19) }]}>
                          {block.text}
                        </Text>
                      </View>
                    ) : block.type === 'bullet' ? (
                      <View style={styles.bulletRow}>
                        <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
                        {renderBlockText(block, [styles.bodyText, { color: primaryText, fontSize: normalize(15) }])}
                      </View>
                    ) : (
                      renderBlockText(block, [styles.bodyText, { color: primaryText, fontSize: normalize(15) }])
                    )}
                  </View>
                ))}
              </View>
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
  inlineBrand: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, marginBottom: 8, borderRadius: 14 },
  scrollContent: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingTop: 16, paddingBottom: 42 },
  documentNav: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 14 },
  documentNavItem: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 14, borderWidth: 1, borderRadius: 999 },
  documentNavText: { fontSize: 13, fontWeight: '700' },
  hero: { position: 'relative', overflow: 'hidden', padding: 24, marginBottom: 18, borderRadius: 22, backgroundColor: '#4d347f' },
  heroDecoration: { position: 'absolute', right: -54, bottom: -96, width: 220, height: 220, borderWidth: 1, borderColor: '#ffffff25', borderRadius: 110, shadowColor: '#ffffff', shadowOpacity: 0.06, shadowRadius: 0, elevation: 0 },
  heroIcon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#ffffff24', marginBottom: 16 },
  eyebrow: { color: '#e1d8ff', fontSize: 10, fontWeight: '800', letterSpacing: 1.2, marginBottom: 8 },
  title: { color: '#fff', fontWeight: '900', lineHeight: 36, letterSpacing: -0.6 },
  heroCopy: { maxWidth: 700, marginTop: 14, color: '#f1edff', lineHeight: 24 },
  version: { marginTop: 12, color: '#e7e0ff', fontSize: 12, fontWeight: '600' },
  documentLayout: { flexDirection: 'column', gap: 14 },
  wideDocumentLayout: { flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  tocCard: { padding: 18, marginBottom: 14, borderWidth: 1, borderRadius: 17, shadowColor: '#20243b', shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  wideTocCard: { width: 250, flexShrink: 0, marginBottom: 0 },
  tocTitle: { marginBottom: 8, fontSize: 15, fontWeight: '800' },
  tocLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 10 },
  tocLink: { flexDirection: 'row', alignItems: 'center', minHeight: 42, gap: 7, borderTopWidth: StyleSheet.hairlineWidth },
  firstTocLink: { borderTopWidth: 0 },
  tocNumber: { fontSize: 13, fontWeight: '700' },
  tocText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  documentCard: { padding: 21, borderWidth: 1, borderRadius: 18, shadowColor: '#20243b', shadowOpacity: 0.04, shadowRadius: 12, elevation: 1 },
  wideDocumentCard: { flex: 1, minWidth: 0 },
  introBox: { marginBottom: 8, padding: 17, borderLeftWidth: 4, borderTopRightRadius: 12, borderBottomRightRadius: 12 },
  introText: { marginBottom: 0 },
  section: { paddingTop: 25, marginTop: 24, borderTopWidth: StyleSheet.hairlineWidth },
  sectionHeading: { marginBottom: 12, fontWeight: '800', letterSpacing: -0.3 },
  bodyText: { marginBottom: 13, lineHeight: 25 },
  inlineLink: { color: '#6546c4', textDecorationLine: 'underline' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7, paddingLeft: 3 },
  bulletDot: { width: 22, fontSize: 18, lineHeight: 24 },
  otherLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, marginTop: 14, borderWidth: 1, borderRadius: 14 },
  otherLinkText: { flex: 1, fontSize: 13, fontWeight: '700' },
  stateCard: { padding: 24, alignItems: 'center', borderRadius: 17 },
  stateText: { marginTop: 12, fontSize: 14, lineHeight: 21, textAlign: 'center' },
  retryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16, paddingHorizontal: 16, paddingVertical: 11, borderRadius: 12, backgroundColor: '#6546c4' },
  retryText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
