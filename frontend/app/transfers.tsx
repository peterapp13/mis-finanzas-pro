import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface BankSettings {
  n26_rent: number;
  n26_food: number;
  n26_parking: number;
  n26_loans: number;
  principal_electricity: number;
  principal_water: number;
  principal_gas: number;
  principal_subscriptions: number;
}

interface PayrollRecord {
  id: string;
  month: number;
  year: number;
  liquido_percibir: number;
}

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function TransfersScreen() {
  const [settings, setSettings] = useState<BankSettings>({
    n26_rent: 234,
    n26_food: 100,
    n26_parking: 120,
    n26_loans: 110,
    principal_electricity: 50,
    principal_water: 20,
    principal_gas: 30,
    principal_subscriptions: 50,
  });
  const [latestPayroll, setLatestPayroll] = useState<PayrollRecord | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      // Fetch settings
      const settingsRes = await fetch(`${BACKEND_URL}/api/settings`);
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        setSettings({
          n26_rent: settingsData.n26_rent,
          n26_food: settingsData.n26_food,
          n26_parking: settingsData.n26_parking,
          n26_loans: settingsData.n26_loans,
          principal_electricity: settingsData.principal_electricity,
          principal_water: settingsData.principal_water,
          principal_gas: settingsData.principal_gas,
          principal_subscriptions: settingsData.principal_subscriptions,
        });
      }

      // Fetch latest payroll
      const payrollRes = await fetch(`${BACKEND_URL}/api/payroll`);
      if (payrollRes.ok) {
        const payrolls = await payrollRes.json();
        if (payrolls.length > 0) {
          setLatestPayroll(payrolls[0]);
        }
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
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        Alert.alert('Éxito', 'Configuración guardada correctamente');
        setShowSettings(false);
      } else {
        Alert.alert('Error', 'No se pudo guardar la configuración');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setIsSaving(false);
    }
  };

  const netSalary = latestPayroll?.liquido_percibir || 0;
  
  // Calculate totals for each account
  const account1Total = settings.n26_rent + settings.n26_food + settings.n26_parking + settings.n26_loans;
  const account2Total = settings.principal_electricity + settings.principal_water + settings.principal_gas + settings.principal_subscriptions;
  const account3Total = Math.max(0, netSalary - account1Total - account2Total);

  const renderSettingsInput = (label: string, field: keyof BankSettings, icon: string) => (
    <View style={styles.settingsInputRow}>
      <View style={styles.settingsLabelContainer}>
        <Ionicons name={icon as any} size={18} color="#666" />
        <Text style={styles.settingsLabel}>{label}</Text>
      </View>
      <View style={styles.settingsInputWrapper}>
        <TextInput
          style={styles.settingsInput}
          value={settings[field].toString()}
          onChangeText={(v) => setSettings(prev => ({ ...prev, [field]: parseFloat(v) || 0 }))}
          keyboardType="decimal-pad"
        />
        <Text style={styles.euroSymbol}>€</Text>
      </View>
    </View>
  );

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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
              <Text style={styles.headerTitle}>Transferencias</Text>
              <Text style={styles.headerSubtitle}>Distribuidor de Fondos</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsButton}
              onPress={() => setShowSettings(!showSettings)}
            >
              <Ionicons name={showSettings ? "close" : "settings-outline"} size={24} color="#00D4AA" />
            </TouchableOpacity>
          </View>

          {/* Net Salary Display */}
          <View style={styles.salaryCard}>
            <Text style={styles.salaryLabel}>Salario Neto Disponible</Text>
            {latestPayroll ? (
              <>
                <Text style={styles.salaryValue}>{netSalary.toFixed(2)} €</Text>
                <Text style={styles.salaryPeriod}>
                  {months[latestPayroll.month - 1]} {latestPayroll.year}
                </Text>
              </>
            ) : (
              <Text style={styles.noDataText}>Sin datos de nómina</Text>
            )}
          </View>

          {/* Settings Panel */}
          {showSettings && (
            <View style={styles.settingsPanel}>
              <Text style={styles.settingsPanelTitle}>Ajustes de Distribución</Text>
              
              <Text style={styles.settingsSectionTitle}>Cuenta N26 - Básicos</Text>
              {renderSettingsInput('Alquiler', 'n26_rent', 'home-outline')}
              {renderSettingsInput('Comida', 'n26_food', 'fast-food-outline')}
              {renderSettingsInput('Parking', 'n26_parking', 'car-outline')}
              {renderSettingsInput('Préstamos', 'n26_loans', 'cash-outline')}
              
              <Text style={[styles.settingsSectionTitle, { marginTop: 16 }]}>Cuenta Principal - Servicios</Text>
              {renderSettingsInput('Electricidad', 'principal_electricity', 'flash-outline')}
              {renderSettingsInput('Agua', 'principal_water', 'water-outline')}
              {renderSettingsInput('Gas', 'principal_gas', 'flame-outline')}
              {renderSettingsInput('Suscripciones', 'principal_subscriptions', 'apps-outline')}
              
              <TouchableOpacity
                style={styles.saveSettingsButton}
                onPress={saveSettings}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#0A0A14" />
                ) : (
                  <Text style={styles.saveSettingsButtonText}>Guardar Cambios</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Account Cards */}
          <View style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={[styles.accountBadge, { backgroundColor: '#FF6B6B' }]}>
                <Ionicons name="card" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>N26 - Básicos</Text>
                <Text style={styles.accountDescription}>Gastos fijos mensuales</Text>
              </View>
              <Text style={styles.accountTotal}>{account1Total.toFixed(2)} €</Text>
            </View>
            <View style={styles.accountDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="home-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Alquiler</Text>
                <Text style={styles.detailValue}>{settings.n26_rent.toFixed(2)} €</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="fast-food-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Comida</Text>
                <Text style={styles.detailValue}>{settings.n26_food.toFixed(2)} €</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="car-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Parking</Text>
                <Text style={styles.detailValue}>{settings.n26_parking.toFixed(2)} €</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="cash-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Préstamos</Text>
                <Text style={styles.detailValue}>{settings.n26_loans.toFixed(2)} €</Text>
              </View>
            </View>
          </View>

          <View style={styles.accountCard}>
            <View style={styles.accountHeader}>
              <View style={[styles.accountBadge, { backgroundColor: '#6C5CE7' }]}>
                <Ionicons name="business" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>Principal - Servicios</Text>
                <Text style={styles.accountDescription}>Suministros y suscripciones</Text>
              </View>
              <Text style={styles.accountTotal}>{account2Total.toFixed(2)} €</Text>
            </View>
            <View style={styles.accountDetails}>
              <View style={styles.detailRow}>
                <Ionicons name="flash-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Electricidad</Text>
                <Text style={styles.detailValue}>{settings.principal_electricity.toFixed(2)} €</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="water-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Agua</Text>
                <Text style={styles.detailValue}>{settings.principal_water.toFixed(2)} €</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="flame-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Gas</Text>
                <Text style={styles.detailValue}>{settings.principal_gas.toFixed(2)} €</Text>
              </View>
              <View style={styles.detailRow}>
                <Ionicons name="apps-outline" size={16} color="#666" />
                <Text style={styles.detailLabel}>Suscripciones</Text>
                <Text style={styles.detailValue}>{settings.principal_subscriptions.toFixed(2)} €</Text>
              </View>
            </View>
          </View>

          <View style={[styles.accountCard, styles.savingsCard]}>
            <View style={styles.accountHeader}>
              <View style={[styles.accountBadge, { backgroundColor: '#00D4AA' }]}>
                <Ionicons name="wallet" size={20} color="#FFFFFF" />
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>Ahorro / Vicios</Text>
                <Text style={styles.accountDescription}>Saldo restante</Text>
              </View>
              <Text style={[styles.accountTotal, { color: '#00D4AA' }]}>{account3Total.toFixed(2)} €</Text>
            </View>
            <View style={styles.savingsProgress}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill,
                    { width: netSalary > 0 ? `${Math.min(100, (account3Total / netSalary) * 100)}%` : '0%' }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {netSalary > 0 ? ((account3Total / netSalary) * 100).toFixed(1) : 0}% del salario neto
              </Text>
            </View>
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Resumen de Distribución</Text>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryDot, { backgroundColor: '#FF6B6B' }]} />
              <Text style={styles.summaryLabel}>N26 Básicos</Text>
              <Text style={styles.summaryValue}>{account1Total.toFixed(2)} €</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryDot, { backgroundColor: '#6C5CE7' }]} />
              <Text style={styles.summaryLabel}>Principal Servicios</Text>
              <Text style={styles.summaryValue}>{account2Total.toFixed(2)} €</Text>
            </View>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryDot, { backgroundColor: '#00D4AA' }]} />
              <Text style={styles.summaryLabel}>Ahorro/Vicios</Text>
              <Text style={styles.summaryValue}>{account3Total.toFixed(2)} €</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryTotalLabel}>Total</Text>
              <Text style={styles.summaryTotalValue}>{netSalary.toFixed(2)} €</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1A2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  salaryCard: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  salaryLabel: {
    color: '#00D4AA',
    fontSize: 14,
  },
  salaryValue: {
    color: '#00D4AA',
    fontSize: 36,
    fontWeight: 'bold',
    marginTop: 4,
  },
  salaryPeriod: {
    color: '#00D4AA',
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
  },
  noDataText: {
    color: '#666',
    fontSize: 16,
    marginTop: 8,
  },
  settingsPanel: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  settingsPanelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  settingsSectionTitle: {
    fontSize: 14,
    color: '#00D4AA',
    fontWeight: '500',
    marginBottom: 12,
  },
  settingsInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  settingsLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsLabel: {
    color: '#CCCCCC',
    fontSize: 14,
  },
  settingsInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D44',
    borderRadius: 8,
    paddingHorizontal: 12,
    minWidth: 100,
  },
  settingsInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 8,
    textAlign: 'right',
  },
  euroSymbol: {
    color: '#00D4AA',
    fontSize: 14,
    marginLeft: 6,
  },
  saveSettingsButton: {
    backgroundColor: '#00D4AA',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  saveSettingsButtonText: {
    color: '#0A0A14',
    fontSize: 16,
    fontWeight: '600',
  },
  accountCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  savingsCard: {
    borderWidth: 1,
    borderColor: '#00D4AA',
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  accountBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
    marginLeft: 12,
  },
  accountName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  accountDescription: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  accountTotal: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  accountDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#2D2D44',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailLabel: {
    flex: 1,
    color: '#999',
    fontSize: 14,
    marginLeft: 10,
  },
  detailValue: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  savingsProgress: {
    marginTop: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#2D2D44',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00D4AA',
    borderRadius: 4,
  },
  progressText: {
    color: '#666',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'right',
  },
  summaryCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  summaryLabel: {
    flex: 1,
    color: '#999',
    fontSize: 14,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 14,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#2D2D44',
    marginVertical: 8,
  },
  summaryTotalLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  summaryTotalValue: {
    color: '#00D4AA',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
