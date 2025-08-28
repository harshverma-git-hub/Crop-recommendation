import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu, Search, User, Settings, UploadCloud, MapPin, Info, Home, Layers,
  BarChart2, ChevronRight, ChevronLeft, SlidersHorizontal, Download, Trash2,
  X, Sparkles, Leaf, ThermometerSun, CloudRain, Droplets, Gauge
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from "recharts";

/**
 * CropRecApp — single-file React + Tailwind UI (frontend-only)
 * - Pure client app with mock scoring until your backend is ready
 * - Highly responsive (mobile-first), dark-mode aware
 * - Clean visual design with cards, skeletons, and nice empty states
 * - LocalStorage for saved scenarios + history
 *
 * How to use:
 * 1) Ensure Tailwind is correctly set up and that your global CSS imports Tailwind directives.
 * 2) Place this file in your React app (e.g., src/CropRecApp.jsx) and render <CropRecApp />.
 * 3) When backend is ready, swap computeRecommendations with an API call in handleRecommend().
 */

export default function CropRecApp() {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "recommend", label: "Recommend", icon: Layers },
    { id: "upload", label: "Upload", icon: UploadCloud },
    { id: "history", label: "History", icon: BarChart2 },
    { id: "settings", label: "Settings", icon: Settings },
    { id: "help", label: "Help", icon: Info },
  ];

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [active, setActive] = useState("recommend");
  const [loading, setLoading] = useState(false);

  // Form inputs
  const [inputs, setInputs] = useState({
    location: "Agra, IN",
    area: 1.0, // hectares
    soilType: "Loam",
    ph: 6.5,
    soilMoisture: 30, // %
    temperature: 26, // °C
    rainfall: 300, // mm/year
    irrigation: "Canal",
    season: "Kharif",
    preference: "High yield",
  });

  // UI data
  const [results, setResults] = useState([]);
  const [shapData, setShapData] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [savedScenarios, setSavedScenarios] = useState([]);
  const [history, setHistory] = useState([]);
  const [modal, setModal] = useState({ open: false, content: null });
  const [compare, setCompare] = useState({ open: false, items: [] });

  // Load from localStorage
  useEffect(() => {
    try {
      const rawS = localStorage.getItem("croprec_scenarios");
      if (rawS) setSavedScenarios(JSON.parse(rawS));
      const rawH = localStorage.getItem("croprec_history");
      if (rawH) setHistory(JSON.parse(rawH));
    } catch (e) {
      console.warn("Could not load local data", e);
    }
  }, []);

  // Save to localStorage when history changes
  useEffect(() => {
    localStorage.setItem("croprec_history", JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    // sample chart preview reacts to top result yield per hectare (expectedYieldValue)
    const baseline = results[0]?.expectedYieldValue || 2.5;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const data = months.map((m, i) => ({
      month: m,
      expected: Math.round((baseline * (0.85 + (i % 6) * 0.05)) * 10) / 10,
    }));
    setChartData(data);
  }, [results]);

  function handleInputChange(e) {
    const { name, value } = e.target;
    setInputs(prev => ({ ...prev, [name]: name === "area" || name === "temperature" || name === "rainfall" ? Number(value) : value }));
  }

  function handleRangeChange(name, value) {
    setInputs(prev => ({ ...prev, [name]: Number(value) }));
  }

  function saveScenario() {
    const toSave = { id: Date.now(), createdAt: new Date().toISOString(), inputs };
    const updated = [toSave, ...savedScenarios].slice(0, 50);
    setSavedScenarios(updated);
    localStorage.setItem("croprec_scenarios", JSON.stringify(updated));
  }

  function loadScenario(s) {
    setInputs(s.inputs);
    setActive("recommend");
  }

  function deleteScenario(id) {
    const updated = savedScenarios.filter(s => s.id !== id);
    setSavedScenarios(updated);
    localStorage.setItem("croprec_scenarios", JSON.stringify(updated));
  }

  // Simple rule-based recommendation engine for UI demo
  function computeRecommendations({ ph, temperature, rainfall, soilType, area, season, preference }) {
    const cropBank = [
      { name: "Wheat", ideal: { ph: [6.0, 7.5], temp: [10, 25], rainfall: [300, 900], seasons: ["Rabi"] }, baseYield: 3.0, fertilizer: "NPK 20-20-0", water: "Medium" },
      { name: "Rice", ideal: { ph: [5.5, 7.0], temp: [20, 35], rainfall: [1000, 2000], seasons: ["Kharif"] }, baseYield: 4.0, fertilizer: "NPK 16-16-8", water: "High" },
      { name: "Maize", ideal: { ph: [5.5, 7.5], temp: [18, 32], rainfall: [500, 1200], seasons: ["Kharif", "Rabi"] }, baseYield: 5.5, fertilizer: "NPK 18-46-0", water: "Medium" },
      { name: "Cotton", ideal: { ph: [5.5, 7.5], temp: [20, 35], rainfall: [500, 1500], seasons: ["Kharif"] }, baseYield: 2.2, fertilizer: "NPK 10-26-26", water: "Medium" },
      { name: "Mustard", ideal: { ph: [6.0, 7.5], temp: [5, 25], rainfall: [200, 600], seasons: ["Rabi"] }, baseYield: 1.1, fertilizer: "NPK 15-15-15", water: "Low" },
      { name: "Pulses", ideal: { ph: [6.0, 7.5], temp: [15, 30], rainfall: [400, 800], seasons: ["Rabi", "Kharif"] }, baseYield: 1.4, fertilizer: "DAP + Urea (split)", water: "Low" },
    ];

    function prefBonus(crop) {
      if (preference === "Low water" && crop.water === "Low") return 0.08;
      if (preference === "High yield" && crop.baseYield >= 3.5) return 0.06;
      if (preference === "Short duration" && ["Pulses", "Maize"].includes(crop.name)) return 0.06;
      if (preference === "Market demand" && ["Rice", "Wheat", "Cotton"].includes(crop.name)) return 0.04;
      return 0;
    }

    function scoreCrop(crop) {
      let score = 0;
      const phRange = crop.ideal.ph;
      if (ph >= phRange[0] && ph <= phRange[1]) score += 0.28; else score += Math.max(0, 0.28 - (Math.abs(((phRange[0] + phRange[1]) / 2) - ph) / 10));

      const tRange = crop.ideal.temp;
      if (temperature >= tRange[0] && temperature <= tRange[1]) score += 0.24; else score += Math.max(0, 0.24 - (Math.abs(((tRange[0] + tRange[1]) / 2) - temperature) / 50));

      const rRange = crop.ideal.rainfall;
      if (rainfall >= rRange[0] && rainfall <= rRange[1]) score += 0.24; else score += Math.max(0, 0.24 - (Math.abs(((rRange[0] + rRange[1]) / 2) - rainfall) / 2000));

      if (crop.ideal.seasons.includes(season)) score += 0.16;
      if (soilType.toLowerCase().includes("loam")) score += 0.05;
      score += prefBonus(crop);

      const expectedYieldPerHa = Math.round((crop.baseYield * (1 + score * 0.4)) * 10) / 10;
      const expectedYield = Math.round(expectedYieldPerHa * area * 10) / 10;
      return { ...crop, score: Math.min(1, score), expectedYield, expectedYieldValue: expectedYieldPerHa };
    }

    return cropBank.map(scoreCrop).sort((a, b) => b.score - a.score).slice(0, 3);
  }

  async function handleRecommend(e) {
    e?.preventDefault?.();
    setLoading(true);
    setResults([]);

    // TODO — replace mock with backend call when available
    // const resp = await fetch('/api/recommend', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inputs) });
    // const recs = await resp.json();
    // setResults(recs);

    setTimeout(() => {
      const recs = computeRecommendations(inputs);
      setResults(recs);

      // SHAP-like random feature importance (UI-only placeholder)
      const sh = [
        { feature: "Soil pH", importance: Math.random() },
        { feature: "Temperature", importance: Math.random() },
        { feature: "Rainfall", importance: Math.random() },
        { feature: "Area", importance: Math.random() },
        { feature: "Soil Type", importance: Math.random() },
      ].map(x => ({ ...x, importance: Math.round(x.importance * 100) / 100 }))
       .sort((a, b) => b.importance - a.importance);
      setShapData(sh);

      // push to history
      const entry = {
        id: Date.now(),
        when: new Date().toISOString(),
        location: inputs.location,
        ph: inputs.ph,
        temp: inputs.temperature,
        rain: inputs.rainfall,
        topCrop: recs[0]?.name || "-",
      };
      const newHistory = [entry, ...history].slice(0, 200);
      setHistory(newHistory);
      setLoading(false);
    }, 500);
  }

  function handleUploadFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const rows = text.trim().split(/\r?\n/);
        const header = rows.shift()?.split(",") || [];
        // naive CSV demo — expects columns that match inputs keys
        const idx = Object.fromEntries(header.map((h, i) => [h.trim(), i]));
        if (!("location" in idx)) throw new Error("CSV must include a 'location' column");
        const first = rows[0]?.split(",");
        if (first) {
          const prefill = {
            location: first[idx.location] || inputs.location,
            area: Number(first[idx.area] ?? inputs.area) || inputs.area,
            soilType: first[idx.soilType] || inputs.soilType,
            ph: Number(first[idx.ph] ?? inputs.ph) || inputs.ph,
            temperature: Number(first[idx.temperature] ?? inputs.temperature) || inputs.temperature,
            rainfall: Number(first[idx.rainfall] ?? inputs.rainfall) || inputs.rainfall,
            irrigation: first[idx.irrigation] || inputs.irrigation,
            season: first[idx.season] || inputs.season,
            preference: first[idx.preference] || inputs.preference,
          };
          setInputs(prefill);
          alert(`Loaded first row into form (preview). Rows: ${rows.length}`);
        }
      } catch (err) {
        alert("CSV parse error: " + err.message);
      }
    };
    reader.readAsText(f);
  }

  function openDetails(rec) { setModal({ open: true, content: rec }); }
  function closeModal() { setModal({ open: false, content: null }); }

  function toggleCompare(rec) {
    setCompare(prev => {
      const exists = prev.items.find(i => i.name === rec.name);
      const items = exists ? prev.items.filter(i => i.name !== rec.name) : [...prev.items, rec].slice(0, 3);
      return { open: true, items };
    });
  }

  function clearHistory() { setHistory([]); }

  // ----- UI helpers -----
  const Stat = ({ icon: Icon, label, value, sub }) => (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <div className="text-xs text-slate-500">{label}</div>
          <div className="text-lg font-semibold">{value}</div>
          {sub && <div className="text-xs text-slate-500">{sub}</div>}
        </div>
      </div>
    </div>
  );

  const Skeleton = ({ className = "h-4 w-full" }) => (
    <div className={`animate-pulse rounded bg-slate-200 dark:bg-slate-800 ${className}`} />
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <button aria-label="Toggle sidebar" className="p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 md:hidden" onClick={() => setSidebarOpen(v => !v)}>
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <div className="text-xl sm:text-2xl font-semibold tracking-tight flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-emerald-600" /> CropWise
                </div>
                <div className="hidden sm:flex items-center gap-1 text-xs sm:text-sm text-slate-500">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate max-w-[140px]">{inputs.location}</span>
                </div>
              </div>
            </div>
            <div className="flex-1 px-2 sm:px-4">
              <div className="relative max-w-xl mx-auto">
                <input id="top-search" name="top-search" placeholder="Search crops, soil types, scenarios..." className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300" />
                <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800">
                <User className="w-4 h-4" /> <span className="text-sm">Harsh</span>
              </button>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-emerald-400 to-sky-400 flex items-center justify-center text-white font-medium">H</div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
        <div className="flex gap-4 md:gap-6">
          {/* Sidebar */}
          <aside className={`${sidebarOpen ? "block" : "hidden"} md:block w-full md:w-64 shrink-0 bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm h-fit`}
            onClick={() => { if (sidebarOpen) setSidebarOpen(false); }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <Leaf className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="font-semibold">Harsh Verma</div>
                <div className="text-xs text-slate-500">MSc CS — Student</div>
              </div>
            </div>
            <nav className="space-y-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = active === item.id;
                return (
                  <button key={item.id} onClick={() => setActive(item.id)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition ${isActive ? "bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-100" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}>
                    <Icon className="w-4 h-4 text-emerald-600" /> <span>{item.label}</span>
                    <ChevronRight className="ml-auto w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </nav>
            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-300">
              <div className="mb-1">Model</div>
              <div className="text-xs">Active model: <span className="font-medium">xgboost-v1</span></div>
              <div className="mt-2 text-xs leading-tight">Next retrain: <strong>Sep 15, 2025</strong></div>
            </div>
          </aside>

          {/* Main */}
          <main className="flex-1 space-y-6">
            {active === "dashboard" && (
              <section>
                <h2 className="text-xl font-semibold mb-3">Dashboard</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <Stat icon={Gauge} label="Runs (30d)" value={history.length} />
                  <Stat icon={Sparkles} label="Avg Score" value={results[0] ? `${Math.round(results[0].score * 100)}%` : "—"} />
                  <Stat icon={ThermometerSun} label="Temp (°C)" value={inputs.temperature} sub="current" />
                  <Stat icon={CloudRain} label="Rainfall (mm)" value={inputs.rainfall} sub="annual" />
                </div>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Yield Trend (preview)</h3>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Quick Actions</h3>
                    <div className="flex flex-col gap-2">
                      <button className="px-3 py-2 rounded-md bg-emerald-600 text-white text-sm">Retrain Model</button>
                      <button className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm">Manage Datasets</button>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {active === "recommend" && (
              <section className="space-y-4">
                <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
                  {/* Form */}
                  <form className="flex-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm" onSubmit={handleRecommend}>
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold">Crop Recommendation</h2>
                      <div className="text-xs sm:text-sm text-slate-500">Test soil & weather scenarios</div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Field label="Location">
                        <input name="location" value={inputs.location} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                      </Field>

                      <Field label="Area (ha)">
                        <input name="area" type="number" step="0.1" value={inputs.area} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                      </Field>

                      <Field label="Soil Type">
                        <select name="soilType" value={inputs.soilType} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                          <option>Loam</option><option>Clay</option><option>Sandy</option><option>Silty</option><option>Peaty</option>
                        </select>
                      </Field>

                      <Field label="Irrigation">
                        <select name="irrigation" value={inputs.irrigation} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                          <option>Canal</option><option>Drip</option><option>Sprinkler</option><option>Rainfed</option>
                        </select>
                      </Field>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">Soil pH <span className="text-xs text-slate-400">{inputs.ph}</span></label>
                        <input type="range" min="3.0" max="9.0" step="0.1" value={inputs.ph} onChange={e => handleRangeChange("ph", e.target.value)} className="mt-2 w-full" />
                      </div>

                      <Field label="Temperature (°C)">
                        <input type="number" name="temperature" value={inputs.temperature} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                      </Field>

                      <Field label="Annual Rainfall (mm)">
                        <input type="number" name="rainfall" value={inputs.rainfall} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
                      </Field>

                      <Field label="Season">
                        <select name="season" value={inputs.season} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                          <option>Kharif</option><option>Rabi</option><option>Zaid</option>
                        </select>
                      </Field>

                      <Field label="Preference">
                        <select name="preference" value={inputs.preference} onChange={handleInputChange} className="mt-1 block w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm">
                          <option>High yield</option><option>Low water</option><option>Short duration</option><option>Market demand</option>
                        </select>
                      </Field>
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <label className="flex items-center gap-2 rounded-md border border-dashed border-slate-200 dark:border-slate-700 px-3 py-2 text-sm cursor-pointer">
                        <UploadCloud className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-500">Upload CSV for batch (optional)</span>
                        <input onChange={handleUploadFile} type="file" accept=".csv" className="hidden" />
                      </label>
                      <div className="sm:ml-auto flex items-center gap-2">
                        <button type="button" onClick={saveScenario} className="px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm">Save scenario</button>
                        <button type="submit" className="px-4 py-2 rounded-md bg-emerald-600 text-white text-sm shadow-sm disabled:opacity-60" disabled={loading}>
                          {loading ? "Working…" : "Get Recommendation"}
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">Tip: Use the pH slider to test sensitivity. Later you can auto-fill from IoT sensors.</p>
                  </form>

                  {/* Results */}
                  <div className="w-full lg:w-96 flex flex-col gap-4">
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Recommendations</h3>
                        <div className="text-xs text-slate-500">Top matches</div>
                      </div>
                      <div className="mt-3 space-y-3">
                        {!loading && results.length === 0 && (
                          <EmptyState title="No recommendations yet" subtitle="Fill the form and click Get Recommendation." />
                        )}
                        <AnimatePresence>
                          {loading && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                              <Skeleton className="h-16" />
                              <Skeleton className="h-16" />
                              <Skeleton className="h-16" />
                            </motion.div>
                          )}
                        </AnimatePresence>
                        {results.map(rec => (
                          <motion.div key={rec.name} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border border-slate-100 dark:border-slate-700">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="flex items-center justify-between">
                                  <div className="font-medium">{rec.name}</div>
                                  <div className="text-sm text-slate-600">{Math.round(rec.score * 100)}%</div>
                                </div>
                                <div className="mt-2 text-xs text-slate-600 dark:text-slate-300">Expected yield: <strong>{rec.expectedYield} t</strong> ({rec.expectedYieldValue} t/ha)</div>
                                <div className="mt-2 w-full bg-white dark:bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-100 dark:border-slate-700">
                                  <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${rec.score * 100}%` }} />
                                </div>
                                <div className="mt-3 flex items-center gap-2">
                                  <button onClick={() => openDetails(rec)} className="text-xs px-3 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">Details</button>
                                  <button onClick={() => toggleCompare(rec)} className="text-xs px-3 py-1 rounded-md bg-emerald-600 text-white">Compare</button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <h4 className="text-sm font-medium">Explainability</h4>
                      <div className="mt-3 space-y-2">
                        {shapData.length === 0 && <div className="text-xs text-slate-500">Run a recommendation to see feature influence.</div>}
                        {shapData.map(s => (
                          <div key={s.feature} className="text-xs">
                            <div className="flex items-center justify-between"><div>{s.feature}</div><div className="text-slate-500">{(s.importance * 100).toFixed(0)}%</div></div>
                            <div className="mt-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2">
                              <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${s.importance * 100}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                      <h4 className="text-sm font-medium">Yield Trend (preview)</h4>
                      <div className="mt-2 h-36">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={2} dot={{ r: 2 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Saved Scenarios + Model Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="col-span-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium">Saved Scenarios</h4>
                      {savedScenarios.length > 0 && (
                        <button className="text-xs text-slate-500" onClick={() => { setSavedScenarios([]); localStorage.removeItem("croprec_scenarios"); }}>Clear all</button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {savedScenarios.length === 0 && <div className="text-sm text-slate-500">No saved scenarios yet.</div>}
                      {savedScenarios.map(s => (
                        <div key={s.id} className="flex items-center justify-between p-2 border border-slate-100 dark:border-slate-800 rounded-md">
                          <div>
                            <div className="text-sm font-medium">{s.inputs.location} — {s.inputs.soilType}</div>
                            <div className="text-xs text-slate-500">{new Date(s.createdAt).toLocaleString()}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="text-xs px-2 py-1 rounded-md border" onClick={() => loadScenario(s)}>Load</button>
                            <button className="text-xs px-2 py-1 rounded-md border" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(s.inputs)); }}>Copy</button>
                            <button className="text-xs px-2 py-1 rounded-md border text-red-600" onClick={() => deleteScenario(s.id)}><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h4 className="text-sm font-medium mb-2">Model Info</h4>
                    <div className="text-xs text-slate-500">This panel will show model performance, last retrain metrics, and a deploy button when your backend is connected.</div>
                  </div>
                </div>
              </section>
            )}

            {active === "upload" && (
              <section className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-lg font-semibold">Upload Dataset</h2>
                <p className="text-sm text-slate-500 mt-2">Upload CSV with columns: location, ph, temperature, rainfall, soilType, area, irrigation, season, preference. First row will prefill the form as a preview.</p>
                <div className="mt-4">
                  <label className="flex items-center gap-3 rounded-md border border-dashed px-4 py-6 text-sm cursor-pointer">
                    <UploadCloud className="w-5 h-5" />
                    <span>Click to upload or drop files here</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleUploadFile} />
                  </label>
                </div>
              </section>
            )}

            {active === "history" && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">History</h2>
                  {history.length > 0 && <button onClick={clearHistory} className="text-xs text-red-600 flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear</button>}
                </div>
                <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="py-2">When</th>
                        <th>Location</th>
                        <th>Soil pH</th>
                        <th>Temp (°C)</th>
                        <th>Rain (mm)</th>
                        <th>Top crop</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 && (
                        <tr><td colSpan={6} className="py-6 text-center text-slate-500">No runs yet. Generate a recommendation to populate history.</td></tr>
                      )}
                      {history.map(h => (
                        <tr key={h.id} className="odd:bg-slate-50/60 dark:odd:bg-slate-800/40">
                          <td className="py-2">{new Date(h.when).toLocaleString()}</td>
                          <td>{h.location}</td>
                          <td>{h.ph}</td>
                          <td>{h.temp}</td>
                          <td>{h.rain}</td>
                          <td>{h.topCrop}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {active === "settings" && (
              <section className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-lg font-semibold">Settings</h2>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Units</div>
                      <div className="text-xs text-slate-500">Metric (ha, °C, mm)</div>
                    </div>
                    <button className="px-3 py-1.5 rounded-md border">Change</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Notifications</div>
                      <div className="text-xs text-slate-500">Training and deployment updates</div>
                    </div>
                    <button className="px-3 py-1.5 rounded-md border">Configure</button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">API Token</div>
                      <div className="text-xs text-slate-500">Set backend endpoint and keys</div>
                    </div>
                    <button className="px-3 py-1.5 rounded-md border">Set up</button>
                  </div>
                </div>
              </section>
            )}

            {active === "help" && (
              <section className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <h2 className="text-lg font-semibold">Help & FAQ</h2>
                <div className="mt-3 text-sm text-slate-600 dark:text-slate-300 space-y-3">
                  <div>
                    <strong>How are recommendations generated?</strong>
                    <div className="text-xs text-slate-500">Currently UI demo using a rule-based scorer. Connect your trained model API to get real predictions.</div>
                  </div>
                  <div>
                    <strong>Can I import my sensor data?</strong>
                    <div className="text-xs text-slate-500">Yes — CSV upload today; later add IoT ingestion via MQTT/webhooks.</div>
                  </div>
                </div>
              </section>
            )}
          </main>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 md:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-1 flex gap-1 z-40">
        {navItems.slice(0, 4).map(item => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button key={item.id} onClick={() => setActive(item.id)} className={`flex-1 p-2 rounded-xl ${isActive ? "bg-emerald-50 text-emerald-600" : "text-slate-600"}`}>
              <div className="flex flex-col items-center justify-center text-[10px]">
                <Icon className="w-5 h-5" />
                <span className="mt-1">{item.label}</span>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Details Modal */}
      <AnimatePresence>
        {modal.open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={closeModal}></div>
            <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }} className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl p-6 z-10 border border-slate-200 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold">{modal.content?.name}</h3>
                  <div className="text-xs text-slate-500">Detailed recommendation breakdown</div>
                </div>
                <button onClick={closeModal} className="px-3 py-1 rounded-md border"><X className="w-4 h-4" /></button>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium">Why this crop?</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">{modal.content ? `This crop scores ${(modal.content.score * 100).toFixed(0)}% based on soil pH, temperature, rainfall, and season match.` : ""}</p>
                  <div className="mt-3 text-xs text-slate-500">Recommended fertilizer: <strong>{modal.content?.fertilizer}</strong></div>
                  <div className="mt-1 text-xs text-slate-500">Sowing window: <strong>{modal.content?.ideal?.seasons?.join(", ")}</strong></div>
                </div>
                <div>
                  <h4 className="text-sm font-medium">Actionable steps</h4>
                  <ol className="text-sm text-slate-600 dark:text-slate-300 mt-2 list-decimal pl-4 space-y-1">
                    <li>Test pH; apply lime/gypsum if needed to correct.</li>
                    <li>Apply recommended fertilizer at sowing; top-dress per local guide.</li>
                    <li>Monitor moisture; optimize irrigation schedule.</li>
                  </ol>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compare Drawer */}
      <AnimatePresence>
        {compare.open && (
          <motion.div initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }} className="fixed bottom-0 inset-x-0 z-50">
            <div className="mx-auto max-w-7xl px-3 sm:px-4 lg:px-6 pb-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">Compare crops ({compare.items.length}/3)</div>
                  <button className="px-2 py-1 rounded-md border" onClick={() => setCompare({ open: false, items: [] })}><X className="w-4 h-4" /></button>
                </div>
                {compare.items.length === 0 ? (
                  <div className="text-sm text-slate-500">Select up to 3 crops to compare.</div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {compare.items.map(c => (
                      <div key={c.name} className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
                        <div className="font-medium">{c.name}</div>
                        <div className="text-xs text-slate-500">Score: {Math.round(c.score * 100)}%</div>
                        <div className="mt-2 text-xs">Yield: <strong>{c.expectedYield} t</strong> ({c.expectedYieldValue} t/ha)</div>
                        <div className="mt-1 text-xs">Fertilizer: <strong>{c.fertilizer}</strong></div>
                        <div className="mt-1 text-xs">Water need: <strong>{c.water}</strong></div>
                        <div className="mt-1 text-xs">Season: <strong>{c.ideal.seasons.join(", ")}</strong></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</label>
      {children}
    </div>
  );
}

function EmptyState({ title, subtitle }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center">
      <div className="text-sm font-medium">{title}</div>
      <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
    </div>
  );
}
