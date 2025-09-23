require('dotenv').config();
const express = require("express");
const path = require("path");
const http = require('http');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const expressLayouts = require('express-ejs-layouts');
const app = express();
const server = http.createServer(app);
// ===== Middleware =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(expressLayouts);
app.set('layout', 'layout/boilerplate'); 
// ===== Sample AQI & Tourist Data =====
const sampleAQI = { city: "Delhi", aqi: 180, dominantPollutant: "PM2.5", temp: 32, humidity: 50 };
const multipleLocations = [
  { city: "Delhi", lat: 28.6448, lng: 77.216721, aqi: 180, dominantPollutant: "PM2.5" },
  { city: "Noida", lat: 28.5355, lng: 77.3910, aqi: 150, dominantPollutant: "PM10" },
  { city: "Gurugram", lat: 28.4595, lng: 77.0266, aqi: 120, dominantPollutant: "O3" },
];
const touristSpots = [
  { name: "India Gate", lat: 28.6129, lng: 77.2295 },
  { name: "Red Fort", lat: 28.6562, lng: 77.2410 },
  { name: "Qutub Minar", lat: 28.5244, lng: 77.1855 },
];

// ===== Sensors & AI Recommendation Data =====
const sensors = [
  { id:1, name:"Delhi", aqi:95, pollutant:"PM2.5", source:"Traffic", action:"Wear mask", vehicleEmission:60, lat:28.6448, lon:77.2167, pollutantConcentration:{"PM2.5":95,"NO2":30}, healthRisks:["Respiratory irritation"], alert:"AQI moderate, wear mask if sensitive", trafficRestriction:"No restriction"},
  { id:2, name:"Noida", aqi:210, pollutant:"PM10", source:"Factory", action:"Stay indoors", vehicleEmission:130, lat:28.5355, lon:77.3910, pollutantConcentration:{"PM10":210,"NO2":40}, healthRisks:["Asthma","Bronchitis"], alert:"AQI unhealthy, stay indoors", trafficRestriction:"Odd-even vehicle restriction"},
  { id:3, name:"Red Fort Area", aqi:180, pollutant:"PM2.5", source:"Traffic", action:"Use mask / purifier", vehicleEmission:120, lat:28.6562, lon:77.2410, pollutantConcentration:{"PM2.5":180,"NO2":65,"CO":10}, healthRisks:["Asthma","Bronchitis","Heart disease"], alert:"AQI unhealthy, limit outdoor activities", trafficRestriction:"Odd-even vehicle restriction enforced", lastUpdated:"2025-09-23 14:30"},
  { id:4, name:"Connaught Place", aqi:95, pollutant:"NO2", source:"Traffic", action:"Wear mask", vehicleEmission:50, lat:28.6322, lon:77.2197, pollutantConcentration:{"NO2":95,"PM10":40}, healthRisks:["Respiratory irritation"], alert:"AQI moderate, sensitive groups should reduce outdoor activity", trafficRestriction:"No restrictions currently", lastUpdated:"2025-09-23 14:30"}
];

// ===== Policy Dashboard Data =====
const policies = [
  { name: "Odd-Even Vehicle Rule", implemented: true },
  { name: "Industrial Emission Control", implemented: true },
  { name: "Construction Dust Control", implemented: false },
];
const products = [
  { name: "EV Incentive Program", desc: "Promoting electric vehicles" },
  { name: "Green Delhi Plantation Drive", desc: "Urban greening initiative" },
  { name: "Industrial Scrubber Upgrade", desc: "Reducing factory emissions" },
];
const statsSummary = {
  totalUsers: 1250,
  totalCompanies: 40,
  activePolicies: policies.filter(p => p.implemented).length
};

// ===== Graph for Citizen Route Calculation =====
const graph = {
  A: [{ to: 'B', distance: 2, aqi: 120, tourist: 5 }, { to: 'C', distance: 3, aqi: 200, tourist: 0 }],
  B: [{ to: 'C', distance: 2, aqi: 100, tourist: 10 }, { to: 'D', distance: 4, aqi: 150, tourist: 2 }],
  C: [{ to: 'D', distance: 2, aqi: 80, tourist: 7 }],
  D: []
};
const coords = { A: [28.6139, 77.2090], B: [28.62, 77.21], C: [28.63, 77.22], D: [28.64, 77.23] };

// ===== Helper Functions =====
function getEdgeWeight(edge, alpha = 1, beta = 1, gamma = 1, preferScenic = false) {
  return alpha * edge.aqi + beta * edge.distance + (preferScenic ? -gamma * edge.tourist : 0);
}
function dijkstra(graph, start, end, alpha, beta, gamma, preferScenic) {
  const distances = {}, prev = {}, pq = new Set(Object.keys(graph));
  Object.keys(graph).forEach(n => distances[n] = Infinity);
  distances[start] = 0;
  while (pq.size) {
    const u = [...pq].reduce((min, node) => distances[node] < distances[min] ? node : min, [...pq][0]);
    pq.delete(u);
    if (u === end) break;
    graph[u].forEach(edge => {
      const alt = distances[u] + getEdgeWeight(edge, alpha, beta, gamma, preferScenic);
      if (alt < distances[edge.to]) { distances[edge.to] = alt; prev[edge.to] = u; }
    });
  }
  const path = [];
  let u = end;
  while (prev[u]) { path.unshift(u); u = prev[u]; }
  if (u === start) path.unshift(start);
  return path;
}
function getHealthRecommendation(aqi, age, symptoms, experience) {
  const alerts = [];
  if (aqi > 100 || experience === 'high') alerts.push("⚠️ Wear an N95 mask outdoors");
  if (aqi > 150) alerts.push("🏠 Limit outdoor activity, stay indoors");
  if (symptoms.includes("asthma") || symptoms.includes("heart")) alerts.push("💨 Avoid strenuous outdoor activity");
  if (aqi > 200) alerts.push("🔴 Use indoor air purifier if available");
  return alerts.length ? alerts : ["✅ Air quality is good"];
}

// ===== Routes =====
app.get("/", (req, res) => res.redirect("/dashboard"));

app.get("/dashboard", (req, res) => {
  const apiKey = process.env.AQICN_API_KEY || "YOUR_API_KEY";
  res.render("dashboard", { aqiData: sampleAQI, aqiLocations: multipleLocations, touristSpots, apiKey });
});

app.get("/airecomandation", (req, res) => res.render("airecomandation", { sensors }));

app.get("/policy", (req, res) => res.render("policy", { policies, products, statsSummary }));

app.post("/api/citizen-route", (req, res) => {
  const { source, destination, preferScenic, age, symptoms, experience } = req.body;
  const route = dijkstra(graph, source, destination, 1, 1, 1, preferScenic);
  const alerts = getHealthRecommendation(sampleAQI.aqi, age, symptoms, experience);
  const pathLatLng = route.map(n => coords[n]);
  res.json({ route, pathLatLng, alerts });
});

app.get("/api/hourly-aqi", (req, res) => {
  const data = Array.from({ length: 24 }, (_, i) => ({ hour: i, pm25: Math.floor(Math.random() * 200) }));
  res.json(data);
});

app.get("/health", (req, res) => res.render("health"));
app.get('/citizen', (req, res) => res.render('citizen'));

// Serve the login page
app.get("/listings/login", (req, res) => {
  res.render("listings/login"); // <-- include folder path
});

// Optional: handle form submission
app.post("/listings/login", (req, res) => {
  const { username, password } = req.body;
  console.log("Login attempt:", username, password);
  res.send("Form submitted!"); // temporary response
});
// ===== Serve the Register Page =====
app.get("/listings/register", (req, res) => {
  res.render("listings/register"); // Render register.ejs
});

// ===== Optional: Handle form submission =====
app.post("/listings/register", (req, res) => {
  const { username, password, email } = req.body;
  console.log("Register attempt:", username, email, password);
  
  // TODO: Add your user creation logic here (e.g., save to DB)
  
  res.send("Registration submitted!"); // Temporary response
});


// ===== Start Server =====
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
