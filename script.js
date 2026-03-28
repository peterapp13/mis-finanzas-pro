// Version: 2025-07-28-v14
// ==================== DATA STORAGE ====================
const STORAGE_KEY = 'mis-finanzas-pro-data';
const BANKS_KEY = 'mis-finanzas-pro-banks';
const EXPENSES_KEY = 'mis-finanzas-pro-expenses';
const LOANS_KEY = 'mis-finanzas-pro-loans';
const SAVINGS_FUND_KEY = 'mis-finanzas-pro-savings-fund';
const SAVINGS_HISTORY_KEY = 'mis-finanzas-pro-savings-history';

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const monthsShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

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
    { id: 'ss_mei', name: 'MEI', defaultPercent: 0.12, editable: false, syncWithBruto: true },
    { id: 'ss_extra1', name: 'Concepto Extra S.S. 1', defaultPercent: 0, editable: true, syncWithBruto: false },
    { id: 'ss_extra2', name: 'Concepto Extra S.S. 2', defaultPercent: 0, editable: true, syncWithBruto: false }
];

// Track which SS Base fields have been manually edited (stops auto-sync)
const ssManuallyEdited = {};

let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();
let statsYear = new Date().getFullYear();
let chart = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initPayrollTable();
    initSSTable();
    initMonthPicker();
    updateDateDisplay();
    updateBanksList();
    updateExpensesList();
    updateLoansList();
    updateStats();
    registerServiceWorker();
    setupEnterKeyNavigation();
    setupAutoSelectOnFocus();
});

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
    
    document.getElementById(`${conceptId}_abonar`).textContent = abonar.toFixed(2);
    document.getElementById(`${conceptId}_total`).textContent = total.toFixed(2);
    
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
    document.getElementById(`${conceptId}_cuota`).textContent = cuota.toFixed(2);
    
    calculateTotals();
}

// Update synced SS bases when Total Bruto changes
function updateSyncedSSBases(totalBruto) {
    ssConcepts.forEach(concept => {
        if (concept.syncWithBruto && !ssManuallyEdited[concept.id]) {
            const baseInput = document.getElementById(`${concept.id}_base`);
            if (baseInput) {
                baseInput.value = totalBruto.toFixed(2);
                // Recalculate cuota for this row
                const percent = parseFloat(document.getElementById(`${concept.id}_percent`).value) || 0;
                const cuota = totalBruto * (percent / 100);
                document.getElementById(`${concept.id}_cuota`).textContent = cuota.toFixed(2);
            }
        }
    });
}

function calculateTotals() {
    // Calculate Total Bruto (sum of all row totals - which is Abonar - Deducir per row)
    let totalBruto = 0;
    
    concepts.forEach(concept => {
        const abonar = parseFloat(document.getElementById(`${concept.id}_abonar`).textContent) || 0;
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
        const cuota = parseFloat(document.getElementById(`${concept.id}_cuota`).textContent) || 0;
        ssAmount += cuota;
    });
    
    // Total Deducciones = IRPF + SS
    const totalDeducciones = irpfAmount + ssAmount;
    
    // Net = Total Bruto - Total Deducciones
    const totalNeto = totalBruto - totalDeducciones;
    
    // Update IRPF Section boxes
    document.getElementById('irpf_remuneracion').value = totalBruto.toFixed(2) + ' €';
    document.getElementById('irpf_retencion').textContent = irpfAmount.toFixed(2) + ' €';
    
    // Update SS total
    document.getElementById('ss-total-cuota').textContent = ssAmount.toFixed(2) + ' €';
    
    // Update Total Bruto display
    document.getElementById('total-bruto').textContent = totalBruto.toFixed(2) + ' €';
    
    // Update RESUMEN DE TOTALES
    document.getElementById('resumen-abonar').textContent = totalBruto.toFixed(2) + ' €';
    document.getElementById('resumen-deducir').textContent = '-' + totalDeducciones.toFixed(2) + ' €';
    document.getElementById('resumen-liquido').textContent = totalNeto.toFixed(2) + ' €';
    
    return { totalBruto, irpfPercent, irpfAmount, ssAmount, totalDeducciones, totalNeto };
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
    if (tab === 'dashboard') updateDashboard();
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
            abonar: parseFloat(document.getElementById(`${concept.id}_abonar`).textContent) || 0,
            deducir: parseFloat(document.getElementById(`${concept.id}_deducir`).value) || 0,
            total: parseFloat(document.getElementById(`${concept.id}_total`).textContent) || 0
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
            cuota: parseFloat(document.getElementById(`${concept.id}_cuota`).textContent) || 0
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
    
    const data = getData();
    data.push(record);
    saveData(data);
    
    alert(`Nómina de ${months[selectedMonth - 1]} ${selectedYear} archivada correctamente`);
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
        document.getElementById('expenses-monthly-total').textContent = '0.00 €';
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
                <span style="font-size: 18px; font-weight: bold; color: var(--primary);">${expense.amount.toFixed(2)} €</span>
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
    
    document.getElementById('expenses-monthly-total').textContent = monthlyTotal.toFixed(2) + ' €';
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
        document.getElementById('loan-total-display').textContent = '0.00 €';
    }
}

function hideLoanForm() {
    document.getElementById('loan-form').classList.add('hidden');
}

function calculateLoanTotal() {
    const installments = parseInt(document.getElementById('loan-installments').value) || 0;
    const payment = parseFloat(document.getElementById('loan-payment').value) || 0;
    const total = installments * payment;
    document.getElementById('loan-total-display').textContent = total.toFixed(2) + ' €';
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
        document.getElementById('loans-total-debt').textContent = '0.00 €';
        document.getElementById('loans-monthly-payment').textContent = '0.00 €';
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
                    <p style="font-weight: 600; margin-top: 2px;">${loan.principal.toFixed(2)} €</p>
                </div>
                <div style="background: var(--bg-input); border-radius: 8px; padding: 10px;">
                    <p style="color: var(--text-secondary); font-size: 10px; text-transform: uppercase;">Cuota Mensual</p>
                    <p style="font-weight: 600; margin-top: 2px;">${loan.payment.toFixed(2)} €</p>
                </div>
                <div style="background: var(--bg-input); border-radius: 8px; padding: 10px;">
                    <p style="color: var(--text-secondary); font-size: 10px; text-transform: uppercase;">Total a Devolver</p>
                    <p style="font-weight: 600; margin-top: 2px;">${loan.totalCost.toFixed(2)} €</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
                <div style="background: rgba(108, 92, 231, 0.1); border-radius: 8px; padding: 12px; border: 1px solid var(--purple);">
                    <p style="color: var(--purple); font-size: 10px; text-transform: uppercase;">Cuotas Restantes</p>
                    <p style="font-size: 24px; font-weight: bold; color: var(--purple); margin-top: 4px;">${status.remainingInstallments} <span style="font-size: 12px; font-weight: normal;">de ${loan.installments}</span></p>
                </div>
                <div style="background: rgba(255, 107, 107, 0.1); border-radius: 8px; padding: 12px; border: 1px solid var(--danger);">
                    <p style="color: var(--danger); font-size: 10px; text-transform: uppercase;">Dinero Pendiente</p>
                    <p style="font-size: 24px; font-weight: bold; color: var(--danger); margin-top: 4px;">${status.pendingAmount.toFixed(2)} €</p>
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
    document.getElementById('loans-total-debt').textContent = totalDebt.toFixed(2) + ' €';
    document.getElementById('loans-monthly-payment').textContent = totalMonthly.toFixed(2) + ' €';
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

function initDashboardSelectors() {
    const yearSelect = document.getElementById('dashboard-year');
    const data = getData();
    const currentYear = new Date().getFullYear();
    
    // Get unique years from data
    const years = [...new Set(data.map(r => r.year))];
    if (!years.includes(currentYear)) years.push(currentYear);
    years.sort((a, b) => b - a);
    
    yearSelect.innerHTML = '';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    });
    
    updateDashboardMonths();
}

function updateDashboardMonths() {
    const yearSelect = document.getElementById('dashboard-year');
    const monthSelect = document.getElementById('dashboard-month');
    const selectedYear = parseInt(yearSelect.value);
    const data = getData();
    
    // Filter records for selected year
    const yearRecords = data.filter(r => r.year === selectedYear);
    
    monthSelect.innerHTML = '<option value="current">Nómina Actual</option>';
    
    // Sort by month descending
    yearRecords.sort((a, b) => b.month - a.month);
    
    yearRecords.forEach(record => {
        const option = document.createElement('option');
        option.value = record.id;
        option.textContent = months[record.month - 1];
        monthSelect.appendChild(option);
    });
    
    updateDashboard();
}

function updateDashboard() {
    // Initialize selectors on first load
    const yearSelect = document.getElementById('dashboard-year');
    if (yearSelect && yearSelect.options.length === 0) {
        initDashboardSelectors();
        return;
    }
    
    const monthSelect = document.getElementById('dashboard-month');
    const data = getData();
    
    // Get net income for selected period
    let netIncome = 0;
    let periodLabel = 'Nómina Actual';
    
    if (monthSelect.value === 'current') {
        // Get from current payroll form
        netIncome = parseFloat(document.getElementById('total-neto')?.textContent) || 0;
        periodLabel = 'Nómina Actual';
    } else {
        const record = data.find(r => r.id === monthSelect.value);
        if (record) {
            netIncome = record.totalNeto || 0;
            periodLabel = `${months[record.month - 1]} ${record.year}`;
        }
    }
    
    document.getElementById('dashboard-net-income').textContent = netIncome.toFixed(2) + ' €';
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
    document.getElementById('rule-necesidades-target').textContent = targets.necesidades.toFixed(2) + ' €';
    document.getElementById('rule-necesidades-actual').textContent = categoryTotals.necesidades.toFixed(2) + ' €';
    const necesidadesPercent = targets.necesidades > 0 ? (categoryTotals.necesidades / targets.necesidades) * 100 : 0;
    document.getElementById('rule-necesidades-bar').style.width = Math.min(150, necesidadesPercent) + '%';
    const necesidadesLibre = updateRuleStatus('necesidades', categoryTotals.necesidades, targets.necesidades);
    
    // Ocio
    document.getElementById('rule-ocio-target').textContent = targets.ocio.toFixed(2) + ' €';
    document.getElementById('rule-ocio-actual').textContent = categoryTotals.ocio.toFixed(2) + ' €';
    const ocioPercent = targets.ocio > 0 ? (categoryTotals.ocio / targets.ocio) * 100 : 0;
    document.getElementById('rule-ocio-bar').style.width = Math.min(150, ocioPercent) + '%';
    const ocioLibre = updateRuleStatus('ocio', categoryTotals.ocio, targets.ocio);
    
    // Ahorro
    document.getElementById('rule-ahorro-target').textContent = targets.ahorro.toFixed(2) + ' €';
    document.getElementById('rule-ahorro-actual').textContent = categoryTotals.ahorro.toFixed(2) + ' €';
    const ahorroPercent = targets.ahorro > 0 ? (categoryTotals.ahorro / targets.ahorro) * 100 : 0;
    document.getElementById('rule-ahorro-bar').style.width = Math.min(150, ahorroPercent) + '%';
    updateRuleStatus('ahorro', categoryTotals.ahorro, targets.ahorro);
    
    // Calculate Dinero Disponible (Necesidades libre + Ocio libre, EXCLUDING Ahorro)
    const dineroDisponible = Math.max(0, necesidadesLibre) + Math.max(0, ocioLibre);
    document.getElementById('dashboard-available-money').textContent = dineroDisponible.toFixed(2) + ' €';
    
    // Update bank breakdown
    updateBankBreakdown();
    
    // Update annual summary
    updateAnnualSummary();
    
    // Update savings fund
    updateSavingsFundDisplay();
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
        statusEl.textContent = `✓ ${diff.toFixed(0)}€ libre`;
        statusEl.style.background = 'rgba(0, 212, 170, 0.2)';
        statusEl.style.color = 'var(--primary)';
        return diff;
    } else {
        statusEl.textContent = `⚠ ${Math.abs(diff).toFixed(0)}€ exceso`;
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
            itemsHtml += `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span style="color: var(--text-secondary);">${e.name}</span><span>${monthly.toFixed(2)} €</span></div>`;
        });
        bankLoans.forEach(l => {
            const status = calculateLoanStatus(l);
            if (status.remainingInstallments > 0) {
                itemsHtml += `<div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;"><span style="color: var(--purple);">📋 ${l.description}</span><span>${l.payment.toFixed(2)} €</span></div>`;
            }
        });
        
        if (!itemsHtml) {
            itemsHtml = '<p style="color: var(--text-secondary); font-size: 12px;">Sin gastos asignados</p>';
        }
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span style="font-weight: 600;">🏦 ${bank.name}</span>
                <span style="font-weight: bold; color: var(--primary);">${total.toFixed(2)} €</span>
            </div>
            ${itemsHtml}
        `;
        
        container.appendChild(card);
    });
}

function updateAnnualSummary() {
    const currentYear = new Date().getFullYear();
    const data = getData();
    const yearData = data.filter(r => r.year === currentYear);
    
    document.getElementById('dashboard-annual-year').textContent = currentYear;
    
    let totalBruto = 0;
    let totalIrpf = 0;
    let totalSS = 0;
    
    yearData.forEach(r => {
        totalBruto += r.totalBruto || 0;
        totalIrpf += r.irpfAmount || 0;
        totalSS += r.ssAmount || 0;
    });
    
    document.getElementById('dashboard-annual-bruto').textContent = totalBruto.toFixed(2) + ' €';
    document.getElementById('dashboard-annual-irpf').textContent = totalIrpf.toFixed(2) + ' €';
    document.getElementById('dashboard-annual-ss').textContent = totalSS.toFixed(2) + ' €';
}

function updateSavingsFundDisplay() {
    const balance = getSavingsFund();
    document.getElementById('savings-fund-balance').textContent = balance.toFixed(2) + ' €';
    
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
                ${isDeposit ? '+' : '-'}${tx.amount.toFixed(2)} €
            </span>
        `;
        container.appendChild(row);
    });
}

function showSavingsFundModal(type) {
    const modal = document.getElementById('savings-fund-modal');
    const title = document.getElementById('savings-modal-title');
    const btn = document.getElementById('savings-modal-btn');
    
    document.getElementById('savings-modal-type').value = type;
    document.getElementById('savings-modal-amount').value = '';
    document.getElementById('savings-modal-description').value = '';
    
    if (type === 'deposit') {
        title.textContent = 'Ingresar al Fondo';
        btn.textContent = 'Confirmar Ingreso';
        btn.style.background = 'var(--primary)';
    } else {
        title.textContent = 'Retirar del Fondo';
        btn.textContent = 'Confirmar Retiro';
        btn.style.background = 'var(--danger)';
    }
    
    modal.classList.remove('hidden');
}

function hideSavingsFundModal() {
    document.getElementById('savings-fund-modal').classList.add('hidden');
}

function saveSavingsFundTransaction() {
    const type = document.getElementById('savings-modal-type').value;
    const amount = parseFloat(document.getElementById('savings-modal-amount').value) || 0;
    const description = document.getElementById('savings-modal-description').value.trim();
    
    if (amount <= 0) {
        alert('Introduce una cantidad válida');
        return;
    }
    
    let balance = getSavingsFund();
    
    if (type === 'withdraw' && amount > balance) {
        alert('No hay suficiente saldo en el fondo');
        return;
    }
    
    // Update balance
    if (type === 'deposit') {
        balance += amount;
    } else {
        balance -= amount;
    }
    saveSavingsFund(balance);
    
    // Add to history
    const history = getSavingsHistory();
    history.push({
        id: Date.now().toString(),
        type: type,
        amount: amount,
        description: description,
        date: new Date().toISOString()
    });
    saveSavingsHistory(history);
    
    hideSavingsFundModal();
    updateSavingsFundDisplay();
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
    
    document.getElementById('total-irpf').textContent = totalIrpf.toFixed(2) + ' €';
    document.getElementById('stats-bruto').textContent = totalBruto.toFixed(2) + ' €';
    document.getElementById('stats-neto').textContent = totalNeto.toFixed(2) + ' €';
    
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
                <span style="flex: 1; font-size: 13px;">${r.totalBruto.toFixed(0)}€</span>
                <span style="flex: 1; font-size: 13px; color: var(--primary);">${r.totalNeto.toFixed(0)}€</span>
                <span style="flex: 1; font-size: 13px; color: var(--danger);">${r.irpfAmount.toFixed(0)}€</span>
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
        data = data.filter(r => r.id !== id);
        saveData(data);
        updateStats();
    }
}

// ==================== HISTORIAL ====================
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
                <td style="padding: 10px 6px; text-align: right;">${salario.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right;">${pagas.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right;">${smg.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right;">${prod.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right;">${hfestUds.toFixed(0)}</td>
                <td style="padding: 10px 6px; text-align: right;">${hfestCost.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right;">${hextraUds.toFixed(0)}</td>
                <td style="padding: 10px 6px; text-align: right;">${hextraCost.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right;">${noct.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right;">${atraso.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--purple);">${ss.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--danger);">${irpPercent.toFixed(2)}%</td>
                <td style="padding: 10px 6px; text-align: right; color: var(--danger);">${irpCost.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right; font-weight: 600;">${bruto.toFixed(2)}</td>
                <td style="padding: 10px 6px; text-align: right; font-weight: 600; color: var(--primary);">${neto.toFixed(2)}</td>
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
            `;
        }
        
        row.style.borderBottom = '1px solid var(--bg-input)';
        tbody.appendChild(row);
    }
    
    // Update footer totals
    document.getElementById('hist-total-salario').textContent = totals.salario > 0 ? totals.salario.toFixed(2) : '-';
    document.getElementById('hist-total-pagas').textContent = totals.pagas > 0 ? totals.pagas.toFixed(2) : '-';
    document.getElementById('hist-total-smg').textContent = totals.smg > 0 ? totals.smg.toFixed(2) : '-';
    document.getElementById('hist-total-prod').textContent = totals.prod > 0 ? totals.prod.toFixed(2) : '-';
    document.getElementById('hist-total-hfest').textContent = totals.hfest > 0 ? totals.hfest.toFixed(0) : '-';
    document.getElementById('hist-total-chfest').textContent = totals.chfest > 0 ? totals.chfest.toFixed(2) : '-';
    document.getElementById('hist-total-hextra').textContent = totals.hextra > 0 ? totals.hextra.toFixed(0) : '-';
    document.getElementById('hist-total-chextra').textContent = totals.chextra > 0 ? totals.chextra.toFixed(2) : '-';
    document.getElementById('hist-total-noct').textContent = totals.noct > 0 ? totals.noct.toFixed(2) : '-';
    document.getElementById('hist-total-atraso').textContent = totals.atraso > 0 ? totals.atraso.toFixed(2) : '-';
    document.getElementById('hist-total-ss').textContent = totals.ss > 0 ? totals.ss.toFixed(2) : '-';
    document.getElementById('hist-total-irp').textContent = totals.irp > 0 ? totals.irp.toFixed(2) : '-';
    document.getElementById('hist-total-bruto').textContent = totals.bruto > 0 ? totals.bruto.toFixed(2) : '-';
    document.getElementById('hist-total-neto').textContent = totals.neto > 0 ? totals.neto.toFixed(2) : '-';
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
