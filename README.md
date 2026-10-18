# LocalMatch — Local Job & Skill Management Portal

**LocalMatch** is a modern, responsive web application and real-time skill matching engine built with **Python (Flask)**, **SQLite**, **Tailwind CSS**, and **Vanilla JavaScript**. It connects local job seekers with nearby employers, skilled trades, healthcare providers, hospitality, and businesses across Indian districts with accurate **GPS coordinates**, **manual village/town/PIN code geocoding**, **Haversine straight-line distance calculations**, and **Indian Rupee (₹) salary formatting**.

---

## 🌟 Key Features

### 1. Accurate Location-Based Job Search
- **Live GPS Location**: One-click **"Use GPS"** button obtains precise latitude and longitude via browser Geolocation API with graceful denial handling.
- **Manual Village, Town, City & PIN Code Search**: Geocodes any Indian location or 6-digit PIN code (e.g. `560001`, `Koramangala`, `Bengaluru`, `Pune`, `Mysuru`) via OpenStreetMap Nominatim with caching and error protection.
- **Radius Filtering**: Filter vacancies within **5 km**, **10 km**, **25 km (Default)**, **50 km**, **100 km**, or Any Distance.
- **True Straight-line Distance**: Calculates accurate distance in kilometres to each verified workplace using the Haversine formula.
- **Nearest-First Sorting**: Ranks opportunities starting from closest proximity.
- **Invalid Coordinate Protection**: Automatically excludes jobs without verified coordinates from GPS distance results.

### 2. Genuine Vacancy & Demonstration Dataset
- **Demonstration Dataset Clearly Identified**: Sample demonstration records are explicitly identified with `📋 Demo Record` badges to avoid misleading users.
- **Employer-Submitted Jobs**: Direct posting workflow saves verified workplace coordinates, PIN code, and contact information.
- **Empty State with Radius Expansion**: When no vacancies exist within the chosen radius, displays:
  `"No jobs found near your selected location."` with one-click actions to expand radius to 50 km or 100 km.

### 3. Indian Currency (₹) & Salary Formatting
- **Standard INR Currency Throughout**: All wages and ranges formatted in Indian Rupees using `Intl.NumberFormat('en-IN')` with ₹ symbol (e.g., `₹28,000 – ₹38,000 / month`, `₹4,00,000 – ₹6,50,000 / year`, `₹600 – ₹850 / day`).
- **Flexible Payment Periods**: Supports Hourly, Daily, Monthly, and Annual compensation.
- **Normalized Salary Filtering**: Minimum and Maximum salary filters accurately compare normalized monthly rates across all payment periods.
- **Negotiable & Undisclosed Handling**: Respects negotiable wages and private salary flags.

### 4. Real-Time Skill-to-Job Matching & Candidate Profile
- **Candidate Profile Management**: Record full name, email, phone, education (10th, 12th, ITI, Diploma, Degree), and experience level.
- **Interactive "My Skills" Dock**: Add individual skills or click suggested skills to dynamically score compatibility across all active listings.
- **Skill Gap Analysis**: Separates matched skills (`✓ You Have`) from missing prerequisites (`Missing Gap`).
- **Quick Profile Presets**: One-click demo profiles for *Electrician / Trades*, *CNA / Healthcare*, *Barista & Food*, *Tech & Support*, and *Warehouse & Forklift*.
- **Transparent Match Score (0% – 100%)**: Computes 85% core required skills + 15% bonus skills without false AI claims.

---

## 📁 Project Structure

```text
The Local Job & Skill Matching Portal/
├── app.py              # Flask server, REST APIs, geocoding & Haversine distance engine
├── database.py         # SQLite database schema, safe migrations, and Indian demonstration dataset
├── portal.db           # SQLite database file (migrated automatically)
├── templates/
│   └── index.html      # Responsive dashboard UI (Tailwind CSS, Lucide Icons)
├── static/
│   ├── app.js          # Reactive client-side logic, GPS geolocation, Nominatim geocoder & filters
│   └── styles.css      # Micro-animations, custom scrollbars, and card styling
├── test_backend.py     # Automated backend validation and endpoint test suite
└── README.md           # Documentation and run instructions
```

---

## 🚀 How to Run the Application

### 1. Ensure Dependencies Are Installed
```bash
pip install flask
```

### 2. Start the Server
From the project directory:
```bash
python app.py
```

### 3. Open in Browser
Open your web browser and navigate to:
```text
http://127.0.0.1:5000
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/geocode?q=<location>` | Geocode village, town, city, or PIN code via OpenStreetMap Nominatim |
| `GET` | `/api/jobs` | Search & filter jobs (`q`, `lat`, `lng`, `radius`, `min_salary`, `max_salary`, `salary_period`, `skills`, `category`, `job_type`, `experience`, `urgent`, `min_match`, `sort`) |
| `GET` | `/api/jobs/<id>` | Full details, skill gap analysis, and calculated distance for a single job |
| `POST` | `/api/jobs` | Publish a new job with workplace PIN code, address, coordinates, and INR salary |
| `POST` | `/api/jobs/<id>/apply` | Submit an application with candidate skills, education, and experience |
| `GET` | `/api/skills` | List all available and high-demand skills in the area |
| `GET` | `/api/neighborhoods` | List all distinct local neighborhoods |
| `GET` | `/api/stats` | Summary statistics (Active jobs, employers, urgent roles, demo records) |

---

## 🧪 Quick Test Checklist

1. **GPS Location**: Click **"Use GPS"** in the search bar. The browser will request location permission and calculate true distance in km to all workplace coordinates.
2. **Manual Village / Town Search**: Enter `Koramangala` or `Indiranagar` and click **"Search"**.
3. **Manual PIN Code Search**: Enter `560001` or `560102`. Notice accurate geocoding and distance calculation.
4. **Radius Filtering**: Select **Within 5 km** vs **Within 25 km** to observe distance cutoffs.
5. **No Matching Jobs / Expand Radius**: Enter a location far away (e.g. `Delhi` or `Mysuru`) with 5 km radius. Notice the clear message: *"No jobs found near your selected location"* with **"Expand Radius to 50 km / 100 km"** buttons.
6. **INR Salary Formatting**: Notice all salaries display in `₹` format (e.g. `₹28,000 – ₹38,000 / month`).
7. **Salary Filters**: Filter by Min `₹25,000` to see normalized salary filtering in action.
8. **Skill Gap Detection**: Select skills and open any job modal to see **(You Have)** vs **(Missing Gap)** badges.
