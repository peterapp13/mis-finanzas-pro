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

let selectedMonth = new Date().getMonth() + 1;
let selectedYear = new Date().getFullYear();
let statsYear = new Date().getFullYear();
let chart = null;

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initPayrollTable();
    initMonthPicker();
    updateDateDisplay();
    loadSettings();
    updateTransfers();
    updateStats();
    registerServiceWorker();
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
    
    concepts.forEach(concept => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="concept-name">
                ${concept.editable 
                    ? `<input type="text" id="${concept.id}_name" value="${concept.name}" style="width: 80px;">`
                    : concept.name}
            </td>
            <td><input type="number" id="${concept.id}_unidad" placeholder="0" oninput="calculateRow('${concept.id}')" min="0" step="0.01"></td>
            <td><input type="number" id="${concept.id}_precio" placeholder="0.00" oninput="calculateRow('${concept.id}')" min="0" step="0.01"></td>
            <td class="calculated" id="${concept.id}_abonar">0.00</td>
            <td class="deducir-cell"><input type="number" id="${concept.id}_deducir" placeholder="0.00" oninput="calculateRow('${concept.id}')" min="0" step="0.01"></td>
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

function calculateTotals() {
    // Calculate Total Bruto (sum of all row totals)
    let totalBruto = 0;
    concepts.forEach(concept => {
        const total = parseFloat(document.getElementById(`${concept.id}_total`).textContent) || 0;
        totalBruto += total;
    });
    
    // Get IRPF percentage
    const irpfPercent = parseFloat(document.getElementById('irpf_percent').value) || 0;
    
    // Calculate deductions
    const irpfAmount = totalBruto * (irpfPercent / 100);
    const ssAmount = totalBruto * 0.0635; // 6.35%
    const totalDeducciones = irpfAmount + ssAmount;
    const totalNeto = totalBruto - totalDeducciones;
    
    // Update display
    document.getElementById('total-bruto').textContent = totalBruto.toFixed(2) + ' €';
    document.getElementById('irpf-amount').textContent = '-' + irpfAmount.toFixed(2) + ' €';
    document.getElementById('ss-amount').textContent = '-' + ssAmount.toFixed(2) + ' €';
    document.getElementById('total-deducciones').textContent = '-' + totalDeducciones.toFixed(2) + ' €';
    document.getElementById('total-neto').textContent = totalNeto.toFixed(2) + ' €';
    
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
    
    const record = {
        id: Date.now().toString(),
        month: selectedMonth,
        year: selectedYear,
        concepts: conceptData,
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
