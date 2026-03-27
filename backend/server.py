from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

# Payroll income concepts
class PayrollConcepts(BaseModel):
    salario_base: float = 0.0
    pp_pagas_extras: float = 0.0
    salario_minimo_garantizado: float = 0.0
    productividad: float = 0.0
    horas_festivas: float = 0.0
    horas_extras: float = 0.0
    plus_nocturnidad: float = 0.0
    atraso_mes_anterior: float = 0.0
    concepto_extra_1_nombre: str = "Concepto Extra 1"
    concepto_extra_1_valor: float = 0.0
    concepto_extra_2_nombre: str = "Concepto Extra 2"
    concepto_extra_2_valor: float = 0.0

class PayrollDeductions(BaseModel):
    irpf_percentage: float = 15.0
    irpf_amount: float = 0.0
    ss_common: float = 0.0  # 4.7%
    ss_unemployment: float = 0.0  # 1.55%
    total_deductions: float = 0.0

class PayrollRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    month: int  # 1-12
    year: int
    concepts: PayrollConcepts
    total_devengado: float  # Gross
    deductions: PayrollDeductions
    liquido_percibir: float  # Net
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PayrollCreate(BaseModel):
    month: int
    year: int
    concepts: PayrollConcepts
    irpf_percentage: float = 15.0

# Bank Router Settings
class BankSettings(BaseModel):
    id: str = "default"
    # Account 1 - N26 Básicos
    n26_rent: float = 234.0
    n26_food: float = 100.0
    n26_parking: float = 120.0
    n26_loans: float = 110.0
    # Account 2 - Principal Servicios
    principal_electricity: float = 50.0
    principal_water: float = 20.0
    principal_gas: float = 30.0
    principal_subscriptions: float = 50.0
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class BankSettingsUpdate(BaseModel):
    n26_rent: Optional[float] = None
    n26_food: Optional[float] = None
    n26_parking: Optional[float] = None
    n26_loans: Optional[float] = None
    principal_electricity: Optional[float] = None
    principal_water: Optional[float] = None
    principal_gas: Optional[float] = None
    principal_subscriptions: Optional[float] = None

# Export/Import models
class ExportData(BaseModel):
    payroll_records: List[PayrollRecord]
    settings: BankSettings
    exported_at: datetime

class ImportData(BaseModel):
    payroll_records: List[dict]
    settings: dict

# ==================== HELPER FUNCTIONS ====================

def calculate_payroll(concepts: PayrollConcepts, irpf_percentage: float) -> tuple:
    """Calculate gross, deductions, and net salary"""
    # Calculate total gross (Total Devengado)
    total_devengado = (
        concepts.salario_base +
        concepts.pp_pagas_extras +
        concepts.salario_minimo_garantizado +
        concepts.productividad +
        concepts.horas_festivas +
        concepts.horas_extras +
        concepts.plus_nocturnidad +
        concepts.atraso_mes_anterior +
        concepts.concepto_extra_1_valor +
        concepts.concepto_extra_2_valor
    )
    
    # Calculate deductions
    irpf_amount = total_devengado * (irpf_percentage / 100)
    ss_common = total_devengado * 0.047  # 4.7%
    ss_unemployment = total_devengado * 0.0155  # 1.55%
    total_deductions = irpf_amount + ss_common + ss_unemployment
    
    deductions = PayrollDeductions(
        irpf_percentage=irpf_percentage,
        irpf_amount=round(irpf_amount, 2),
        ss_common=round(ss_common, 2),
        ss_unemployment=round(ss_unemployment, 2),
        total_deductions=round(total_deductions, 2)
    )
    
    # Net salary (Líquido a Percibir)
    liquido_percibir = round(total_devengado - total_deductions, 2)
    
    return round(total_devengado, 2), deductions, liquido_percibir

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Mis Finanzas Pro API", "version": "1.0.0"}

# Payroll Routes
@api_router.post("/payroll", response_model=PayrollRecord)
async def create_payroll(input: PayrollCreate):
    """Create a new payroll record with automatic calculations"""
    total_devengado, deductions, liquido_percibir = calculate_payroll(
        input.concepts, input.irpf_percentage
    )
    
    payroll = PayrollRecord(
        month=input.month,
        year=input.year,
        concepts=input.concepts,
        total_devengado=total_devengado,
        deductions=deductions,
        liquido_percibir=liquido_percibir
    )
    
    await db.payroll.insert_one(payroll.dict())
    return payroll

@api_router.get("/payroll", response_model=List[PayrollRecord])
async def get_all_payroll():
    """Get all payroll records sorted by date"""
    records = await db.payroll.find().sort([("year", -1), ("month", -1)]).to_list(1000)
    return [PayrollRecord(**record) for record in records]

@api_router.get("/payroll/year/{year}", response_model=List[PayrollRecord])
async def get_payroll_by_year(year: int):
    """Get payroll records for a specific year"""
    records = await db.payroll.find({"year": year}).sort("month", 1).to_list(12)
    return [PayrollRecord(**record) for record in records]

@api_router.delete("/payroll/{payroll_id}")
async def delete_payroll(payroll_id: str):
    """Delete a payroll record"""
    result = await db.payroll.delete_one({"id": payroll_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    return {"message": "Payroll record deleted successfully"}

@api_router.get("/payroll/stats/{year}")
async def get_yearly_stats(year: int):
    """Get yearly statistics: total gross, total net, total IRPF"""
    records = await db.payroll.find({"year": year}).to_list(12)
    
    total_gross = sum(r.get("total_devengado", 0) for r in records)
    total_net = sum(r.get("liquido_percibir", 0) for r in records)
    total_irpf = sum(r.get("deductions", {}).get("irpf_amount", 0) for r in records)
    
    return {
        "year": year,
        "total_gross": round(total_gross, 2),
        "total_net": round(total_net, 2),
        "total_irpf": round(total_irpf, 2),
        "records_count": len(records)
    }

# Bank Settings Routes
@api_router.get("/settings", response_model=BankSettings)
async def get_settings():
    """Get bank router settings (creates default if not exists)"""
    settings = await db.settings.find_one({"id": "default"})
    if not settings:
        default_settings = BankSettings()
        await db.settings.insert_one(default_settings.dict())
        return default_settings
    return BankSettings(**settings)

@api_router.put("/settings", response_model=BankSettings)
async def update_settings(input: BankSettingsUpdate):
    """Update bank router settings"""
    update_data = {k: v for k, v in input.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    await db.settings.update_one(
        {"id": "default"},
        {"$set": update_data},
        upsert=True
    )
    
    settings = await db.settings.find_one({"id": "default"})
    return BankSettings(**settings)

# Export/Import Routes
@api_router.get("/export")
async def export_data():
    """Export all data as JSON for iCloud backup"""
    payroll_records = await db.payroll.find().to_list(1000)
    settings = await db.settings.find_one({"id": "default"})
    
    if not settings:
        settings = BankSettings().dict()
    else:
        # Remove MongoDB _id field
        settings.pop('_id', None)
    
    # Remove MongoDB _id from payroll records
    cleaned_records = []
    for record in payroll_records:
        record.pop('_id', None)
        cleaned_records.append(record)
    
    return {
        "payroll_records": cleaned_records,
        "settings": settings,
        "exported_at": datetime.utcnow().isoformat()
    }

@api_router.post("/import")
async def import_data(data: ImportData):
    """Import data from JSON backup"""
    # Clear existing data
    await db.payroll.delete_many({})
    
    # Import payroll records
    if data.payroll_records:
        await db.payroll.insert_many(data.payroll_records)
    
    # Update settings
    if data.settings:
        data.settings["id"] = "default"
        await db.settings.replace_one(
            {"id": "default"},
            data.settings,
            upsert=True
        )
    
    return {
        "message": "Data imported successfully",
        "records_imported": len(data.payroll_records),
        "settings_updated": bool(data.settings)
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
