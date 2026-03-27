// Version: 2025-07-28-v10
// ==================== DATA STORAGE ====================
const STORAGE_KEY = 'mis-finanzas-pro-data';
const SETTINGS_KEY = 'mis-finanzas-pro-settings';

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
    loadSettings();
    updateTransfers();
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
    
    if (tab === 'transfers') updateTransfers();
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
    const settings = localStorage.getItem(SETTINGS_KEY);
    return settings ? JSON.parse(settings) : {
        rent: 234, food: 100, parking: 120, loans: 110,
        electricity: 50, water: 20, gas: 30, subs: 50
    };
}

function saveSettingsData(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// ==================== TRANSFERS ====================
function loadSettings() {
    const s = getSettings();
    document.getElementById('set_rent').value = s.rent;
    document.getElementById('set_food').value = s.food;
    document.getElementById('set_parking').value = s.parking;
    document.getElementById('set_loans').value = s.loans;
    document.getElementById('set_electricity').value = s.electricity;
    document.getElementById('set_water').value = s.water;
    document.getElementById('set_gas').value = s.gas;
    document.getElementById('set_subs').value = s.subs;
}

function toggleSettings() {
    document.getElementById('settings-panel').classList.toggle('hidden');
}

function saveSettings() {
    const settings = {
        rent: parseFloat(document.getElementById('set_rent').value) || 0,
        food: parseFloat(document.getElementById('set_food').value) || 0,
        parking: parseFloat(document.getElementById('set_parking').value) || 0,
        loans: parseFloat(document.getElementById('set_loans').value) || 0,
        electricity: parseFloat(document.getElementById('set_electricity').value) || 0,
        water: parseFloat(document.getElementById('set_water').value) || 0,
        gas: parseFloat(document.getElementById('set_gas').value) || 0,
        subs: parseFloat(document.getElementById('set_subs').value) || 0
    };
    saveSettingsData(settings);
    toggleSettings();
    updateTransfers();
    alert('Configuración guardada correctamente');
}

function updateTransfers() {
    const data = getData();
    const s = getSettings();
    
    // Get latest payroll
    const sorted = data.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
    });
    const latest = sorted[0];
    
    const netSalary = latest ? latest.totalNeto : 0;
    
    document.getElementById('transfer-net').textContent = netSalary.toFixed(2) + ' €';
    document.getElementById('transfer-period').textContent = latest ? `${months[latest.month - 1]} ${latest.year}` : 'Sin datos';
    
    // Account 1 - N26
    const acc1Total = s.rent + s.food + s.parking + s.loans;
    document.getElementById('acc1-total').textContent = acc1Total.toFixed(2) + ' €';
    document.getElementById('acc1-rent').textContent = s.rent.toFixed(2) + ' €';
    document.getElementById('acc1-food').textContent = s.food.toFixed(2) + ' €';
    document.getElementById('acc1-parking').textContent = s.parking.toFixed(2) + ' €';
    document.getElementById('acc1-loans').textContent = s.loans.toFixed(2) + ' €';
    
    // Account 2 - Principal
    const acc2Total = s.electricity + s.water + s.gas + s.subs;
    document.getElementById('acc2-total').textContent = acc2Total.toFixed(2) + ' €';
    document.getElementById('acc2-elec').textContent = s.electricity.toFixed(2) + ' €';
    document.getElementById('acc2-water').textContent = s.water.toFixed(2) + ' €';
    document.getElementById('acc2-gas').textContent = s.gas.toFixed(2) + ' €';
    document.getElementById('acc2-subs').textContent = s.subs.toFixed(2) + ' €';
    
    // Account 3 - Savings
    const acc3Total = Math.max(0, netSalary - acc1Total - acc2Total);
    document.getElementById('acc3-total').textContent = acc3Total.toFixed(2) + ' €';
    
    const percent = netSalary > 0 ? (acc3Total / netSalary) * 100 : 0;
    document.getElementById('savings-bar').style.width = Math.min(100, percent) + '%';
    document.getElementById('savings-percent').textContent = percent.toFixed(1) + '% del salario neto';
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
        updateTransfers();
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
        settings: getSettings(),
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
                if (data.settings) saveSettingsData(data.settings);
                
                loadSettings();
                updateTransfers();
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
