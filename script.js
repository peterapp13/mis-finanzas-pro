// Version: 2025-07-28-v69
// ==================== DATA STORAGE ====================
const STORAGE_KEY = 'mis-finanzas-pro-data';
const BANKS_KEY = 'mis-finanzas-pro-banks';
const EXPENSES_KEY = 'mis-finanzas-pro-expenses';
const LOANS_KEY = 'mis-finanzas-pro-loans';
const SAVINGS_FUND_KEY = 'mis-finanzas-pro-savings-fund';
const SAVINGS_HISTORY_KEY = 'mis-finanzas-pro-savings-history';
const PIN_KEY = 'app_security_pin';
const LAST_UPDATE_KEY = 'finanzas_last_update';
const EXTRAS_STORAGE_KEY = 'mis-finanzas-extras';

// ==================== ESTADO GLOBAL Y VARIABLES DE TABS ====================
// Variable global inicial - solo se usa para inicializar los tabs al entrar con PIN
let anioGlobalActivo = new Date().getFullYear();

// Variables INTERNAS de cada tab (independientes después de la inicialización)
let anioDashboard = new Date().getFullYear();  // Año interno del Dashboard
let anioExtras = new Date().getFullYear();      // Año interno del tab Extras
let anioHistorial = new Date().getFullYear();   // Año interno del tab Historial
let anioStats = new Date().getFullYear();       // Año interno del tab Estadísticas

// ==================== PIN SECURITY SYSTEM ====================
let currentPinInput = '';

// Check security on app load
function initSecurityCheck() {
    const savedPin = localStorage.getItem(PIN_KEY);
    
    if (!savedPin) {
        // No PIN set - show setup screen
        showPinSetupScreen();
    } else {
        // PIN exists - show lock screen
        showLockScreen();
    }
}

function showPinSetupScreen() {
    document.getElementById('pin-setup-screen').classList.remove('hidden');
    document.getElementById('lock-screen').classList.add('hidden');
    hideAppContent();
}

function showLockScreen() {
    document.getElementById('lock-screen').classList.remove('hidden');
    document.getElementById('pin-setup-screen').classList.add('hidden');
    hideAppContent();
    currentPinInput = '';
    updatePinDisplay();
}

function hideAppContent() {
    // Hide tab bar and all content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.visibility = 'hidden';
    });
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) tabBar.style.visibility = 'hidden';
    const footer = document.querySelector('.author-footer');
    if (footer) footer.style.visibility = 'hidden';
}

function showAppContent() {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.visibility = 'visible';
    });
    const tabBar = document.querySelector('.tab-bar');
    if (tabBar) tabBar.style.visibility = 'visible';
    const footer = document.querySelector('.author-footer');
    if (footer) footer.style.visibility = 'visible';
    
    // Actualizar widget de Extras después de mostrar contenido
    setTimeout(() => {
        updateExtrasDashboard();
    }, 50);
}

function savePinSetup() {
    const pin1 = document.getElementById('setup-pin-1').value;
    const pin2 = document.getElementById('setup-pin-2').value;
    
    if (pin1.length !== 4) {
        alert('⚠️ El PIN debe tener 4 dígitos');
        return;
    }
    
    if (pin1 !== pin2) {
        alert('❌ Los PINs no coinciden. Inténtalo de nuevo.');
        document.getElementById('setup-pin-2').value = '';
        return;
    }
    
    // Save PIN
    localStorage.setItem(PIN_KEY, pin1);
    
    // Hide setup screen and show app
    document.getElementById('pin-setup-screen').classList.add('hidden');
    showAppContent();
    
    alert('✅ PIN configurado correctamente\n\n🔒 Tu aplicación ahora está protegida.');
}

function enterPinDigit(digit) {
    if (currentPinInput.length < 4) {
        currentPinInput += digit;
        updatePinDisplay();
        
        // Auto-verify when 4 digits entered
        if (currentPinInput.length === 4) {
            setTimeout(verifyPin, 200);
        }
    }
}

function deletePinDigit() {
    if (currentPinInput.length > 0) {
        currentPinInput = currentPinInput.slice(0, -1);
        updatePinDisplay();
    }
    // Clear error
    document.getElementById('pin-error').textContent = '';
}

function updatePinDisplay() {
    const dots = document.querySelectorAll('#pin-display .pin-dot');
    dots.forEach((dot, index) => {
        if (index < currentPinInput.length) {
            dot.style.background = 'var(--primary)';
            dot.style.borderColor = 'var(--primary)';
        } else {
            dot.style.background = 'var(--bg-input)';
            dot.style.borderColor = 'var(--text-secondary)';
        }
    });
}

function verifyPin() {
    const savedPin = localStorage.getItem(PIN_KEY);
    
    if (currentPinInput === savedPin) {
        // Correct PIN - unlock app
        document.getElementById('lock-screen').classList.add('hidden');
        showAppContent();
        currentPinInput = '';
        
        // Inicializar año global al año actual
        anioGlobalActivo = new Date().getFullYear();
        
        // Inicializar TODAS las variables internas de cada tab con el año global
        anioDashboard = anioGlobalActivo;
        anioExtras = anioGlobalActivo;
        anioHistorial = anioGlobalActivo;
        anioStats = anioGlobalActivo;
        
        // Sincronizar todos los selectores con el año global (solo una vez al iniciar)
        syncAllYearSelectors();
    } else {
        // Wrong PIN
        document.getElementById('pin-error').textContent = 'PIN incorrecto. Inténtalo de nuevo.';
        currentPinInput = '';
        updatePinDisplay();
        
        // Shake animation effect
        const display = document.getElementById('pin-display');
        display.style.animation = 'shake 0.5s';
        setTimeout(() => {
            display.style.animation = '';
        }, 500);
    }
}

// Sincronizar todos los selectores con el año global (solo se usa al iniciar sesión)
function syncAllYearSelectors() {
    const selectors = ['dashboard-year', 'historial-year', 'extras-year', 'stats-year'];
    
    selectors.forEach(id => {
        const select = document.getElementById(id);
        if (select) {
            select.value = anioGlobalActivo.toString();
        }
    });
}

// Change PIN from Settings
function showChangePinModal() {
    const currentPin = prompt('🔐 Introduce tu PIN actual (4 dígitos):');
    
    if (currentPin === null) return; // Cancelled
    
    const savedPin = localStorage.getItem(PIN_KEY);
    
    if (currentPin !== savedPin) {
        alert('❌ PIN incorrecto');
        return;
    }
    
    const newPin = prompt('🔑 Introduce el nuevo PIN (4 dígitos):');
    
    if (newPin === null) return; // Cancelled
    
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
        alert('⚠️ El PIN debe tener exactamente 4 dígitos numéricos');
        return;
    }
    
    const confirmPin = prompt('🔑 Confirma el nuevo PIN:');
    
    if (confirmPin === null) return; // Cancelled
    
    if (newPin !== confirmPin) {
        alert('❌ Los PINs no coinciden');
        return;
    }
    
    // Save new PIN
    localStorage.setItem(PIN_KEY, newPin);
    alert('✅ PIN actualizado correctamente');
}

// ==================== HARD RESET / FORGOT PIN ====================
function showHardResetModal() {
    document.getElementById('hard-reset-modal').classList.remove('hidden');
}

function hideHardResetModal() {
    document.getElementById('hard-reset-modal').classList.add('hidden');
}

function executeHardReset() {
    // Clear ALL localStorage data including Extras
    // Lista explícita de todas las claves usadas por la app
    const keysToDelete = [
        STORAGE_KEY,           // mis-finanzas-pro-data
        BANKS_KEY,             // mis-finanzas-pro-banks
        EXPENSES_KEY,          // mis-finanzas-pro-expenses
        LOANS_KEY,             // mis-finanzas-pro-loans
        SAVINGS_FUND_KEY,      // mis-finanzas-pro-savings-fund
        SAVINGS_HISTORY_KEY,   // mis-finanzas-pro-savings-history
        PIN_KEY,               // app_security_pin
        LAST_UPDATE_KEY,       // finanzas_last_update
        EXTRAS_STORAGE_KEY,    // mis-finanzas-extras
        'mis-finanzas-percentages' // Porcentajes guardados
    ];
    
    keysToDelete.forEach(key => {
        localStorage.removeItem(key);
    });
    
    // Limpiar CUALQUIER otra clave que pueda quedar
    localStorage.clear();
    
    // Reload the page - app will detect no PIN and show setup screen
    location.reload();
}

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ==================== GLOBAL CURRENCY FORMATTER ====================
// European format: 3500.5 -> "3.500,50 €" (always with thousands separator)

// Manual formatter to ensure consistent European format across all browsers
function formatEuropeanNumber(number, decimals = 2) {
    if (number === null || number === undefined || isNaN(number)) return '0,00';
    
    // Round to specified decimals
    const fixed = Number(number).toFixed(decimals);
    
    // Split into integer and decimal parts
    const parts = fixed.split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1] || '00';
    
    // Add thousands separator (.)
    const withThousands = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Combine with comma as decimal separator
    return withThousands + ',' + decimalPart;
}

function formatCurrency(number) {
    if (number === null || number === undefined || isNaN(number)) return '0,00 €';
    return formatEuropeanNumber(number, 2) + ' €';
}

function formatNumber(number) {
    if (number === null || number === undefined || isNaN(number)) return '0,00';
    return formatEuropeanNumber(number, 2);
}

// Parse European formatted number back to float
// "1.234,56" -> 1234.56
function parseEuropeanNumber(str) {
    if (!str || typeof str !== 'string') return 0;
    // Remove currency symbol and whitespace
    str = str.replace(/[€\s]/g, '').trim();
    // Remove thousands separators (dots)
    str = str.replace(/\./g, '');
    // Replace decimal comma with dot
    str = str.replace(',', '.');
    return parseFloat(str) || 0;
}

// Payroll concepts configuration
const concepts = [
    { id: 'salario_base', name: 'Salario Base', editable: false },
    { id: 'pp_pagas', name: 'P.P. Pagas Extras', editable: false },
    { id: 'horas_festivas', name: 'Horas Festivas', editable: false },
    { id: 'horas_extras', name: 'Horas Extras', editable: false },
    { id: 'productividad', name: 'Productividad', editable: false },
    { id: 'salario_minimo', name: 'Salario Mín. Garant. NC', editable: false },
    { id: 'plus_nocturnidad', name: 'Plus Nocturnidad', editable: false },
    { id: 'atraso_mes', name: 'Atraso Mes Ant', editable: false },
    { id: 'extra1', name: 'Concepto Extra 1', editable: true },
    { id: 'extra2', name: 'Concepto Extra 2', editable: true }
];

// S.S. concepts configuration
// syncWithBruto: true = auto-sync Base with Total Bruto
const ssConcepts = [
    { id: 'ss_contingencias', name: 'Contingencias Comunes', defaultPercent: 4.7, editable: false, syncWithBruto: true },
    { id: 'ss_atep', name: 'AT y EP', defaultPercent: 0.000, editable: false, syncWithBruto: false },
    { id: 'ss_desempleo', name: 'Desempleo', defaultPercent: 1.55, editable: false, syncWithBruto: true },
    { id: 'ss_formacion', name: 'Formación Profesional', defaultPercent: 0.1, editable: false, syncWithBruto: true },
    { id: 'ss_fogasa', name: 'Fondo Garantía Social (FOGASA)', defaultPercent: 0.000, editable: false, syncWithBruto: false },
    { id: 'ss_horas_fm', name: 'Horas extras fuerza mayor', defaultPercent: 2.0, editable: false, syncWithBruto: false },
    { id: 'ss_horas_nfm', name: 'Horas extras no fuerza mayor', defaultPercent: 4.7, editable: false, syncWithBruto: false },
    { id: 'ss_mei', name: 'MEI', defaultPercent: 0.15, editable: false, syncWithBruto: true },
    { id: 'ss_extra1', name: 'Concepto Extra S.S. 1', defaultPercent: 0, editable: true, syncWithBruto: false },
    { id: 'ss_extra2', name: 'Concepto Extra S.S. 2', defaultPercent: 0, editable: true, syncWithBruto: false }
];

// Track which SS Base fields have been manually edited (stops auto-sync)
const ssManuallyEdited = {};

// Persistent percentage configuration key
const CONFIG_PERCENTAGES_KEY = 'mis-finanzas-pro-config-percentages';

let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();
let statsYear = new Date().getFullYear();
let chart = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    // Security check first
    initSecurityCheck();
    
    // Sanity check - remove duplicate payroll records
    sanitizePayrollData();
    
    initPayrollTable();
    initSSTable();
    loadSavedPercentages(); // Load saved percentages from localStorage
    initMonthPicker();
    updateDateDisplay();
    initAllYearDropdowns(); // Initialize all year dropdowns (2020-2045)
    initDashboardSelectors(); // Initialize Dashboard selectors with most recent record
    updateBanksList();
    updateExpensesList();
    updateLoansList();
    updateStats();
    initExtras(); // Initialize Extras module
    initUpdateSystem(); // Initialize update system (last update date)
    registerServiceWorker();
    setupEnterKeyNavigation();
    setupAutoSelectOnFocus();
    
    // Actualizar widget de Extras al final de toda la inicialización
    // Usar setTimeout para asegurar que todos los selectores estén poblados
    setTimeout(() => {
        updateExtrasDashboard();
    }, 100);
});

// ==================== SANITY CHECK - REMOVE DUPLICATES ====================
function sanitizePayrollData() {
    const data = getData();
    if (!data || data.length === 0) return;
    
    const seen = new Map();
    const uniqueData = [];
    
    // Keep only the most recent record for each month/year combination
    data.forEach(record => {
        const key = `${record.month}-${record.year}`;
        const existing = seen.get(key);
        
        if (!existing) {
            seen.set(key, record);
            uniqueData.push(record);
        } else {
            // Keep the newer one (compare by createdAt or id)
            const existingTime = new Date(existing.createdAt || existing.id).getTime();
            const currentTime = new Date(record.createdAt || record.id).getTime();
            
            if (currentTime > existingTime) {
                // Replace with newer record
                const idx = uniqueData.indexOf(existing);
                if (idx !== -1) {
                    uniqueData[idx] = record;
                    seen.set(key, record);
                }
            }
        }
    });
    
    // Only save if we removed duplicates
    if (uniqueData.length < data.length) {
        console.log(`Sanity Check: Removed ${data.length - uniqueData.length} duplicate payroll records`);
        saveData(uniqueData);
    }
}

function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => console.log('Service Worker registered', reg.scope))
            .catch((err) => console.log('Service Worker registration failed', err));
    }
}

// ==================== PAYROLL TABLE ====================
function initPayrollTable() {
    const tbody = document.getElementById('payroll-tbody');
    tbody.innerHTML = '';
    
    concepts.forEach((concept, rowIndex) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="concept-name">
                ${concept.editable 
                    ? `<input type="text" id="${concept.id}_name" value="${concept.name}" style="width: 80px;" data-row="${rowIndex}" data-col="0">`
                    : concept.name}
            </td>
            <td><input type="number" inputmode="decimal" id="${concept.id}_unidad" placeholder="0" oninput="calculateRow('${concept.id}')" min="0" step="0.01" data-row="${rowIndex}" data-col="1"></td>
            <td><input type="number" inputmode="decimal" id="${concept.id}_precio" placeholder="0.00" oninput="calculateRow('${concept.id}')" min="0" step="0.01" data-row="${rowIndex}" data-col="2"></td>
            <td class="calculated" id="${concept.id}_abonar">0.00</td>
            <td class="deducir-cell"><input type="number" inputmode="decimal" id="${concept.id}_deducir" placeholder="0.00" oninput="calculateRow('${concept.id}')" min="0" step="0.01" data-row="${rowIndex}" data-col="3"></td>
            <td class="total-fila" id="${concept.id}_total">0.00</td>
        `;
        tbody.appendChild(row);
    });
}

function calculateRow(conceptId) {
    const unidad = parseFloat(document.getElementById(`${conceptId}_unidad`).value) || 0;
    const precio = parseFloat(document.getElementById(`${conceptId}_precio`).value) || 0;
    const deducir = parseFloat(document.getElementById(`${conceptId}_deducir`).value) || 0;
    
    const abonar = unidad * precio;
    const total = abonar - deducir;
    
    // Use European format for display (1.234,56)
    document.getElementById(`${conceptId}_abonar`).textContent = formatNumber(abonar);
    document.getElementById(`${conceptId}_total`).textContent = formatNumber(total);
    
    calculateTotals();
}

// ==================== S.S. TABLE ====================
function initSSTable() {
    const tbody = document.getElementById('ss-tbody');
    tbody.innerHTML = '';
    
    // Reset manual edit tracking
    ssConcepts.forEach(concept => {
        ssManuallyEdited[concept.id] = false;
    });
    
    ssConcepts.forEach((concept, rowIndex) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="concept-name">
                ${concept.editable 
                    ? `<input type="text" id="${concept.id}_name" value="${concept.name}" style="width: 120px;">`
                    : concept.name}
            </td>
            <td><input type="number" inputmode="decimal" id="${concept.id}_base" placeholder="0.00" 
                oninput="onSSBaseInput('${concept.id}')" 
                onfocus="onSSBaseFocus('${concept.id}')"
                min="0" step="0.01" data-ss-row="${rowIndex}" data-ss-col="0"></td>
            <td><input type="number" inputmode="decimal" id="${concept.id}_percent" value="${concept.defaultPercent}" oninput="calculateSSRow('${concept.id}')" min="0" max="100" step="0.001" data-ss-row="${rowIndex}" data-ss-col="1"></td>
            <td class="calculated" id="${concept.id}_cuota" style="color: var(--purple);">0.00</td>
        `;
        tbody.appendChild(row);
    });
}

// Track when user manually edits a synced SS Base field
function onSSBaseInput(conceptId) {
    const concept = ssConcepts.find(c => c.id === conceptId);
    if (concept && concept.syncWithBruto) {
        // Mark as manually edited to stop auto-sync
        ssManuallyEdited[conceptId] = true;
    }
    calculateSSRow(conceptId);
}

// When focusing on a synced field, we don't reset the manual flag
function onSSBaseFocus(conceptId) {
    // No action needed, just for tracking
}

function calculateSSRow(conceptId) {
    const base = parseFloat(document.getElementById(`${conceptId}_base`).value) || 0;
    const percent = parseFloat(document.getElementById(`${conceptId}_percent`).value) || 0;
    
    const cuota = base * (percent / 100);
    document.getElementById(`${conceptId}_cuota`).textContent = formatNumber(cuota);
    
    // Save percentage to localStorage for persistence
    savePercentageConfig(conceptId, percent);
    
    calculateTotals();
}

// ==================== PERSISTENT PERCENTAGES ====================
// Save percentage configuration to localStorage
function savePercentageConfig(conceptId, value) {
    const config = getPercentageConfig();
    config[conceptId] = value;
    localStorage.setItem(CONFIG_PERCENTAGES_KEY, JSON.stringify(config));
}

// Get all percentage configurations from localStorage
function getPercentageConfig() {
    const stored = localStorage.getItem(CONFIG_PERCENTAGES_KEY);
    return stored ? JSON.parse(stored) : {};
}

// Load saved percentages when initializing SS table
function loadSavedPercentages() {
    const config = getPercentageConfig();
    
    ssConcepts.forEach(concept => {
        const percentInput = document.getElementById(`${concept.id}_percent`);
        if (percentInput && config[concept.id] !== undefined) {
            percentInput.value = config[concept.id];
        }
    });
    
    // Also load IRPF retention if saved
    const irpfRetInput = document.getElementById('irpf_retencion_percent');
    if (irpfRetInput && config['irpf_retencion'] !== undefined) {
        irpfRetInput.value = config['irpf_retencion'];
    }
}

// Save IRPF retention percentage
function saveIRPFPercentage() {
    const irpfInput = document.getElementById('irpf_retencion_percent');
    if (irpfInput) {
        const value = parseFloat(irpfInput.value) || 0;
        savePercentageConfig('irpf_retencion', value);
    }
}

// ==================== CLEAR/VACIAR FUNCTION ====================
// Clears only monetary amounts, NOT percentages
function clearPayrollAmounts() {
    // Confirm before clearing
    if (!confirm('¿Vaciar todos los importes?\n\nEsto borrará las cantidades de la nómina pero mantendrá los porcentajes guardados.')) {
        return;
    }
    
    // Clear payroll table amounts (Unidad, Precio, Deducir)
    concepts.forEach(concept => {
        const unidadInput = document.getElementById(`${concept.id}_unidad`);
        const precioInput = document.getElementById(`${concept.id}_precio`);
        const deducirInput = document.getElementById(`${concept.id}_deducir`);
        
        if (unidadInput) unidadInput.value = '';
        if (precioInput) precioInput.value = '';
        if (deducirInput) deducirInput.value = '';
        
        // Reset display values
        const abonarEl = document.getElementById(`${concept.id}_abonar`);
        const totalEl = document.getElementById(`${concept.id}_total`);
        if (abonarEl) abonarEl.textContent = '0,00';
        if (totalEl) totalEl.textContent = '0,00';
    });
    
    // Clear SS table bases (but NOT percentages)
    ssConcepts.forEach(concept => {
        const baseInput = document.getElementById(`${concept.id}_base`);
        const cuotaEl = document.getElementById(`${concept.id}_cuota`);
        
        if (baseInput) baseInput.value = '';
        if (cuotaEl) cuotaEl.textContent = '0,00';
        
        // Reset manual edit tracking
        ssManuallyEdited[concept.id] = false;
    });
    
    // Clear IRPF base (but NOT percentage)
    const irpfBaseInput = document.getElementById('irpf_remuneracion');
    if (irpfBaseInput) irpfBaseInput.value = '';
    
    // Recalculate totals
    calculateTotals();
}

// Update synced SS bases when Total Bruto changes
function updateSyncedSSBases(totalBruto) {
    ssConcepts.forEach(concept => {
        if (concept.syncWithBruto && !ssManuallyEdited[concept.id]) {
            const baseInput = document.getElementById(`${concept.id}_base`);
            if (baseInput) {
                // Keep input values as simple numbers for calculation
                baseInput.value = totalBruto.toFixed(2);
                // Recalculate cuota for this row - use formatNumber for display
                const percent = parseFloat(document.getElementById(`${concept.id}_percent`).value) || 0;
                const cuota = totalBruto * (percent / 100);
                document.getElementById(`${concept.id}_cuota`).textContent = formatNumber(cuota);
            }
        }
    });
}

function calculateTotals() {
    // Calculate Total Bruto (sum of all row totals - which is Abonar - Deducir per row)
    let totalBruto = 0;
    
    concepts.forEach(concept => {
        // Parse European formatted number (1.234,56 -> 1234.56)
        const abonar = parseEuropeanNumber(document.getElementById(`${concept.id}_abonar`).textContent);
        totalBruto += abonar; // Total Bruto is sum of all "A Abonar"
    });
    
    // Update synced SS bases with new Total Bruto
    updateSyncedSSBases(totalBruto);
    
    // Get IRPF percentage (max 100%, up to 3 decimals)
    let irpfPercent = parseFloat(document.getElementById('irpf_percent').value) || 0;
    irpfPercent = Math.min(100, Math.max(0, irpfPercent)); // Clamp to 0-100
    
    // Calculate IRPF based on Total Bruto
    const irpfAmount = totalBruto * (irpfPercent / 100);
    
    // Calculate S.S. total (sum of all cuotas)
    let ssAmount = 0;
    ssConcepts.forEach(concept => {
        // Parse European formatted number (1.234,56 -> 1234.56)
        const cuota = parseEuropeanNumber(document.getElementById(`${concept.id}_cuota`).textContent);
        ssAmount += cuota;
    });
    
    // Total Deducciones = IRPF + SS
    const totalDeducciones = irpfAmount + ssAmount;
    
    // Net = Total Bruto - Total Deducciones
    const totalNeto = totalBruto - totalDeducciones;
    
    // Update IRPF Section boxes
    document.getElementById('irpf_remuneracion').value = formatCurrency(totalBruto);
    document.getElementById('irpf_retencion').textContent = formatCurrency(irpfAmount);
    
    // Update SS total
    document.getElementById('ss-total-cuota').textContent = formatCurrency(ssAmount);
    
    // Update Total Bruto display
    document.getElementById('total-bruto').textContent = formatCurrency(totalBruto);
    
    // Update RESUMEN DE TOTALES
    document.getElementById('resumen-abonar').textContent = formatCurrency(totalBruto);
    document.getElementById('resumen-deducir').textContent = '-' + formatCurrency(totalDeducciones).replace('€', '').trim() + ' €';
    document.getElementById('resumen-liquido').textContent = formatCurrency(totalNeto);
    
    return { totalBruto, irpfPercent, irpfAmount, ssAmount, totalDeducciones, totalNeto };
}

// Suggest optimal IRPF retention based on current gross salary (Aragón 2025)
function sugerirRetencionIRPF() {
    const calc = calculateTotals();
    const brutoMensual = calc.totalBruto;
    
    if (brutoMensual <= 0) {
        alert('Introduce primero los conceptos de la nómina para calcular la retención óptima.');
        return;
    }
    
    const retencionSugerida = calcularRetencionRecomendada(brutoMensual);
    const desglose = mostrarCalculoIRPF(brutoMensual);
    
    // Update the input field
    document.getElementById('irpf_percent').value = retencionSugerida.toFixed(2);
    
    // Recalculate totals with new percentage
    calculateTotals();
    
    // Show detailed breakdown to user
    const tieneReduccion = parseFloat(desglose.reduccionTrabajo) > 0;
    
    alert(`💡 Retención sugerida: ${retencionSugerida.toFixed(2)}%\n\n` +
          `📊 DESGLOSE DEL CÁLCULO:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• Bruto Anual: ${formatCurrency(desglose.brutoAnual)}\n` +
          `• Cotización SS: -${desglose.cotizacionSS} €\n` +
          `• Gastos Deducibles: -2.000 €\n` +
          `• Rendimiento Neto: ${desglose.rendimientoNeto} €\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• Reducción Trabajo: ${tieneReduccion ? '-' + desglose.reduccionTrabajo + ' €' : 'NO APLICA (>22.000€)'}\n` +
          `• Base Liquidable: ${desglose.baseLiquidable} €\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• Cuota Íntegra: ${desglose.cuotaIntegra} €\n` +
          `• Mínimo Personal: -${desglose.cuotaMinimo} €\n` +
          `• Cuota Líquida: ${desglose.cuotaLiquida} €\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `ℹ️ Situación: Soltero, sin hijos | Aragón 2025\n` +
          `⚠️ Incluye +0.5% de margen de seguridad`);
}

// ==================== TAB NAVIGATION ====================
function switchTab(tab) {
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    document.getElementById(`tab-${tab}`).classList.add('active');
    event.currentTarget.classList.add('active');
    
    if (tab === 'bancos') updateBanksList();
    if (tab === 'gastos') updateExpensesList();
    if (tab === 'prestamos') updateLoansList();
    if (tab === 'extras') {
        // Asegurar que el selector de año esté inicializado
        initExtrasYearDropdown();
        renderExtrasList();
    }
    if (tab === 'dashboard') {
        // Initialize selectors if not already done
        const monthSelect = document.getElementById('dashboard-month');
        if (!monthSelect || monthSelect.options.length === 0) {
            initDashboardSelectors();
        } else {
            updateDashboard();
        }
        updateExtrasDashboard(); // Update Extras widget in Dashboard
    }
    if (tab === 'stats') updateStats();
    if (tab === 'historial') updateHistorial();
}

// ==================== MONTH PICKER ====================
function initMonthPicker() {
    const grid = document.getElementById('month-grid');
    grid.innerHTML = '';
    months.forEach((month, i) => {
        const btn = document.createElement('button');
        btn.className = 'month-btn' + (selectedMonth === i + 1 ? ' active' : '');
        btn.textContent = month.substring(0, 3);
        btn.onclick = () => selectMonth(i + 1);
        grid.appendChild(btn);
    });
    document.getElementById('picker-year').textContent = selectedYear;
}

function toggleMonthPicker() {
    const picker = document.getElementById('month-picker');
    picker.classList.toggle('hidden');
    document.getElementById('month-chevron').style.transform = picker.classList.contains('hidden') ? '' : 'rotate(180deg)';
}

function changeYear(delta) {
    selectedYear += delta;
    document.getElementById('picker-year').textContent = selectedYear;
}

function selectMonth(month) {
    selectedMonth = month;
    initMonthPicker();
    updateDateDisplay();
    toggleMonthPicker();
}

function updateDateDisplay() {
    document.getElementById('selected-date').textContent = `${months[selectedMonth - 1]} ${selectedYear}`;
}

// ==================== SAVE PAYROLL ====================
function savePayroll() {
    const calc = calculateTotals();
    
    if (calc.totalBruto <= 0) {
        alert('Introduce al menos un concepto con valor positivo');
        return;
    }
    
    // Collect all concept data
    const conceptData = {};
    concepts.forEach(concept => {
        const nameEl = document.getElementById(`${concept.id}_name`);
        conceptData[concept.id] = {
            name: nameEl ? nameEl.value : concept.name,
            unidad: parseFloat(document.getElementById(`${concept.id}_unidad`).value) || 0,
            precio: parseFloat(document.getElementById(`${concept.id}_precio`).value) || 0,
            abonar: parseEuropeanNumber(document.getElementById(`${concept.id}_abonar`).textContent),
            deducir: parseFloat(document.getElementById(`${concept.id}_deducir`).value) || 0,
            total: parseEuropeanNumber(document.getElementById(`${concept.id}_total`).textContent)
        };
    });
    
    // Collect all SS concept data
    const ssData = {};
    ssConcepts.forEach(concept => {
        const nameEl = document.getElementById(`${concept.id}_name`);
        ssData[concept.id] = {
            name: nameEl ? nameEl.value : concept.name,
            base: parseFloat(document.getElementById(`${concept.id}_base`).value) || 0,
            percent: parseFloat(document.getElementById(`${concept.id}_percent`).value) || 0,
            cuota: parseEuropeanNumber(document.getElementById(`${concept.id}_cuota`).textContent)
        };
    });
    
    const record = {
        id: Date.now().toString(),
        month: selectedMonth,
        year: selectedYear,
        concepts: conceptData,
        ssConcepts: ssData,
        totalBruto: calc.totalBruto,
        totalNeto: calc.totalNeto,
        irpfPercent: calc.irpfPercent,
        irpfAmount: calc.irpfAmount,
        ssAmount: calc.ssAmount,
        totalDeducciones: calc.totalDeducciones,
        createdAt: new Date().toISOString()
    };
    
    // UPSERT: Check if record for this month/year already exists
    const data = getData();
    const existingIndex = data.findIndex(r => r.month === selectedMonth && r.year === selectedYear);
    
    if (existingIndex !== -1) {
        // Update existing record (keep same id for consistency)
        record.id = data[existingIndex].id;
        data[existingIndex] = record;
        alert(`Nómina de ${months[selectedMonth - 1]} ${selectedYear} actualizada correctamente`);
    } else {
        // Add new record
        data.push(record);
        alert(`Nómina de ${months[selectedMonth - 1]} ${selectedYear} archivada correctamente`);
    }
    
    saveData(data);
    resetForm();
    updateTransfers();
    updateStats();
}

function resetForm() {
    concepts.forEach(concept => {
        document.getElementById(`${concept.id}_unidad`).value = '';
        document.getElementById(`${concept.id}_precio`).value = '';
        document.getElementById(`${concept.id}_deducir`).value = '';
        document.getElementById(`${concept.id}_abonar`).textContent = '0.00';
        document.getElementById(`${concept.id}_total`).textContent = '0.00';
        
        const nameEl = document.getElementById(`${concept.id}_name`);
        if (nameEl && concept.editable) {
            nameEl.value = concept.name;
        }
    });
    
    // Reset SS table and manual edit tracking
    ssConcepts.forEach(concept => {
        ssManuallyEdited[concept.id] = false; // Reset manual edit flag
        document.getElementById(`${concept.id}_base`).value = '';
        document.getElementById(`${concept.id}_percent`).value = concept.defaultPercent;
        document.getElementById(`${concept.id}_cuota`).textContent = '0.00';
        
        const nameEl = document.getElementById(`${concept.id}_name`);
        if (nameEl && concept.editable) {
            nameEl.value = concept.name;
        }
    });
    
    document.getElementById('irpf_percent').value = '6';
    calculateTotals();
}

// ==================== DATA MANAGEMENT ====================
function getData() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getSettings() {
    // Legacy - kept for backward compatibility
    return {};
}

function saveSettingsData(settings) {
    // Legacy - kept for backward compatibility
}

// ==================== BANKS MANAGEMENT ====================
function getBanks() {
    const data = localStorage.getItem(BANKS_KEY);
    return data ? JSON.parse(data) : [];
}

function saveBanks(banks) {
    localStorage.setItem(BANKS_KEY, JSON.stringify(banks));
}

function addBank() {
    const nameInput = document.getElementById('new-bank-name');
    const name = nameInput.value.trim();
    
    if (!name) {
        alert('Introduce un nombre para el banco');
        return;
    }
    
    const banks = getBanks();
    
    // Check for duplicates
    if (banks.some(b => b.name.toLowerCase() === name.toLowerCase())) {
        alert('Ya existe un banco con ese nombre');
        return;
    }
    
    banks.push({
        id: Date.now().toString(),
        name: name
    });
    
    saveBanks(banks);
    nameInput.value = '';
    updateBanksList();
    updateBankDropdowns();
}

function editBank(id) {
    const banks = getBanks();
    const bank = banks.find(b => b.id === id);
    
    if (!bank) return;
    
    const newName = prompt('Nuevo nombre del banco:', bank.name);
    
    if (newName === null) return;
    
    const trimmedName = newName.trim();
    if (!trimmedName) {
        alert('El nombre no puede estar vacío');
        return;
    }
    
    // Check for duplicates (excluding current bank)
    if (banks.some(b => b.id !== id && b.name.toLowerCase() === trimmedName.toLowerCase())) {
        alert('Ya existe un banco con ese nombre');
        return;
    }
    
    bank.name = trimmedName;
    saveBanks(banks);
    updateBanksList();
    updateBankDropdowns();
    updateExpensesList(); // Update expenses to show new bank name
}

function deleteBank(id) {
    if (!confirm('¿Eliminar este banco? Los gastos asociados perderán el banco asignado.')) return;
    
    let banks = getBanks();
    banks = banks.filter(b => b.id !== id);
    saveBanks(banks);
    
    // Clear bank from associated expenses
    let expenses = getExpenses();
    expenses = expenses.map(e => {
        if (e.bankId === id) {
            e.bankId = '';
        }
        return e;
    });
    saveExpenses(expenses);
    
    updateBanksList();
    updateBankDropdowns();
    updateExpensesList();
}

function updateBanksList() {
    const banks = getBanks();
    const container = document.getElementById('banks-list');
    const emptyState = document.getElementById('banks-empty');
    
    if (banks.length === 0) {
        emptyState.style.display = 'block';
        // Remove any bank rows
        const existingRows = container.querySelectorAll('.bank-row');
        existingRows.forEach(row => row.remove());
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Clear existing rows
    const existingRows = container.querySelectorAll('.bank-row');
    existingRows.forEach(row => row.remove());
    
    banks.forEach(bank => {
        const row = document.createElement('div');
        row.className = 'bank-row';
        row.style.cssText = 'display: flex; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--bg-input);';
        row.innerHTML = `
            <div style="width: 40px; height: 40px; border-radius: 10px; background: var(--purple); display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                <svg width="20" height="20" fill="white" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4z"/></svg>
            </div>
            <span style="flex: 1; font-weight: 500;">${bank.name}</span>
            <button onclick="editBank('${bank.id}')" style="background: none; border: none; color: var(--primary); padding: 8px; cursor: pointer;">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button onclick="deleteBank('${bank.id}')" style="background: none; border: none; color: var(--danger); padding: 8px; cursor: pointer;">
                <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
        `;
        container.appendChild(row);
    });
}

function updateBankDropdowns() {
    const banks = getBanks();
    const dropdown = document.getElementById('expense-bank');
    
    if (!dropdown) return;
    
    // Keep the first option
    dropdown.innerHTML = '<option value="">-- Seleccionar --</option>';
    
    banks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank.id;
        option.textContent = bank.name;
        dropdown.appendChild(option);
    });
}

// ==================== EXPENSES MANAGEMENT ====================
function getExpenses() {
    const data = localStorage.getItem(EXPENSES_KEY);
    return data ? JSON.parse(data) : [];
}

function saveExpenses(expenses) {
    localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses));
}

function toggleExpenseDateInput() {
    const frequency = document.getElementById('expense-frequency').value;
    const container = document.getElementById('expense-date-container');
    
    if (frequency === 'mensual') {
        container.innerHTML = `
            <label style="color: var(--text-secondary); font-size: 12px; display: block; margin-bottom: 6px;">Día del Mes</label>
            <input type="number" id="expense-day" placeholder="1-31" min="1" max="31"
                style="width: 100%; background: var(--bg-input); border: none; border-radius: 10px; padding: 14px 16px; color: var(--text-primary); font-size: 14px; outline: none; box-sizing: border-box;">
        `;
    } else {
        container.innerHTML = `
            <label style="color: var(--text-secondary); font-size: 12px; display: block; margin-bottom: 6px;">Fecha (Día/Mes)</label>
            <div style="display: flex; gap: 8px;">
                <input type="number" id="expense-day" placeholder="Día" min="1" max="31"
                    style="flex: 1; background: var(--bg-input); border: none; border-radius: 10px; padding: 14px 12px; color: var(--text-primary); font-size: 14px; outline: none;">
                <input type="number" id="expense-month" placeholder="Mes" min="1" max="12"
                    style="flex: 1; background: var(--bg-input); border: none; border-radius: 10px; padding: 14px 12px; color: var(--text-primary); font-size: 14px; outline: none;">
            </div>
        `;
    }
}

function addExpense() {
    const name = document.getElementById('expense-name').value.trim();
    const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
    const frequency = document.getElementById('expense-frequency').value;
    const day = parseInt(document.getElementById('expense-day').value) || 1;
    const monthEl = document.getElementById('expense-month');
    const month = monthEl ? parseInt(monthEl.value) || 1 : null;
    const bankId = document.getElementById('expense-bank').value;
    const category = document.getElementById('expense-category').value;
    
    if (!name) {
        alert('Introduce un nombre para el gasto');
        return;
    }
    
    if (amount <= 0) {
        alert('Introduce un monto válido');
        return;
    }
    
    const expenses = getExpenses();
    expenses.push({
        id: Date.now().toString(),
        name: name,
        amount: amount,
        frequency: frequency,
        day: day,
        month: frequency === 'anual' ? month : null,
        bankId: bankId,
        category: category
    });
    
    saveExpenses(expenses);
    
    // Clear form
    document.getElementById('expense-name').value = '';
    document.getElementById('expense-amount').value = '';
    document.getElementById('expense-day').value = '';
    if (monthEl) monthEl.value = '';
    document.getElementById('expense-bank').value = '';
    document.getElementById('expense-category').value = 'necesidades';
    
    updateExpensesList();
}

function editExpense(id) {
    const expenses = getExpenses();
    const expense = expenses.find(e => e.id === id);
    
    if (!expense) return;
    
    const newName = prompt('Nombre del gasto:', expense.name);
    if (newName === null) return;
    
    const newAmount = prompt('Monto (€):', expense.amount);
    if (newAmount === null) return;
    
    expense.name = newName.trim() || expense.name;
    expense.amount = parseFloat(newAmount) || expense.amount;
    
    saveExpenses(expenses);
    updateExpensesList();
}

function deleteExpense(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    
    let expenses = getExpenses();
    expenses = expenses.filter(e => e.id !== id);
    saveExpenses(expenses);
    updateExpensesList();
}

function updateExpensesList() {
    const expenses = getExpenses();
    const banks = getBanks();
    const container = document.getElementById('expenses-list');
    const emptyState = document.getElementById('expenses-empty');
    
    // Update bank dropdowns
    updateBankDropdowns();
    
    if (expenses.length === 0) {
        emptyState.style.display = 'block';
        const existingRows = container.querySelectorAll('.expense-row');
        existingRows.forEach(row => row.remove());
        document.getElementById('expenses-monthly-total').textContent = formatCurrency(0);
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Clear existing rows
    const existingRows = container.querySelectorAll('.expense-row');
    existingRows.forEach(row => row.remove());
    
    let monthlyTotal = 0;
    
    expenses.forEach(expense => {
        const bank = banks.find(b => b.id === expense.bankId);
        const bankName = bank ? bank.name : 'Sin banco';
        
        // Calculate monthly equivalent
        const monthlyAmount = expense.frequency === 'anual' ? expense.amount / 12 : expense.amount;
        monthlyTotal += monthlyAmount;
        
        // Format date display
        let dateDisplay;
        if (expense.frequency === 'mensual') {
            dateDisplay = `Día ${expense.day}`;
        } else {
            dateDisplay = `${expense.day}/${expense.month || 1}`;
        }
        
        const row = document.createElement('div');
        row.className = 'expense-row';
        row.style.cssText = 'padding: 14px 0; border-bottom: 1px solid var(--bg-input);';
        row.innerHTML = `
            <div style="display: flex; align-items: center; margin-bottom: 8px;">
                <span style="flex: 1; font-weight: 600;">${expense.name}</span>
                <span style="font-size: 18px; font-weight: bold; color: var(--primary);">${formatCurrency(expense.amount)}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span style="font-size: 12px; color: var(--text-secondary); background: var(--bg-input); padding: 4px 8px; border-radius: 6px;">
                    ${expense.frequency === 'mensual' ? '📅 Mensual' : '📆 Anual'} • ${dateDisplay}
                </span>
                <span style="font-size: 12px; color: var(--purple);">🏦 ${bankName}</span>
                <div style="flex: 1;"></div>
                <button onclick="editExpense('${expense.id}')" style="background: none; border: none; color: var(--primary); padding: 4px; cursor: pointer;">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button onclick="deleteExpense('${expense.id}')" style="background: none; border: none; color: var(--danger); padding: 4px; cursor: pointer;">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
            </div>
        `;
        container.appendChild(row);
    });
    
    document.getElementById('expenses-monthly-total').textContent = formatCurrency(monthlyTotal);
}

// ==================== LOANS MANAGEMENT ====================
function getLoans() {
    const data = localStorage.getItem(LOANS_KEY);
    return data ? JSON.parse(data) : [];
}

function saveLoans(loans) {
    localStorage.setItem(LOANS_KEY, JSON.stringify(loans));
}

function showLoanForm(loanId = null) {
    const form = document.getElementById('loan-form');
    form.classList.remove('hidden');
    
    // Populate bank dropdown
    const banks = getBanks();
    const bankSelect = document.getElementById('loan-bank');
    bankSelect.innerHTML = '<option value="">-- Seleccionar --</option>';
    banks.forEach(bank => {
        const option = document.createElement('option');
        option.value = bank.id;
        option.textContent = bank.name;
        bankSelect.appendChild(option);
    });
    
    if (loanId) {
        // Edit mode
        const loans = getLoans();
        const loan = loans.find(l => l.id === loanId);
        if (loan) {
            document.getElementById('loan-description').value = loan.description;
            document.getElementById('loan-lender').value = loan.lender;
            document.getElementById('loan-bank').value = loan.bankId || '';
            document.getElementById('loan-principal').value = loan.principal;
            document.getElementById('loan-start-date').value = loan.startDate;
            document.getElementById('loan-installments').value = loan.installments;
            document.getElementById('loan-payment').value = loan.payment;
            document.getElementById('loan-edit-id').value = loanId;
            calculateLoanTotal();
        }
    } else {
        // New loan mode - clear form
        document.getElementById('loan-description').value = '';
        document.getElementById('loan-lender').value = '';
        document.getElementById('loan-bank').value = '';
        document.getElementById('loan-principal').value = '';
        document.getElementById('loan-start-date').value = '';
        document.getElementById('loan-installments').value = '';
        document.getElementById('loan-payment').value = '';
        document.getElementById('loan-edit-id').value = '';
        document.getElementById('loan-total-display').textContent = formatCurrency(0);
    }
}

function hideLoanForm() {
    document.getElementById('loan-form').classList.add('hidden');
}

function calculateLoanTotal() {
    const installments = parseInt(document.getElementById('loan-installments').value) || 0;
    const payment = parseFloat(document.getElementById('loan-payment').value) || 0;
    const total = installments * payment;
    document.getElementById('loan-total-display').textContent = formatCurrency(total);
}

function saveLoan() {
    const description = document.getElementById('loan-description').value.trim();
    const lender = document.getElementById('loan-lender').value.trim();
    const bankId = document.getElementById('loan-bank').value;
    const principal = parseFloat(document.getElementById('loan-principal').value) || 0;
    const startDate = document.getElementById('loan-start-date').value;
    const installments = parseInt(document.getElementById('loan-installments').value) || 0;
    const payment = parseFloat(document.getElementById('loan-payment').value) || 0;
    const category = document.getElementById('loan-category').value;
    const editId = document.getElementById('loan-edit-id').value;
    
    if (!description) {
        alert('Introduce una descripción');
        return;
    }
    
    if (installments <= 0 || payment <= 0) {
        alert('Introduce valores válidos para cuotas y pago');
        return;
    }
    
    const loans = getLoans();
    
    const loanData = {
        description,
        lender,
        bankId,
        principal,
        startDate,
        installments,
        payment,
        category,
        totalCost: installments * payment,
        paidOff: false
    };
    
    if (editId) {
        // Update existing
        const index = loans.findIndex(l => l.id === editId);
        if (index !== -1) {
            loanData.id = editId;
            loanData.paidOff = loans[index].paidOff;
            loanData.category = loans[index].category || category;
            loans[index] = loanData;
        }
    } else {
        // Create new
        loanData.id = Date.now().toString();
        loans.push(loanData);
    }
    
    saveLoans(loans);
    hideLoanForm();
    updateLoansList();
}

function deleteLoan(id) {
    if (!confirm('¿Eliminar este préstamo?')) return;
    
    let loans = getLoans();
    loans = loans.filter(l => l.id !== id);
    saveLoans(loans);
    updateLoansList();
}

function toggleLoanPaidOff(id) {
    const loans = getLoans();
    const loan = loans.find(l => l.id === id);
    
    if (loan) {
        loan.paidOff = !loan.paidOff;
        saveLoans(loans);
        updateLoansList();
    }
}

function calculateLoanStatus(loan) {
    if (loan.paidOff) {
        return {
            remainingInstallments: 0,
            pendingAmount: 0,
            paidInstallments: loan.installments,
            percentPaid: 100
        };
    }
    
    if (!loan.startDate) {
        return {
            remainingInstallments: loan.installments,
            pendingAmount: loan.totalCost,
            paidInstallments: 0,
            percentPaid: 0
        };
    }
    
    const startDate = new Date(loan.startDate);
    const now = new Date();
    
    // Calculate months passed
    let monthsPassed = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
    
    // If we're past the day of the month of first payment, count this month as paid
    if (now.getDate() >= startDate.getDate()) {
        monthsPassed += 1;
    }
    
    // Clamp to valid range
    const paidInstallments = Math.min(Math.max(0, monthsPassed), loan.installments);
    const remainingInstallments = loan.installments - paidInstallments;
    const pendingAmount = remainingInstallments * loan.payment;
    const percentPaid = (paidInstallments / loan.installments) * 100;
    
    return {
        remainingInstallments,
        pendingAmount,
        paidInstallments,
        percentPaid
    };
}

function updateLoansList() {
    const loans = getLoans();
    const banks = getBanks();
    const container = document.getElementById('loans-list');
    const emptyState = document.getElementById('loans-empty');
    
    if (loans.length === 0) {
        emptyState.style.display = 'block';
        const existingCards = container.querySelectorAll('.loan-card');
        existingCards.forEach(card => card.remove());
        document.getElementById('loans-total-debt').textContent = formatCurrency(0);
        document.getElementById('loans-monthly-payment').textContent = formatCurrency(0);
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Clear existing cards
    const existingCards = container.querySelectorAll('.loan-card');
    existingCards.forEach(card => card.remove());
    
    let totalDebt = 0;
    let totalMonthly = 0;
    
    loans.forEach(loan => {
        const bank = banks.find(b => b.id === loan.bankId);
        const bankName = bank ? bank.name : 'Sin banco';
        const status = calculateLoanStatus(loan);
        
        totalDebt += status.pendingAmount;
        if (!loan.paidOff && status.remainingInstallments > 0) {
            totalMonthly += loan.payment;
        }
        
        const card = document.createElement('div');
        card.className = 'loan-card card';
        card.style.cssText = loan.paidOff 
            ? 'border: 1px solid var(--primary); opacity: 0.7; margin-bottom: 16px;'
            : 'border: 1px solid var(--bg-input); margin-bottom: 16px;';
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
                <div>
                    <p style="font-size: 18px; font-weight: 600;">${loan.description}</p>
                    <p style="color: var(--text-secondary); font-size: 12px; margin-top: 2px;">${loan.lender || 'Sin prestamista'} • 🏦 ${bankName}</p>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="showLoanForm('${loan.id}')" style="background: none; border: none; color: var(--primary); padding: 4px; cursor: pointer;">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onclick="deleteLoan('${loan.id}')" style="background: none; border: none; color: var(--danger); padding: 4px; cursor: pointer;">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: var(--bg-input); border-radius: 8px; padding: 10px;">
                    <p style="color: var(--text-secondary); font-size: 10px; text-transform: uppercase;">Costo Inicial</p>
                    <p style="font-weight: 600; margin-top: 2px;">${formatCurrency(loan.principal)}</p>
                </div>
                <div style="background: var(--bg-input); border-radius: 8px; padding: 10px;">
                    <p style="color: var(--text-secondary); font-size: 10px; text-transform: uppercase;">Cuota Mensual</p>
                    <p style="font-weight: 600; margin-top: 2px;">${formatCurrency(loan.payment)}</p>
                </div>
                <div style="background: var(--bg-input); border-radius: 8px; padding: 10px;">
                    <p style="color: var(--text-secondary); font-size: 10px; text-transform: uppercase;">Total a Devolver</p>
                    <p style="font-weight: 600; margin-top: 2px;">${formatCurrency(loan.totalCost)}</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: rgba(108, 92, 231, 0.1); border-radius: 8px; padding: 12px; border: 1px solid var(--purple);">
                    <p style="color: var(--purple); font-size: 10px; text-transform: uppercase;">Cuotas Restantes</p>
                    <p style="font-size: 24px; font-weight: bold; color: var(--purple); margin-top: 4px;">${status.remainingInstallments} <span style="font-size: 12px; font-weight: normal;">de ${loan.installments}</span></p>
                </div>
                <div style="background: rgba(255, 107, 107, 0.1); border-radius: 8px; padding: 12px; border: 1px solid var(--danger);">
                    <p style="color: var(--danger); font-size: 10px; text-transform: uppercase;">Dinero Pendiente</p>
                    <p style="font-size: 24px; font-weight: bold; color: var(--danger); margin-top: 4px;">${formatCurrency(status.pendingAmount)}</p>
                </div>
            </div>
            
            <!-- Progress Bar -->
            <div style="margin-bottom: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: var(--text-secondary); font-size: 11px;">Progreso de pago</span>
                    <span style="color: var(--primary); font-size: 11px; font-weight: 600;">${status.percentPaid.toFixed(0)}%</span>
                </div>
                <div style="height: 8px; background: var(--bg-input); border-radius: 4px; overflow: hidden;">
                    <div style="height: 100%; background: ${loan.paidOff ? 'var(--primary)' : 'linear-gradient(90deg, var(--purple), var(--primary))'}; border-radius: 4px; width: ${status.percentPaid}%; transition: width 0.3s;"></div>
                </div>
            </div>
            
            <!-- Toggle Paid Off -->
            <button onclick="toggleLoanPaidOff('${loan.id}')" style="width: 100%; padding: 12px; border-radius: 10px; font-size: 14px; font-weight: 600; cursor: pointer; ${loan.paidOff 
                ? 'background: var(--primary); color: var(--bg-dark); border: none;' 
                : 'background: transparent; color: var(--primary); border: 1px solid var(--primary);'}">
                ${loan.paidOff ? '✓ Pagado Totalmente' : 'Marcar como Pagado'}
            </button>
        `;
        
        container.appendChild(card);
    });
    
    // Update summary
    document.getElementById('loans-total-debt').textContent = formatCurrency(totalDebt);
    document.getElementById('loans-monthly-payment').textContent = formatCurrency(totalMonthly);
}

// ==================== DASHBOARD ====================
function getSavingsFund() {
    const data = localStorage.getItem(SAVINGS_FUND_KEY);
    return data ? parseFloat(data) : 0;
}

function saveSavingsFund(balance) {
    localStorage.setItem(SAVINGS_FUND_KEY, balance.toString());
}

function getSavingsHistory() {
    const data = localStorage.getItem(SAVINGS_HISTORY_KEY);
    return data ? JSON.parse(data) : [];
}

function saveSavingsHistory(history) {
    localStorage.setItem(SAVINGS_HISTORY_KEY, JSON.stringify(history));
}

// ==================== DYNAMIC YEAR DROPDOWNS (2020-2045) ====================
// Global function to populate year dropdowns dynamically
// Range: 2020 to 2045, with current year selected by default
function populateYearDropdown(selectElement, selectedYear = null) {
    if (!selectElement) return;
    
    const currentYear = new Date().getFullYear();
    const startYear = 2020;
    const endYear = 2045;
    
    // Use provided year or default to current year
    const yearToSelect = selectedYear || currentYear;
    
    selectElement.innerHTML = '';
    
    // Populate years in descending order (newest first)
    for (let year = endYear; year >= startYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === yearToSelect) option.selected = true;
        selectElement.appendChild(option);
    }
}

// Initialize all year dropdowns in the app
function initAllYearDropdowns() {
    const currentYear = new Date().getFullYear();
    
    // Dashboard year selector
    const dashboardYearSelect = document.getElementById('dashboard-year');
    populateYearDropdown(dashboardYearSelect, currentYear);
    
    // Historial year selector
    const historialYearSelect = document.getElementById('historial-year');
    populateYearDropdown(historialYearSelect, currentYear);
}

function initDashboardSelectors() {
    const yearSelect = document.getElementById('dashboard-year');
    const monthSelect = document.getElementById('dashboard-month');
    
    if (!yearSelect || !monthSelect) {
        console.error('Dashboard selectors not found');
        return;
    }
    
    const currentYear = new Date().getFullYear();
    
    // SIEMPRE inicializar con el año actual
    populateYearDropdown(yearSelect, currentYear);
    
    // IMPORTANTE: Sincronizar variable interna anioDashboard con el selector
    anioDashboard = currentYear;
    
    // Populate months for current year
    updateDashboardMonthsForYear(currentYear);
    
    // Force update dashboard with selected values (graceful handling of empty data)
    updateDashboard();
    
    // Actualizar widget de Extras para que coincida con el año del Dashboard
    updateExtrasDashboard();
}

// Helper function to populate months for a specific year
function updateDashboardMonthsForYear(targetYear) {
    const monthSelect = document.getElementById('dashboard-month');
    if (!monthSelect) return;
    
    const currentYear = new Date().getFullYear();
    const targetYearInt = parseInt(targetYear);
    const data = getData();
    
    console.log('updateDashboardMonthsForYear - targetYear:', targetYearInt, 'data length:', data.length);
    
    // Filter records for target year - ensure type consistency with parseInt
    const yearRecords = data.filter(r => parseInt(r.year) === targetYearInt);
    
    console.log('Year records found:', yearRecords.length);
    
    // Clear month selector
    monthSelect.innerHTML = '';
    
    // Add "Nómina Actual" option only for current year
    if (targetYearInt === currentYear) {
        const currentOption = document.createElement('option');
        currentOption.value = 'current';
        currentOption.textContent = 'Nómina Actual';
        monthSelect.appendChild(currentOption);
    }
    
    // Sort by month descending (most recent first)
    const sortedRecords = [...yearRecords].sort((a, b) => parseInt(b.month) - parseInt(a.month));
    
    // Add months that have records
    sortedRecords.forEach(record => {
        const option = document.createElement('option');
        option.value = record.id;
        option.textContent = months[parseInt(record.month) - 1];
        monthSelect.appendChild(option);
        console.log('Added month option:', record.month, months[parseInt(record.month) - 1]);
    });
    
    // If no records and not current year, show message
    if (yearRecords.length === 0 && targetYearInt !== currentYear) {
        const emptyOption = document.createElement('option');
        emptyOption.value = 'empty';
        emptyOption.textContent = 'Sin registros';
        monthSelect.appendChild(emptyOption);
    }
}

// Solo actualiza las opciones del selector de mes (NO llama a updateDashboard)
function updateDashboardMonthsForYearOnly() {
    const yearSelect = document.getElementById('dashboard-year');
    const monthSelect = document.getElementById('dashboard-month');
    const selectedYear = parseInt(yearSelect.value);
    
    // Use helper function to populate months
    updateDashboardMonthsForYear(selectedYear);
}

// Función llamada por el botón "Actualizar" del Dashboard
function onDashboardUpdateClick() {
    const yearSelect = document.getElementById('dashboard-year');
    const selectedYear = parseInt(yearSelect.value);
    
    // Actualizar SOLO la variable interna del Dashboard (NO afecta a otros tabs)
    anioDashboard = selectedYear;
    
    try {
        // Primero actualiza las opciones del mes según el año seleccionado
        updateDashboardMonthsForYear(selectedYear);
        
        // Luego actualiza todo el Dashboard
        updateDashboard();
    } catch (e) {
        console.error('Error en updateDashboard:', e);
    }
    
    // SIEMPRE actualizar el widget de Extras (independiente de errores anteriores)
    updateExtrasDashboard();
}

// LEGACY: Mantener por compatibilidad pero ya no se usa con onchange
function updateDashboardMonths() {
    const yearSelect = document.getElementById('dashboard-year');
    const monthSelect = document.getElementById('dashboard-month');
    const selectedYear = parseInt(yearSelect.value);
    const data = getData();
    
    // Use helper function to populate months
    updateDashboardMonthsForYear(selectedYear);
    
    // Get records for selected year to find most recent
    const yearRecords = data.filter(r => parseInt(r.year) === selectedYear);
    
    // If there are records for this year, select the most recent
    if (yearRecords.length > 0) {
        const mostRecent = [...yearRecords].sort((a, b) => parseInt(b.month) - parseInt(a.month))[0];
        monthSelect.value = mostRecent.id;
    }
    
    updateDashboard();
    updateExtrasDashboard(); // Update Extras widget when year changes
}

function updateDashboard() {
    // Initialize selectors on first load
    const yearSelect = document.getElementById('dashboard-year');
    if (!yearSelect || yearSelect.options.length === 0) {
        initDashboardSelectors();
        return;
    }
    
    const monthSelect = document.getElementById('dashboard-month');
    if (!monthSelect) return;
    
    const data = getData() || []; // Graceful fallback: array vacío si no hay datos
    const selectedValue = monthSelect.value;
    
    // Get net income for selected period
    let netIncome = 0;
    let periodLabel = 'Sin datos';
    
    if (selectedValue === 'current') {
        // Get from current payroll form - parse the formatted currency
        const netoElement = document.getElementById('total-neto');
        if (netoElement) {
            const netoText = netoElement.textContent || '0';
            // Remove currency formatting: "1.234,56 €" -> 1234.56
            netIncome = parseFloat(netoText.replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')) || 0;
        }
        periodLabel = 'Nómina Actual';
    } else if (selectedValue === 'empty' || !selectedValue) {
        // Graceful handling cuando no hay valor o es vacío
        netIncome = 0;
        periodLabel = 'Sin registros';
    } else {
        // Find the record by ID
        const record = data.find(r => r.id === selectedValue);
        if (record) {
            netIncome = record.totalNeto || 0;
            periodLabel = `${months[record.month - 1]} ${record.year}`;
        }
    }
    
    document.getElementById('dashboard-net-income').textContent = formatCurrency(netIncome);
    document.getElementById('dashboard-period-label').textContent = periodLabel;
    
    // Calculate 50/30/20 rule
    const expenses = getExpenses();
    const loans = getLoans();
    
    // Calculate monthly amounts by category
    let categoryTotals = { necesidades: 0, ocio: 0, ahorro: 0 };
    
    expenses.forEach(e => {
        const monthlyAmount = e.frequency === 'anual' ? e.amount / 12 : e.amount;
        const cat = e.category || 'necesidades';
        categoryTotals[cat] = (categoryTotals[cat] || 0) + monthlyAmount;
    });
    
    loans.forEach(l => {
        if (!l.paidOff) {
            const status = calculateLoanStatus(l);
            if (status.remainingInstallments > 0) {
                const cat = l.category || 'necesidades';
                categoryTotals[cat] = (categoryTotals[cat] || 0) + l.payment;
            }
        }
    });
    
    // Update 50/30/20 display
    const targets = {
        necesidades: netIncome * 0.50,
        ocio: netIncome * 0.30,
        ahorro: netIncome * 0.20
    };
    
    // Necesidades
    document.getElementById('rule-necesidades-target').textContent = formatCurrency(targets.necesidades);
    document.getElementById('rule-necesidades-actual').textContent = formatCurrency(categoryTotals.necesidades);
    const necesidadesPercent = targets.necesidades > 0 ? (categoryTotals.necesidades / targets.necesidades) * 100 : 0;
    document.getElementById('rule-necesidades-bar').style.width = Math.min(150, necesidadesPercent) + '%';
    const necesidadesLibre = updateRuleStatus('necesidades', categoryTotals.necesidades, targets.necesidades);
    
    // Ocio
    document.getElementById('rule-ocio-target').textContent = formatCurrency(targets.ocio);
    document.getElementById('rule-ocio-actual').textContent = formatCurrency(categoryTotals.ocio);
    const ocioPercent = targets.ocio > 0 ? (categoryTotals.ocio / targets.ocio) * 100 : 0;
    document.getElementById('rule-ocio-bar').style.width = Math.min(150, ocioPercent) + '%';
    const ocioLibre = updateRuleStatus('ocio', categoryTotals.ocio, targets.ocio);
    
    // Ahorro
    document.getElementById('rule-ahorro-target').textContent = formatCurrency(targets.ahorro);
    document.getElementById('rule-ahorro-actual').textContent = formatCurrency(categoryTotals.ahorro);
    const ahorroPercent = targets.ahorro > 0 ? (categoryTotals.ahorro / targets.ahorro) * 100 : 0;
    document.getElementById('rule-ahorro-bar').style.width = Math.min(150, ahorroPercent) + '%';
    updateRuleStatus('ahorro', categoryTotals.ahorro, targets.ahorro);
    
    // Calculate Dinero Disponible (Necesidades libre + Ocio libre, EXCLUDING Ahorro)
    const dineroDisponible = Math.max(0, necesidadesLibre) + Math.max(0, ocioLibre);
    document.getElementById('dashboard-available-money').textContent = formatCurrency(dineroDisponible);
    
    // Update bank breakdown
    updateBankBreakdown();
    
    // Update annual summary
    updateAnnualSummary();
    
    // Update savings fund
    updateSavingsFundDisplay();
    
    // Update Extras widget to match the selected year
    updateExtrasDashboard();
}

function updateRuleStatus(category, actual, target) {
    const statusEl = document.getElementById(`rule-${category}-status`);
    const diff = target - actual;
    
    if (target === 0) {
        statusEl.textContent = '--';
        statusEl.style.background = 'var(--bg-card)';
        statusEl.style.color = 'var(--text-secondary)';
        return 0;
    } else if (diff >= 0) {
        statusEl.textContent = `✓ ${formatCurrency(diff).replace(' €', '€')} libre`;
        statusEl.style.background = 'rgba(0, 212, 170, 0.2)';
        statusEl.style.color = 'var(--primary)';
        return diff;
    } else {
        statusEl.textContent = `⚠ ${formatCurrency(Math.abs(diff)).replace(' €', '€')} exceso`;
        statusEl.style.background = 'rgba(255, 107, 107, 0.2)';
        statusEl.style.color = 'var(--danger)';
        return diff;
    }
}

function updateBankBreakdown() {
    const banks = getBanks();
    const expenses = getExpenses();
    const loans = getLoans();
    const container = document.getElementById('dashboard-banks-breakdown');
    
    // Protección contra null
    if (!container) return;
    
    if (banks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">No hay bancos configurados</p>';
        return;
    }
    
    container.innerHTML = '';
    
    banks.forEach(bank => {
        const bankExpenses = expenses.filter(e => e.bankId === bank.id);
        const bankLoans = loans.filter(l => l.bankId === bank.id && !l.paidOff);
        
        let total = 0;
        
        // Calculate expenses total
        bankExpenses.forEach(e => {
            const monthly = e.frequency === 'anual' ? e.amount / 12 : e.amount;
            total += monthly;
        });
        
        // Calculate active loans total
        bankLoans.forEach(l => {
            const status = calculateLoanStatus(l);
            if (status.remainingInstallments > 0) {
                total += l.payment;
            }
        });
        
        const card = document.createElement('div');
        card.style.cssText = 'background: var(--bg-input); border-radius: 10px; padding: 14px; margin-bottom: 12px;';
        
        let itemsHtml = '';
        bankExpenses.forEach(e => {
            const monthly = e.frequency === 'anual' ? e.amount / 12 : e.amount;
            itemsHtml += `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span style="color: var(--text-secondary);">${e.name}</span><span>${formatCurrency(monthly)}</span></div>`;
        });
        bankLoans.forEach(l => {
            const status = calculateLoanStatus(l);
            if (status.remainingInstallments > 0) {
                itemsHtml += `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span style="color: var(--purple);">📋 ${l.description}</span><span>${formatCurrency(l.payment)}</span></div>`;
            }
        });
        
        if (!itemsHtml) {
            itemsHtml = '<p style="color: var(--text-secondary); font-size: 12px;">Sin gastos asignados</p>';
        }
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: 600;">🏦 ${bank.name}</span>
                <span style="font-weight: bold; color: var(--primary);">${formatCurrency(total)}</span>
            </div>
            ${itemsHtml}
        `;
        
        container.appendChild(card);
    });
}

// ==================== IRPF CALCULATOR - ARAGÓN 2025 ====================
// Fórmulas OFICIALES según AEAT y Real Decreto-ley 4/2024
// Tramos Aragón 2025 + Reducción por Rendimientos del Trabajo Art. 20 LIRPF

// TRAMOS ESTATALES 2025 (porcentajes)
const TRAMOS_ESTATALES = [
    { limite: 12450, tipo: 0.095 },
    { limite: 20200, tipo: 0.12 },
    { limite: 35200, tipo: 0.15 },
    { limite: 60000, tipo: 0.185 },
    { limite: 300000, tipo: 0.225 }
];

// TRAMOS AUTONÓMICOS ARAGÓN 2025
const TRAMOS_ARAGON = [
    { limite: 13072.50, tipo: 0.095 },
    { limite: 21210, tipo: 0.12 },
    { limite: 36960, tipo: 0.15 },
    { limite: 52500, tipo: 0.185 },
    { limite: 60000, tipo: 0.205 },
    { limite: 80000, tipo: 0.23 },
    { limite: 90000, tipo: 0.24 },
    { limite: 130000, tipo: 0.25 }
];

// Constants for 2025
const GASTOS_DEDUCIBLES = 2000;      // Art. 19.2.f LIRPF
const MINIMO_PERSONAL = 5550;        // Mínimo personal (soltero, sin hijos)
const COTIZACION_SS_PERCENT = 6.35;

// Reducción por rendimientos del trabajo (Art. 20 LIRPF - RDL 4/2024)
// FÓRMULAS OFICIALES 2025:
// ≤ 14.852€: 7.302€
// 14.852,01 - 17.673,52€: 7.302 - 1,75 × (RNT - 14.852)
// 17.673,52 - 19.747,50€: 2.364,34 - 1,14 × (RNT - 17.673,52)
// > 19.747,50€: 0€
function calcularReduccionRendimientos(rendimientoNeto) {
    if (rendimientoNeto <= 0) return 0;
    
    if (rendimientoNeto <= 14852) {
        return 7302;
    }
    
    if (rendimientoNeto <= 17673.52) {
        return Math.max(0, 7302 - (1.75 * (rendimientoNeto - 14852)));
    }
    
    if (rendimientoNeto <= 19747.50) {
        return Math.max(0, 2364.34 - (1.14 * (rendimientoNeto - 17673.52)));
    }
    
    return 0;
}

// Calcular cuota por tramos
function calcularCuotaPorTramos(base, tramos) {
    if (base <= 0) return 0;
    
    let cuota = 0;
    let limiteAnterior = 0;
    
    for (const tramo of tramos) {
        if (base <= limiteAnterior) break;
        
        const baseEnTramo = Math.min(base, tramo.limite) - limiteAnterior;
        if (baseEnTramo > 0) {
            cuota += baseEnTramo * tramo.tipo;
        }
        limiteAnterior = tramo.limite;
    }
    
    // Último tramo (sin límite superior)
    const ultimoLimite = tramos[tramos.length - 1].limite;
    if (base > ultimoLimite) {
        cuota += (base - ultimoLimite) * 0.255; // Aragón: 25.5% para > 130.000€
    }
    
    return cuota;
}

// Calcular cuota IRPF total (Estatal + Autonómica)
function calcularCuotaIRPF(baseLiquidable) {
    const cuotaEstatal = calcularCuotaPorTramos(baseLiquidable, TRAMOS_ESTATALES);
    const cuotaAutonomica = calcularCuotaPorTramos(baseLiquidable, TRAMOS_ARAGON);
    return cuotaEstatal + cuotaAutonomica;
}

// Función principal para calcular la cuota real
function calcularCuotaRealAragon(brutoAnual, ssAnual) {
    // Paso 1: Rendimiento Neto del Trabajo
    const rendimientoNeto = brutoAnual - ssAnual - GASTOS_DEDUCIBLES;
    
    // Paso 2: Reducción por rendimientos del trabajo (Art. 20 LIRPF)
    const reduccion = calcularReduccionRendimientos(rendimientoNeto);
    
    // Paso 3: Base Liquidable General
    const baseLiquidableGeneral = Math.max(0, rendimientoNeto - reduccion);
    
    // Paso 4: Cuota Íntegra (Estatal + Autonómica)
    const cuotaIntegra = calcularCuotaIRPF(baseLiquidableGeneral);
    
    // Paso 5: Cuota del mínimo personal
    const cuotaMinimo = calcularCuotaIRPF(MINIMO_PERSONAL);
    
    // Paso 6: Cuota Líquida
    const cuotaLiquida = Math.max(0, cuotaIntegra - cuotaMinimo);
    
    return {
        rendimientoNeto,
        reduccion,
        baseLiquidable: baseLiquidableGeneral,
        cuotaIntegra,
        cuotaMinimo,
        cuotaLiquida
    };
}

// MAIN DYNAMIC FUNCTION: Calculate recommended IRPF retention percentage
// Fully dynamic - works for ANY income level
function calcularRetencionRecomendada(brutoMensual) {
    if (brutoMensual <= 0) return 0;
    
    // Step 1: Calculate annual gross income
    const brutoAnual = brutoMensual * 12;
    
    // Step 2: Calculate annual SS contributions (dynamic)
    const cotizacionSS = brutoAnual * (COTIZACION_SS_PERCENT / 100);
    
    // Step 3: Calculate Net Work Income (Rendimiento Neto del Trabajo)
    const rendimientoNeto = brutoAnual - cotizacionSS - GASTOS_DEDUCIBLES;
    
    // Step 4: Apply DYNAMIC reduction for work income
    // This will be 0 for incomes > 22,000€
    const reduccion = calcularReduccionRendimientos(rendimientoNeto);
    
    // Step 5: Calculate Taxable Base (Base Liquidable General)
    const baseLiquidable = Math.max(0, rendimientoNeto - reduccion);
    
    // Step 6: Calculate gross tax WITHOUT personal minimum
    const cuotaIntegraSinMinimo = calcularCuotaIRPF(baseLiquidable);
    
    // Step 7: Calculate tax credit for personal minimum
    // The minimum reduces tax, not the base
    const cuotaMinimo = calcularCuotaIRPF(Math.min(MINIMO_PERSONAL, baseLiquidable));
    
    // Step 8: Final tax (Cuota Líquida)
    const cuotaLiquida = Math.max(0, cuotaIntegraSinMinimo - cuotaMinimo);
    
    // Step 9: Calculate retention percentage over gross income
    const porcentajeRetencion = (cuotaLiquida / brutoAnual) * 100;
    
    // Minimum thresholds for retention obligation
    // Below ~15,000€ annual: generally exempt from retention
    if (brutoAnual < 15000) return 0;
    if (brutoAnual < 15500) return Math.max(0, porcentajeRetencion);
    
    // Add small safety margin (0.5%) to avoid "a pagar" situations
    const retencionConMargen = porcentajeRetencion + 0.5;
    
    // Round to 2 decimals
    return Math.round(retencionConMargen * 100) / 100;
}

// Debug function to show calculation breakdown
function mostrarCalculoIRPF(brutoMensual) {
    const brutoAnual = brutoMensual * 12;
    const cotizacionSS = brutoAnual * (COTIZACION_SS_PERCENT / 100);
    const rendimientoNeto = brutoAnual - cotizacionSS - GASTOS_DEDUCIBLES;
    const reduccion = calcularReduccionRendimientos(rendimientoNeto);
    const baseLiquidable = Math.max(0, rendimientoNeto - reduccion);
    const cuotaIntegra = calcularCuotaIRPF(baseLiquidable);
    const cuotaMinimo = calcularCuotaIRPF(Math.min(MINIMO_PERSONAL, baseLiquidable));
    const cuotaLiquida = Math.max(0, cuotaIntegra - cuotaMinimo);
    const porcentaje = calcularRetencionRecomendada(brutoMensual);
    
    return {
        brutoAnual,
        cotizacionSS: cotizacionSS.toFixed(2),
        rendimientoNeto: rendimientoNeto.toFixed(2),
        reduccionTrabajo: reduccion.toFixed(2),
        baseLiquidable: baseLiquidable.toFixed(2),
        cuotaIntegra: cuotaIntegra.toFixed(2),
        cuotaMinimo: cuotaMinimo.toFixed(2),
        cuotaLiquida: cuotaLiquida.toFixed(2),
        porcentajeRetencion: porcentaje
    };
}

// Wrapper for legacy compatibility
function calculateIRPFLegal(baseLiquidable) {
    return calcularCuotaIRPF(baseLiquidable);
}

function updateAnnualSummary() {
    // Get the selected year from the dashboard year selector
    const yearSelect = document.getElementById('dashboard-year');
    const selectedYear = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();
    
    const data = getData();
    // Filter strictly by the selected year only
    const yearData = data.filter(r => r.year === selectedYear);
    
    document.getElementById('dashboard-annual-year').textContent = selectedYear;
    
    const monthsCount = yearData.length;
    const isComplete = monthsCount === 12;
    
    // Calculate actual accumulated values
    let totalBruto = 0;
    let totalIrpfRetenido = 0;
    let totalSS = 0;
    
    yearData.forEach(r => {
        totalBruto += r.totalBruto || 0;
        totalIrpfRetenido += r.irpfAmount || 0;
        totalSS += r.ssAmount || 0;
    });
    
    // Calculate projections (average * 12) for annual values
    let proyeccionBruto = 0;
    let proyeccionSS = 0;
    let proyeccionRetenido = 0;
    
    if (monthsCount > 0) {
        const avgBruto = totalBruto / monthsCount;
        const avgSS = totalSS / monthsCount;
        const avgRetenido = totalIrpfRetenido / monthsCount;
        
        proyeccionBruto = avgBruto * 12;
        proyeccionSS = avgSS * 12;
        proyeccionRetenido = avgRetenido * 12;
    }
    
    // Determine which values to use for calculations
    const calcBruto = isComplete ? totalBruto : proyeccionBruto;
    const calcSS = isComplete ? totalSS : proyeccionSS;
    const calcRetenido = isComplete ? totalIrpfRetenido : proyeccionRetenido;
    
    // Update Bruto display (accumulated as main, projection as subtext)
    document.getElementById('dashboard-annual-bruto').textContent = formatCurrency(totalBruto);
    
    const brutoProjection = document.getElementById('dashboard-bruto-projection');
    const estimatedLabel = document.getElementById('dashboard-annual-estimated-label');
    
    if (isComplete) {
        if (brutoProjection) brutoProjection.style.display = 'none';
        if (estimatedLabel) estimatedLabel.style.display = 'none';
    } else {
        if (brutoProjection) {
            brutoProjection.textContent = `Proyección: ${formatCurrency(proyeccionBruto)}`;
            brutoProjection.style.display = 'block';
        }
        if (estimatedLabel) {
            estimatedLabel.textContent = monthsCount > 0 ? '(Estimado)' : '';
            estimatedLabel.style.display = monthsCount > 0 ? 'block' : 'none';
        }
    }
    
    // ==================== CÁLCULO IRPF ARAGÓN 2025 (CORRECTO) ====================
    // Usar la nueva función que calcula la cuota real
    const calculoIRPF = calcularCuotaRealAragon(calcBruto, calcSS);
    const irpfLegalTotal = calculoIRPF.cuotaLiquida;
    
    // Calculate Tax Return Result (Previsión Renta)
    // Positivo = A Pagar, Negativo = A Devolver
    const resultadoRenta = irpfLegalTotal - calcRetenido;
    
    // Update IRPF Retenido (accumulated as main, projection as subtext)
    document.getElementById('dashboard-annual-irpf').textContent = formatCurrency(totalIrpfRetenido);
    
    const irpfProjection = document.getElementById('dashboard-irpf-projection');
    if (irpfProjection) {
        if (isComplete) {
            irpfProjection.style.display = 'none';
        } else {
            irpfProjection.textContent = `Proy: ${formatCurrency(proyeccionRetenido)}`;
            irpfProjection.style.display = 'block';
        }
    }
    
    // Update IRPF Legal Total (Cuota Líquida Real)
    document.getElementById('dashboard-annual-irpf-legal').textContent = formatCurrency(irpfLegalTotal);
    
    const irpfLegalLabel = document.getElementById('dashboard-irpf-legal-label');
    if (irpfLegalLabel) {
        irpfLegalLabel.textContent = isComplete ? '(Definitivo)' : '(Estimado)';
    }
    
    // Update S.S. (accumulated as main, projection as subtext)
    document.getElementById('dashboard-annual-ss').textContent = formatCurrency(totalSS);
    
    const ssProjection = document.getElementById('dashboard-ss-projection');
    if (ssProjection) {
        if (isComplete) {
            ssProjection.style.display = 'none';
        } else {
            ssProjection.textContent = `Proy: ${formatCurrency(proyeccionSS)}`;
            ssProjection.style.display = 'block';
        }
    }
    
    // Update Previsión Renta / Resultado Renta
    const rentaLabel = document.getElementById('dashboard-renta-label');
    const rentaElement = document.getElementById('dashboard-renta-result');
    const rentaFormula = document.getElementById('dashboard-renta-formula');
    
    if (rentaLabel) {
        rentaLabel.textContent = isComplete ? '📋 Resultado Renta (Definitivo)' : '📋 Previsión Renta';
    }
    
    if (rentaFormula) {
        rentaFormula.style.display = isComplete ? 'none' : 'block';
    }
    
    if (rentaElement) {
        if (monthsCount === 0) {
            rentaElement.textContent = '--';
            rentaElement.style.color = 'var(--text-secondary)';
        } else if (resultadoRenta > 0.01) {
            rentaElement.textContent = `A Pagar: ${formatCurrency(resultadoRenta)}`;
            rentaElement.style.color = 'var(--danger)';
        } else if (resultadoRenta < -0.01) {
            rentaElement.textContent = `A Devolver: ${formatCurrency(Math.abs(resultadoRenta))}`;
            rentaElement.style.color = 'var(--primary)';
        } else {
            rentaElement.textContent = 'Equilibrado';
            rentaElement.style.color = 'var(--text-secondary)';
        }
    }
    
    // Update months info
    const monthsInfo = document.getElementById('dashboard-annual-months-info');
    if (monthsInfo) {
        if (monthsCount === 0) {
            monthsInfo.textContent = 'Sin datos archivados para ' + selectedYear;
        } else if (monthsCount === 1) {
            monthsInfo.textContent = 'Basado en 1 mes archivado';
        } else if (isComplete) {
            monthsInfo.textContent = '✓ Año completo (12 meses)';
        } else {
            monthsInfo.textContent = `Basado en ${monthsCount} meses archivados`;
        }
    }
}

function updateSavingsFundDisplay() {
    const balance = getSavingsFund();
    document.getElementById('savings-fund-balance').textContent = formatCurrency(balance);
    
    // Update history
    const history = getSavingsHistory();
    const container = document.getElementById('savings-fund-history');
    
    if (history.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px; text-align: center; padding: 12px;">Sin movimientos</p>';
        return;
    }
    
    container.innerHTML = '';
    
    // Show last 10 transactions
    const recent = history.slice(-10).reverse();
    recent.forEach(tx => {
        const date = new Date(tx.date);
        const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        const isDeposit = tx.type === 'deposit';
        
        const row = document.createElement('div');
        row.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bg-input);';
        row.innerHTML = `
            <div>
                <p style="font-size: 13px; font-weight: 500;">${tx.description || (isDeposit ? 'Ingreso' : 'Retiro')}</p>
                <p style="font-size: 11px; color: var(--text-secondary);">${dateStr}</p>
            </div>
            <span style="font-weight: 600; color: ${isDeposit ? 'var(--primary)' : 'var(--danger)'};">
                ${isDeposit ? '+' : '-'}${formatCurrency(tx.amount)}
            </span>
        `;
        container.appendChild(row);
    });
}

// Simplified Savings Fund with JavaScript prompt() - GLOBAL and PERSISTENT
// This fund does NOT depend on the year filter - it's your real piggy bank
function showSavingsFundModal(type) {
    const balance = getSavingsFund();
    
    if (type === 'deposit') {
        const input = prompt('💰 INGRESAR AL FONDO DE AHORRO\n\nSaldo actual: ' + formatCurrency(balance) + '\n\nIntroduce la cantidad a ingresar (€):');
        
        if (input === null) return; // User cancelled
        
        const amount = parseFloat(input.replace(',', '.')) || 0;
        
        if (amount <= 0) {
            alert('Introduce una cantidad válida mayor que 0');
            return;
        }
        
        const newBalance = balance + amount;
        saveSavingsFund(newBalance);
        
        // Add to history
        const history = getSavingsHistory();
        history.push({
            id: Date.now().toString(),
            type: 'deposit',
            amount: amount,
            description: 'Ingreso manual',
            date: new Date().toISOString()
        });
        saveSavingsHistory(history);
        
        alert('✅ Ingreso realizado\n\nNuevo saldo: ' + formatCurrency(newBalance));
        updateSavingsFundDisplay();
        
    } else {
        const input = prompt('💸 RETIRAR DEL FONDO DE AHORRO\n\nSaldo actual: ' + formatCurrency(balance) + '\n\nIntroduce la cantidad a retirar (€):');
        
        if (input === null) return; // User cancelled
        
        const amount = parseFloat(input.replace(',', '.')) || 0;
        
        if (amount <= 0) {
            alert('Introduce una cantidad válida mayor que 0');
            return;
        }
        
        if (amount > balance) {
            alert('⚠️ No hay suficiente saldo en el fondo\n\nSaldo disponible: ' + formatCurrency(balance));
            return;
        }
        
        const newBalance = balance - amount;
        saveSavingsFund(newBalance);
        
        // Add to history
        const history = getSavingsHistory();
        history.push({
            id: Date.now().toString(),
            type: 'withdraw',
            amount: amount,
            description: 'Retiro manual',
            date: new Date().toISOString()
        });
        saveSavingsHistory(history);
        
        alert('✅ Retiro realizado\n\nNuevo saldo: ' + formatCurrency(newBalance));
        updateSavingsFundDisplay();
    }
}

// Legacy modal functions - kept for backwards compatibility but no longer used
function hideSavingsFundModal() {
    const modal = document.getElementById('savings-fund-modal');
    if (modal) modal.classList.add('hidden');
}

function saveSavingsFundTransaction() {
    // Legacy - now handled directly in showSavingsFundModal
}

// ==================== STATS ====================
function changeStatsYear(delta) {
    statsYear += delta;
    document.getElementById('stats-year').textContent = statsYear;
    document.getElementById('irpf-year-label').textContent = statsYear;
    document.getElementById('empty-year').textContent = statsYear;
    updateStats();
}

function updateStats() {
    const data = getData();
    const yearData = data.filter(r => r.year === statsYear).sort((a, b) => a.month - b.month);
    
    // Calculate totals
    const totalBruto = yearData.reduce((sum, r) => sum + r.totalBruto, 0);
    const totalNeto = yearData.reduce((sum, r) => sum + r.totalNeto, 0);
    const totalIrpf = yearData.reduce((sum, r) => sum + r.irpfAmount, 0);
    
    document.getElementById('total-irpf').textContent = formatCurrency(totalIrpf);
    document.getElementById('stats-bruto').textContent = formatCurrency(totalBruto);
    document.getElementById('stats-neto').textContent = formatCurrency(totalNeto);
    
    // Update table
    if (yearData.length === 0) {
        document.getElementById('history-empty').classList.remove('hidden');
        document.getElementById('history-table').classList.add('hidden');
    } else {
        document.getElementById('history-empty').classList.add('hidden');
        document.getElementById('history-table').classList.remove('hidden');
        
        const rows = document.getElementById('history-rows');
        rows.innerHTML = '';
        yearData.forEach(r => {
            const row = document.createElement('div');
            row.className = 'table-row';
            row.innerHTML = `
                <span style="flex: 1; font-size: 13px;">${monthsShort[r.month - 1]}</span>
                <span style="flex: 1; font-size: 13px;">${formatCurrency(r.totalBruto)}</span>
                <span style="flex: 1; font-size: 13px; color: var(--primary);">${formatCurrency(r.totalNeto)}</span>
                <span style="flex: 1; font-size: 13px; color: var(--danger);">${formatCurrency(r.irpfAmount)}</span>
                <button class="delete-btn" onclick="deleteRecord('${r.id}')">🗑️</button>
            `;
            rows.appendChild(row);
        });
    }
    
    // Update chart
    updateChart(yearData);
}

function updateChart(yearData) {
    const ctx = document.getElementById('chart').getContext('2d');
    
    if (chart) chart.destroy();
    
    const labels = yearData.map(r => monthsShort[r.month - 1]);
    const brutoData = yearData.map(r => r.totalBruto);
    const netoData = yearData.map(r => r.totalNeto);
    
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Bruto',
                    data: brutoData,
                    backgroundColor: '#6C5CE7',
                    borderRadius: 4
                },
                {
                    label: 'Neto',
                    data: netoData,
                    backgroundColor: '#00D4AA',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#666' }
                },
                y: {
                    grid: { color: '#2D2D44' },
                    ticks: { color: '#666' }
                }
            }
        }
    });
}

function deleteRecord(id) {
    if (confirm('¿Estás seguro de que deseas eliminar este registro?')) {
        let data = getData();
        const originalLength = data.length;
        data = data.filter(r => r.id !== id);
        
        if (data.length < originalLength) {
            saveData(data);
            // Re-render history table and update dashboard stats
            updateStats();
            console.log(`Record ${id} deleted. Records: ${originalLength} -> ${data.length}`);
        }
    }
}

// ==================== HISTORIAL ====================
// Print historial report
function printHistorialReport() {
    const selectedYear = document.getElementById('historial-year').value;
    
    // Update print header with selected year
    const printTitle = document.getElementById('print-year-title');
    if (printTitle) {
        printTitle.textContent = `Año Fiscal: ${selectedYear}`;
    }
    
    // Ensure historial tab is active and visible before printing
    const historialTab = document.getElementById('tab-historial');
    if (historialTab) {
        // Add active class temporarily for print
        historialTab.classList.add('active');
    }
    
    // Small delay to ensure DOM is ready, then print
    setTimeout(() => {
        window.print();
    }, 100);
}

function updateHistorial() {
    const selectedYear = parseInt(document.getElementById('historial-year').value);
    const data = getData();
    const yearData = data.filter(r => r.year === selectedYear);
    
    const tbody = document.getElementById('historial-tbody');
    tbody.innerHTML = '';
    
    // Totals accumulators
    let totals = {
        salario: 0, pagas: 0, smg: 0, prod: 0, hfest: 0, chfest: 0,
        hextra: 0, chextra: 0, noct: 0, atraso: 0, ss: 0, irp: 0, bruto: 0, neto: 0
    };
    
    // Generate 12 rows (one per month)
    for (let month = 1; month <= 12; month++) {
        const record = yearData.find(r => r.month === month);
        const row = document.createElement('tr');
        
        if (record) {
            // Extract data from the saved record
            const c = record.concepts || {};
            
            const salario = c.salario_base ? c.salario_base.abonar : 0;
            const pagas = c.pp_pagas ? c.pp_pagas.abonar : 0;
            const smg = c.salario_minimo ? c.salario_minimo.abonar : 0;
            const prod = c.productividad ? c.productividad.abonar : 0;
            const hfestUds = c.horas_festivas ? c.horas_festivas.unidad : 0;
            const hfestCost = c.horas_festivas ? c.horas_festivas.abonar : 0;
            const hextraUds = c.horas_extras ? c.horas_extras.unidad : 0;
            const hextraCost = c.horas_extras ? c.horas_extras.abonar : 0;
            const noct = c.plus_nocturnidad ? c.plus_nocturnidad.abonar : 0;
            const atraso = c.atraso_mes ? c.atraso_mes.abonar : 0;
            const ss = record.ssAmount || 0;
            const irpPercent = record.irpfPercent || 0;
            const irpCost = record.irpfAmount || 0;
            const bruto = record.totalBruto || 0;
            const neto = record.totalNeto || 0;
            
            // Accumulate totals
            totals.salario += salario;
            totals.pagas += pagas;
            totals.smg += smg;
            totals.prod += prod;
            totals.hfest += hfestUds;
            totals.chfest += hfestCost;
            totals.hextra += hextraUds;
            totals.chextra += hextraCost;
            totals.noct += noct;
            totals.atraso += atraso;
            totals.ss += ss;
            totals.irp += irpCost;
            totals.bruto += bruto;
            totals.neto += neto;
            
            row.innerHTML = `
                <td style="padding: 10px 8px; font-weight: 500; color: var(--primary); position: sticky; left: 0; background: var(--bg-card); white-space: nowrap;">${monthsShort[month - 1]} ${selectedYear}</td>
                <td style="padding: 10px 6px; text-align: right;">${formatCurrency(salario)}</td>
                <td style="padding: 10px 6px; text-align: right;">${formatCurrency(pagas)}</td>
                <td style="padding: 10px 6px; text-align: right;">${formatCurrency(smg)}</td>
                <td style="padding: 10px 6px; text-align: right;">${formatCurrency(prod)}</td>
                <td style="padding: 10px 6px; text-align: right;">${hfestUds}</td>
                <td style="padding: 10px 6px; text-align: right;">${formatCurrency(hfestCost)}</td>
                <td style="padding: 10px 6px; text-align: right;">${hextraUds}</td>
                <td style="padding: 10px 6px; text-align: right;">${formatCurrency(hextraCost)}</td>
                <td style="padding: 10px 6px; text-align: right;">${formatCurrency(noct)}</td>
                <td style="padding: 10px 6px; text-align: right;">${formatCurrency(atraso)}</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--purple);">${formatCurrency(ss)}</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--danger);">${irpPercent.toFixed(2)}%</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--danger);">${formatCurrency(irpCost)}</td>
                <td style="padding: 10px 6px; text-align: right; font-weight: 600;">${formatCurrency(bruto)}</td>
                <td style="padding: 10px 6px; text-align: right; font-weight: 600; color: var(--primary);">${formatCurrency(neto)}</td>
                <td style="padding: 10px 6px; text-align: center;">
                    <button onclick="deleteHistorialRecord('${record.id}')" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 4px;" title="Eliminar">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </td>
            `;
        } else {
            // Empty row for months without data
            row.innerHTML = `
                <td style="padding: 10px 8px; font-weight: 500; color: var(--text-secondary); position: sticky; left: 0; background: var(--bg-card); white-space: nowrap;">${monthsShort[month - 1]} ${selectedYear}</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--text-secondary);">-</td>
                <td style="padding: 10px 6px;"></td>
            `;
        }
        
        row.style.borderBottom = '1px solid var(--bg-input)';
        tbody.appendChild(row);
    }
    
    // Update footer totals with formatCurrency
    document.getElementById('hist-total-salario').textContent = totals.salario > 0 ? formatCurrency(totals.salario) : '-';
    document.getElementById('hist-total-pagas').textContent = totals.pagas > 0 ? formatCurrency(totals.pagas) : '-';
    document.getElementById('hist-total-smg').textContent = totals.smg > 0 ? formatCurrency(totals.smg) : '-';
    document.getElementById('hist-total-prod').textContent = totals.prod > 0 ? formatCurrency(totals.prod) : '-';
    document.getElementById('hist-total-hfest').textContent = totals.hfest > 0 ? totals.hfest : '-';
    document.getElementById('hist-total-chfest').textContent = totals.chfest > 0 ? formatCurrency(totals.chfest) : '-';
    document.getElementById('hist-total-hextra').textContent = totals.hextra > 0 ? totals.hextra : '-';
    document.getElementById('hist-total-chextra').textContent = totals.chextra > 0 ? formatCurrency(totals.chextra) : '-';
    document.getElementById('hist-total-noct').textContent = totals.noct > 0 ? formatCurrency(totals.noct) : '-';
    document.getElementById('hist-total-atraso').textContent = totals.atraso > 0 ? formatCurrency(totals.atraso) : '-';
    document.getElementById('hist-total-ss').textContent = totals.ss > 0 ? formatCurrency(totals.ss) : '-';
    document.getElementById('hist-total-irp').textContent = totals.irp > 0 ? formatCurrency(totals.irp) : '-';
    document.getElementById('hist-total-bruto').textContent = totals.bruto > 0 ? formatCurrency(totals.bruto) : '-';
    document.getElementById('hist-total-neto').textContent = totals.neto > 0 ? formatCurrency(totals.neto) : '-';
}

// Delete record from Historial
function deleteHistorialRecord(recordId) {
    if (!confirm('¿Eliminar este registro de nómina?')) return;
    
    let data = getData();
    data = data.filter(r => r.id !== recordId);
    saveData(data);
    updateHistorial();
    updateStats();
}

// ==================== EXPORT/IMPORT ====================
function exportData() {
    const data = {
        payroll_records: getData(),
        banks: getBanks(),
        expenses: getExpenses(),
        loans: getLoans(),
        savings_fund: getSavingsFund(),
        savings_history: getSavingsHistory(),
        exported_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mis-finanzas-pro-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            
            if (confirm('Esto reemplazará todos los datos actuales. ¿Deseas continuar?')) {
                if (data.payroll_records) saveData(data.payroll_records);
                if (data.banks) saveBanks(data.banks);
                if (data.expenses) saveExpenses(data.expenses);
                if (data.loans) saveLoans(data.loans);
                if (data.savings_fund !== undefined) saveSavingsFund(data.savings_fund);
                if (data.savings_history) saveSavingsHistory(data.savings_history);
                
                updateBanksList();
                updateExpensesList();
                updateLoansList();
                updateStats();
                alert('Datos importados correctamente');
            }
        } catch (err) {
            alert('Error al leer el archivo');
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}


// ==================== FAST DATA ENTRY ====================

// Get all input fields in the payroll and SS tables in order
function getPayrollInputs() {
    const inputs = [];
    
    // Payroll table inputs
    const payrollTbody = document.getElementById('payroll-tbody');
    if (payrollTbody) {
        const rows = payrollTbody.querySelectorAll('tr');
        rows.forEach(row => {
            const rowInputs = row.querySelectorAll('input');
            rowInputs.forEach(input => inputs.push(input));
        });
    }
    
    // IRPF input
    const irpfInput = document.getElementById('irpf_percent');
    if (irpfInput) inputs.push(irpfInput);
    
    // SS table inputs
    const ssTbody = document.getElementById('ss-tbody');
    if (ssTbody) {
        const rows = ssTbody.querySelectorAll('tr');
        rows.forEach(row => {
            const rowInputs = row.querySelectorAll('input');
            rowInputs.forEach(input => inputs.push(input));
        });
    }
    
    return inputs;
}

// Setup Enter key navigation
function setupEnterKeyNavigation() {
    document.addEventListener('keydown', (e) => {
        // Only handle Enter key
        if (e.key !== 'Enter') return;
        
        // Get the active element
        const activeElement = document.activeElement;
        
        // Check if it's an input field
        if (!activeElement || activeElement.tagName !== 'INPUT') return;
        
        // Prevent form submission
        e.preventDefault();
        e.stopPropagation();
        
        // Get all payroll inputs
        const inputs = getPayrollInputs();
        
        // Find current input index
        const currentIndex = inputs.indexOf(activeElement);
        
        // If found, move to next input
        if (currentIndex !== -1 && currentIndex < inputs.length - 1) {
            const nextInput = inputs[currentIndex + 1];
            nextInput.focus();
            nextInput.select();
        } else if (currentIndex === inputs.length - 1) {
            // At the last input, blur to close keyboard
            activeElement.blur();
        }
    });
    
    // Prevent form submission on entire document
    document.addEventListener('submit', (e) => {
        e.preventDefault();
        return false;
    });
}

// Setup auto-select on focus
function setupAutoSelectOnFocus() {
    document.addEventListener('focusin', (e) => {
        const target = e.target;
        
        // Check if it's an input field
        if (target.tagName === 'INPUT' && (target.type === 'number' || target.type === 'text')) {
            // Small delay to ensure the focus is complete (especially on iOS)
            setTimeout(() => {
                target.select();
            }, 50);
        }
    });
    
    // Also handle click to select
    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName === 'INPUT' && (target.type === 'number' || target.type === 'text')) {
            target.select();
        }
    });
}

// ==================== SETTINGS - BACKUP FUNCTIONS ====================

// All localStorage keys used by the app
const ALL_STORAGE_KEYS = [
    STORAGE_KEY,           // 'mis-finanzas-pro-data' - payroll history
    BANKS_KEY,             // 'mis-finanzas-pro-banks'
    EXPENSES_KEY,          // 'mis-finanzas-pro-expenses'
    LOANS_KEY,             // 'mis-finanzas-pro-loans'
    SAVINGS_FUND_KEY,      // 'mis-finanzas-pro-savings-fund'
    SAVINGS_HISTORY_KEY    // 'mis-finanzas-pro-savings-history'
];

// Export ALL localStorage data as JSON
function exportAllData() {
    const backup = {
        version: 'v36',
        exportDate: new Date().toISOString(),
        data: {}
    };
    
    // Collect all data from localStorage
    ALL_STORAGE_KEYS.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
            try {
                // Try to parse as JSON
                backup.data[key] = JSON.parse(value);
            } catch (e) {
                // Store as raw string if not valid JSON
                backup.data[key] = value;
            }
        }
    });
    
    // Create file name with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `backup_finanzas_${dateStr}.json`;
    
    // Create blob and trigger download
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Copia de seguridad exportada\n\nArchivo: ' + fileName + '\n\nGuárdalo en iCloud Drive o Files para mantenerlo seguro.');
}

// Export payroll history to CSV for Excel (European format with semicolons)
function exportPayrollHistoryToCSV() {
    const data = getData();
    
    if (data.length === 0) {
        alert('⚠️ No hay datos de nóminas para exportar');
        return;
    }
    
    // CSV Header (semicolon separated for European Excel)
    const headers = ['Mes', 'Año', 'Bruto', 'Seguridad Social', 'IRPF', 'Neto', 'MEI', 'Base Imponible'];
    
    // Convert number to European format (dot to comma)
    const toEuropeanNumber = (num) => {
        if (num === null || num === undefined || isNaN(num)) return '0,00';
        return Number(num).toFixed(2).replace('.', ',');
    };
    
    // Build CSV rows
    const rows = data.map(record => {
        // Calculate MEI from SS data if available
        let meiAmount = 0;
        let totalSS = 0;
        
        if (record.ssConcepts) {
            Object.values(record.ssConcepts).forEach(ss => {
                totalSS += (ss.cuota || 0);
            });
            if (record.ssConcepts.ss_mei) {
                meiAmount = record.ssConcepts.ss_mei.cuota || 0;
            }
        }
        
        // Base Imponible (taxable base) = Total Bruto
        const baseImponible = record.totalBruto || 0;
        
        return [
            months[parseInt(record.month) - 1] || record.month,
            record.year,
            toEuropeanNumber(record.totalBruto),
            toEuropeanNumber(totalSS),
            toEuropeanNumber(record.irpfAmount),
            toEuropeanNumber(record.totalNeto),
            toEuropeanNumber(meiAmount),
            toEuropeanNumber(baseImponible)
        ].join(';');
    });
    
    // Sort rows by year and month (most recent first)
    data.sort((a, b) => {
        if (parseInt(a.year) !== parseInt(b.year)) return parseInt(b.year) - parseInt(a.year);
        return parseInt(b.month) - parseInt(a.month);
    });
    
    // Combine header and rows
    const csvContent = [headers.join(';'), ...rows].join('\n');
    
    // Add BOM for proper UTF-8 encoding in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Create file name with date
    const now = new Date();
    const dateStr = `${now.getFullYear()}_${String(now.getMonth() + 1).padStart(2, '0')}_${String(now.getDate()).padStart(2, '0')}`;
    const fileName = `PF_Finance_Export_${dateStr}.csv`;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('✅ Exportación CSV completada\n\nArchivo: ' + fileName + '\n\n📊 Abre con Excel para ver tus datos de nóminas.');
}

// Import data from JSON backup file
let pendingImportData = null; // Store parsed data for import

function preParseImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const backup = JSON.parse(e.target.result);
            
            // Validate backup structure
            if (!backup.data || typeof backup.data !== 'object') {
                alert('❌ Error: El archivo no tiene un formato válido');
                event.target.value = '';
                return;
            }
            
            // Store for later use
            pendingImportData = backup;
            
            // Count records in each category
            const counts = {
                nominas: 0,
                bancos: 0,
                transacciones: 0,
                prestamos: 0
            };
            
            // Count payroll records (nóminas)
            if (backup.data[STORAGE_KEY]) {
                const payrollData = Array.isArray(backup.data[STORAGE_KEY]) 
                    ? backup.data[STORAGE_KEY] 
                    : [];
                counts.nominas = payrollData.length;
            }
            
            // Count banks
            if (backup.data[BANKS_KEY]) {
                const banksData = Array.isArray(backup.data[BANKS_KEY]) 
                    ? backup.data[BANKS_KEY] 
                    : [];
                counts.bancos = banksData.length;
            }
            
            // Count transactions (expenses)
            if (backup.data[EXPENSES_KEY]) {
                const expensesData = Array.isArray(backup.data[EXPENSES_KEY]) 
                    ? backup.data[EXPENSES_KEY] 
                    : [];
                counts.transacciones = expensesData.length;
            }
            
            // Count loans
            if (backup.data[LOANS_KEY]) {
                const loansData = Array.isArray(backup.data[LOANS_KEY]) 
                    ? backup.data[LOANS_KEY] 
                    : [];
                counts.prestamos = loansData.length;
            }
            
            // Update modal UI
            document.getElementById('import-count-nominas').textContent = counts.nominas;
            document.getElementById('import-count-bancos').textContent = counts.bancos;
            document.getElementById('import-count-transacciones').textContent = counts.transacciones;
            document.getElementById('import-count-prestamos').textContent = counts.prestamos;
            
            // Show modal
            document.getElementById('import-modal').classList.remove('hidden');
            
        } catch (error) {
            alert('❌ Error al leer el archivo\n\n' + error.message);
        }
    };
    
    reader.onerror = function() {
        alert('❌ Error al leer el archivo');
    };
    
    reader.readAsText(file);
    
    // Reset file input for next use
    event.target.value = '';
}

function hideImportModal() {
    document.getElementById('import-modal').classList.add('hidden');
    pendingImportData = null;
}

function executeImport(mode) {
    if (!pendingImportData) {
        alert('❌ No hay datos para importar');
        hideImportModal();
        return;
    }
    
    const backup = pendingImportData;
    
    if (mode === 'replace') {
        // REPLACE MODE: Clear all existing data and load new
        ALL_STORAGE_KEYS.forEach(key => {
            localStorage.removeItem(key);
        });
        
        // Import new data
        Object.keys(backup.data).forEach(key => {
            const value = backup.data[key];
            if (typeof value === 'object') {
                localStorage.setItem(key, JSON.stringify(value));
            } else {
                localStorage.setItem(key, value);
            }
        });
        
        alert('✅ Datos reemplazados correctamente\n\nLa aplicación se recargará ahora.');
        
    } else if (mode === 'merge') {
        // MERGE MODE: Append new data to existing
        
        // Merge payroll records
        if (backup.data[STORAGE_KEY]) {
            const existing = getData();
            const incoming = Array.isArray(backup.data[STORAGE_KEY]) ? backup.data[STORAGE_KEY] : [];
            const merged = [...existing, ...incoming];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        }
        
        // Merge banks
        if (backup.data[BANKS_KEY]) {
            const existing = getBanks();
            const incoming = Array.isArray(backup.data[BANKS_KEY]) ? backup.data[BANKS_KEY] : [];
            const merged = [...existing, ...incoming];
            localStorage.setItem(BANKS_KEY, JSON.stringify(merged));
        }
        
        // Merge expenses/transactions
        if (backup.data[EXPENSES_KEY]) {
            const existing = getExpenses();
            const incoming = Array.isArray(backup.data[EXPENSES_KEY]) ? backup.data[EXPENSES_KEY] : [];
            const merged = [...existing, ...incoming];
            localStorage.setItem(EXPENSES_KEY, JSON.stringify(merged));
        }
        
        // Merge loans
        if (backup.data[LOANS_KEY]) {
            const existing = getLoans();
            const incoming = Array.isArray(backup.data[LOANS_KEY]) ? backup.data[LOANS_KEY] : [];
            const merged = [...existing, ...incoming];
            localStorage.setItem(LOANS_KEY, JSON.stringify(merged));
        }
        
        // For savings fund, use the imported value (don't add)
        if (backup.data[SAVINGS_FUND_KEY] !== undefined) {
            // Keep existing value unless user specifically wants to update
            // This avoids accidentally adding savings amounts
        }
        
        // Merge savings history
        if (backup.data[SAVINGS_HISTORY_KEY]) {
            const existing = getSavingsHistory();
            const incoming = Array.isArray(backup.data[SAVINGS_HISTORY_KEY]) ? backup.data[SAVINGS_HISTORY_KEY] : [];
            const merged = [...existing, ...incoming];
            localStorage.setItem(SAVINGS_HISTORY_KEY, JSON.stringify(merged));
        }
        
        alert('✅ Datos combinados correctamente\n\n⚠️ Revisa si hay duplicados.\n\nLa aplicación se recargará ahora.');
    }
    
    // Reload app to apply changes
    window.location.reload();
}

// Legacy function - kept for backwards compatibility
function importAllData(event) {
    preParseImportFile(event);
}

// Delete ALL data with double confirmation
function deleteAllData() {
    // First confirmation
    const confirm1 = confirm('⚠️ BORRAR TODOS LOS DATOS\n\n¿Estás seguro de que quieres eliminar TODOS tus datos?\n\nEsto incluye:\n• Historial de nóminas\n• Bancos\n• Transacciones\n• Préstamos\n• Fondo de ahorro\n\nEsta acción NO se puede deshacer.');
    
    if (!confirm1) return;
    
    // Second confirmation with type check
    const confirm2 = prompt('⚠️ CONFIRMACIÓN FINAL\n\nEscribe "BORRAR" para confirmar la eliminación de todos tus datos:');
    
    if (confirm2 !== 'BORRAR') {
        alert('Operación cancelada. Tus datos están a salvo.');
        return;
    }
    
    // Clear all localStorage keys
    ALL_STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
    });
    
    alert('✅ Todos los datos han sido eliminados.\n\nLa aplicación se recargará ahora.');
    
    // Reload app
    window.location.reload();
}

// ==================== MÓDULO EXTRAS (RENDIMIENTOS DEL CAPITAL) ====================
const IRPF_CAPITAL = 0.19; // 19% fijo para rendimientos del capital mobiliario

// Obtener extras del localStorage
function getExtras() {
    const data = localStorage.getItem(EXTRAS_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
}

// Guardar extras en localStorage
function saveExtras(extras) {
    localStorage.setItem(EXTRAS_STORAGE_KEY, JSON.stringify(extras));
}

// Inicializar dropdown de años para Extras
function initExtrasYearDropdown() {
    const yearSelect = document.getElementById('extras-year');
    
    if (!yearSelect) {
        console.error('Extras year select not found - will retry');
        // Reintentar después de un pequeño delay
        setTimeout(initExtrasYearDropdown, 100);
        return;
    }
    
    const currentYear = new Date().getFullYear();
    const baseStartYear = 2020;
    const baseEndYear = 2045;
    
    // Obtener años de los datos existentes
    const allExtras = getExtras() || [];
    const dataYears = new Set();
    
    allExtras.forEach(extra => {
        if (extra && extra.fecha) {
            const year = new Date(extra.fecha).getFullYear();
            dataYears.add(year);
        }
    });
    
    // Crear conjunto de todos los años (base + datos)
    const allYears = new Set();
    
    // Añadir rango base 2020-2045
    for (let year = baseStartYear; year <= baseEndYear; year++) {
        allYears.add(year);
    }
    
    // Añadir años de los datos (por si hay fuera del rango base)
    dataYears.forEach(year => allYears.add(year));
    
    // Convertir a array y ordenar descendente
    const sortedYears = Array.from(allYears).sort((a, b) => b - a);
    
    // Limpiar opciones existentes
    yearSelect.innerHTML = '';
    
    // Poblar años
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year.toString();
        option.textContent = year.toString();
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    });
    
    // Sincronizar con la variable interna anioExtras
    yearSelect.value = anioExtras.toString();
    
    console.log('Extras year dropdown initialized with', yearSelect.options.length, 'options');
}

// ==================== MODAL FUNCTIONS ====================

// Abrir modal para crear/editar
function abrirModalExtra(editId = null) {
    const modal = document.getElementById('modal-extra-overlay');
    const title = document.getElementById('modal-extra-title');
    const editIdInput = document.getElementById('extra-edit-id');
    
    if (editId) {
        // Modo edición
        title.textContent = 'Editar Ingreso Extra';
        editIdInput.value = editId;
        
        const extras = getExtras();
        const extra = extras.find(e => e.id === editId);
        
        if (extra) {
            document.getElementById('extra-fecha').value = extra.fecha;
            document.getElementById('extra-concepto').value = extra.concepto;
            document.getElementById('extra-bruto').value = extra.bruto;
            calcularExtraPreview();
        }
    } else {
        // Modo creación
        title.textContent = 'Nuevo Ingreso Extra';
        editIdInput.value = '';
        
        // Limpiar formulario
        document.getElementById('extra-fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('extra-concepto').value = '';
        document.getElementById('extra-bruto').value = '';
        calcularExtraPreview();
    }
    
    modal.classList.remove('hidden');
}

// Cerrar modal
function cerrarModalExtra(event) {
    if (event && event.target !== event.currentTarget) return;
    
    const modal = document.getElementById('modal-extra-overlay');
    modal.classList.add('hidden');
}

// Calcular preview al escribir el bruto
function calcularExtraPreview() {
    const brutoInput = document.getElementById('extra-bruto');
    const bruto = brutoInput ? (parseFloat(brutoInput.value) || 0) : 0;
    const irpf = bruto * IRPF_CAPITAL;
    const neto = bruto - irpf;
    
    const irpfPreview = document.getElementById('extra-irpf-preview');
    const netoPreview = document.getElementById('extra-neto-preview');
    
    if (irpfPreview) irpfPreview.textContent = formatCurrency(irpf);
    if (netoPreview) netoPreview.textContent = formatCurrency(neto);
}

// ==================== CRUD FUNCTIONS ====================

// CREATE / UPDATE - Guardar extra
function guardarExtra() {
    const editId = document.getElementById('extra-edit-id').value;
    const fecha = document.getElementById('extra-fecha').value;
    const concepto = document.getElementById('extra-concepto').value.trim();
    const brutoRaw = document.getElementById('extra-bruto').value;
    
    // Limpiar formato numérico
    const bruto = parseFloat(brutoRaw.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
    
    if (!fecha) {
        alert('⚠️ Por favor, selecciona una fecha.');
        return;
    }
    
    if (!concepto) {
        alert('⚠️ Por favor, introduce un concepto.');
        return;
    }
    
    if (bruto <= 0) {
        alert('⚠️ El importe bruto debe ser mayor que 0.');
        return;
    }
    
    const irpf = bruto * IRPF_CAPITAL;
    const neto = bruto - irpf;
    
    let extras = getExtras();
    
    if (editId) {
        // UPDATE - Editar existente
        const index = extras.findIndex(e => e.id === editId);
        if (index !== -1) {
            extras[index] = {
                ...extras[index],
                fecha,
                concepto,
                bruto,
                irpf,
                neto,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // CREATE - Nuevo registro
        const nuevoExtra = {
            id: Date.now().toString(),
            fecha,
            concepto,
            bruto,
            irpf,
            neto,
            createdAt: new Date().toISOString()
        };
        extras.push(nuevoExtra);
    }
    
    saveExtras(extras);
    
    // Cerrar modal
    cerrarModalExtra();
    
    // Actualizar UI
    actualizarExtrasVista();
    updateExtrasDashboard();
}

// DELETE - Eliminar extra
function eliminarExtra(id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este ingreso extra?')) {
        return;
    }
    
    let extras = getExtras();
    extras = extras.filter(e => e.id !== id);
    saveExtras(extras);
    
    // Actualizar UI
    actualizarExtrasVista();
    updateExtrasDashboard();
}

// ==================== RENDER FUNCTIONS ====================

// Actualizar vista de Extras (llamado por botón "Actualizar" de Extras)
function actualizarExtrasVista() {
    // Leer el año del selector de Extras y actualizar SOLO anioExtras (independiente)
    const yearSelect = document.getElementById('extras-year');
    
    if (yearSelect && yearSelect.value) {
        anioExtras = parseInt(yearSelect.value) || new Date().getFullYear();
    }
    
    // NO sincronizar con otros tabs - cada tab es independiente
    renderExtrasList();
}

// Renderizar lista de extras (usa anioExtras - variable interna del tab)
function renderExtrasList() {
    const container = document.getElementById('extras-list');
    const summaryYear = document.getElementById('extras-summary-year');
    const countEl = document.getElementById('extras-count');
    const totalBrutoEl = document.getElementById('extras-total-bruto');
    const totalIrpfEl = document.getElementById('extras-total-irpf');
    const totalNetoEl = document.getElementById('extras-total-neto');
    
    if (!container) return;
    
    const allExtras = getExtras() || [];
    
    // USAR anioExtras (variable interna del tab Extras)
    const yearToFilter = anioExtras;
    
    // Filtrar por año del tab Extras
    const extras = allExtras.filter(extra => {
        if (!extra || !extra.fecha) return false;
        const extraYear = new Date(extra.fecha).getFullYear();
        return extraYear === yearToFilter;
    });
    
    // Actualizar resumen
    if (summaryYear) summaryYear.textContent = yearToFilter;
    if (countEl) countEl.textContent = extras.length;
    
    // Calcular totales
    let totalBruto = 0;
    let totalIrpf = 0;
    let totalNeto = 0;
    
    extras.forEach(extra => {
        totalBruto += extra.bruto || 0;
        totalIrpf += extra.irpf || 0;
        totalNeto += extra.neto || 0;
    });
    
    if (totalBrutoEl) totalBrutoEl.textContent = formatCurrency(totalBruto);
    if (totalIrpfEl) totalIrpfEl.textContent = formatCurrency(totalIrpf);
    if (totalNetoEl) totalNetoEl.textContent = formatCurrency(totalNeto);
    
    // Renderizar lista
    if (extras.length === 0) {
        container.innerHTML = `
            <div style="padding: 40px 20px; text-align: center;">
                <svg width="48" height="48" fill="var(--text-secondary)" style="opacity: 0.3; margin-bottom: 12px;" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z"/><path fill-rule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clip-rule="evenodd"/></svg>
                <p style="color: var(--text-secondary); font-size: 14px;">No hay registros en ${yearToFilter}</p>
                <p style="color: var(--text-secondary); font-size: 12px; opacity: 0.7;">Pulsa el botón (+) para añadir</p>
            </div>
        `;
        return;
    }
    
    // Ordenar por fecha (más reciente primero)
    extras.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    let html = '';
    
    extras.forEach(extra => {
        const fechaFormateada = new Date(extra.fecha).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
        
        html += `
            <div class="extras-item">
                <div class="extras-item-info">
                    <div class="extras-item-concept">${extra.concepto || 'Sin concepto'}</div>
                    <div class="extras-item-date">${fechaFormateada}</div>
                </div>
                <div class="extras-item-amounts">
                    <div class="extras-item-neto">${formatCurrency(extra.neto || 0)}</div>
                    <div class="extras-item-details">Bruto: ${formatCurrency(extra.bruto || 0)} | IRPF: ${formatCurrency(extra.irpf || 0)}</div>
                </div>
                <div class="extras-item-actions">
                    <button class="extras-action-btn edit" onclick="abrirModalExtra('${extra.id}')" title="Editar">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/></svg>
                    </button>
                    <button class="extras-action-btn delete" onclick="eliminarExtra('${extra.id}')" title="Eliminar">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/></svg>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// LEGACY: Mantener para compatibilidad (ahora llama a renderExtrasList)
function renderExtrasHistorial() {
    actualizarExtrasVista();
}

// Actualizar widget de Extras en el Dashboard
function updateExtrasDashboard() {
    const allExtras = getExtras() || [];
    
    // Leer el año DIRECTAMENTE del selector del Dashboard (igual que updateAnnualSummary)
    const yearSelect = document.getElementById('dashboard-year');
    const yearToFilter = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();
    
    // Filtrar extras por año del Dashboard
    const extras = allExtras.filter(extra => {
        if (!extra || !extra.fecha) return false;
        const extraYear = new Date(extra.fecha).getFullYear();
        return extraYear === yearToFilter;
    });
    
    let totalBruto = 0;
    let totalIrpf = 0;
    let totalNeto = 0;
    
    extras.forEach(extra => {
        totalBruto += extra.bruto || 0;
        totalIrpf += extra.irpf || 0;
        totalNeto += extra.neto || 0;
    });
    
    // Actualizar año mostrado en el widget
    const yearLabel = document.getElementById('extras-dashboard-year');
    if (yearLabel) yearLabel.textContent = yearToFilter;
    
    // Actualizar valores
    const brutoEl = document.getElementById('extras-bruto-total');
    const irpfEl = document.getElementById('extras-irpf-total');
    const netoEl = document.getElementById('extras-neto-total');
    
    if (brutoEl) brutoEl.textContent = formatCurrency(totalBruto);
    if (irpfEl) irpfEl.textContent = formatCurrency(totalIrpf);
    if (netoEl) netoEl.textContent = formatCurrency(totalNeto);
}

// Inicializar Extras al cargar la app
function initExtras() {
    // Inicializar selector de año
    initExtrasYearDropdown();
    
    // Renderizar lista (NO llamar updateExtrasDashboard aquí porque 
    // initDashboardSelectors() ya lo hace después de poblar el selector)
    actualizarExtrasVista();
}

// ==================== SISTEMA DE ACTUALIZACIÓN PWA ====================

// Obtener fecha de última actualización
function getLastUpdateDate() {
    const stored = localStorage.getItem(LAST_UPDATE_KEY);
    if (stored) {
        return new Date(stored);
    }
    // Si no hay fecha guardada, guardar la actual
    const now = new Date();
    localStorage.setItem(LAST_UPDATE_KEY, now.toISOString());
    return now;
}

// Formatear fecha de forma amigable (estilo español)
function formatUpdateDate(date) {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} a las ${hours}:${minutes}`;
}

// Actualizar la etiqueta de última actualización en la UI
function updateLastUpdateLabel() {
    const label = document.getElementById('last-update-date');
    if (label) {
        const lastUpdate = getLastUpdateDate();
        label.textContent = formatUpdateDate(lastUpdate);
    }
}

// Buscar actualización (Hard Reload PWA)
async function buscarActualizacion() {
    try {
        // 1. Actualizar fecha en localStorage
        const now = new Date();
        localStorage.setItem(LAST_UPDATE_KEY, now.toISOString());
        
        // 2. Mostrar mensaje de actualización
        const updateStatus = document.getElementById('update-status');
        if (updateStatus) {
            updateStatus.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px; color: var(--primary);">
                    <svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20" style="animation: spin 1s linear infinite;">
                        <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
                    </svg>
                    <span style="font-size: 13px; font-weight: 500;">Descargando nueva versión...</span>
                </div>
            `;
        }
        
        // 3. Desregistrar Service Workers
        if ('serviceWorker' in navigator) {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (const registration of registrations) {
                await registration.unregister();
            }
            console.log('Service Workers desregistrados');
        }
        
        // 4. Limpiar todas las cachés
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('Cachés limpiadas');
        }
        
        // 5. Esperar un momento para que el usuario vea el mensaje
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 6. Forzar recarga completa
        window.location.reload(true);
        
    } catch (error) {
        console.error('Error al actualizar:', error);
        alert('⚠️ Error al buscar actualización. Intenta de nuevo.');
    }
}

// Inicializar sistema de actualización
function initUpdateSystem() {
    updateLastUpdateLabel();
}
