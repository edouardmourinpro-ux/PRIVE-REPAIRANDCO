import requests
import sys
import json
from datetime import datetime

class RepairCoAPITester:
    def __init__(self, base_url="https://repair-tech-demo.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                except:
                    print(f"   Response: {response.text[:200]}...")
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:300]}")
                self.failed_tests.append({
                    'name': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:300]
                })

            return success, response.json() if success and response.text else {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            self.failed_tests.append({
                'name': name,
                'error': str(e)
            })
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test(
            "Root API Endpoint",
            "GET",
            "api/",
            200
        )

    def test_stores_endpoint(self):
        """Test stores endpoint"""
        success, response = self.run_test(
            "Get All Stores",
            "GET", 
            "api/stores",
            200
        )
        
        if success and isinstance(response, list) and len(response) == 5:
            print(f"   ✅ Found {len(response)} stores as expected")
            # Check if first store has required fields
            store = response[0]
            required_fields = ['id', 'name', 'address', 'city', 'phone']
            missing_fields = [field for field in required_fields if field not in store]
            if missing_fields:
                print(f"   ⚠️  Missing fields in store data: {missing_fields}")
        
        return success, response

    def test_single_store_endpoint(self):
        """Test single store endpoint"""
        return self.run_test(
            "Get Single Store",
            "GET",
            "api/stores/nimes-etoile",
            200
        )

    def test_quote_submission(self):
        """Test quote form submission"""
        quote_data = {
            "device_type": "smartphone",
            "brand": "Apple",
            "model": "iPhone 14 Pro",
            "issue_types": ["Écran cassé", "Batterie"],
            "other_issue": "",
            "name": "Test User",
            "phone": "0612345678",
            "email": "test@example.com",
            "store": "nimes-etoile",
            "preferred_time": "Mardi matin"
        }
        
        success, response = self.run_test(
            "Quote Form Submission",
            "POST",
            "api/quote",
            200,
            data=quote_data
        )
        
        if success and 'id' in response:
            print(f"   ✅ Quote created with ID: {response['id']}")
        
        return success, response

    def test_contact_submission(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test Contact",
            "email": "contact@example.com",
            "phone": "0612345678",
            "subject": "Question sur une réparation",
            "store": "nimes-etoile",
            "message": "Ceci est un message de test pour vérifier le formulaire de contact."
        }
        
        success, response = self.run_test(
            "Contact Form Submission",
            "POST",
            "api/contact",
            200,
            data=contact_data
        )
        
        if success and 'id' in response:
            print(f"   ✅ Contact created with ID: {response['id']}")
        
        return success, response

    def test_b2b_submission(self):
        """Test B2B form submission"""
        b2b_data = {
            "first_name": "Jean",
            "last_name": "Dupont",
            "company": "Test Company SARL",
            "email": "jean.dupont@testcompany.com",
            "phone": "0612345678",
            "fleet_size": "10-50",
            "message": "Nous avons besoin d'un service de réparation pour notre flotte mobile."
        }
        
        success, response = self.run_test(
            "B2B Form Submission",
            "POST",
            "api/b2b",
            200,
            data=b2b_data
        )
        
        if success and 'id' in response:
            print(f"   ✅ B2B request created with ID: {response['id']}")
        
        return success, response

    def test_buyback_submission(self):
        """Test buyback form submission"""
        buyback_data = {
            "brand": "Apple",
            "model": "iPhone 12",
            "condition": "bon",
            "name": "Test Seller",
            "phone": "0612345678",
            "store": "montpellier-sud"
        }
        
        success, response = self.run_test(
            "Buyback Form Submission",
            "POST",
            "api/buyback",
            200,
            data=buyback_data
        )
        
        if success and 'id' in response:
            print(f"   ✅ Buyback request created with ID: {response['id']}")
        
        return success, response

    def test_invalid_store_endpoint(self):
        """Test invalid store ID"""
        return self.run_test(
            "Invalid Store ID",
            "GET",
            "api/stores/invalid-store",
            404
        )

    def test_invalid_quote_data(self):
        """Test quote submission with invalid data"""
        invalid_quote = {
            "device_type": "",  # Missing required field
            "brand": "Apple",
            "model": "",  # Missing required field
            "issue_types": [],  # Empty array
            "name": "",  # Missing required field
            "phone": "123",  # Invalid phone
            "email": "invalid-email",  # Invalid email
            "store": ""  # Missing required field
        }
        
        return self.run_test(
            "Invalid Quote Data",
            "POST",
            "api/quote",
            422  # Validation error
        )

def main():
    print("🚀 Starting Repair & Co API Tests")
    print("=" * 50)
    
    tester = RepairCoAPITester()
    
    # Test all endpoints
    print("\n📍 Testing Basic Endpoints...")
    tester.test_root_endpoint()
    tester.test_stores_endpoint()
    tester.test_single_store_endpoint()
    tester.test_invalid_store_endpoint()
    
    print("\n📝 Testing Form Submissions...")
    tester.test_quote_submission()
    tester.test_contact_submission()
    tester.test_b2b_submission()
    tester.test_buyback_submission()
    
    print("\n🔍 Testing Error Handling...")
    tester.test_invalid_quote_data()
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
    
    if tester.failed_tests:
        print(f"\n❌ Failed Tests ({len(tester.failed_tests)}):")
        for i, test in enumerate(tester.failed_tests, 1):
            print(f"{i}. {test['name']}")
            if 'error' in test:
                print(f"   Error: {test['error']}")
            else:
                print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                print(f"   Response: {test['response']}")
    
    success_rate = (tester.tests_passed / tester.tests_run) * 100
    print(f"\n🎯 Success Rate: {success_rate:.1f}%")
    
    return 0 if tester.tests_passed == tester.tests_run else 1

if __name__ == "__main__":
    sys.exit(main())