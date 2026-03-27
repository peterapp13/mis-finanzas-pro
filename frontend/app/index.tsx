import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PayrollConcepts {
  salario_base: number;
  pp_pagas_extras: number;
  salario_minimo_garantizado: number;
  productividad: number;
  horas_festivas: number;
  horas_extras: number;
  plus_nocturnidad: number;
  atraso_mes_anterior: number;
  concepto_extra_1_nombre: string;
  concepto_extra_1_valor: number;
  concepto_extra_2_nombre: string;
  concepto_extra_2_valor: number;
}

const initialConcepts: PayrollConcepts = {
  salario_base: 0,
  pp_pagas_extras: 0,
  salario_minimo_garantizado: 0,
  productividad: 0,
  horas_festivas: 0,
  horas_extras: 0,
  plus_nocturnidad: 0,
  atraso_mes_anterior: 0,
  concepto_extra_1_nombre: 'Concepto Extra 1',
  concepto_extra_1_valor: 0,
  concepto_extra_2_nombre: 'Concepto Extra 2',
  concepto_extra_2_valor: 0,
};

const months = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function NominaScreen() {
  const insets = useSafeAreaInsets();
  const [concepts, setConcepts] = useState<PayrollConcepts>(initialConcepts);
  const [irpfPercentage, setIrpfPercentage] = useState('15');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isLoading, setIsLoading] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const totalDevengado = 
      concepts.salario_base +
      concepts.pp_pagas_extras +
      concepts.salario_minimo_garantizado +
      concepts.productividad +
      concepts.horas_festivas +
      concepts.horas_extras +
      concepts.plus_nocturnidad +
      concepts.atraso_mes_anterior +
      concepts.concepto_extra_1_valor +
      concepts.concepto_extra_2_valor;

    const irpf = parseFloat(irpfPercentage) || 0;
    const irpfAmount = totalDevengado * (irpf / 100);
    const ssCommon = totalDevengado * 0.047;
    const ssUnemployment = totalDevengado * 0.0155;
    const totalDeductions = irpfAmount + ssCommon + ssUnemployment;
    const liquidoPercibir = totalDevengado - totalDeductions;

    return {
      totalDevengado: totalDevengado.toFixed(2),
      irpfAmount: irpfAmount.toFixed(2),
      ssCommon: ssCommon.toFixed(2),
      ssUnemployment: ssUnemployment.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      liquidoPercibir: liquidoPercibir.toFixed(2),
    };
  }, [concepts, irpfPercentage]);

  const totals = calculateTotals();

  const handleValueChange = (field: keyof PayrollConcepts, value: string) => {
    const numValue = parseFloat(value) || 0;
    setConcepts(prev => ({ ...prev, [field]: numValue }));
  };

  const handleNameChange = (field: 'concepto_extra_1_nombre' | 'concepto_extra_2_nombre', value: string) => {
    setConcepts(prev => ({ ...prev, [field]: value }));
  };

  const handleValidarYArchivar = async () => {
    if (parseFloat(totals.totalDevengado) <= 0) {
      Alert.alert('Error', 'Introduce al menos un concepto con valor positivo');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/payroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          year: selectedYear,
          concepts: concepts,
          irpf_percentage: parseFloat(irpfPercentage) || 15,
        }),
      });

      if (response.ok) {
        Alert.alert(
          'Éxito',
          `Nómina de ${months[selectedMonth - 1]} ${selectedYear} archivada correctamente`,
          [{ text: 'OK' }]
        );
        // Reset form
        setConcepts(initialConcepts);
        setIrpfPercentage('15');
      } else {
        const error = await response.json();
        Alert.alert('Error', error.detail || 'Error al guardar la nómina');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo conectar con el servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const renderConceptInput = (
    label: string,
    field: keyof PayrollConcepts,
    isExtra: boolean = false,
    nameField?: 'concepto_extra_1_nombre' | 'concepto_extra_2_nombre'
  ) => (
    <View style={styles.inputRow}>
      {isExtra && nameField ? (
        <TextInput
          style={[styles.inputLabel, styles.editableLabel]}
          value={concepts[nameField] as string}
          onChangeText={(v) => handleNameChange(nameField, v)}
          placeholderTextColor="#666"
        />
      ) : (
        <Text style={styles.inputLabel}>{label}</Text>
      )}
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.input}
          value={concepts[field] === 0 ? '' : concepts[field].toString()}
          onChangeText={(v) => handleValueChange(field, v)}
          keyboardType="decimal-pad"
          placeholder="0.00"
          placeholderTextColor="#444"
        />
        <Text style={styles.euroSymbol}>€</Text>
      </View>
    </View>
  );

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
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Nómina</Text>
            <Text style={styles.headerSubtitle}>Simulador de Nómina</Text>
          </View>

          {/* Month/Year Selector */}
          <TouchableOpacity 
            style={styles.dateSelector}
            onPress={() => setShowMonthPicker(!showMonthPicker)}
          >
            <Ionicons name="calendar-outline" size={20} color="#00D4AA" />
            <Text style={styles.dateText}>
              {months[selectedMonth - 1]} {selectedYear}
            </Text>
            <Ionicons name={showMonthPicker ? "chevron-up" : "chevron-down"} size={20} color="#00D4AA" />
          </TouchableOpacity>

          {showMonthPicker && (
            <View style={styles.monthPickerContainer}>
              <View style={styles.yearSelector}>
                <TouchableOpacity onPress={() => setSelectedYear(y => y - 1)}>
                  <Ionicons name="chevron-back" size={24} color="#00D4AA" />
                </TouchableOpacity>
                <Text style={styles.yearText}>{selectedYear}</Text>
                <TouchableOpacity onPress={() => setSelectedYear(y => y + 1)}>
                  <Ionicons name="chevron-forward" size={24} color="#00D4AA" />
                </TouchableOpacity>
              </View>
              <View style={styles.monthGrid}>
                {months.map((month, index) => (
                  <TouchableOpacity
                    key={month}
                    style={[
                      styles.monthButton,
                      selectedMonth === index + 1 && styles.monthButtonActive
                    ]}
                    onPress={() => {
                      setSelectedMonth(index + 1);
                      setShowMonthPicker(false);
                    }}
                  >
                    <Text style={[
                      styles.monthButtonText,
                      selectedMonth === index + 1 && styles.monthButtonTextActive
                    ]}>
                      {month.substring(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Abonos Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="add-circle" size={20} color="#00D4AA" />
              <Text style={styles.sectionTitle}>Abonos</Text>
            </View>
            
            {renderConceptInput('Salario Base', 'salario_base')}
            {renderConceptInput('P.P. Pagas Extras', 'pp_pagas_extras')}
            {renderConceptInput('Salario Mínimo Garantizado', 'salario_minimo_garantizado')}
            {renderConceptInput('Productividad', 'productividad')}
            {renderConceptInput('Horas Festivas', 'horas_festivas')}
            {renderConceptInput('Horas Extras', 'horas_extras')}
            {renderConceptInput('Plus Nocturnidad', 'plus_nocturnidad')}
            {renderConceptInput('Atraso Mes Anterior', 'atraso_mes_anterior')}
            
            <View style={styles.divider} />
            
            {renderConceptInput('', 'concepto_extra_1_valor', true, 'concepto_extra_1_nombre')}
            {renderConceptInput('', 'concepto_extra_2_valor', true, 'concepto_extra_2_nombre')}
          </View>

          {/* Total Devengado */}
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>Total Devengado (Bruto)</Text>
            <Text style={styles.totalValue}>{totals.totalDevengado} €</Text>
          </View>

          {/* Deducciones Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="remove-circle" size={20} color="#FF6B6B" />
              <Text style={styles.sectionTitle}>Deducciones</Text>
            </View>

            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>IRPF (%)</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  style={styles.input}
                  value={irpfPercentage}
                  onChangeText={setIrpfPercentage}
                  keyboardType="decimal-pad"
                  placeholder="15"
                  placeholderTextColor="#444"
                />
                <Text style={styles.euroSymbol}>%</Text>
              </View>
            </View>

            <View style={styles.deductionRow}>
              <Text style={styles.deductionLabel}>IRPF ({irpfPercentage}%)</Text>
              <Text style={styles.deductionValue}>-{totals.irpfAmount} €</Text>
            </View>

            <View style={styles.deductionRow}>
              <Text style={styles.deductionLabel}>S.S. Contingencias Comunes (4.7%)</Text>
              <Text style={styles.deductionValue}>-{totals.ssCommon} €</Text>
            </View>

            <View style={styles.deductionRow}>
              <Text style={styles.deductionLabel}>S.S. Desempleo/Otros (1.55%)</Text>
              <Text style={styles.deductionValue}>-{totals.ssUnemployment} €</Text>
            </View>

            <View style={[styles.deductionRow, styles.totalDeductionRow]}>
              <Text style={styles.totalDeductionLabel}>Total Deducciones</Text>
              <Text style={styles.totalDeductionValue}>-{totals.totalDeductions} €</Text>
            </View>
          </View>

          {/* Líquido a Percibir */}
          <View style={styles.netCard}>
            <Text style={styles.netLabel}>Líquido a Percibir (Neto)</Text>
            <Text style={styles.netValue}>{totals.liquidoPercibir} €</Text>
          </View>

          {/* Validar y Archivar Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleValidarYArchivar}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#0A0A14" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#0A0A14" />
                <Text style={styles.submitButtonText}>Validar y Archivar</Text>
              </>
            )}
          </TouchableOpacity>
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
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A2E',
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  dateText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  monthPickerContainer: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  yearSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  yearText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  monthButton: {
    width: '23%',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2D2D44',
    alignItems: 'center',
  },
  monthButtonActive: {
    backgroundColor: '#00D4AA',
  },
  monthButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
  },
  monthButtonTextActive: {
    color: '#0A0A14',
    fontWeight: 'bold',
  },
  section: {
    backgroundColor: '#1A1A2E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputLabel: {
    flex: 1,
    color: '#CCCCCC',
    fontSize: 14,
  },
  editableLabel: {
    backgroundColor: '#2D2D44',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D2D44',
    borderRadius: 8,
    paddingHorizontal: 12,
    minWidth: 120,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 10,
    textAlign: 'right',
  },
  euroSymbol: {
    color: '#00D4AA',
    fontSize: 16,
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#2D2D44',
    marginVertical: 16,
  },
  deductionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deductionLabel: {
    color: '#999',
    fontSize: 13,
  },
  deductionValue: {
    color: '#FF6B6B',
    fontSize: 14,
    fontWeight: '500',
  },
  totalDeductionRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2D2D44',
  },
  totalDeductionLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  totalDeductionValue: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: 'bold',
  },
  totalCard: {
    backgroundColor: '#1A1A2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2D2D44',
  },
  totalLabel: {
    color: '#999',
    fontSize: 14,
    marginBottom: 4,
  },
  totalValue: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  netCard: {
    backgroundColor: 'rgba(0, 212, 170, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#00D4AA',
  },
  netLabel: {
    color: '#00D4AA',
    fontSize: 14,
    marginBottom: 4,
  },
  netValue: {
    color: '#00D4AA',
    fontSize: 36,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#00D4AA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  submitButtonText: {
    color: '#0A0A14',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
