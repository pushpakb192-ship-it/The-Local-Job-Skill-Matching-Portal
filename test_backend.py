from app import app
import json

client = app.test_client()

# 1. Test Geocode
print("=== 1. Test Geocode ===")
r = client.get('/api/geocode?q=Koramangala')
print('Geocode Koramangala:', r.status_code, r.json.get('lat'), r.json.get('lng'), r.json.get('pin_code'))

# 2. Test Invalid Geocode
print("\n=== 2. Test Invalid Geocode ===")
r = client.get('/api/geocode?q=xyzqwerasdfinvalidplacename123')
print('Invalid geocode status:', r.status_code, 'Error:', r.json.get('error'))

# 3. Test Nearby Jobs with GPS coordinates (Koramangala) radius 5 km
print("\n=== 3. Test Nearby Jobs (Koramangala coords) radius 5 km ===")
r = client.get('/api/jobs?lat=12.9352&lng=77.6245&radius=5')
data = r.json
print('Found within 5km:', data['count'])
for j in data['jobs']:
    print(f" - {j['title']} ({j['neighborhood']}) : {j['distance_km']} km | {j['pay']}/{j['pay_period']}")

# 4. Test Nearby Jobs radius 25 km
print("\n=== 4. Test Nearby Jobs radius 25 km ===")
r = client.get('/api/jobs?lat=12.9352&lng=77.6245&radius=25')
data = r.json
print('Found within 25km:', data['count'])

# 5. Verify Job 13 (no coordinates) is excluded when coords passed
ids = [j['id'] for j in data['jobs']]
print('Is Job 13 (no coords) excluded from GPS results?:', 13 not in ids)

# 6. Test Salary Filter (Min 25000/month)
print("\n=== 6. Test Salary Filter Min 25000/month ===")
r = client.get('/api/jobs?min_salary=25000&salary_period=month')
print('Jobs with >= Rs. 25,000/month:', r.json['count'])

# 7. Test Skill Matching
print("\n=== 7. Test Skill Matching ===")
r = client.get('/api/jobs?skills=Electrical Wiring,Troubleshooting')
j1 = next((j for j in r.json['jobs'] if j['id'] == 1), None)
if j1:
    print('Job 1 match %:', j1['match_percentage'], 'Matched:', j1['matched_skills'], 'Missing:', j1['missing_skills'])
