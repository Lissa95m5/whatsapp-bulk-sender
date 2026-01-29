import requests
import sys
import json
from datetime import datetime
from pathlib import Path

class WhatsAppBulkSenderTester:
    def __init__(self, base_url="https://whatsapp-sender-60.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'} if not files else {}
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files, data=data, timeout=10)
                else:
                    response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                details += f", Expected: {expected_status}"
                try:
                    error_data = response.json()
                    details += f", Error: {error_data.get('detail', 'Unknown error')}"
                except:
                    details += f", Response: {response.text[:100]}"

            self.log_test(name, success, details)
            return success, response.json() if success and response.content else {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        print("\n🔍 Testing Health Check...")
        success, response = self.run_test(
            "Health Check",
            "GET",
            "health",
            200
        )
        
        if success:
            print(f"   Status: {response.get('status')}")
            print(f"   Twilio Configured: {response.get('twilio_configured')}")
        
        return success

    def test_root_endpoint(self):
        """Test root API endpoint"""
        print("\n🔍 Testing Root Endpoint...")
        success, response = self.run_test(
            "Root API",
            "GET",
            "",
            200
        )
        
        if success:
            print(f"   Message: {response.get('message')}")
            print(f"   Version: {response.get('version')}")
        
        return success

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        print("\n🔍 Testing Dashboard Stats...")
        success, response = self.run_test(
            "Dashboard Stats",
            "GET",
            "stats/dashboard",
            200
        )
        
        if success:
            print(f"   Total Contacts: {response.get('total_contacts', 0)}")
            print(f"   Total Campaigns: {response.get('total_campaigns', 0)}")
            print(f"   Total Messages: {response.get('total_messages', 0)}")
            print(f"   Delivery Rate: {response.get('delivery_rate', 0)}%")
        
        return success

    def test_contact_management(self):
        """Test contact CRUD operations"""
        print("\n🔍 Testing Contact Management...")
        
        # Test creating a contact
        test_contact = {
            "phone_number": "+1234567890",
            "name": "Test User",
            "email": "test@example.com",
            "tags": ["test"]
        }
        
        success, response = self.run_test(
            "Create Contact",
            "POST",
            "contacts",
            200,
            data=test_contact
        )
        
        if not success:
            return False
        
        # Test getting contacts
        success, response = self.run_test(
            "Get Contacts",
            "GET",
            "contacts",
            200
        )
        
        if success:
            print(f"   Found {len(response.get('contacts', []))} contacts")
        
        # Test bulk contact upload
        bulk_contacts = [
            {"phone_number": "+1234567891", "name": "Bulk User 1"},
            {"phone_number": "+1234567892", "name": "Bulk User 2"}
        ]
        
        success, response = self.run_test(
            "Bulk Contact Upload",
            "POST",
            "contacts/bulk",
            200,
            data=bulk_contacts
        )
        
        if success:
            print(f"   Added: {response.get('added', 0)}, Skipped: {response.get('skipped', 0)}")
        
        # Test deleting a contact
        success, response = self.run_test(
            "Delete Contact",
            "DELETE",
            "contacts/+1234567890",
            200
        )
        
        return success

    def test_media_upload(self):
        """Test media upload functionality"""
        print("\n🔍 Testing Media Upload...")
        
        # Create a test file
        test_file_path = Path("/tmp/test_image.txt")
        test_file_path.write_text("This is a test file content")
        
        try:
            with open(test_file_path, 'rb') as f:
                files = {'file': ('test_image.txt', f, 'text/plain')}
                data = {'media_type': 'document'}
                
                success, response = self.run_test(
                    "Media Upload",
                    "POST",
                    "media/upload",
                    200,
                    data=data,
                    files=files
                )
                
                if success:
                    print(f"   Uploaded: {response.get('filename')}")
                    print(f"   Media URL: {response.get('media_url')}")
                    print(f"   File Size: {response.get('file_size')} bytes")
                
                return success
        except Exception as e:
            self.log_test("Media Upload", False, f"File error: {str(e)}")
            return False
        finally:
            if test_file_path.exists():
                test_file_path.unlink()

    def test_campaign_management(self):
        """Test campaign operations"""
        print("\n🔍 Testing Campaign Management...")
        
        # Test creating a campaign
        test_campaign = {
            "name": "Test Campaign",
            "message_body": "Hello, this is a test message!",
            "media_attachments": [],
            "recipients": ["+1234567890", "+1234567891"],
            "provider": "twilio"
        }
        
        success, response = self.run_test(
            "Create Campaign",
            "POST",
            "campaigns",
            200,
            data=test_campaign
        )
        
        campaign_id = None
        if success:
            campaign_id = response.get('campaign', {}).get('id')
            print(f"   Campaign ID: {campaign_id}")
        
        # Test getting campaigns
        success, response = self.run_test(
            "Get Campaigns",
            "GET",
            "campaigns",
            200
        )
        
        if success:
            print(f"   Found {len(response.get('campaigns', []))} campaigns")
        
        # Test getting specific campaign
        if campaign_id:
            success, response = self.run_test(
                "Get Campaign by ID",
                "GET",
                f"campaigns/{campaign_id}",
                200
            )
        
        return success

    def test_message_sending_without_credentials(self):
        """Test message sending without Twilio credentials (should fail gracefully)"""
        print("\n🔍 Testing Message Sending (No Credentials)...")
        
        # Test single message sending
        success, response = self.run_test(
            "Send Single Message (No Credentials)",
            "POST",
            "messages/send",
            400,  # Should fail with 400 due to missing credentials
            data={
                "recipient_phone": "+1234567890",
                "message_body": "Test message",
                "media_urls": ""
            }
        )
        
        # Test bulk message sending
        bulk_request = {
            "recipients": ["+1234567890", "+1234567891"],
            "message_body": "Test bulk message",
            "media_attachments": [],
            "campaign_name": "Test Bulk Campaign",
            "provider": "twilio"
        }
        
        success, response = self.run_test(
            "Send Bulk Messages (No Credentials)",
            "POST",
            "messages/bulk",
            400,  # Should fail with 400 due to missing credentials
            data=bulk_request
        )
        
        return True  # We expect these to fail, so return True if they fail as expected

    def test_provider_configuration(self):
        """Test provider configuration"""
        print("\n🔍 Testing Provider Configuration...")
        
        # Test saving Twilio configuration
        twilio_config = {
            "provider": "twilio",
            "account_sid": "test_account_sid",
            "auth_token": "test_auth_token",
            "whatsapp_number": "whatsapp:+14155238886",
            "is_active": True
        }
        
        success, response = self.run_test(
            "Configure Twilio Provider",
            "POST",
            "settings/provider",
            200,
            data=twilio_config
        )
        
        # Test getting providers
        success, response = self.run_test(
            "Get Providers",
            "GET",
            "settings/providers",
            200
        )
        
        if success:
            print(f"   Found {len(response.get('providers', []))} provider configs")
        
        return success

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting WhatsApp Bulk Sender Backend Tests")
        print(f"🌐 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Run all test categories
        test_methods = [
            self.test_health_check,
            self.test_root_endpoint,
            self.test_dashboard_stats,
            self.test_contact_management,
            self.test_media_upload,
            self.test_campaign_management,
            self.test_message_sending_without_credentials,
            self.test_provider_configuration
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                print(f"❌ {test_method.__name__} failed with exception: {str(e)}")
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️  {self.tests_run - self.tests_passed} tests failed")
            return 1

def main():
    tester = WhatsAppBulkSenderTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())