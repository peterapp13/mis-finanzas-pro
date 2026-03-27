import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-gifted-charts';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const screenWidth = Dimensions.get('window').width;

interface PayrollRecord {
  id: string;
  month: number;
  year: number;
  total_devengado: number;
  liquido_percibir: number;
  deductions: {
    irpf_amount: number;
    ss_common: number;
    ss_unemployment: number;
  };
}

interface YearStats {
  year: number;
  total_gross: number;
  total_net: number;
  total_irpf: number;
  records_count: number;
}

const months = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export default function StatsScreen() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [yearStats, setYearStats] = useState<YearStats | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch payroll records for selected year
      const recordsRes = await fetch(`${BACKEND_URL}/api/payroll/year/${selectedYear}`);
      if (recordsRes.ok) {
        const data = await recordsRes.json();
        setRecords(data);
      }

      // Fetch yearly stats
      const statsRes = await fetch(`${BACKEND_URL}/api/payroll/stats/${selectedYear}`);
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setYearStats(stats);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [selectedYear]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/export`);
      if (response.ok) {
        const data = await response.json();
        const jsonString = JSON.stringify(data, null, 2);
        const fileName = `mis-finanzas-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
        const filePath = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(filePath, jsonString);
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(filePath, {
            mimeType: 'application/json',
            dialogTitle: 'Exportar datos de Mis Finanzas Pro',
          });
        } else {
          Alert.alert('Éxito', 'Archivo guardado localmente');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      const content = await FileSystem.readAsStringAsync(file.uri);
      const data = JSON.parse(content);

      Alert.alert(
        'Confirmar Importación',
        'Esto reemplazará todos los datos actuales. ¿Deseas continuar?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Importar',
            style: 'destructive',
            onPress: async () => {
              const response = await fetch(`${BACKEND_URL}/api/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  payroll_records: data.payroll_records || [],
                  settings: data.settings || {},
                }),
              });

              if (response.ok) {
                Alert.alert('Éxito', 'Datos importados correctamente');
                fetchData();
              } else {
                Alert.alert('Error', 'No se pudo importar los datos');
              }
            },
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo leer el archivo');
    }
  };

  const handleDeleteRecord = (id: string) => {
    Alert.alert(
      'Eliminar Registro',
      '¿Estás seguro de que deseas eliminar este registro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${BACKEND_URL}/api/payroll/${id}`, {
                method: 'DELETE',
              });
              if (response.ok) {
                fetchData();
              }
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el registro');
            }
          },
        },
      ]
    );
  };

  // Prepare chart data
  const chartData = records.map((record) => [
    {
      value: record.total_devengado,
      label: months[record.month - 1],
      frontColor: '#6C5CE7',
      spacing: 2,
      labelWidth: 30,
      labelTextStyle: { color: '#666', fontSize: 10 },
    },
    {
      value: record.liquido_percibir,
      frontColor: '#00D4AA',
    },
  ]).flat();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00D4AA" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#00D4AA"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Estadísticas</Text>
            <Text style={styles.headerSubtitle}>Historial y Análisis Fiscal</Text>
          </View>
        </View>

        {/* Year Selector */}
        <View style={styles.yearSelector}>
          <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)}>
            <Ionicons name="chevron-back" size={28} color="#00D4AA" />
          </TouchableOpacity>
          <Text style={styles.yearText}>{selectedYear}</Text>
          <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)}>
            <Ionicons name="chevron-forward" size={28} color="#00D4AA" />
          </TouchableOpacity>
        </View>

        {/* IRPF Counter */}
        <View style={styles.irpfCard}>
          <View style={styles.irpfHeader}>
            <Ionicons name="receipt" size={24} color="#FF6B6B" />
            <Text style={styles.irpfTitle}>Total IRPF {selectedYear}</Text>
          </View>
          <Text style={styles.irpfValue}>
            {yearStats?.total_irpf?.toFixed(2) || '0.00'} €
          </Text>
          <Text style={styles.irpfSubtext}>Pagado a Hacienda este año</Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Bruto</Text>
            <Text style={styles.summaryValue}>
              {yearStats?.total_gross?.toFixed(2) || '0.00'} €
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Total Neto</Text>
            <Text style={[styles.summaryValue, { color: '#00D4AA' }]}>
              {yearStats?.total_net?.toFixed(2) || '0.00'} €
            </Text>
          </View>
        </View>

        {/* Chart */}
        {records.length > 0 && (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Bruto vs Neto Mensual</Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#6C5CE7' }]} />
                <Text style={styles.legendText}>Bruto</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#00D4AA' }]} />
                <Text style={styles.legendText}>Neto</Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={chartData}
                barWidth={18}
                spacing={24}
                roundedTop
                roundedBottom
                hideRules
                xAxisThickness={0}
                yAxisThickness={0}
                yAxisTextStyle={{ color: '#666', fontSize: 10 }}
                noOfSections={4}
                maxValue={Math.max(...records.map(r => r.total_devengado)) * 1.2}
                isAnimated
                backgroundColor="transparent"
              />
            </ScrollView>
          </View>
        )}

        {/* History Table */}
        <View style={styles.tableCard}>
          <Text style={styles.tableTitle}>Historial de Nóminas</Text>
          
          {records.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={48} color="#666" />
              <Text style={styles.emptyText}>Sin registros para {selectedYear}</Text>
            </View>
          ) : (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Mes</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Bruto</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Neto</Text>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>IRPF</Text>
                <Text style={[styles.tableHeaderText, { width: 40 }]}></Text>
              </View>
              {records.map((record) => (
                <View key={record.id} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {months[record.month - 1]}
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1 }]}>
                    {record.total_devengado.toFixed(0)}€
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#00D4AA' }]}>
                    {record.liquido_percibir.toFixed(0)}€
                  </Text>
                  <Text style={[styles.tableCell, { flex: 1, color: '#FF6B6B' }]}>
                    {record.deductions.irpf_amount.toFixed(0)}€
                  </Text>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRecord(record.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Export/Import Section */}
        <View style={styles.syncSection}>
          <Text style={styles.syncTitle}>Sincronización</Text>
          <Text style={styles.syncSubtitle}>Exporta tus datos para guardar en iCloud</Text>
          
          <View style={styles.syncButtons}>
            <TouchableOpacity
              style={[styles.syncButton, styles.exportButton]}
              onPress={handleExport}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator color="#0A0A14" />
              ) : (
                <>
                  <Ionicons name="cloud-upload-outline" size={20} color="#0A0A14" />
                  <Text style={styles.exportButtonText}>Exportar JSON</Text>
                </>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.syncButton, styles.importButton]}
              onPress={handleImport}
            >
              <Ionicons name="cloud-download-outline" size={20} color="#00D4AA" />
              <Text style={styles.importButtonText}>Importar JSON</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A14',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 20,
  },
  yearText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  irpfCard: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF6B6B',
  },
  irpfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  irpfTitle: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  irpfValue: {
    color: '#FF6B6B',
    fontSize: 42,
    fontWeight: 'bold',
    marginTop: 8,
  },
  irpfSubtext: {
    color: '#FF6B6B',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
  },
  summaryLabel: {
    color: '#666',
    fontSize: 12,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 4,
  },
  chartCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: '#999',
    fontSize: 12,
  },
  tableCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  tableTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
    marginTop: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D44',
    marginBottom: 8,
  },
  tableHeaderText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2D2D44',
  },
  tableCell: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  deleteButton: {
    width: 40,
    alignItems: 'center',
  },
  syncSection: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
  },
  syncTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  syncSubtitle: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    marginBottom: 16,
  },
  syncButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  syncButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 10,
    gap: 8,
  },
  exportButton: {
    backgroundColor: '#00D4AA',
  },
  exportButtonText: {
    color: '#0A0A14',
    fontSize: 14,
    fontWeight: '600',
  },
  importButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  importButtonText: {
    color: '#00D4AA',
    fontSize: 14,
    fontWeight: '600',
  },
});
