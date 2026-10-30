// State Management
const state = {
  selectedSkills: new Set(),
  searchQuery: "",
  manualLocationQuery: "",
  neighborhood: "All",
  userLat: null,
  userLng: null,
  locationLabel: "",
  locationSource: null, // 'gps' | 'manual' | 'neighborhood' | null
  radius: 25, // default 25 km
  category: "All",
  jobType: "All",
  experience: "All",
  minSalary: 0,
  maxSalary: 0,
  salaryPeriod: "all",
  urgentOnly: false,
  minMatch: 0,
  sortBy: "distance",
  savedJobIds: new Set(JSON.parse(localStorage.getItem("localmatch_saved_jobs") || "[]")),
  userProfile: JSON.parse(localStorage.getItem("localmatch_profile") || JSON.stringify({
    name: "",
    email: "",
    phone: "",
    education: "Bachelor's Degree (B.E./B.Tech/B.Sc/B.Com)",
    experience: "Intermediate",
    location: ""
  })),
  allPopularSkills: [],
  currentJobs: [],
  activeModalJob: null,
  isLocating: false,
  isGeocoding: false
};

// Known Locality Coordinates for Instant Accurate Distance Calculations
const NEIGHBORHOOD_COORDS = {
  "Koramangala": { lat: 12.9352, lng: 77.6245 },
  "HSR Layout": { lat: 12.9121, lng: 77.6446 },
  "Indiranagar": { lat: 12.9784, lng: 77.6408 },
  "Whitefield": { lat: 12.9698, lng: 77.7499 },
  "Peenya Industrial Area": { lat: 13.0285, lng: 77.5197 },
  "Rajajinagar": { lat: 12.9915, lng: 77.5525 },
  "Electronic City": { lat: 12.8452, lng: 77.6602 },
  "Jayanagar": { lat: 12.9308, lng: 77.5838 },
  "Malleshwaram": { lat: 13.0031, lng: 77.5643 },
  "Hebbal": { lat: 13.0358, lng: 77.5970 },
  "Bannerghatta Road": { lat: 12.8943, lng: 77.5986 },
  "MG Road / CBD": { lat: 12.9756, lng: 77.6066 },
  "Central": { lat: 12.9756, lng: 77.6066 },
  "Southgate": { lat: 12.8943, lng: 77.5986 }
};

// Skill Presets for Quick Testing & Demonstration
const PRESETS = {
  trades: ["Electrical Wiring", "Circuit Breakers", "Blueprint Reading", "Safety Compliance", "Troubleshooting"],
  healthcare: ["Patient Care", "Vital Signs", "First Aid / CPR", "Empathy & Communication", "Mobility Assistance"],
  hospitality: ["Espresso Calibration", "Latte Art", "Customer Service", "Cashier / POS", "Food Safety Certification"],
  tech: ["Python", "JavaScript", "HTML/CSS", "Troubleshooting", "REST APIs", "Git & GitHub"],
  warehouse: ["Forklift Operation", "OSHA Safety", "Inventory Scanning", "Pallet Jack", "Heavy Lifting (50lbs)"]
};

// DOM Elements
const searchInput = document.getElementById("search-input");
const clearSearchBtn = document.getElementById("clear-search-btn");
const neighborhoodSelect = document.getElementById("neighborhood-select");
const manualLocationInput = document.getElementById("manual-location-input");
const clearLocationBtn = document.getElementById("clear-location-btn");
const triggerSearchBtn = document.getElementById("trigger-search-btn");
const btnUseGps = document.getElementById("btn-use-gps");
const gpsBtnLabel = document.getElementById("gps-btn-label");
const radiusSelect = document.getElementById("radius-select");

// Location Status & Error Bars
const locationStatusBar = document.getElementById("location-status-bar");
const locTypeLabel = document.getElementById("loc-type-label");
const locDisplayName = document.getElementById("loc-display-name");
const locCoords = document.getElementById("loc-coords");
const locRadiusDisplay = document.getElementById("loc-radius-display");
const btnClearActiveLocation = document.getElementById("btn-clear-active-location");
const locationErrorBar = document.getElementById("location-error-bar");
const locationErrorMsg = document.getElementById("location-error-msg");
const btnDismissLocError = document.getElementById("btn-dismiss-loc-error");

// Filter Dropdowns
const categorySelect = document.getElementById("category-select");
const jobTypeSelect = document.getElementById("job-type-select");
const minSalarySelect = document.getElementById("min-salary-select");
const maxSalarySelect = document.getElementById("max-salary-select");
const salaryPeriodSelect = document.getElementById("salary-period-select");
const experienceSelect = document.getElementById("experience-select");
const urgentToggle = document.getElementById("urgent-toggle");
const resetFiltersBtn = document.getElementById("reset-filters-btn");
const categoryPills = document.querySelectorAll(".cat-pill");
const matchThresholdSelect = document.getElementById("match-threshold");
const sortSelect = document.getElementById("sort-select");

// Skill Dock Elements
const selectedSkillsContainer = document.getElementById("selected-skills-container");
const skillSelectDropdown = document.getElementById("skill-select-dropdown");
const skillInput = document.getElementById("skill-input");
const addSkillBtn = document.getElementById("add-skill-btn");
const skillSuggestions = document.getElementById("skill-suggestions");
const clearSkillsBtn = document.getElementById("clear-skills-btn");

// Main Results Elements
const jobCardsContainer = document.getElementById("job-cards-container");
const resultsCount = document.getElementById("results-count");
const emptyState = document.getElementById("empty-state");
const savedCountBadge = document.getElementById("saved-count-badge");
const activeFilterTags = document.getElementById("active-filter-tags");

// Empty State Buttons
const btnExpand50 = document.getElementById("btn-expand-50");
const btnExpand100 = document.getElementById("btn-expand-100");
const btnClearLocEmpty = document.getElementById("btn-clear-loc-empty");
const emptyResetBtn = document.getElementById("empty-reset-btn");

// Modals
const profileModal = document.getElementById("profile-modal");
const btnOpenProfile = document.getElementById("btn-open-profile");
const profileCloseBtn = document.getElementById("profile-close-btn");
const profileCancelBtn = document.getElementById("profile-cancel-btn");
const profileForm = document.getElementById("profile-form");

const jobModal = document.getElementById("job-modal");
const modalCloseBtn = document.getElementById("modal-close-btn");
const modalSaveBtn = document.getElementById("modal-save-btn");
const modalApplyBtn = document.getElementById("modal-apply-btn");

const applyModal = document.getElementById("apply-modal");
const applyCloseBtn = document.getElementById("apply-close-btn");
const applyCancelBtn = document.getElementById("apply-cancel-btn");
const applyForm = document.getElementById("apply-form");

const postModal = document.getElementById("post-modal");
const btnOpenPost = document.getElementById("btn-open-post");
const postCloseBtn = document.getElementById("post-close-btn");
const postCancelBtn = document.getElementById("post-cancel-btn");
const postForm = document.getElementById("post-form");

const savedModal = document.getElementById("saved-modal");
const btnOpenSaved = document.getElementById("btn-open-saved");
const savedCloseBtn = document.getElementById("saved-close-btn");
const savedJobsList = document.getElementById("saved-jobs-list");

// Initialize Lucide Icons
function refreshIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Toast notification
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const msgEl = document.getElementById("toast-message");
  const iconEl = document.getElementById("toast-icon");
  
  msgEl.textContent = message;
  iconEl.className = type === "success" ? "text-emerald-400" : "text-amber-400";
  
  toast.classList.remove("translate-y-20", "opacity-0", "pointer-events-none");
  toast.classList.add("translate-y-0", "opacity-100");
  
  setTimeout(() => {
    toast.classList.add("translate-y-20", "opacity-0", "pointer-events-none");
    toast.classList.remove("translate-y-0", "opacity-100");
  }, 3200);
}

// Indian Currency Formatting Utility (Intl.NumberFormat with en-IN and INR)
const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

function formatINR(amount) {
  if (amount == null || isNaN(amount) || amount === "") return "";
  const num = parseFloat(amount);
  return inrFormatter.format(num);
}

function formatSalaryDisplay(job) {
  if (job.salary_disclosed === false || job.salary_disclosed === 0) {
    return "Salary Not Disclosed";
  }

  const periodMap = {
    hr: "hour",
    hour: "hour",
    day: "day",
    month: "month",
    year: "year",
    annual: "year"
  };
  const period = periodMap[(job.pay_period || "month").toLowerCase()] || job.pay_period || "month";

  const minVal = parseFloat(job.salary_min || 0);
  const maxVal = parseFloat(job.salary_max || 0);

  if (minVal > 0 && maxVal > 0 && minVal !== maxVal) {
    return `${formatINR(minVal)} – ${formatINR(maxVal)} / ${period}${job.is_negotiable ? ' (Negotiable)' : ''}`;
  } else if (minVal > 0) {
    return `${formatINR(minVal)} / ${period}${job.is_negotiable ? ' (Negotiable)' : ''}`;
  } else if (maxVal > 0) {
    return `Up to ${formatINR(maxVal)} / ${period}${job.is_negotiable ? ' (Negotiable)' : ''}`;
  } else if (job.pay && job.pay !== "-") {
    return `${job.pay} / ${period}`;
  }
  return "Negotiable";
}

// Saved jobs in LocalStorage
function updateSavedBadge() {
  savedCountBadge.textContent = state.savedJobIds.size;
  localStorage.setItem("localmatch_saved_jobs", JSON.stringify([...state.savedJobIds]));
}

function toggleSaveJob(jobId, event) {
  if (event) event.stopPropagation();
  if (state.savedJobIds.has(jobId)) {
    state.savedJobIds.delete(jobId);
    showToast("Job removed from saved list.");
  } else {
    state.savedJobIds.add(jobId);
    showToast("Job saved to your bookmarks!");
  }
  updateSavedBadge();
  renderJobCards(state.currentJobs);
  if (state.activeModalJob && state.activeModalJob.id === jobId) {
    updateModalSaveButton(jobId);
  }
}

function updateModalSaveButton(jobId) {
  const isSaved = state.savedJobIds.has(jobId);
  const saveText = document.getElementById("modal-save-text");
  if (isSaved) {
    saveText.textContent = "Saved";
    modalSaveBtn.classList.add("bg-blue-50", "text-blue-700", "border-blue-300");
  } else {
    saveText.textContent = "Save Job";
    modalSaveBtn.classList.remove("bg-blue-50", "text-blue-700", "border-blue-300");
  }
}

// Skill Suggestions & Skill Select Dropdown Rendering
function renderSkillSuggestions() {
  skillSuggestions.innerHTML = "";
  const unselectedPopular = state.allPopularSkills
    .filter(skill => !state.selectedSkills.has(skill));

  // Populate Skill Select Dropdown
  if (skillSelectDropdown) {
    skillSelectDropdown.innerHTML = '<option value="">➕ Select a Skill to Add...</option>' +
      unselectedPopular.map(s => `<option value="${s}">${s}</option>`).join("");
  }

  // Populate top 8 suggestion buttons
  unselectedPopular.slice(0, 8).forEach(skill => {
    const pill = document.createElement("button");
    pill.className = "px-2 py-1 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 shadow-2xs cursor-pointer";
    pill.innerHTML = `<span>+ ${skill}</span>`;
    pill.onclick = () => addSkill(skill);
    skillSuggestions.appendChild(pill);
  });
}

// Selected Skills Badges Rendering
function renderSelectedSkills() {
  selectedSkillsContainer.innerHTML = "";
  if (state.selectedSkills.size === 0) {
    selectedSkillsContainer.innerHTML = `<span class="text-xs text-slate-400 italic">No skills selected yet. Select from the dropdown below or click popular skills to calculate match scores!</span>`;
    renderSkillSuggestions();
    syncSkillsToProfileModal();
    return;
  }

  state.selectedSkills.forEach(skill => {
    const badge = document.createElement("span");
    badge.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-600 text-white shadow-xs animate-fade-in";
    badge.innerHTML = `
      <span>${skill}</span>
      <button class="hover:text-blue-200 focus:outline-none cursor-pointer" title="Remove skill">
        <i data-lucide="x" class="w-3.5 h-3.5"></i>
      </button>
    `;
    badge.querySelector("button").onclick = () => removeSkill(skill);
    selectedSkillsContainer.appendChild(badge);
  });

  renderSkillSuggestions();
  syncSkillsToProfileModal();
  refreshIcons();
}

function syncSkillsToProfileModal() {
  const container = document.getElementById("prof-skills-preview");
  if (!container) return;
  if (state.selectedSkills.size === 0) {
    container.innerHTML = `<span class="text-xs text-slate-400 italic">No active skills. Select skills from the main dock or add them here.</span>`;
  } else {
    container.innerHTML = [...state.selectedSkills].map(s => 
      `<span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-xs">${s}</span>`
    ).join("");
  }
}

function addSkill(skillName) {
  const clean = skillName.trim();
  if (clean && !state.selectedSkills.has(clean)) {
    state.selectedSkills.add(clean);
    renderSelectedSkills();
    showToast(`Added skill: ${clean}`);
    fetchJobs();
  }
}

function removeSkill(skillName) {
  state.selectedSkills.delete(skillName);
  renderSelectedSkills();
  fetchJobs();
}

function clearAllSkills() {
  state.selectedSkills.clear();
  renderSelectedSkills();
  fetchJobs();
  showToast("Skills cleared.");
}

function applyPreset(presetKey) {
  const skills = PRESETS[presetKey];
  if (skills) {
    state.selectedSkills = new Set(skills);
    renderSelectedSkills();
    fetchJobs();
    showToast(`Loaded "${presetKey.toUpperCase()}" skill profile!`);
  }
}

// Location Management: GPS Location
function requestGpsLocation() {
  if (!navigator.geolocation) {
    showLocationError("Geolocation is not supported by your web browser. Please enter your location or PIN code manually.");
    return;
  }

  state.isLocating = true;
  gpsBtnLabel.textContent = "Locating...";
  btnUseGps.classList.add("opacity-75");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      state.isLocating = false;
      gpsBtnLabel.textContent = "GPS Active";
      btnUseGps.classList.remove("opacity-75");
      btnUseGps.className = "flex-1 py-2.5 px-2 bg-emerald-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer";

      state.userLat = position.coords.latitude;
      state.userLng = position.coords.longitude;
      state.locationSource = "gps";
      state.locationLabel = `GPS Location (${state.userLat.toFixed(4)}° N, ${state.userLng.toFixed(4)}° E)`;
      
      neighborhoodSelect.value = "All";
      state.neighborhood = "All";
      manualLocationInput.value = "";
      clearLocationBtn.classList.add("hidden");

      updateLocationStatusUI();
      hideLocationError();

      if (state.sortBy !== "pay" && state.sortBy !== "match") {
        state.sortBy = "distance";
        sortSelect.value = "distance";
      }

      fetchJobs();
      showToast("GPS coordinates acquired. Showing nearest jobs!");
    },
    (err) => {
      state.isLocating = false;
      gpsBtnLabel.textContent = "GPS";
      btnUseGps.classList.remove("opacity-75");
      btnUseGps.className = "flex-1 py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer";

      let errorMsg = "Unable to access your current location.";
      if (err.code === err.PERMISSION_DENIED) {
        errorMsg = "GPS location permission was denied. Please allow location access in your browser or select an area/PIN code manually.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errorMsg = "GPS signal is currently unavailable. Please select your area or enter a PIN code manually.";
      } else if (err.code === err.TIMEOUT) {
        errorMsg = "Location request timed out. Please try again or select your area manually.";
      }
      showLocationError(errorMsg);
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000
    }
  );
}

// Location Management: Select Neighborhood Option Dropdown
function selectNeighborhood(hood) {
  state.neighborhood = hood;
  if (!hood || hood === "All") {
    clearActiveLocation();
    return;
  }

  // Check if we have pre-calibrated coordinates for this neighborhood
  const coords = NEIGHBORHOOD_COORDS[hood];
  if (coords) {
    state.userLat = coords.lat;
    state.userLng = coords.lng;
    state.locationSource = "neighborhood";
    state.locationLabel = `${hood}, Bengaluru`;
  } else {
    state.userLat = null;
    state.userLng = null;
    state.locationSource = "neighborhood";
    state.locationLabel = hood;
  }

  manualLocationInput.value = "";
  clearLocationBtn.classList.add("hidden");
  updateLocationStatusUI();
  hideLocationError();

  if (state.sortBy !== "pay" && state.sortBy !== "match") {
    state.sortBy = "distance";
    sortSelect.value = "distance";
  }

  fetchJobs();
  showToast(`Selected Area: ${hood}`);
}

// Location Management: Manual Geocoded Search (Village, Town, PIN Code)
async function resolveManualLocation(query) {
  const cleanQ = query.trim();
  if (!cleanQ) {
    clearActiveLocation();
    return;
  }

  state.isGeocoding = true;
  triggerSearchBtn.disabled = true;
  triggerSearchBtn.innerHTML = `<span class="animate-spin inline-block mr-1">⌛</span>`;

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(cleanQ)}`);
    const data = await res.json();

    if (res.ok && data.success) {
      state.userLat = data.lat;
      state.userLng = data.lng;
      state.locationSource = "manual";
      
      let label = data.city || data.state ? `${data.city || ""}${data.city && data.state ? ", " : ""}${data.state || ""}` : cleanQ;
      if (data.pin_code) label += ` (PIN: ${data.pin_code})`;
      if (!label.trim()) label = data.display_name.split(",").slice(0, 2).join(",");
      state.locationLabel = label;

      neighborhoodSelect.value = "All";
      state.neighborhood = "All";

      updateLocationStatusUI();
      hideLocationError();

      if (state.sortBy !== "pay" && state.sortBy !== "match") {
        state.sortBy = "distance";
        sortSelect.value = "distance";
      }

      fetchJobs();
      showToast(`Location resolved: ${state.locationLabel}`);
    } else {
      showLocationError(data.error || `Unable to find coordinates for '${cleanQ}'. Please check the spelling or enter a nearby town/PIN code.`);
    }
  } catch (err) {
    console.error("Geocoding fetch error:", err);
    showLocationError(`Geocoding service network error. Please try again or select from the area dropdown.`);
  } finally {
    state.isGeocoding = false;
    triggerSearchBtn.disabled = false;
    triggerSearchBtn.innerHTML = `<i data-lucide="search" class="w-3.5 h-3.5"></i><span>Find</span>`;
    refreshIcons();
  }
}

function updateLocationStatusUI() {
  if (state.userLat !== null && state.userLng !== null) {
    locationStatusBar.classList.remove("hidden");
    locTypeLabel.textContent = state.locationSource === "gps" ? "GPS Active" : "Area Selected";
    locDisplayName.textContent = state.locationLabel || "Selected Location";
    locCoords.textContent = `(${state.userLat.toFixed(4)}° N, ${state.userLng.toFixed(4)}° E)`;
    locRadiusDisplay.textContent = state.radius > 0 ? `Radius: ≤ ${state.radius} km` : "Radius: Any Distance";
  } else if (state.neighborhood && state.neighborhood !== "All") {
    locationStatusBar.classList.remove("hidden");
    locTypeLabel.textContent = "Area Filter";
    locDisplayName.textContent = state.neighborhood;
    locCoords.textContent = "";
    locRadiusDisplay.textContent = "All Distances in Area";
  } else {
    locationStatusBar.classList.add("hidden");
  }
  refreshIcons();
}

function clearActiveLocation() {
  state.userLat = null;
  state.userLng = null;
  state.locationLabel = "";
  state.locationSource = null;
  state.neighborhood = "All";
  if (neighborhoodSelect) neighborhoodSelect.value = "All";
  state.manualLocationQuery = "";
  manualLocationInput.value = "";
  clearLocationBtn.classList.add("hidden");

  btnUseGps.className = "flex-1 py-2.5 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all shadow-xs cursor-pointer";
  gpsBtnLabel.textContent = "GPS";

  updateLocationStatusUI();
  hideLocationError();

  if (state.sortBy === "distance") {
    state.sortBy = "recent";
    sortSelect.value = "recent";
  }

  fetchJobs();
  showToast("Location filter cleared. Showing all regional vacancies.");
}

function showLocationError(msg) {
  locationErrorMsg.textContent = msg;
  locationErrorBar.classList.remove("hidden");
  showToast(msg, "warning");
  refreshIcons();
}

function hideLocationError() {
  locationErrorBar.classList.add("hidden");
}

// Fetch Jobs from Server
let debounceTimer = null;
async function fetchJobs() {
  const params = new URLSearchParams();

  if (state.searchQuery) params.append("q", state.searchQuery);

  // Send Coordinates and Radius
  if (state.userLat !== null && state.userLng !== null) {
    params.append("lat", state.userLat);
    params.append("lng", state.userLng);
    if (state.radius > 0) {
      params.append("radius", state.radius);
    }
  } else if (state.neighborhood && state.neighborhood !== "All") {
    params.append("location", state.neighborhood);
  } else if (state.manualLocationQuery) {
    params.append("location", state.manualLocationQuery);
  }

  // Categories & Filters
  if (state.category && state.category !== "All") params.append("category", state.category);
  if (state.jobType && state.jobType !== "All") params.append("job_type", state.jobType);
  if (state.experience && state.experience !== "All") params.append("experience", state.experience);

  // Salary Filters (INR)
  if (state.minSalary > 0) params.append("min_salary", state.minSalary);
  if (state.maxSalary > 0) params.append("max_salary", state.maxSalary);
  if (state.salaryPeriod && state.salaryPeriod !== "all") params.append("salary_period", state.salaryPeriod);

  if (state.urgentOnly) params.append("urgent", "true");
  if (state.minMatch > 0) params.append("min_match", state.minMatch);
  params.append("sort", state.sortBy);

  if (state.selectedSkills.size > 0) {
    params.append("skills", [...state.selectedSkills].join(","));
  }

  resultsCount.textContent = "Searching...";

  try {
    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();
    state.currentJobs = data.jobs || [];

    renderActiveFilterTags();
    renderJobCards(state.currentJobs);
    
    const count = state.currentJobs.length;
    resultsCount.textContent = `${count} ${count === 1 ? 'Job' : 'Jobs'} Found`;

    // Manage empty state message details
    if (count === 0 && (state.userLat !== null || (state.neighborhood && state.neighborhood !== "All") || state.manualLocationQuery)) {
      document.getElementById("empty-state-title").textContent = "No jobs found near your selected location.";
      document.getElementById("empty-state-subtitle").textContent = 
        `We could not find active vacancies within ${state.radius > 0 ? state.radius + ' km of ' + (state.locationLabel || state.neighborhood || 'your location') : 'your selected area'}. Try expanding your search radius to 50 km or 100 km, or select another locality or PIN code.`;
    } else {
      document.getElementById("empty-state-title").textContent = "No matching jobs found";
      document.getElementById("empty-state-subtitle").textContent = "Try broadening your search term, adjusting filters, or clearing specific constraints.";
    }

  } catch (err) {
    console.error("Error fetching jobs:", err);
    resultsCount.textContent = "Error loading jobs";
  }
}

// Render Active Filter Tags
function renderActiveFilterTags() {
  activeFilterTags.innerHTML = "";
  const filters = [];

  if (state.searchQuery) {
    filters.push({ 
      label: `Query: "${state.searchQuery}"`, 
      clear: () => { 
        state.searchQuery = ""; 
        searchInput.value = ""; 
        clearSearchBtn.classList.add("hidden"); 
      } 
    });
  }

  if (state.neighborhood && state.neighborhood !== "All") {
    filters.push({
      label: `📍 Area: ${state.neighborhood}`,
      clear: clearActiveLocation
    });
  } else if (state.userLat !== null && state.userLng !== null) {
    filters.push({
      label: `📍 ${state.locationLabel} (≤ ${state.radius} km)`,
      clear: clearActiveLocation
    });
  }

  if (state.category !== "All") {
    filters.push({ label: `Sector: ${state.category}`, clear: () => setCategory("All") });
  }

  if (state.jobType !== "All") {
    filters.push({ label: `Type: ${state.jobType}`, clear: () => setJobType("All") });
  }

  if (state.experience !== "All") {
    filters.push({ 
      label: `Exp: ${state.experience}`, 
      clear: () => { 
        state.experience = "All"; 
        experienceSelect.value = "All"; 
      } 
    });
  }

  if (state.minSalary > 0) {
    filters.push({ 
      label: `Min: ${formatINR(state.minSalary)}`, 
      clear: () => { 
        state.minSalary = 0; 
        minSalarySelect.value = "0"; 
      } 
    });
  }

  if (state.maxSalary > 0) {
    filters.push({ 
      label: `Max: ${formatINR(state.maxSalary)}`, 
      clear: () => { 
        state.maxSalary = 0; 
        maxSalarySelect.value = "0"; 
      } 
    });
  }

  if (state.salaryPeriod !== "all") {
    filters.push({ 
      label: `Period: / ${state.salaryPeriod}`, 
      clear: () => { 
        state.salaryPeriod = "all"; 
        salaryPeriodSelect.value = "all"; 
      } 
    });
  }

  if (state.urgentOnly) {
    filters.push({ 
      label: `Urgent Only`, 
      clear: () => { 
        state.urgentOnly = false; 
        urgentToggle.checked = false; 
      } 
    });
  }

  if (state.minMatch > 0) {
    filters.push({ 
      label: `Min Match: ${state.minMatch}%`, 
      clear: () => { 
        state.minMatch = 0; 
        matchThresholdSelect.value = "0"; 
      } 
    });
  }

  filters.forEach(f => {
    const tag = document.createElement("span");
    tag.className = "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-200 text-slate-700 shadow-2xs";
    tag.innerHTML = `<span>${f.label}</span><button class="hover:text-red-600 ml-0.5 focus:outline-none cursor-pointer" title="Remove filter">✕</button>`;
    tag.querySelector("button").onclick = () => {
      f.clear();
      fetchJobs();
    };
    activeFilterTags.appendChild(tag);
  });
}

// Render Job Cards Grid
function renderJobCards(jobs) {
  jobCardsContainer.innerHTML = "";

  if (jobs.length === 0) {
    emptyState.classList.remove("hidden");
    jobCardsContainer.classList.add("hidden");
    return;
  }

  emptyState.classList.add("hidden");
  jobCardsContainer.classList.remove("hidden");

  jobs.forEach(job => {
    const card = document.createElement("div");
    card.className = "job-card bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:border-blue-400 relative overflow-hidden transition-all";
    
    const isSaved = state.savedJobIds.has(job.id);

    // Skill Match Gauge Styling
    let matchColor = "bg-slate-100 text-slate-600 border-slate-200";
    let matchLabel = "No skills set";
    if (state.selectedSkills.size > 0) {
      if (job.match_percentage >= 80) {
        matchColor = "bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-500/20";
        matchLabel = "High Match";
      } else if (job.match_percentage >= 50) {
        matchColor = "bg-blue-50 text-blue-700 border-blue-300 ring-1 ring-blue-500/20";
        matchLabel = "Good Match";
      } else {
        matchColor = "bg-amber-50 text-amber-700 border-amber-300";
        matchLabel = "Partial";
      }
    }

    // Required Skills Badges with Match Indicators
    const reqSkills = job.required_skills || [];
    const skillsHtml = reqSkills.slice(0, 4).map(skill => {
      const hasSkill = job.matched_skills && job.matched_skills.includes(skill);
      if (hasSkill) {
        return `<span class="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md">
          <i data-lucide="check" class="w-3 h-3 text-emerald-600"></i> ${skill}
        </span>`;
      } else {
        return `<span class="inline-flex items-center text-[11px] font-medium bg-slate-100 text-slate-600 border border-dashed border-slate-300 px-2 py-0.5 rounded-md">
          ${skill}
        </span>`;
      }
    }).join("");

    // Verification / Demonstration Badge
    let sourceBadge = "";
    if (job.verification_status === "demo" || job.job_source === "demonstration_dataset") {
      sourceBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200" title="Demonstration listing for distance & matching evaluation">📋 Demo Record</span>`;
    } else if (job.verified_employer) {
      sourceBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-0.5"><i data-lucide="check-circle" class="w-3 h-3 text-blue-600"></i> Verified</span>`;
    } else {
      sourceBadge = `<span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">Employer Posted</span>`;
    }

    // Salary Display (INR)
    const formattedSalary = formatSalaryDisplay(job);

    // Distance display
    let distanceHtml = "";
    if (job.distance_km !== undefined && job.distance_km !== null) {
      distanceHtml = `<span class="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded text-[11px]">📍 ${job.distance_km} km away</span>`;
    } else {
      distanceHtml = `<span class="text-slate-400 text-[11px]">📍 Karnataka</span>`;
    }

    card.innerHTML = `
      <div>
        <!-- Top Row: Badges, Distance & Bookmark -->
        <div class="flex items-center justify-between gap-2 mb-2.5">
          <div class="flex items-center gap-1.5 flex-wrap">
            ${job.urgent ? `
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse">
                <i data-lucide="zap" class="w-3 h-3"></i> Urgent
              </span>
            ` : ""}
            ${sourceBadge}
            <span class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
              ${job.category}
            </span>
          </div>

          <button class="save-job-btn p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer" title="${isSaved ? 'Remove bookmark' : 'Save job'}">
            <i data-lucide="bookmark" class="w-4 h-4 ${isSaved ? 'fill-blue-600 text-blue-600' : ''}"></i>
          </button>
        </div>

        <!-- Job Title & Company -->
        <h3 class="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 leading-snug line-clamp-1">
          ${job.title}
        </h3>
        
        <div class="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
          <span class="font-semibold text-slate-800">${job.company}</span>
          ${job.verified_employer ? `<i data-lucide="check-circle" class="w-3.5 h-3.5 text-blue-600 inline" title="Verified Local Employer"></i>` : ""}
        </div>

        <!-- Workplace Location & Real Distance -->
        <div class="flex items-center gap-2 text-xs text-slate-500 mt-2 flex-wrap">
          <span class="flex items-center gap-1">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500"></i> ${job.neighborhood || job.location}${job.pin_code ? ' (' + job.pin_code + ')' : ''}
          </span>
          <span>•</span>
          ${distanceHtml}
        </div>

        <!-- INR Salary Display -->
        <div class="mt-3 flex items-baseline gap-1">
          <span class="text-base sm:text-lg font-extrabold text-emerald-700">${formattedSalary}</span>
        </div>

        <!-- Skills Breakdown -->
        <div class="mt-3 pt-3 border-t border-slate-100">
          <div class="text-[11px] font-semibold text-slate-500 mb-1.5">Required Skills:</div>
          <div class="flex flex-wrap gap-1.5">
            ${skillsHtml}
            ${reqSkills.length > 4 ? `<span class="text-[10px] text-slate-400 font-medium self-center">+${reqSkills.length - 4} more</span>` : ""}
          </div>
        </div>
      </div>

      <!-- Footer: Match Gauge & Action Buttons -->
      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        ${state.selectedSkills.size > 0 ? `
          <div class="flex items-center gap-1.5">
            <div class="px-2.5 py-1 rounded-full text-xs font-bold border ${matchColor}">
              ${job.match_percentage}% Match
            </div>
            <span class="text-[11px] text-slate-500">${(job.matched_skills || []).length}/${reqSkills.length} skills</span>
          </div>
        ` : `
          <span class="text-xs text-slate-400 italic">Select skills to match</span>
        `}

        <div class="flex items-center gap-2">
          <button class="details-btn px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer">
            Details
          </button>
          <button class="quick-apply-btn px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer">
            Apply
          </button>
        </div>
      </div>
    `;

    // Event Listeners on Card
    card.onclick = () => openJobModal(job);
    card.querySelector(".save-job-btn").onclick = (e) => toggleSaveJob(job.id, e);
    card.querySelector(".details-btn").onclick = (e) => { e.stopPropagation(); openJobModal(job); };
    card.querySelector(".quick-apply-btn").onclick = (e) => { e.stopPropagation(); openApplyModal(job); };

    jobCardsContainer.appendChild(card);
  });

  refreshIcons();
}

// Open Job Details Modal
function openJobModal(job) {
  state.activeModalJob = job;

  document.getElementById("modal-title").textContent = job.title;
  document.getElementById("modal-company").textContent = job.company;

  // Complete address & coordinates
  const addressText = `${job.location}, ${job.neighborhood || ""}, ${job.city || "Bengaluru"}, ${job.state || "Karnataka"} ${job.pin_code ? "- " + job.pin_code : ""}`;
  document.getElementById("modal-full-address").textContent = addressText;
  document.getElementById("modal-location").innerHTML = `<i data-lucide="map-pin" class="w-3.5 h-3.5 text-rose-500 inline"></i> ${job.neighborhood || job.location}`;

  if (job.latitude && job.longitude) {
    document.getElementById("modal-coords").textContent = `${job.latitude.toFixed(4)}° N, ${job.longitude.toFixed(4)}° E`;
  } else {
    document.getElementById("modal-coords").textContent = "Coordinates pending employer verification";
  }

  if (job.distance_km !== undefined && job.distance_km !== null) {
    document.getElementById("modal-distance").textContent = `${job.distance_km} km away`;
  } else {
    document.getElementById("modal-distance").textContent = "Distance requires GPS/Area search";
  }

  document.getElementById("modal-deadline").textContent = job.deadline || "Open until filled";
  document.getElementById("modal-category").textContent = job.category;
  document.getElementById("modal-job-type").textContent = job.job_type;
  document.getElementById("modal-pay").textContent = formatSalaryDisplay(job);
  document.getElementById("modal-description").textContent = job.description;

  // Urgent badge
  const urgentBadge = document.getElementById("modal-badge-urgent");
  if (job.urgent) {
    urgentBadge.classList.remove("hidden");
  } else {
    urgentBadge.classList.add("hidden");
  }

  // Demonstration tag & banner
  const demoTag = document.getElementById("modal-demo-tag");
  const demoBanner = document.getElementById("modal-demo-banner");
  if (job.verification_status === "demo" || job.job_source === "demonstration_dataset") {
    demoTag.classList.remove("hidden");
    demoBanner.classList.remove("hidden");
  } else {
    demoTag.classList.add("hidden");
    demoBanner.classList.add("hidden");
  }

  // Verification status
  const verifiedBadge = document.getElementById("modal-verified-badge");
  if (job.verified_employer) {
    verifiedBadge.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4 text-blue-600 inline mr-0.5"></i> Verified Local Business`;
  } else if (job.job_source === "demonstration_dataset") {
    verifiedBadge.innerHTML = `<span class="text-amber-700 font-semibold">Demonstration Record</span>`;
  } else {
    verifiedBadge.innerHTML = `<span class="text-slate-500">Unverified Employer</span>`;
  }

  // Skill Compatibility breakdown
  const matchBox = document.getElementById("modal-match-box");
  const matchPercent = document.getElementById("modal-match-percent");
  const matchLabel = document.getElementById("modal-match-label");
  const matchDetail = document.getElementById("modal-match-detail");

  if (state.selectedSkills.size > 0) {
    matchBox.classList.remove("hidden");
    matchPercent.textContent = `${job.match_percentage}%`;
    const matchedCount = (job.matched_skills || []).length;
    const totalCount = (job.required_skills || []).length;
    matchDetail.textContent = `${matchedCount} of ${totalCount} required skills matched`;

    if (job.match_percentage >= 80) {
      matchPercent.className = "text-xl font-extrabold text-emerald-600";
      matchLabel.className = "text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
      matchLabel.textContent = "High Match";
    } else if (job.match_percentage >= 50) {
      matchPercent.className = "text-xl font-extrabold text-blue-600";
      matchLabel.className = "text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800";
      matchLabel.textContent = "Good Match";
    } else {
      matchPercent.className = "text-xl font-extrabold text-amber-600";
      matchLabel.className = "text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800";
      matchLabel.textContent = "Partial Match";
    }
  } else {
    matchPercent.textContent = "--%";
    matchLabel.className = "text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-600";
    matchLabel.textContent = "No skills set";
    matchDetail.textContent = "Add your skills to see match score";
  }

  // Required Skills List (Categorized: You Have vs Skill Gap)
  const reqContainer = document.getElementById("modal-required-skills");
  const reqSkills = job.required_skills || [];
  reqContainer.innerHTML = reqSkills.map(skill => {
    const isMatched = job.matched_skills && job.matched_skills.includes(skill);
    if (isMatched) {
      return `<span class="inline-flex items-center gap-1 text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 px-2.5 py-1 rounded-lg">
        <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-emerald-600"></i> ${skill} <span class="text-[10px] font-semibold text-emerald-700">(You Have)</span>
      </span>`;
    } else {
      return `<span class="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-900 border border-dashed border-amber-300 px-2.5 py-1 rounded-lg">
        <i data-lucide="alert-circle" class="w-3.5 h-3.5 text-amber-500"></i> ${skill} <span class="text-[10px] font-semibold text-amber-700">(Missing Gap)</span>
      </span>`;
    }
  }).join("");

  // Nice to have skills
  const niceContainer = document.getElementById("modal-nice-skills");
  const niceSkills = job.nice_to_have_skills || [];
  if (niceSkills.length > 0) {
    niceContainer.innerHTML = niceSkills.map(skill => {
      const isMatched = job.matched_bonus_skills && job.matched_bonus_skills.includes(skill);
      if (isMatched) {
        return `<span class="inline-flex items-center gap-1 text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 px-2.5 py-1 rounded-lg">
          <i data-lucide="sparkles" class="w-3.5 h-3.5 text-blue-600"></i> ${skill} (Bonus Match)
        </span>`;
      } else {
        return `<span class="inline-flex items-center text-xs font-medium bg-slate-50 text-slate-600 border border-slate-200 px-2.5 py-1 rounded-lg">
          ${skill}
        </span>`;
      }
    }).join("");
  } else {
    niceContainer.innerHTML = `<span class="text-xs text-slate-400">None specified</span>`;
  }

  // Benefits
  const benContainer = document.getElementById("modal-benefits");
  benContainer.innerHTML = (job.benefits || []).map(b => 
    `<span class="inline-flex items-center gap-1 text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-lg">
      <i data-lucide="check-circle-2" class="w-3.5 h-3.5 text-indigo-500"></i> ${b}
    </span>`
  ).join("");

  updateModalSaveButton(job.id);
  jobModal.classList.remove("hidden");
  refreshIcons();
}

function closeJobModal() {
  jobModal.classList.add("hidden");
  state.activeModalJob = null;
}

// Open Quick Apply Modal
function openApplyModal(job) {
  closeJobModal();
  state.activeModalJob = job;

  document.getElementById("apply-job-subtitle").textContent = `${job.title} at ${job.company}`;
  
  if (state.userProfile.name) document.getElementById("apply-name").value = state.userProfile.name;
  if (state.userProfile.email) document.getElementById("apply-email").value = state.userProfile.email;
  if (state.userProfile.phone) document.getElementById("apply-phone").value = state.userProfile.phone;
  if (state.userProfile.education) document.getElementById("apply-education").value = state.userProfile.education;
  if (state.userProfile.experience) document.getElementById("apply-experience").value = state.userProfile.experience;

  const preview = document.getElementById("apply-skills-preview");
  if (state.selectedSkills.size > 0) {
    preview.innerHTML = [...state.selectedSkills].map(s => 
      `<span class="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold text-xs">${s}</span>`
    ).join("");
  } else {
    preview.innerHTML = `<span class="text-slate-400 italic text-xs">No skills selected in the dock. You can still apply!</span>`;
  }

  applyModal.classList.remove("hidden");
}

function closeApplyModal() {
  applyModal.classList.add("hidden");
}

// Open Candidate Profile Modal
function openProfileModal() {
  document.getElementById("prof-name").value = state.userProfile.name || "";
  document.getElementById("prof-email").value = state.userProfile.email || "";
  document.getElementById("prof-phone").value = state.userProfile.phone || "";
  if (state.userProfile.education) document.getElementById("prof-education").value = state.userProfile.education;
  if (state.userProfile.experience) document.getElementById("prof-experience").value = state.userProfile.experience;
  document.getElementById("prof-location").value = state.userProfile.location || "";
  
  syncSkillsToProfileModal();
  profileModal.classList.remove("hidden");
}

function closeProfileModal() {
  profileModal.classList.add("hidden");
}

// Open Saved Jobs Modal
function openSavedModal() {
  savedJobsList.innerHTML = "";
  if (state.savedJobIds.size === 0) {
    savedJobsList.innerHTML = `
      <div class="text-center py-8 text-slate-400">
        <i data-lucide="bookmark" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
        <p class="text-sm font-semibold">No saved jobs yet.</p>
        <p class="text-xs mt-1">Bookmark vacancies to review or apply later.</p>
      </div>
    `;
    refreshIcons();
    savedModal.classList.remove("hidden");
    return;
  }

  fetch("/api/jobs")
    .then(r => r.json())
    .then(data => {
      const allJobs = data.jobs || [];
      const saved = allJobs.filter(j => state.savedJobIds.has(j.id));
      
      savedJobsList.innerHTML = saved.map(job => `
        <div class="p-3 rounded-xl border border-slate-200 hover:border-blue-300 flex items-center justify-between gap-3 bg-white shadow-2xs">
          <div class="cursor-pointer flex-1" onclick="openJobModalById(${job.id})">
            <h4 class="text-sm font-bold text-slate-900">${job.title}</h4>
            <div class="text-xs text-slate-500 mt-0.5">${job.company} • ${formatSalaryDisplay(job)} • ${job.neighborhood || job.location}</div>
          </div>
          <div class="flex items-center gap-1.5">
            <button onclick="openApplyModalById(${job.id})" class="px-2.5 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer">Apply</button>
            <button onclick="toggleSaveJob(${job.id}); openSavedModal();" class="p-1.5 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer" title="Remove bookmark">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </div>
      `).join("");

      refreshIcons();
      savedModal.classList.remove("hidden");
    });
}

function openJobModalById(jobId) {
  savedModal.classList.add("hidden");
  const params = new URLSearchParams();
  if (state.selectedSkills.size > 0) params.append("skills", [...state.selectedSkills].join(","));
  if (state.userLat && state.userLng) {
    params.append("lat", state.userLat);
    params.append("lng", state.userLng);
  }
  fetch(`/api/jobs/${jobId}?${params.toString()}`)
    .then(r => r.json())
    .then(job => openJobModal(job));
}

function openApplyModalById(jobId) {
  savedModal.classList.add("hidden");
  fetch(`/api/jobs/${jobId}`)
    .then(r => r.json())
    .then(job => openApplyModal(job));
}

// Category Selection (Dropdown & Pills synchronization)
function setCategory(cat) {
  state.category = cat;
  if (categorySelect) categorySelect.value = cat;

  categoryPills.forEach(p => {
    if (p.getAttribute("data-cat") === cat) {
      p.className = "cat-pill px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap bg-slate-900 text-white shadow-xs cursor-pointer";
    } else {
      p.className = "cat-pill px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 cursor-pointer";
    }
  });
  fetchJobs();
}

// Job Type Selection
function setJobType(type) {
  state.jobType = type;
  if (jobTypeSelect) jobTypeSelect.value = type;
  fetchJobs();
}

// Reset all filters
function resetAllFilters() {
  state.searchQuery = "";
  searchInput.value = "";
  clearSearchBtn.classList.add("hidden");

  clearActiveLocation();

  state.radius = 25;
  radiusSelect.value = "25";
  state.minSalary = 0;
  minSalarySelect.value = "0";
  state.maxSalary = 0;
  maxSalarySelect.value = "0";
  state.salaryPeriod = "all";
  salaryPeriodSelect.value = "all";
  state.experience = "All";
  experienceSelect.value = "All";
  state.urgentOnly = false;
  urgentToggle.checked = false;
  state.minMatch = 0;
  matchThresholdSelect.value = "0";
  state.sortBy = "recent";
  sortSelect.value = "recent";

  setCategory("All");
  setJobType("All");
  fetchJobs();
  showToast("All search and location filters reset.");
}

// Wire Event Listeners
function setupEventListeners() {
  // 1. Keyword search input with debounce
  searchInput.addEventListener("input", (e) => {
    state.searchQuery = e.target.value.trim();
    if (state.searchQuery) {
      clearSearchBtn.classList.remove("hidden");
    } else {
      clearSearchBtn.classList.add("hidden");
    }
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      fetchJobs();
    }, 280);
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    state.searchQuery = "";
    clearSearchBtn.classList.add("hidden");
    fetchJobs();
  });

  // 2. Select Locality / Area Dropdown Option
  if (neighborhoodSelect) {
    neighborhoodSelect.addEventListener("change", (e) => {
      selectNeighborhood(e.target.value);
    });
  }

  // 3. Manual Location input (PIN / Town)
  manualLocationInput.addEventListener("input", (e) => {
    state.manualLocationQuery = e.target.value.trim();
    if (e.target.value.trim()) {
      clearLocationBtn.classList.remove("hidden");
    } else {
      clearLocationBtn.classList.add("hidden");
    }
  });

  manualLocationInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      resolveManualLocation(manualLocationInput.value);
    }
  });

  clearLocationBtn.addEventListener("click", () => {
    clearActiveLocation();
  });

  // 4. Trigger Search Button
  triggerSearchBtn.addEventListener("click", () => {
    const locVal = manualLocationInput.value.trim();
    if (locVal && state.locationSource !== "manual") {
      resolveManualLocation(locVal);
    } else {
      fetchJobs();
    }
  });

  // 5. GPS Button
  btnUseGps.addEventListener("click", requestGpsLocation);

  // 6. Radius Selector Dropdown Option
  radiusSelect.addEventListener("change", (e) => {
    state.radius = parseFloat(e.target.value);
    updateLocationStatusUI();
    fetchJobs();
  });

  // 7. Clear Active Location from Status Bar
  btnClearActiveLocation.addEventListener("click", clearActiveLocation);
  btnDismissLocError.addEventListener("click", hideLocationError);

  // 8. Sector & Job Type Dropdown Options
  if (categorySelect) {
    categorySelect.addEventListener("change", (e) => {
      setCategory(e.target.value);
    });
  }

  if (jobTypeSelect) {
    jobTypeSelect.addEventListener("change", (e) => {
      setJobType(e.target.value);
    });
  }

  // 9. Salary & Experience Filters
  minSalarySelect.addEventListener("change", (e) => {
    state.minSalary = parseFloat(e.target.value);
    fetchJobs();
  });

  maxSalarySelect.addEventListener("change", (e) => {
    state.maxSalary = parseFloat(e.target.value);
    fetchJobs();
  });

  salaryPeriodSelect.addEventListener("change", (e) => {
    state.salaryPeriod = e.target.value;
    fetchJobs();
  });

  experienceSelect.addEventListener("change", (e) => {
    state.experience = e.target.value;
    fetchJobs();
  });

  urgentToggle.addEventListener("change", (e) => {
    state.urgentOnly = e.target.checked;
    fetchJobs();
  });

  matchThresholdSelect.addEventListener("change", (e) => {
    state.minMatch = parseInt(e.target.value);
    fetchJobs();
  });

  sortSelect.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    fetchJobs();
  });

  resetFiltersBtn.addEventListener("click", resetAllFilters);
  emptyResetBtn.addEventListener("click", resetAllFilters);

  // Empty State expansion buttons
  btnExpand50.addEventListener("click", () => {
    state.radius = 50;
    radiusSelect.value = "50";
    updateLocationStatusUI();
    fetchJobs();
  });

  btnExpand100.addEventListener("click", () => {
    state.radius = 100;
    radiusSelect.value = "100";
    updateLocationStatusUI();
    fetchJobs();
  });

  btnClearLocEmpty.addEventListener("click", clearActiveLocation);

  // Category Pills
  categoryPills.forEach(pill => {
    pill.addEventListener("click", () => setCategory(pill.getAttribute("data-cat")));
  });

  // Presets
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => applyPreset(btn.getAttribute("data-preset")));
  });

  clearSkillsBtn.addEventListener("click", clearAllSkills);

  // Skill Select Dropdown Option
  if (skillSelectDropdown) {
    skillSelectDropdown.addEventListener("change", (e) => {
      if (e.target.value) {
        addSkill(e.target.value);
        e.target.value = "";
      }
    });
  }

  // Add custom skill text input
  addSkillBtn.addEventListener("click", () => {
    if (skillInput.value) {
      addSkill(skillInput.value);
      skillInput.value = "";
    }
  });

  skillInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (skillInput.value) {
        addSkill(skillInput.value);
        skillInput.value = "";
      }
    }
  });

  // Candidate Profile Modal
  btnOpenProfile.addEventListener("click", openProfileModal);
  profileCloseBtn.addEventListener("click", closeProfileModal);
  profileCancelBtn.addEventListener("click", closeProfileModal);

  profileForm.addEventListener("submit", (e) => {
    e.preventDefault();
    state.userProfile = {
      name: document.getElementById("prof-name").value.trim(),
      email: document.getElementById("prof-email").value.trim(),
      phone: document.getElementById("prof-phone").value.trim(),
      education: document.getElementById("prof-education").value,
      experience: document.getElementById("prof-experience").value,
      location: document.getElementById("prof-location").value.trim()
    };
    localStorage.setItem("localmatch_profile", JSON.stringify(state.userProfile));
    closeProfileModal();
    showToast("Profile information updated and saved!");
  });

  // Modals closing
  modalCloseBtn.addEventListener("click", closeJobModal);
  applyCloseBtn.addEventListener("click", closeApplyModal);
  applyCancelBtn.addEventListener("click", closeApplyModal);
  postCloseBtn.addEventListener("click", () => postModal.classList.add("hidden"));
  postCancelBtn.addEventListener("click", () => postModal.classList.add("hidden"));
  savedCloseBtn.addEventListener("click", () => savedModal.classList.add("hidden"));

  btnOpenPost.addEventListener("click", () => postModal.classList.remove("hidden"));
  btnOpenSaved.addEventListener("click", openSavedModal);

  modalSaveBtn.addEventListener("click", () => {
    if (state.activeModalJob) {
      toggleSaveJob(state.activeModalJob.id);
    }
  });

  modalApplyBtn.addEventListener("click", () => {
    if (state.activeModalJob) {
      openApplyModal(state.activeModalJob);
    }
  });

  // Quick Apply Form Submission
  applyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!state.activeModalJob) return;

    const payload = {
      applicant_name: document.getElementById("apply-name").value,
      applicant_email: document.getElementById("apply-email").value,
      applicant_phone: document.getElementById("apply-phone").value,
      applicant_education: document.getElementById("apply-education").value,
      applicant_experience: document.getElementById("apply-experience").value,
      applicant_skills: [...state.selectedSkills],
      message: document.getElementById("apply-message").value
    };

    try {
      const res = await fetch(`/api/jobs/${state.activeModalJob.id}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        closeApplyModal();
        applyForm.reset();
        showToast("Application submitted successfully to employer!");
      } else {
        alert(data.error || "Failed to submit application");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting application");
    }
  });

  // Post Job Form Submission (with Indian Rupee fields & PIN geocoding)
  postForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const reqSkillsRaw = document.getElementById("post-required-skills").value;
    const requiredSkills = reqSkillsRaw.split(",").map(s => s.trim()).filter(Boolean);

    const payload = {
      title: document.getElementById("post-title").value,
      company: document.getElementById("post-company").value,
      category: document.getElementById("post-category").value,
      location: document.getElementById("post-location").value,
      neighborhood: document.getElementById("post-neighborhood").value,
      pin_code: document.getElementById("post-pincode").value,
      city: document.getElementById("post-city").value,
      state: document.getElementById("post-state").value,
      salary_min: parseFloat(document.getElementById("post-salary-min").value || 0),
      salary_max: parseFloat(document.getElementById("post-salary-max").value || 0),
      pay_period: document.getElementById("post-pay-period").value,
      is_negotiable: document.getElementById("post-negotiable").checked,
      salary_disclosed: document.getElementById("post-disclosed").checked,
      job_type: document.getElementById("post-job-type").value,
      experience_level: document.getElementById("post-experience").value,
      required_skills: requiredSkills,
      contact_email: document.getElementById("post-email").value,
      deadline: document.getElementById("post-deadline").value,
      description: document.getElementById("post-description").value,
      urgent: document.getElementById("post-urgent").checked
    };

    try {
      const submitBtn = document.getElementById("post-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Publishing...";
      }

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      let data = {};
      try {
        data = await res.json();
      } catch (jsonErr) {
        data = { error: "Server returned a non-JSON response or empty response." };
      }

      if (res.ok && data.success) {
        postModal.classList.add("hidden");
        postForm.reset();
        showToast("Job listing published live with INR salary formatting!");
        fetchJobs();
      } else {
        alert(data.error || "Failed to post job");
      }
    } catch (err) {
      console.error(err);
      alert("Error posting job: " + (err.message || "Network error. Please make sure the server is reachable."));
    } finally {
      const submitBtn = document.getElementById("post-submit-btn");
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Publish Listing";
      }
    }
  });
}

// Fetch Initial Data (Neighborhoods, Skills, Stats)
async function initAppData() {
  try {
    const [skillsRes, hoodsRes, statsRes] = await Promise.all([
      fetch("/api/skills").then(r => r.json()),
      fetch("/api/neighborhoods").then(r => r.json()),
      fetch("/api/stats").then(r => r.json())
    ]);

    state.allPopularSkills = skillsRes.popular_skills || [];
    renderSkillSuggestions();

    // Populate Neighborhoods Dropdown Options
    if (neighborhoodSelect && Array.isArray(hoodsRes)) {
      neighborhoodSelect.innerHTML = '<option value="All">📍 Select Locality / Area (All)</option>' +
        hoodsRes.map(h => `<option value="${h}">📍 ${h}</option>`).join("");
    }

    // Populate Stats Banner
    if (statsRes.urgent_jobs !== undefined) {
      document.getElementById("stat-urgent").innerHTML = 
        `<span class="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span> ${statsRes.urgent_jobs} Urgent Vacancies`;
    }

    if (statsRes.demo_jobs_count) {
      document.getElementById("stat-demo-notice").textContent = 
        `${statsRes.demo_jobs_count} Demonstration Listings Active`;
    }

    updateSavedBadge();
    fetchJobs();
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

// Window initialization
window.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  initAppData();
});
/* FIX: Submit the Post a Job form to the Flask backend */

postForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const submitButton = document.getElementById("post-submit-btn");
    const originalText = submitButton.textContent;

    const value = (id) =>
        document.getElementById(id).value.trim();

    const salaryMin = Number(value("post-salary-min"));
    const salaryMax = Number(value("post-salary-max"));

    if (salaryMin < 0 || salaryMax < salaryMin) {
        showToast("Please check the salary range.", "warning");
        return;
    }

    const jobData = {
        title: value("post-title"),
        company: value("post-company"),
        category: value("post-category"),
        location: value("post-location"),
        neighborhood: value("post-neighborhood"),
        pin_code: value("post-pincode"),
        city: value("post-city"),
        state: value("post-state"),

        salary_min: salaryMin,
        salary_max: salaryMax,
        pay_period: value("post-pay-period"),
        is_negotiable:
            document.getElementById("post-negotiable").checked,
        salary_disclosed:
            document.getElementById("post-disclosed").checked,

        job_type: value("post-job-type"),
        employment_type: value("post-job-type"),
        experience_level: value("post-experience"),

        required_skills: value("post-required-skills")
            .split(",")
            .map(skill => skill.trim())
            .filter(Boolean),

        nice_to_have_skills: [],
        contact_email: value("post-email"),
        deadline: value("post-deadline"),
        description: value("post-description"),
        urgent: document.getElementById("post-urgent").checked
    };

    if (
        !jobData.title ||
        !jobData.company ||
        !jobData.location ||
        !jobData.contact_email ||
        !jobData.description ||
        jobData.required_skills.length === 0
    ) {
        showToast("Please complete all required fields.", "warning");
        return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Publishing...";

    try {
        const response = await fetch("/api/jobs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(jobData)
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(
                result.error || "Unable to publish this job."
            );
        }

        postForm.reset();
        postModal.classList.add("hidden");

        // Reload listings from the backend.
        clearActiveLocation();
        await fetchJobs();

        showToast("Job published successfully!");

    } catch (error) {
        console.error("Add Job failed:", error);
        showToast(error.message || "Could not publish the job.", "warning");

    } finally {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});