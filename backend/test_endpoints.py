import requests
import json

def test_endpoint(endpoint, data):
    """Test a specific endpoint"""
    try:
        print(f"\nTesting {endpoint}...")
        response = requests.post(f'http://localhost:5000{endpoint}', 
                               json=data, 
                               headers={'Content-Type': 'application/json'})
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    # Test data - use a sample image path
    test_data = {
        'imagePath': 'C:/Users/Public/MicroScope_Images/6390107_20250812_115603.jpg'
    }
    
    # List of endpoints to test
    endpoints = [
        '/api/lowpass-filter',
        '/api/median-filter', 
        '/api/edge-detect',
        '/api/edge-emphasis',
        '/api/threshold',
        '/api/grayscale',
        '/api/invert',
        '/api/thin',
        '/api/image-sharpen',
        '/api/image-stitch'
    ]
    
    print("Testing image processing endpoints...")
    
    results = {}
    for endpoint in endpoints:
        results[endpoint] = test_endpoint(endpoint, test_data)
    
    print("\n" + "="*50)
    print("SUMMARY:")
    print("="*50)
    
    working = 0
    for endpoint, success in results.items():
        status = "✓ WORKING" if success else "✗ FAILED"
        print(f"{endpoint}: {status}")
        if success:
            working += 1
    
    print(f"\nTotal working: {working}/{len(endpoints)}")

if __name__ == "__main__":
    main()
