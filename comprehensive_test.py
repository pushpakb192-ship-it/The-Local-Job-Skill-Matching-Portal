import unittest
import json
import sqlite3
from app import app, haversine_km, normalize_monthly_salary, calculate_skill_match
from database import get_db

class TestLocalJobMatchingPortal(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()

    def test_01_haversine_distance(self):
        # Distance between Koramangala (12.9352, 77.6245) and HSR Layout (12.9121, 77.6446)
        dist = haversine_km(12.9352, 77.6245, 12.9121, 77.6446)
        self.assertIsNotNone(dist)
        self.assertAlmostEqual(dist, 3.4, delta=0.5)

    def test_02_manual_town_geocode(self):
        res = self.client.get('/api/geocode?q=Koramangala')
        self.assertEqual(res.status_code, 200)
        data = res.json
        self.assertTrue(data['success'])
        self.assertAlmostEqual(data['lat'], 12.9357, delta=0.05)
        self.assertAlmostEqual(data['lng'], 77.6240, delta=0.05)

    def test_03_manual_pincode_geocode(self):
        res = self.client.get('/api/geocode?q=560001')
        self.assertEqual(res.status_code, 200)
        data = res.json
        self.assertTrue(data['success'])
        self.assertAlmostEqual(data['lat'], 12.9797, delta=0.05)

    def test_04_invalid_location_geocode(self):
        res = self.client.get('/api/geocode?q=invalidnonexistenttown123456789')
        self.assertEqual(res.status_code, 404)
        data = res.json
        self.assertFalse(data['success'])
        self.assertIn("Unable to find coordinates", data['error'])

    def test_05_nearby_job_distance_and_nearest_sorting(self):
        # From Koramangala
        res = self.client.get('/api/jobs?lat=12.9352&lng=77.6245&radius=25')
        self.assertEqual(res.status_code, 200)
        jobs = res.json['jobs']
        self.assertGreater(len(jobs), 0)
        # Check sorting: nearest first
        distances = [j['distance_km'] for j in jobs]
        self.assertEqual(distances, sorted(distances))
        self.assertEqual(jobs[0]['title'], "Head Barista & Cafe Shift Supervisor")
        self.assertAlmostEqual(jobs[0]['distance_km'], 0.0, delta=0.2)

    def test_06_radius_filtering_5km_vs_25km(self):
        res_5 = self.client.get('/api/jobs?lat=12.9352&lng=77.6245&radius=5')
        count_5 = res_5.json['count']
        res_25 = self.client.get('/api/jobs?lat=12.9352&lng=77.6245&radius=25')
        count_25 = res_25.json['count']
        self.assertLess(count_5, count_25)
        for j in res_5.json['jobs']:
            self.assertLessEqual(j['distance_km'], 5.0)

    def test_07_jobs_without_coordinates_excluded_from_gps_results(self):
        res = self.client.get('/api/jobs?lat=12.9352&lng=77.6245&radius=100')
        ids = [j['id'] for j in res.json['jobs']]
        # Job 13 has no coordinates
        self.assertNotIn(13, ids)
        # Verify all returned jobs have non-null coordinates
        for j in res.json['jobs']:
            self.assertIsNotNone(j['latitude'])
            self.assertIsNotNone(j['longitude'])

    def test_08_no_matching_jobs_empty_state(self):
        # Query far away location with small radius (e.g. coordinates in North India or Himalayas)
        res = self.client.get('/api/jobs?lat=32.0&lng=77.0&radius=10')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json['count'], 0)
        self.assertEqual(len(res.json['jobs']), 0)

    def test_09_inr_currency_and_formatting(self):
        res = self.client.get('/api/jobs')
        for j in res.json['jobs']:
            self.assertEqual(j['currency'], 'INR')
            self.assertNotIn('$', j['pay'])
            self.assertIn(j['pay_period'], ['hour', 'day', 'month', 'year', 'hr'])

    def test_10_daily_monthly_annual_salary_periods(self):
        # Daily: Crew Member (id 11)
        # Monthly: Electrician (id 1)
        # Annual: Web Developer (id 12)
        res = self.client.get('/api/jobs')
        jobs_by_id = {j['id']: j for j in res.json['jobs']}
        self.assertEqual(jobs_by_id[11]['pay_period'], 'day')
        self.assertEqual(jobs_by_id[1]['pay_period'], 'month')
        self.assertEqual(jobs_by_id[12]['pay_period'], 'year')

    def test_11_salary_normalization_and_filtering(self):
        # Normalization tests
        # Day: 600 * 22 = 13,200
        self.assertEqual(normalize_monthly_salary(600, 'day'), 13200.0)
        # Year: 4,00,000 / 12 = 33,333.33
        self.assertAlmostEqual(normalize_monthly_salary(400000, 'year'), 33333.33, delta=1.0)
        # Filter min_salary = 30000/month
        res = self.client.get('/api/jobs?min_salary=30000&salary_period=month')
        for j in res.json['jobs']:
            norm_max = normalize_monthly_salary(j['salary_max'] or j['salary_min'], j['pay_period'])
            self.assertGreaterEqual(norm_max, 30000.0)

    def test_12_skill_matching_and_gap_analysis(self):
        req = ["Electrical Wiring", "Circuit Breakers", "Blueprint Reading"]
        nice = ["EV Charger Installation"]
        # Candidate has 1 required skill
        result = calculate_skill_match(["Electrical Wiring"], req, nice)
        self.assertIn("Electrical Wiring", result['matched_skills'])
        self.assertIn("Circuit Breakers", result['missing_skills'])
        self.assertIn("Blueprint Reading", result['missing_skills'])
        self.assertEqual(result['total_matched'], 1)
        self.assertEqual(result['total_required'], 3)
        self.assertEqual(result['match_percentage'], 28) # 1/3 * 85 = 28.33 -> 28%

    def test_13_demonstration_data_identification(self):
        res = self.client.get('/api/stats')
        self.assertGreater(res.json['demo_jobs_count'], 0)
        job1 = self.client.get('/api/jobs/1').json
        self.assertEqual(job1['job_source'], 'demonstration_dataset')
        self.assertEqual(job1['verification_status'], 'demo')

    def test_14_post_job_and_apply(self):
        # Post a job with INR salary
        new_job = {
            "title": "Automated Test Electrician",
            "company": "Test Electrical Corp",
            "category": "Skilled Trades",
            "location": "MG Road",
            "neighborhood": "Central",
            "city": "Bengaluru",
            "state": "Karnataka",
            "pin_code": "560001",
            "latitude": 12.9756,
            "longitude": 77.6066,
            "salary_min": 30000,
            "salary_max": 40000,
            "pay_period": "month",
            "is_negotiable": True,
            "contact_email": "test@company.in",
            "description": "Test job for verification",
            "required_skills": ["Electrical Wiring"]
        }
        post_res = self.client.post('/api/jobs', json=new_job)
        self.assertEqual(post_res.status_code, 201)
        job_id = post_res.json['job_id']

        # Apply to the job with candidate education and experience
        apply_data = {
            "applicant_name": "Test Candidate",
            "applicant_email": "candidate@example.com",
            "applicant_phone": "9876543210",
            "applicant_education": "Diploma in Electrical",
            "applicant_experience": "3 years",
            "applicant_skills": ["Electrical Wiring"],
            "message": "Available immediately"
        }
        apply_res = self.client.post(f'/api/jobs/{job_id}/apply', json=apply_data)
        self.assertEqual(apply_res.status_code, 200)
        self.assertTrue(apply_res.json['success'])

if __name__ == '__main__':
    unittest.main()
