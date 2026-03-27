#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Mis Finanzas Pro
Tests all API endpoints with proper validation and calculation verification
"""

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Any, List

# Backend URL from environment
BACKEND_URL = "https://fintech-salary.preview.emergentagent.com/api"

class BackendTester:
    def __init__(self):
        self.base_url = BACKEND_URL
        self.session = requests.Session()
        self.test_results = []
        self.created_payroll_ids = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        print()
    
    def test_health_check(self):
        """Test GET /api/ - Health check"""
        try:
            response = self.session.get(f"{self.base_url}/")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "version" in data:
                    self.log_test("Health Check", True, f"API version: {data.get('version')}")
                    return True
                else:
                    self.log_test("Health Check", False, "Missing message or version in response")
                    return False
            else:
                self.log_test("Health Check", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Health Check", False, f"Exception: {str(e)}")
            return False
    
    def test_create_payroll(self):
        """Test POST /api/payroll - Create payroll record"""
        try:
            # Test data from the review request
            payroll_data = {
                "month": 7,
                "year": 2025,
                "concepts": {
                    "salario_base": 1800,
                    "pp_pagas_extras": 300,
                    "salario_minimo_garantizado": 0,
                    "productividad": 150,
                    "horas_festivas": 0,
                    "horas_extras": 100,
                    "plus_nocturnidad": 0,
                    "atraso_mes_anterior": 0,
                    "concepto_extra_1_nombre": "Bonus",
                    "concepto_extra_1_valor": 50,
                    "concepto_extra_2_nombre": "Concepto Extra 2",
                    "concepto_extra_2_valor": 0
                },
                "irpf_percentage": 15
            }
            
            response = self.session.post(
                f"{self.base_url}/payroll",
                json=payroll_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Store the ID for later tests
                if "id" in data:
                    self.created_payroll_ids.append(data["id"])
                
                # Verify calculations
                expected_total = 1800 + 300 + 0 + 150 + 0 + 100 + 0 + 0 + 50 + 0  # 2400
                expected_irpf = expected_total * 0.15  # 360
                expected_ss_common = expected_total * 0.047  # 112.8
                expected_ss_unemployment = expected_total * 0.0155  # 37.2
                expected_net = expected_total - expected_irpf - expected_ss_common - expected_ss_unemployment  # 1890
                
                calculations_correct = True
                calc_details = []
                
                if abs(data.get("total_devengado", 0) - expected_total) > 0.01:
                    calculations_correct = False
                    calc_details.append(f"Total devengado: got {data.get('total_devengado')}, expected {expected_total}")
                
                if abs(data.get("deductions", {}).get("irpf_amount", 0) - expected_irpf) > 0.01:
                    calculations_correct = False
                    calc_details.append(f"IRPF: got {data.get('deductions', {}).get('irpf_amount')}, expected {expected_irpf}")
                
                if abs(data.get("deductions", {}).get("ss_common", 0) - expected_ss_common) > 0.01:
                    calculations_correct = False
                    calc_details.append(f"SS Common: got {data.get('deductions', {}).get('ss_common')}, expected {expected_ss_common}")
                
                if abs(data.get("deductions", {}).get("ss_unemployment", 0) - expected_ss_unemployment) > 0.01:
                    calculations_correct = False
                    calc_details.append(f"SS Unemployment: got {data.get('deductions', {}).get('ss_unemployment')}, expected {expected_ss_unemployment}")
                
                if abs(data.get("liquido_percibir", 0) - expected_net) > 0.01:
                    calculations_correct = False
                    calc_details.append(f"Net salary: got {data.get('liquido_percibir')}, expected {expected_net}")
                
                if calculations_correct:
                    self.log_test("Create Payroll", True, f"Payroll created with correct calculations. ID: {data.get('id')}")
                    return True
                else:
                    self.log_test("Create Payroll", False, f"Calculation errors: {'; '.join(calc_details)}")
                    return False
            else:
                self.log_test("Create Payroll", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_test("Create Payroll", False, f"Exception: {str(e)}")
            return False
    
    def test_get_all_payroll(self):
        """Test GET /api/payroll - Get all payroll records"""
        try:
            response = self.session.get(f"{self.base_url}/payroll")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get All Payroll", True, f"Retrieved {len(data)} payroll records")
                    return True
                else:
                    self.log_test("Get All Payroll", False, "Response is not a list")
                    return False
            else:
                self.log_test("Get All Payroll", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get All Payroll", False, f"Exception: {str(e)}")
            return False
    
    def test_get_payroll_by_year(self):
        """Test GET /api/payroll/year/{year} - Get records for 2025"""
        try:
            response = self.session.get(f"{self.base_url}/payroll/year/2025")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    # Verify all records are from 2025
                    all_2025 = all(record.get("year") == 2025 for record in data)
                    if all_2025:
                        self.log_test("Get Payroll by Year", True, f"Retrieved {len(data)} records for 2025")
                        return True
                    else:
                        self.log_test("Get Payroll by Year", False, "Some records are not from 2025")
                        return False
                else:
                    self.log_test("Get Payroll by Year", False, "Response is not a list")
                    return False
            else:
                self.log_test("Get Payroll by Year", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Payroll by Year", False, f"Exception: {str(e)}")
            return False
    
    def test_get_yearly_stats(self):
        """Test GET /api/payroll/stats/{year} - Get yearly statistics"""
        try:
            response = self.session.get(f"{self.base_url}/payroll/stats/2025")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["year", "total_gross", "total_net", "total_irpf", "records_count"]
                
                if all(field in data for field in required_fields):
                    if data["year"] == 2025:
                        self.log_test("Get Yearly Stats", True, 
                                    f"Stats for 2025: {data['records_count']} records, "
                                    f"Gross: {data['total_gross']}, Net: {data['total_net']}, "
                                    f"IRPF: {data['total_irpf']}")
                        return True
                    else:
                        self.log_test("Get Yearly Stats", False, f"Wrong year in response: {data['year']}")
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Get Yearly Stats", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Get Yearly Stats", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Yearly Stats", False, f"Exception: {str(e)}")
            return False
    
    def test_get_settings(self):
        """Test GET /api/settings - Get bank router settings"""
        try:
            response = self.session.get(f"{self.base_url}/settings")
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ["id", "n26_rent", "n26_food", "n26_parking", "n26_loans",
                                 "principal_electricity", "principal_water", "principal_gas", 
                                 "principal_subscriptions"]
                
                if all(field in data for field in expected_fields):
                    self.log_test("Get Settings", True, f"Retrieved settings with all required fields")
                    return True
                else:
                    missing = [f for f in expected_fields if f not in data]
                    self.log_test("Get Settings", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Get Settings", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Get Settings", False, f"Exception: {str(e)}")
            return False
    
    def test_update_settings(self):
        """Test PUT /api/settings - Update settings"""
        try:
            update_data = {"n26_rent": 300}
            
            response = self.session.put(
                f"{self.base_url}/settings",
                json=update_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("n26_rent") == 300:
                    self.log_test("Update Settings", True, f"Successfully updated n26_rent to 300")
                    return True
                else:
                    self.log_test("Update Settings", False, f"n26_rent not updated correctly: {data.get('n26_rent')}")
                    return False
            else:
                self.log_test("Update Settings", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Update Settings", False, f"Exception: {str(e)}")
            return False
    
    def test_export_data(self):
        """Test GET /api/export - Export all data as JSON"""
        try:
            response = self.session.get(f"{self.base_url}/export")
            
            if response.status_code == 200:
                data = response.json()
                required_fields = ["payroll_records", "settings", "exported_at"]
                
                if all(field in data for field in required_fields):
                    if isinstance(data["payroll_records"], list) and isinstance(data["settings"], dict):
                        self.log_test("Export Data", True, 
                                    f"Exported {len(data['payroll_records'])} records and settings")
                        return True
                    else:
                        self.log_test("Export Data", False, "Invalid data types in export")
                        return False
                else:
                    missing = [f for f in required_fields if f not in data]
                    self.log_test("Export Data", False, f"Missing fields: {missing}")
                    return False
            else:
                self.log_test("Export Data", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Export Data", False, f"Exception: {str(e)}")
            return False
    
    def test_import_data(self):
        """Test POST /api/import - Import data"""
        try:
            # First export to get current data structure
            export_response = self.session.get(f"{self.base_url}/export")
            if export_response.status_code != 200:
                self.log_test("Import Data", False, "Could not export data for import test")
                return False
            
            export_data = export_response.json()
            
            # Prepare import data
            import_data = {
                "payroll_records": export_data["payroll_records"],
                "settings": export_data["settings"]
            }
            
            response = self.session.post(
                f"{self.base_url}/import",
                json=import_data,
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "records_imported" in data:
                    self.log_test("Import Data", True, 
                                f"Imported {data['records_imported']} records successfully")
                    return True
                else:
                    self.log_test("Import Data", False, "Missing response fields")
                    return False
            else:
                self.log_test("Import Data", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Import Data", False, f"Exception: {str(e)}")
            return False
    
    def test_delete_payroll(self):
        """Test DELETE /api/payroll/{id} - Delete a record"""
        try:
            if not self.created_payroll_ids:
                self.log_test("Delete Payroll", False, "No payroll IDs available for deletion test")
                return False
            
            payroll_id = self.created_payroll_ids[0]
            response = self.session.delete(f"{self.base_url}/payroll/{payroll_id}")
            
            if response.status_code == 200:
                data = response.json()
                if "message" in data:
                    self.log_test("Delete Payroll", True, f"Successfully deleted payroll {payroll_id}")
                    return True
                else:
                    self.log_test("Delete Payroll", False, "Missing message in response")
                    return False
            else:
                self.log_test("Delete Payroll", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_test("Delete Payroll", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("BACKEND API TESTING - MIS FINANZAS PRO")
        print(f"Testing against: {self.base_url}")
        print("=" * 60)
        print()
        
        # Test in logical order
        tests = [
            ("Health Check", self.test_health_check),
            ("Create Payroll", self.test_create_payroll),
            ("Get All Payroll", self.test_get_all_payroll),
            ("Get Payroll by Year", self.test_get_payroll_by_year),
            ("Get Yearly Stats", self.test_get_yearly_stats),
            ("Get Settings", self.test_get_settings),
            ("Update Settings", self.test_update_settings),
            ("Export Data", self.test_export_data),
            ("Import Data", self.test_import_data),
            ("Delete Payroll", self.test_delete_payroll),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            if test_func():
                passed += 1
        
        print("=" * 60)
        print(f"TESTING COMPLETE: {passed}/{total} tests passed")
        print("=" * 60)
        
        # Print summary
        print("\nTEST SUMMARY:")
        for result in self.test_results:
            status = "✅" if result["success"] else "❌"
            print(f"{status} {result['test']}")
            if not result["success"] and result["details"]:
                print(f"   Error: {result['details']}")
        
        return passed == total

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)