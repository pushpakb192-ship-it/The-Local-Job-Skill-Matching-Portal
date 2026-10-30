import os
import re
import json
import math
import urllib.request
import urllib.parse
from flask import Flask, render_template, request, jsonify
from database import init_db, get_db, POPULAR_SKILLS

app = Flask(__name__)

# Initialize database schema and verify seed on startup
init_db()

# In-memory cache for geocoding to prevent repetitive external API calls
GEOCODE_CACHE = {}

def haversine_km(lat1, lon1, lat2, lon2):
    """
    Computes accurate straight-line (great-circle) distance in kilometres
    between two latitude/longitude points using the Haversine formula.
    """
    try:
        lat1, lon1, lat2, lon2 = float(lat1), float(lon1), float(lat2), float(lon2)
    except (TypeError, ValueError):
        return None

    # Validate coordinate ranges
    if not (-90.0 <= lat1 <= 90.0 and -90.0 <= lat2 <= 90.0):
        return None
    if not (-180.0 <= lon1 <= 180.0 and -180.0 <= lon2 <= 180.0):
        return None

    R = 6371.0 # Mean Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 1)

def normalize_monthly_salary(salary_val, period):
    """
    Converts hourly, daily, monthly, or annual wages to a normalized monthly figure
    for consistent sorting and comparative filtering across salary periods.
    """
    if not salary_val:
        return 0.0
    try:
        val = float(salary_val)
    except (ValueError, TypeError):
        return 0.0

    p = (period or "month").strip().lower()
    if p in ("hr", "hour", "hourly"):
        return val * 160.0 # 40 hours/week * 4 weeks
    elif p in ("day", "daily"):
        return val * 22.0  # 22 standard working days per month
    elif p in ("year", "annual", "annually", "yr"):
        return val / 12.0
    return val # Default monthly

def calculate_skill_match(candidate_skills, required_skills, nice_to_have_skills):
    """
    Transparent, realistic skill matching engine:
    - 85% weighting for mandatory required skills.
    - 15% weighting for nice-to-have / bonus skills.
    - Accurately classifies matched vs. missing skills (skill gap detection).
    """
    if not candidate_skills:
        return {
            "match_percentage": 0,
            "matched_skills": [],
            "missing_skills": list(required_skills),
            "matched_bonus_skills": [],
            "missing_bonus_skills": list(nice_to_have_skills),
            "total_required": len(required_skills),
            "total_matched": 0
        }

    norm_candidate = {s.strip().lower() for s in candidate_skills if s.strip()}

    matched_req = []
    missing_req = []
    for s in required_skills:
        s_clean = s.strip().lower()
        if any(s_clean == c or s_clean in c or c in s_clean for c in norm_candidate):
            matched_req.append(s)
        else:
            missing_req.append(s)

    matched_nice = []
    missing_nice = []
    for s in nice_to_have_skills:
        s_clean = s.strip().lower()
        if any(s_clean == c or s_clean in c or c in s_clean for c in norm_candidate):
            matched_nice.append(s)
        else:
            missing_nice.append(s)

    total_req = len(required_skills)
    total_nice = len(nice_to_have_skills)

    req_ratio = len(matched_req) / max(1, total_req)

    if total_nice > 0:
        nice_ratio = len(matched_nice) / total_nice
        score = (req_ratio * 85) + (nice_ratio * 15)
        if req_ratio == 1.0 and score < 90:
            score = 90 + int(round(nice_ratio * 10))
    else:
        score = req_ratio * 100

    return {
        "match_percentage": min(100, int(round(score))),
        "matched_skills": matched_req,
        "missing_skills": missing_req,
        "matched_bonus_skills": matched_nice,
        "missing_bonus_skills": missing_nice,
        "total_required": total_req,
        "total_matched": len(matched_req)
    }

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/geocode", methods=["GET"])
def geocode_location():
    """
    Legitimate geocoding endpoint utilizing OpenStreetMap Nominatim.
    Resolves villages, towns, cities, districts, or 6-digit Indian PIN codes to coordinates.
    Includes caching and error handling. Never silently substitutes an unrelated city.
    """
    raw_query = request.args.get("q", "").strip()
    if not raw_query:
        return jsonify({"success": False, "error": "Location query is required."}), 400

    cache_key = raw_query.lower()
    if cache_key in GEOCODE_CACHE:
        return jsonify(GEOCODE_CACHE[cache_key])

    try:
        # Check if query is 6-digit PIN code or contains country context
        clean_q = raw_query
        if re.match(r'^\d{6}$', clean_q):
            search_str = f"{clean_q}, India"
        else:
            search_str = clean_q

        encoded = urllib.parse.quote(search_str)
        url = f"https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q={encoded}&limit=1"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "LocalJobSkillMatchingPortal/1.0 (local-match-portal-in)",
                "Accept-Language": "en"
            }
        )

        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and len(data) > 0:
                top = data[0]
                lat = float(top["lat"])
                lng = float(top["lon"])
                display_name = top.get("display_name", raw_query)
                address = top.get("address", {})

                city = (
                    address.get("city") or
                    address.get("town") or
                    address.get("village") or
                    address.get("suburb") or
                    address.get("municipality") or
                    address.get("county") or ""
                )
                state_name = address.get("state", "")
                pin_code = address.get("postcode", "")

                result = {
                    "success": True,
                    "query": raw_query,
                    "lat": lat,
                    "lng": lng,
                    "display_name": display_name,
                    "city": city,
                    "state": state_name,
                    "pin_code": pin_code
                }
                GEOCODE_CACHE[cache_key] = result
                return jsonify(result)
            else:
                return jsonify({
                    "success": False,
                    "error": f"Unable to find coordinates for '{raw_query}'. Please check the spelling or enter a nearby town/PIN code."
                }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Geocoding service unavailable: {str(e)}"
        }), 503

@app.route("/api/skills", methods=["GET"])
def get_skills():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT required_skills, nice_to_have_skills FROM jobs WHERE status = 'published'")
    all_skills = set(POPULAR_SKILLS)
    for row in cursor.fetchall():
        try:
            for s in json.loads(row["required_skills"] or "[]"):
                all_skills.add(s)
            for s in json.loads(row["nice_to_have_skills"] or "[]"):
                all_skills.add(s)
        except Exception:
            continue
    conn.close()
    return jsonify({
        "skills": sorted(list(all_skills)),
        "popular_skills": POPULAR_SKILLS
    })

@app.route("/api/neighborhoods", methods=["GET"])
def get_neighborhoods():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT DISTINCT neighborhood FROM jobs WHERE status = 'published' AND neighborhood IS NOT NULL AND neighborhood != '' ORDER BY neighborhood")
    neighborhoods = [row["neighborhood"] for row in cursor.fetchall()]
    conn.close()
    return jsonify(neighborhoods)

@app.route("/api/stats", methods=["GET"])
def get_stats():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE status = 'published'")
    total_jobs = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(DISTINCT company) FROM jobs WHERE status = 'published'")
    total_employers = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE status = 'published' AND urgent = 1")
    urgent_jobs = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM applications")
    total_applications = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM jobs WHERE job_source = 'demonstration_dataset'")
    demo_jobs = cursor.fetchone()[0]
    conn.close()

    return jsonify({
        "total_jobs": total_jobs,
        "total_employers": total_employers,
        "urgent_jobs": urgent_jobs,
        "total_applications": total_applications,
        "demo_jobs_count": demo_jobs
    })

@app.route("/api/jobs", methods=["GET"])
def get_jobs():
    """
    Search and filter jobs:
    - Text query (Title, Company, Description, Skills, Location, City, PIN)
    - GPS & Coordinate-based Location Search (lat, lng, radius in km)
    - Accurate Haversine Distance computation
    - Excludes jobs with invalid/null coordinates when coordinate filtering is active
    - Indian Rupee Salary Range filters (min_salary, max_salary, salary_period)
    - Experience level, Category, Job Type, Employment Type
    - Skill matching and missing skill gap detection
    - Sorting by nearest distance, highest match, pay, or recent
    """
    query = request.args.get("q", "").strip().lower()
    location_filter = request.args.get("location", "").strip()
    category_filter = request.args.get("category", "").strip()
    job_type_filter = request.args.get("job_type", "").strip()
    experience_filter = request.args.get("experience", "").strip()

    # Coordinates & Radius
    user_lat = request.args.get("lat", type=float)
    user_lng = request.args.get("lng", type=float)
    radius_km = request.args.get("radius", type=float)

    # Salary Filters (INR)
    min_salary = request.args.get("min_salary", type=float)
    max_salary = request.args.get("max_salary", type=float)
    salary_period = request.args.get("salary_period", "").strip().lower()

    urgent_only = request.args.get("urgent", "false").lower() == "true"
    min_match = request.args.get("min_match", type=int, default=0)
    sort_by = request.args.get("sort", "").strip()

    # Default sort
    has_coords = (user_lat is not None and user_lng is not None)
    if not sort_by:
        sort_by = "distance" if has_coords else "recent"

    # Candidate skills
    candidate_skills_raw = request.args.get("skills", "")
    candidate_skills = [s.strip() for s in candidate_skills_raw.split(",") if s.strip()]

    conn = get_db()
    cursor = conn.cursor()
    # Fetch only active, published jobs
    cursor.execute("""
        SELECT * FROM jobs
        WHERE status = 'published'
        AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
    """)
    rows = cursor.fetchall()
    conn.close()

    results = []
    for row in rows:
        job = dict(row)
        try:
            job["required_skills"] = json.loads(job.get("required_skills") or "[]")
        except Exception:
            job["required_skills"] = []
        try:
            job["nice_to_have_skills"] = json.loads(job.get("nice_to_have_skills") or "[]")
        except Exception:
            job["nice_to_have_skills"] = []
        try:
            job["benefits"] = json.loads(job.get("benefits") or "[]")
        except Exception:
            job["benefits"] = []

        job["urgent"] = bool(job.get("urgent", 0))
        job["verified_employer"] = bool(job.get("verified_employer", 0))
        job["currency"] = job.get("currency") or "INR"
        job["salary_min"] = float(job.get("salary_min") or 0)
        job["salary_max"] = float(job.get("salary_max") or 0)
        job["pay_period"] = job.get("pay_period") or "month"
        job["is_negotiable"] = bool(job.get("is_negotiable", 0))
        job["salary_disclosed"] = bool(job.get("salary_disclosed", 1))

        # Skill match computation
        match_info = calculate_skill_match(candidate_skills, job["required_skills"], job["nice_to_have_skills"])
        job.update(match_info)

        # 1. Location & Coordinate Distance Calculation
        if has_coords:
            job_lat = job.get("latitude")
            job_lng = job.get("longitude")
            # Exclude jobs with invalid or missing coordinates from GPS/coordinate-based distance results
            if job_lat is None or job_lng is None:
                continue

            dist = haversine_km(user_lat, user_lng, job_lat, job_lng)
            if dist is None:
                continue

            job["distance_km"] = dist

            # Radius filtering
            if radius_km is not None and radius_km > 0:
                if dist > radius_km:
                    continue
        else:
            # Text-based location filter when no GPS coordinates supplied
            if location_filter and location_filter != "All":
                loc_low = location_filter.lower()
                n_low = (job.get("neighborhood") or "").lower()
                l_low = (job.get("location") or "").lower()
                c_low = (job.get("city") or "").lower()
                p_low = (job.get("pin_code") or "").lower()
                if loc_low not in n_low and loc_low not in l_low and loc_low not in c_low and loc_low not in p_low:
                    continue

        # 2. Urgent filter
        if urgent_only and not job["urgent"]:
            continue

        # 3. Category / Sector filter
        if category_filter and category_filter != "All":
            if (job.get("category") or "").lower() != category_filter.lower():
                continue

        # 4. Job Type / Employment Type filter
        if job_type_filter and job_type_filter != "All":
            jtype = (job.get("job_type") or "").lower()
            etype = (job.get("employment_type") or "").lower()
            filter_low = job_type_filter.lower()
            if filter_low not in jtype and filter_low not in etype:
                continue

        # 5. Experience level filter
        if experience_filter and experience_filter != "All":
            if (job.get("experience_level") or "").lower() != experience_filter.lower():
                continue

        # 6. Salary filters (INR)
        if job["salary_disclosed"]:
            # If user selected specific period
            if salary_period and salary_period != "all":
                if job["pay_period"].lower() != salary_period:
                    continue

            norm_min = normalize_monthly_salary(job["salary_min"], job["pay_period"])
            norm_max = normalize_monthly_salary(job["salary_max"], job["pay_period"])

            if min_salary is not None and min_salary > 0:
                # Compare user min salary (normalized)
                user_norm_min = normalize_monthly_salary(min_salary, salary_period if salary_period and salary_period != "all" else "month")
                effective_max = norm_max if norm_max > 0 else norm_min
                if effective_max < user_norm_min:
                    continue

            if max_salary is not None and max_salary > 0:
                user_norm_max = normalize_monthly_salary(max_salary, salary_period if salary_period and salary_period != "all" else "month")
                effective_min = norm_min if norm_min > 0 else norm_max
                if effective_min > user_norm_max:
                    continue

        # 7. Minimum skill match threshold
        if min_match > 0 and len(candidate_skills) > 0 and job["match_percentage"] < min_match:
            continue

        # 8. Text search query (Title, Company, Location, Description, Skills, PIN)
        if query:
            haystack = " ".join([
                job.get("title", ""),
                job.get("company", ""),
                job.get("category", ""),
                job.get("location", ""),
                job.get("neighborhood", ""),
                job.get("city", ""),
                job.get("pin_code", ""),
                job.get("description", ""),
                " ".join(job["required_skills"]),
                " ".join(job["nice_to_have_skills"])
            ]).lower()

            query_tokens = query.split()
            if not all(token in haystack for token in query_tokens):
                continue

        results.append(job)

    # Sorting
    if sort_by == "distance" and has_coords:
        results.sort(key=lambda x: (x.get("distance_km") is None, x.get("distance_km", 999999)))
    elif sort_by == "match" and candidate_skills:
        results.sort(key=lambda x: (x["match_percentage"], -x.get("distance_km", 999999)), reverse=True)
    elif sort_by == "pay":
        results.sort(key=lambda x: normalize_monthly_salary(x["salary_max"] or x["salary_min"], x["pay_period"]), reverse=True)
    elif sort_by == "recent":
        results.sort(key=lambda x: (x["urgent"], x["id"]), reverse=True)
    else:
        if has_coords:
            results.sort(key=lambda x: (x.get("distance_km") is None, x.get("distance_km", 999999)))
        else:
            results.sort(key=lambda x: (x["urgent"], x["id"]), reverse=True)

    return jsonify({
        "count": len(results),
        "candidate_skills_count": len(candidate_skills),
        "has_coordinates": has_coords,
        "searched_lat": user_lat,
        "searched_lng": user_lng,
        "radius_km": radius_km,
        "jobs": results
    })

@app.route("/api/jobs/<int:job_id>", methods=["GET"])
def get_job(job_id):
    candidate_skills_raw = request.args.get("skills", "")
    candidate_skills = [s.strip() for s in candidate_skills_raw.split(",") if s.strip()]

    user_lat = request.args.get("lat", type=float)
    user_lng = request.args.get("lng", type=float)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM jobs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({"error": "Job not found"}), 404

    job = dict(row)
    try:
        job["required_skills"] = json.loads(job.get("required_skills") or "[]")
    except Exception:
        job["required_skills"] = []
    try:
        job["nice_to_have_skills"] = json.loads(job.get("nice_to_have_skills") or "[]")
    except Exception:
        job["nice_to_have_skills"] = []
    try:
        job["benefits"] = json.loads(job.get("benefits") or "[]")
    except Exception:
        job["benefits"] = []

    job["urgent"] = bool(job.get("urgent", 0))
    job["verified_employer"] = bool(job.get("verified_employer", 0))
    job["currency"] = job.get("currency") or "INR"
    job["salary_min"] = float(job.get("salary_min") or 0)
    job["salary_max"] = float(job.get("salary_max") or 0)
    job["pay_period"] = job.get("pay_period") or "month"
    job["is_negotiable"] = bool(job.get("is_negotiable", 0))
    job["salary_disclosed"] = bool(job.get("salary_disclosed", 1))

    match_info = calculate_skill_match(candidate_skills, job["required_skills"], job["nice_to_have_skills"])
    job.update(match_info)

    if user_lat is not None and user_lng is not None and job.get("latitude") and job.get("longitude"):
        job["distance_km"] = haversine_km(user_lat, user_lng, job["latitude"], job["longitude"])

    return jsonify(job)

@app.route("/api/jobs", methods=["POST"])
def create_job():
    try:
        data = request.get_json(silent=True) or {}
        required_fields = ["title", "company", "category", "location", "contact_email", "description"]
        for field in required_fields:
            if not data.get(field) or not str(data.get(field)).strip():
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate or geocode workplace coordinates
        workplace_lat = None
        workplace_lng = None
        if data.get("latitude") and data.get("longitude"):
            try:
                workplace_lat = float(data["latitude"])
                workplace_lng = float(data["longitude"])
            except (ValueError, TypeError):
                workplace_lat = None
                workplace_lng = None

        # Look up known coordinates for Bengaluru neighborhoods first for instant response
        neighborhood_coords = {
            "koramangala": (12.9352, 77.6245),
            "hsr layout": (12.9121, 77.6446),
            "indiranagar": (12.9719, 77.6412),
            "whitefield": (12.9698, 77.7500),
            "peenya industrial area": (13.0285, 77.5195),
            "rajajinagar": (12.9982, 77.5530),
            "electronic city": (12.8452, 77.6602),
            "jayanagar": (12.9308, 77.5838),
            "malleshwaram": (13.0031, 77.5643),
            "hebbal": (13.0358, 77.5970),
            "bannerghatta road": (12.8954, 77.5990),
            "mg road / cbd": (12.9756, 77.6066),
        }
        
        target_hood = str(data.get("neighborhood", "")).strip().lower()
        if (workplace_lat is None or workplace_lng is None) and target_hood in neighborhood_coords:
            workplace_lat, workplace_lng = neighborhood_coords[target_hood]

        # If still not found, try Nominatim with short timeout
        if workplace_lat is None or workplace_lng is None:
            addr_to_geo = f"{data.get('neighborhood', '')}, {data.get('city', 'Bengaluru')}"
            try:
                encoded = urllib.parse.quote(addr_to_geo)
                req = urllib.request.Request(
                    f"https://nominatim.openstreetmap.org/search?format=json&q={encoded}&limit=1",
                    headers={"User-Agent": "LocalJobSkillMatchingPortal/1.0"}
                )
                with urllib.request.urlopen(req, timeout=1.5) as resp:
                    geo_data = json.loads(resp.read().decode("utf-8"))
                    if geo_data:
                        workplace_lat = float(geo_data[0]["lat"])
                        workplace_lng = float(geo_data[0]["lon"])
            except Exception:
                pass

        # Fallback to Bengaluru center if none matched
        if workplace_lat is None or workplace_lng is None:
            workplace_lat, workplace_lng = (12.9716, 77.5946)

        try:
            salary_min = float(data.get("salary_min") or 0)
        except (ValueError, TypeError):
            salary_min = 0.0

        try:
            salary_max = float(data.get("salary_max") or 0)
        except (ValueError, TypeError):
            salary_max = 0.0

        currency = "INR"
        pay_period = data.get("pay_period", "month")
        is_negotiable = 1 if data.get("is_negotiable") else 0
        salary_disclosed = 0 if data.get("salary_disclosed") is False else 1

        # Format INR pay display string
        if not salary_disclosed:
            pay_str = "Salary Not Disclosed"
        elif is_negotiable and not salary_min and not salary_max:
            pay_str = "Negotiable"
        elif salary_min and salary_max:
            pay_str = f"₹{int(salary_min):,} - ₹{int(salary_max):,}"
        elif salary_min:
            pay_str = f"₹{int(salary_min):,}"
        elif salary_max:
            pay_str = f"Up to ₹{int(salary_max):,}"
        else:
            pay_str = "Negotiable"

        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
        INSERT INTO jobs (
            title, company, category, location, neighborhood, city, state, pin_code,
            latitude, longitude, distance_km, job_type, employment_type, pay, salary_min, salary_max,
            currency, pay_period, is_negotiable, salary_disclosed, experience_level, urgent,
            verified_employer, job_source, verification_status, status, contact_email,
            application_url, deadline, expires_at, description, required_skills,
            nice_to_have_skills, benefits, posted_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_DATE)
        """, (
            str(data["title"]).strip(),
            str(data["company"]).strip(),
            data.get("category", "Skilled Trades"),
            str(data["location"]).strip(),
            str(data.get("neighborhood", "")).strip() or str(data["location"]).strip(),
            str(data.get("city", "Bengaluru")).strip(),
            str(data.get("state", "Karnataka")).strip(),
            str(data.get("pin_code", "")).strip(),
            workplace_lat,
            workplace_lng,
            float(data.get("distance_km", 2.0)),
            data.get("job_type", "Full-time"),
            data.get("employment_type", data.get("job_type", "Full-time")),
            pay_str,
            salary_min,
            salary_max,
            currency,
            pay_period,
            is_negotiable,
            salary_disclosed,
            data.get("experience_level", "Intermediate"),
            1 if data.get("urgent") else 0,
            0, # Unverified until employer verification review
            "employer_posted",
            "unverified",
            "published",
            str(data["contact_email"]).strip(),
            str(data.get("application_url", "")).strip(),
            data.get("deadline", "2026-12-31"),
            data.get("expires_at", "2026-12-31"),
            str(data["description"]).strip(),
            json.dumps(data.get("required_skills", [])),
            json.dumps(data.get("nice_to_have_skills", [])),
            json.dumps(data.get("benefits", ["Competitive Pay", "Local Team"])),
        ))
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()

        return jsonify({
            "success": True,
            "job_id": new_id,
            "message": "Job listing posted successfully! Identified as employer-submitted listing."
        }), 201

    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@app.route("/api/jobs/<int:job_id>/apply", methods=["POST"])
def apply_job(job_id):
    data = request.json or {}
    if not data.get("applicant_name") or not data.get("applicant_email"):
        return jsonify({"error": "Name and email are required"}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT title, company FROM jobs WHERE id = ?", (job_id,))
    job = cursor.fetchone()
    if not job:
        conn.close()
        return jsonify({"error": "Job listing not found"}), 404

    cursor.execute("""
    INSERT INTO applications (
        job_id, applicant_name, applicant_email, applicant_phone,
        applicant_education, applicant_experience, applicant_skills, message
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        job_id,
        data["applicant_name"].strip(),
        data["applicant_email"].strip(),
        data.get("applicant_phone", "").strip(),
        data.get("applicant_education", "").strip(),
        data.get("applicant_experience", "").strip(),
        json.dumps(data.get("applicant_skills", [])),
        data.get("message", "").strip()
    ))
    application_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        "success": True,
        "application_id": application_id,
        "message": f"Application submitted to {job['company']} for {job['title']}!"
    }), 200

if __name__ == "__main__":
    print("Starting Local Job & Skill Matching Portal on http://127.0.0.1:5000")
    app.run(host="127.0.0.1", port=5000, debug=True)
