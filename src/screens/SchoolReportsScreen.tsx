import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, BarChart3, PieChart, TrendingUp, Users, DollarSign, Calendar, Download, FileText, RefreshCw } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';
import apiService from '../services/api.service';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function SchoolReportsScreen({ navigation, route }: any) {
  const { colors, normalize } = useTheme();
  const isPrefet = route?.params?.schoolRole === 'prefet';
  const { width: windowWidth } = useWindowDimensions();
  const isTablet = windowWidth > 768;

  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState('academic_performance');
  const [reportData, setReportData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  const reportTypes = [
    {
      id: 'academic_performance',
      title: 'Performance Académique',
      description: 'Notes moyennes, top performers, résultats par classe',
      icon: <TrendingUp size={24} color="#4CAF50" />,
      color: '#4CAF50'
    },
    {
      id: 'financial_summary',
      title: 'Résumé Financier',
      description: 'Frais, paiements, soldes, transactions récentes',
      icon: <DollarSign size={24} color="#2196F3" />,
      color: '#2196F3'
    },
    {
      id: 'attendance_summary',
      title: 'Résumé Présences',
      description: 'Taux de présence, absences fréquentes, tendances',
      icon: <Calendar size={24} color="#FF9800" />,
      color: '#FF9800'
    }
  ].filter((report) => !isPrefet || report.id !== 'financial_summary');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      // Récupérer les statistiques de base
      const [attendanceRes, studentsRes, classesRes] = await Promise.all([
        apiService.getSchoolAttendanceStats(),
        apiService.getSchoolStudents(),
        apiService.getSchoolClasses()
      ]);

      const statsData = {
        attendance: attendanceRes.success ? (attendanceRes.data || attendanceRes.stats) : null,
        studentsCount: studentsRes.success ? (studentsRes.data || []).length : 0,
        classesCount: classesRes.success ? (classesRes.data || []).length : 0
      };

      setStats(statsData);
    } catch (e) {
      console.error('Error fetching stats:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (reportType: string) => {
    setSelectedReportType(reportType);
    setGeneratingReport(true);

    try {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // 3 derniers mois
      const endDate = new Date();

      const res = await apiService.getSchoolReports({
        reportType,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });

      if (res.success) {
        setReportData(res.data);
      } else {
        Alert.alert('Erreur', res.error || 'Impossible de générer le rapport.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const exportData = async (dataType: string) => {
    try {
      const res = await apiService.exportSchoolData({ dataType });

      if (res.success) {
        const exportResponse: any = res;
        // Générer un PDF simple avec les données
        const html = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>Rapport École - ${dataType}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h1 { color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background-color: #f2f2f2; }
                .header { text-align: center; margin-bottom: 30px; }
                .footer { margin-top: 30px; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>Rapport École - ${dataType}</h1>
                <p>Généré le ${new Date().toLocaleDateString('fr-FR')}</p>
              </div>
              <p>Total: ${exportResponse.count || 0} enregistrements</p>
              <table>
                <thead>
                  <tr>
                    ${Object.keys((exportResponse.data && exportResponse.data[0]) || {}).map((key: string) => `<th>${key}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${(exportResponse.data || []).slice(0, 50).map((row: Record<string, any>) => `
                    <tr>
                      ${Object.values(row).map((value: any) => `<td>${value}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ${(exportResponse.data || []).length > 50 ? `<p>... et ${(exportResponse.data || []).length - 50} autres enregistrements</p>` : ''}
              <div class="footer">
                <p>© ${new Date().getFullYear()} Acemia - Module École</p>
              </div>
            </body>
          </html>
        `;

        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Exporter ${dataType}`,
          UTI: 'com.adobe.pdf'
        });
      } else {
        Alert.alert('Erreur', res.error || 'Impossible d\'exporter les données.');
      }
    } catch (e: any) {
      Alert.alert('Erreur', e.message || 'Une erreur est survenue lors de l\'export.');
    }
  };

  const renderAcademicPerformanceReport = () => {
    if (!reportData) return null;

    return (
      <View style={styles.reportSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Performance par Classe
        </Text>

        {reportData.byClass && reportData.byClass.length > 0 ? (
          reportData.byClass.map((item: any, index: number) => (
            <View key={index} style={[styles.classPerformanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.classPerformanceHeader}>
                <Text style={[styles.className, { color: colors.text.primary }]}>{item.class_name || 'Non classé'}</Text>
                <View style={[styles.averageBadge, { backgroundColor: '#4CAF50' + '20' }]}>
                  <Text style={[styles.averageScore, { color: '#4CAF50' }]}>
                    {item.average_score || '0.00'}
                  </Text>
                </View>
              </View>

              <View style={styles.classPerformanceDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Élèves:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.student_count || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Notes:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.grade_count || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Min/Max:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>
                    {item.min_score || '0.00'} / {item.max_score || '0.00'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Aucune donnée de performance disponible.
          </Text>
        )}

        {reportData.topPerformers && reportData.topPerformers.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 20 }]}>
              Top Performers
            </Text>
            <View style={[styles.topPerformersCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {reportData.topPerformers.slice(0, 5).map((student: any, index: number) => (
                <View key={index} style={[styles.topPerformerRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.rankBadge}>
                    <Text style={[styles.rankText, { color: colors.text.primary }]}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.studentName, { color: colors.text.primary }]}>{student.full_name}</Text>
                    <Text style={[styles.className, { color: colors.text.secondary }]}>{student.class_name}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.averageScore, { color: '#4CAF50' }]}>{student.average_score}</Text>
                    <Text style={[styles.evaluationsCount, { color: colors.text.secondary }]}>
                      {student.evaluations_count} éval.
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderFinancialReport = () => {
    if (!reportData) return null;

    return (
      <View style={styles.reportSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Résumé Financier
        </Text>

        {reportData.summary && reportData.summary.length > 0 ? (
          reportData.summary.map((item: any, index: number) => (
            <View key={index} style={[styles.financialCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.financialHeader}>
                <Text style={[styles.financialCategory, { color: colors.text.primary }]}>{item.category}</Text>
                <View style={[styles.amountBadge, { backgroundColor: item.category.includes('Frais') ? '#F44336' + '20' : '#4CAF50' + '20' }]}>
                  <Text style={[styles.amountText, { color: item.category.includes('Frais') ? '#F44336' : '#4CAF50' }]}>
                    {item.total_due || item.total_amount || 0} $
                  </Text>
                </View>
              </View>

              <View style={styles.financialDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Total:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.total_invoices || item.total_payments || 0}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Payé:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.total_paid || 0} $</Text>
                </View>
                {item.total_balance !== undefined && (
                  <View style={styles.detailRow}>
                    <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Solde:</Text>
                    <Text style={[styles.detailValue, { color: item.total_balance > 0 ? '#F44336' : '#4CAF50' }]}>
                      {item.total_balance || 0} $
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Aucune donnée financière disponible.
          </Text>
        )}

        {reportData.recentPayments && reportData.recentPayments.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text.primary, marginTop: 20 }]}>
              Paiements Récents
            </Text>
            <View style={[styles.recentPaymentsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {reportData.recentPayments.slice(0, 10).map((payment: any, index: number) => (
                <View key={index} style={[styles.paymentRow, { borderBottomColor: colors.border }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.studentName, { color: colors.text.primary }]}>{payment.student_name}</Text>
                    <Text style={[styles.paymentDate, { color: colors.text.secondary }]}>
                      {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.paymentAmount, { color: '#4CAF50' }]}>{payment.amount} $</Text>
                    <Text style={[styles.paymentStatus, {
                      color: payment.status === 'completed' ? '#4CAF50' :
                            payment.status === 'pending' ? '#FF9800' : '#F44336'
                    }]}>
                      {payment.status === 'completed' ? 'Complété' :
                       payment.status === 'pending' ? 'En attente' : 'Échoué'}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    );
  };

  const renderAttendanceReport = () => {
    if (!reportData) return null;

    return (
      <View style={styles.reportSection}>
        <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>
          Résumé Mensuel des Présences
        </Text>

        {reportData.monthlySummary && reportData.monthlySummary.length > 0 ? (
          reportData.monthlySummary.map((item: any, index: number) => (
            <View key={index} style={[styles.attendanceCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.attendanceHeader}>
                <Text style={[styles.monthText, { color: colors.text.primary }]}>
                  {new Date(item.month).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                </Text>
                <View style={[styles.presenceRateBadge, {
                  backgroundColor: parseFloat(item.presence_rate) >= 90 ? '#4CAF50' + '20' :
                                 parseFloat(item.presence_rate) >= 80 ? '#FF9800' + '20' : '#F44336' + '20'
                }]}>
                  <Text style={[styles.presenceRateText, {
                    color: parseFloat(item.presence_rate) >= 90 ? '#4CAF50' :
                           parseFloat(item.presence_rate) >= 80 ? '#FF9800' : '#F44336'
                  }]}>
                    {item.presence_rate}%
                  </Text>
                </View>
              </View>

              <View style={styles.attendanceDetails}>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Jours totaux:</Text>
                  <Text style={[styles.detailValue, { color: colors.text.primary }]}>{item.total_days}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Présences:</Text>
                  <Text style={[styles.detailValue, { color: '#4CAF50' }]}>{item.present_days}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={[styles.detailLabel, { color: colors.text.secondary }]}>Absences:</Text>
                  <Text style={[styles.detailValue, { color: '#F44336' }]}>{item.absent_days}</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: colors.text.secondary }]}>
            Aucune donnée de présence disponible.
          </Text>
        )}
      </View>
    );
  };

  const renderReportContent = () => {
    switch (selectedReportType) {
      case 'academic_performance':
        return renderAcademicPerformanceReport();
      case 'financial_summary':
        return renderFinancialReport();
      case 'attendance_summary':
        return renderAttendanceReport();
      default:
        return null;
    }
  };

  if (loading && !reportData) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text.primary, fontSize: normalize(18) }]}>
          Rapports & Analytics
        </Text>
        <TouchableOpacity onPress={fetchStats}>
          <RefreshCw size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Statistiques rapides */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingTop: 15 }}>
        <View style={[styles.quickStats, { backgroundColor: colors.surface }]}>
          <View style={styles.quickStatItem}>
            <Users size={20} color={colors.primary} />
            <Text style={[styles.quickStatValue, { color: colors.text.primary }]}>
              {stats?.studentsCount || 0}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.text.secondary }]}>Élèves</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.quickStatItem}>
            <BarChart3 size={20} color="#4CAF50" />
            <Text style={[styles.quickStatValue, { color: '#4CAF50' }]}>
              {stats?.attendance?.presenceRate || '0'}%
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.text.secondary }]}>Présence</Text>
          </View>

          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

          <View style={styles.quickStatItem}>
            <FileText size={20} color="#2196F3" />
            <Text style={[styles.quickStatValue, { color: '#2196F3' }]}>
              {stats?.classesCount || 0}
            </Text>
            <Text style={[styles.quickStatLabel, { color: colors.text.secondary }]}>Classes</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sélection du type de rapport */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingHorizontal: 20, paddingTop: 15 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {reportTypes.map(report => (
            <TouchableOpacity
              key={report.id}
              style={[
                styles.reportTypeCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: selectedReportType === report.id ? report.color : colors.border,
                  borderWidth: selectedReportType === report.id ? 2 : 1
                }
              ]}
              onPress={() => generateReport(report.id)}
              disabled={generatingReport}
            >
              {report.icon}
              <Text style={[styles.reportTypeTitle, { color: colors.text.primary, marginTop: 8 }]}>
                {report.title}
              </Text>
              <Text style={[styles.reportTypeDescription, { color: colors.text.secondary }]} numberOfLines={2}>
                {report.description}
              </Text>
              {generatingReport && selectedReportType === report.id && (
                <ActivityIndicator size="small" color={report.color} style={{ marginTop: 8 }} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Contenu du rapport */}
      <ScrollView style={styles.reportContent}>
        {generatingReport ? (
          <View style={styles.loadingReport}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text.secondary, marginTop: 15 }]}>
              Génération du rapport en cours...
            </Text>
          </View>
        ) : reportData ? (
          <>
            {renderReportContent()}

            {/* Boutons d'export */}
            {!isPrefet && (
              <View style={[styles.exportSection, { borderTopColor: colors.border }]}>
                <Text style={[styles.sectionTitle, { color: colors.text.primary }]}>Exporter les données</Text>
                <View style={styles.exportButtons}>
                  <TouchableOpacity
                    style={[styles.exportButton, { borderColor: colors.border }]}
                    onPress={() => exportData('students')}
                  >
                    <Users size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.text.primary }}>Élèves</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.exportButton, { borderColor: colors.border }]}
                    onPress={() => exportData('grades')}
                  >
                    <BarChart3 size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.text.primary }}>Notes</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.exportButton, { borderColor: colors.border }]}
                    onPress={() => exportData('attendance')}
                  >
                    <Calendar size={18} color={colors.primary} style={{ marginRight: 8 }} />
                    <Text style={{ color: colors.text.primary }}>Présences</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.exportNote, { color: colors.text.secondary }]}>
                  Les données sont exportées au format PDF et partagées depuis votre appareil.
                </Text>
              </View>
            )}
          </>
        ) : (
          <View style={styles.emptyReport}>
            <BarChart3 size={60} color={colors.text.disabled} />
            <Text style={[styles.emptyText, { color: colors.text.secondary, marginTop: 15 }]}>
              Sélectionnez un type de rapport pour générer les statistiques.
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ddd'
  },
  headerTitle: { fontWeight: 'bold' },
  quickStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  quickStatItem: {
    alignItems: 'center',
    paddingHorizontal: 15
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 4
  },
  quickStatLabel: {
    fontSize: 11
  },
  statDivider: {
    width: 1,
    height: 40,
    marginHorizontal: 5
  },
  reportTypeCard: {
    width: 150,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center'
  },
  reportTypeTitle: {
    fontWeight: 'bold',
    textAlign: 'center'
  },
  reportTypeDescription: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4
  },
  reportContent: {
    flex: 1,
    padding: 20
  },
  loadingReport: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40
  },
  loadingText: {
    fontSize: 14
  },
  emptyReport: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 60
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14
  },
  reportSection: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15
  },
  classPerformanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12
  },
  classPerformanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  className: {
    fontWeight: 'bold',
    flex: 1
  },
  averageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  averageScore: {
    fontWeight: 'bold'
  },
  classPerformanceDetails: {
    marginTop: 8
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  detailLabel: {
    fontSize: 12
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500'
  },
  topPerformersCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15
  },
  topPerformerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center'
  },
  rankText: {
    fontWeight: 'bold',
    fontSize: 12
  },
  studentName: {
    fontWeight: 'bold',
    marginBottom: 2
  },
  evaluationsCount: {
    fontSize: 11
  },
  financialCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12
  },
  financialHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  financialCategory: {
    fontWeight: 'bold',
    flex: 1
  },
  amountBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  amountText: {
    fontWeight: 'bold'
  },
  financialDetails: {
    marginTop: 8
  },
  recentPaymentsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  paymentDate: {
    fontSize: 11,
    marginTop: 2
  },
  paymentAmount: {
    fontWeight: 'bold',
    marginBottom: 2
  },
  paymentStatus: {
    fontSize: 11,
    fontWeight: 'bold'
  },
  attendanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12
  },
  attendanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  monthText: {
    fontWeight: 'bold',
    flex: 1
  },
  presenceRateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8
  },
  presenceRateText: {
    fontWeight: 'bold'
  },
  attendanceDetails: {
    marginTop: 8
  },
  exportSection: {
    paddingTop: 25,
    borderTopWidth: 1,
    marginTop: 20
  },
  exportButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 15
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1
  },
  exportNote: {
    fontSize: 11,
    marginTop: 15,
    fontStyle: 'italic'
  }
});