const wrapper = document.querySelector('.wrapper');
const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const locationButton = document.getElementById('locationButton');
const errorBox = document.querySelector('.error-box');
const errorMessage = document.querySelector('.error-message');
const weatherContainer = document.querySelector('.weather-container');
const forecastContainer = document.querySelector('.forecast-container');
const hourlyForecastContainer = document.querySelector('.hourly-forecast-container');
const airQualityContainer = document.querySelector('.air-quality-container');
const weatherMapContainer = document.querySelector('.weather-map-container');
const loadingSpinner = document.querySelector('.loading-spinner');
const recentSearchesList = document.querySelector('.recent-searches-list');
const settingsButton = document.querySelector('.settings-button');
const settingsModal = document.querySelector('.settings-modal');
const closeSettingsButton = document.querySelector('.close-settings');
const saveSettingsButton = document.querySelector('.save-settings');
const celsiusToggle = document.querySelector('.celsius');
const fahrenheitToggle = document.querySelector('.fahrenheit');
const weatherMap = document.getElementById('weather-map');
const mapControls = document.querySelectorAll('.map-control');

// API Configuration
const API_KEY = 'aa36e458143363c69bc4f46f5b4e87de';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5/';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0/';

// App State
let currentCity = '';
let currentCoords = { lat: 0, lon: 0 };
let units = localStorage.getItem('units') || 'metric';
let theme = localStorage.getItem('theme') || 'light';
let map = null;
let mapLayer = 'temp';
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
let notifySettings = {
  severe: localStorage.getItem('notify-severe') === 'true',
  daily: localStorage.getItem('notify-daily') === 'true'
};

// Initialize the App
function initApp() {
  loadSettings();
  applyTheme();
  displayRecentSearches();
  
  const lastCity = localStorage.getItem('lastCity') || 'New York';
  if (lastCity) {
    searchInput.value = lastCity;
    searchByCity(lastCity);
  }
  
  if ("geolocation" in navigator) {
    locationButton.style.display = "block";
  } else {
    locationButton.style.display = "none";
  }
  
  setupEventListeners();
}

// Set up all event listeners
function setupEventListeners() {
  searchButton.addEventListener('click', handleSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  });
  
  locationButton.addEventListener('click', getCurrentLocation);
  
  celsiusToggle.addEventListener('click', () => setTemperatureUnit('metric'));
  fahrenheitToggle.addEventListener('click', () => setTemperatureUnit('imperial'));
  
  settingsButton.addEventListener('click', openSettings);
  closeSettingsButton.addEventListener('click', closeSettings);
  saveSettingsButton.addEventListener('click', saveSettings);
  
  mapControls.forEach(control => {
    control.addEventListener('click', () => {
      mapLayer = control.dataset.layer;
      updateWeatherMap();
      mapControls.forEach(btn => btn.classList.remove('active'));
      control.classList.add('active');
    });
  });
  
  recentSearchesList.addEventListener('click', (e) => {
    if (e.target.classList.contains('recent-search-item')) {
      searchInput.value = e.target.textContent;
      searchByCity(e.target.textContent);
    }
  });
}

// Handle search form submission
function handleSearch() {
  const city = searchInput.value.trim();
  if (city) {
    searchByCity(city);
  } else {
    showError('Please enter a city name');
  }
}

// Search weather by city name
async function searchByCity(city) {
  showLoading();
  hideError();
  
  try {
    const geoUrl = `${GEO_API_URL}direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
    const geoResponse = await fetch(geoUrl);
    const geoData = await geoResponse.json();
    
    if (!geoData.length) {
      showError('City not found');
      hideLoading();
      return;
    }
    
    const { lat, lon, name, country } = geoData[0];
    currentCity = `${name}, ${country}`;
    currentCoords = { lat, lon };
    
    addToRecentSearches(currentCity);
    localStorage.setItem('lastCity', currentCity);
    
    await fetchWeatherData();
    
  } catch (error) {
    console.error('Error searching by city:', error);
    showError('Failed to get weather data');
  }
  
  hideLoading();
}

// Add city to recent searches
function addToRecentSearches(city) {
  recentSearches = recentSearches.filter(item => item !== city);
  recentSearches.unshift(city);
  if (recentSearches.length > 5) {
    recentSearches = recentSearches.slice(0, 5);
  }
  localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  displayRecentSearches();
}

// Display recent searches in UI
function displayRecentSearches() {
  recentSearchesList.innerHTML = '';
  recentSearches.forEach(city => {
    const cityElement = document.createElement('div');
    cityElement.classList.add('recent-search-item');
    cityElement.textContent = city;
    recentSearchesList.appendChild(cityElement);
  });
}

// Get current location
function getCurrentLocation() {
  showLoading();
  hideError();
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      currentCoords = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };
      
      try {
        const reverseGeoUrl = `${GEO_API_URL}reverse?lat=${currentCoords.lat}&lon=${currentCoords.lon}&limit=1&appid=${API_KEY}`;
        const geoResponse = await fetch(reverseGeoUrl);
        const geoData = await geoResponse.json();
        
        if (geoData.length > 0) {
          currentCity = `${geoData[0].name}, ${geoData[0].country}`;
          searchInput.value = currentCity;
          localStorage.setItem('lastCity', currentCity);
          addToRecentSearches(currentCity);
        }
        
        await fetchWeatherData();
        
      } catch (error) {
        console.error('Error getting location:', error);
        showError('Failed to get location data');
      }
      
      hideLoading();
    },
    (error) => {
      console.error('Geolocation error:', error);
      hideLoading();
      showError('Location access denied. Please search by city name.');
    }
  );
}

// Fetch all weather data
async function fetchWeatherData() {
  try {
    const weatherUrl = `${WEATHER_API_URL}weather?lat=${currentCoords.lat}&lon=${currentCoords.lon}&units=${units}&appid=${API_KEY}`;
    const weatherResponse = await fetch(weatherUrl);
    const weatherData = await weatherResponse.json();
    
    const forecastUrl = `${WEATHER_API_URL}forecast?lat=${currentCoords.lat}&lon=${currentCoords.lon}&units=${units}&appid=${API_KEY}`;
    const forecastResponse = await fetch(forecastUrl);
    const forecastData = await forecastResponse.json();
    
    const airQualityUrl = `${WEATHER_API_URL}air_pollution?lat=${currentCoords.lat}&lon=${currentCoords.lon}&appid=${API_KEY}`;
    const airQualityResponse = await fetch(airQualityUrl);
    const airQualityData = await airQualityResponse.json();
    
    updateCurrentWeather(weatherData);
    updateForecast(forecastData);
    updateAirQuality(airQualityData);
    initializeWeatherMap();
    
    weatherContainer.style.display = 'block';
    forecastContainer.style.display = 'block';
    hourlyForecastContainer.style.display = 'block';
    airQualityContainer.style.display = 'block';
    weatherMapContainer.style.display = 'block';
    
    if (weatherData.alerts && notifySettings.severe) {
      showWeatherAlert(weatherData.alerts[0]);
    }
    
  } catch (error) {
    console.error('Error fetching weather data:', error);
    showError('Failed to fetch weather data');
  }
}

// Update current weather UI
function updateCurrentWeather(data) {
  const cityNameElement = document.querySelector('.city-name');
  const dateTimeElement = document.querySelector('.date-time');
  const temperatureElement = document.querySelector('.temperature');
  const weatherIcon = document.querySelector('.weather-icon');
  const weatherDescription = document.querySelector('.weather-description');
  const feelsLikeElement = document.querySelector('.feels-like span');
  const windSpeedElement = document.querySelector('.wind-speed');
  const humidityElement = document.querySelector('.humidity');
  const visibilityElement = document.querySelector('.visibility');
  const pressureElement = document.querySelector('.pressure');
  
  const date = new Date();
  const options = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
  const dateString = date.toLocaleDateString('en-US', options);
  const timeString = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  
  cityNameElement.textContent = currentCity;
  dateTimeElement.textContent = `${dateString} | Local time: ${timeString}`;
  temperatureElement.textContent = `${Math.round(data.main.temp)}${units === 'metric' ? '°C' : '°F'}`;
  feelsLikeElement.textContent = `${Math.round(data.main.feels_like)}${units === 'metric' ? '°C' : '°F'}`;
  weatherDescription.textContent = data.weather[0].description;
  
  const iconClass = getWeatherIconClass(data.weather[0].id);
  weatherIcon.className = '';
  weatherIcon.classList.add('fas', iconClass, 'weather-icon');
  
  windSpeedElement.textContent = `${data.wind.speed} ${units === 'metric' ? 'km/h' : 'mph'}`;
  humidityElement.textContent = `${data.main.humidity}%`;
  visibilityElement.textContent = `${(data.visibility / 1000).toFixed(1)} km`;
  pressureElement.textContent = `${data.main.pressure} hPa`;
}

// Update forecast UI
function updateForecast(data) {
  const dailyForecast = processDailyForecast(data.list);
  const forecastItemsContainer = document.querySelector('.forecast-items');
  forecastItemsContainer.innerHTML = '';
  
  dailyForecast.forEach((day, index) => {
    if (index < 5) {
      const dayElement = document.createElement('div');
      dayElement.classList.add('forecast-item');
      
      const date = new Date(day.date);
      const dayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
      
      dayElement.innerHTML = `
        <p class="forecast-day">${dayName}</p>
        <i class="fas ${getWeatherIconClass(day.weatherId)} forecast-icon"></i>
        <p class="forecast-temp">
          <span class="max-temp">${Math.round(day.maxTemp)}°</span>
          <span class="min-temp">${Math.round(day.minTemp)}°</span>
        </p>
      `;
      
      forecastItemsContainer.appendChild(dayElement);
    }
  });
  
  const hourlyForecastContainer = document.querySelector('.hourly-forecast-items');
  hourlyForecastContainer.innerHTML = '';
  
  for (let i = 0; i < 8; i++) {
    if (data.list[i]) {
      const forecast = data.list[i];
      const hourElement = document.createElement('div');
      hourElement.classList.add('hourly-forecast-item');
      
      const forecastTime = new Date(forecast.dt * 1000);
      const hourString = forecastTime.toLocaleTimeString('en-US', { hour: '2-digit' });
      
      hourElement.innerHTML = `
        <p class="forecast-hour">${hourString}</p>
        <i class="fas ${getWeatherIconClass(forecast.weather[0].id)} forecast-icon"></i>
        <p class="hourly-temp">${Math.round(forecast.main.temp)}°</p>
      `;
      
      hourlyForecastContainer.appendChild(hourElement);
    }
  }
}

// Process forecast data to get daily min/max
function processDailyForecast(forecastList) {
  const dailyData = {};
  
  forecastList.forEach(forecast => {
    const date = new Date(forecast.dt * 1000).toDateString();
    
    if (!dailyData[date]) {
      dailyData[date] = {
        date: forecast.dt * 1000,
        minTemp: forecast.main.temp_min,
        maxTemp: forecast.main.temp_max,
        weatherId: forecast.weather[0].id
      };
    } else {
      dailyData[date].minTemp = Math.min(dailyData[date].minTemp, forecast.main.temp_min);
      dailyData[date].maxTemp = Math.max(dailyData[date].maxTemp, forecast.main.temp_max);
      const forecastHour = new Date(forecast.dt * 1000).getHours();
      if (forecastHour >= 11 && forecastHour <= 14) {
        dailyData[date].weatherId = forecast.weather[0].id;
      }
    }
  });
  
  return Object.values(dailyData);
}

// Update air quality UI
function updateAirQuality(data) {
  const aqiValue = document.querySelector('.aqi-value');
  const aqiStatus = document.querySelector('.air-quality-status');
  const pollutants = document.querySelectorAll('.air-quality-item');
  
  const aqi = data.list[0].main.aqi;
  aqiValue.textContent = aqi;
  
  let status = '';
  let statusClass = '';
  
  switch (aqi) {
    case 1:
      status = 'Good';
      statusClass = 'good';
      break;
    case 2:
      status = 'Fair';
      statusClass = 'fair';
      break;
    case 3:
      status = 'Moderate';
      statusClass = 'moderate';
      break;
    case 4:
      status = 'Poor';
      statusClass = 'poor';
      break;
    case 5:
      status = 'Very Poor';
      statusClass = 'very-poor';
      break;
    default:
      status = 'Unknown';
      statusClass = '';
  }
  
  aqiStatus.textContent = status;
  aqiStatus.className = 'air-quality-status ' + statusClass;
  
  const components = data.list[0].components;
  pollutants[0].querySelector('.pollutant-value').textContent = `${components.pm2_5.toFixed(1)} µg/m³`;
  pollutants[1].querySelector('.pollutant-value').textContent = `${components.pm10.toFixed(1)} µg/m³`;
  pollutants[2].querySelector('.pollutant-value').textContent = `${components.o3.toFixed(1)} µg/m³`;
  pollutants[3].querySelector('.pollutant-value').textContent = `${components.no2.toFixed(1)} µg/m³`;
}

// Initialize the weather map
function initializeWeatherMap() {
  if (!map) {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/leaflet.js';
    script.onload = () => {
      map = L.map('weather-map').setView([currentCoords.lat, currentCoords.lon], 8);
      
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(map);
      
      L.marker([currentCoords.lat, currentCoords.lon]).addTo(map)
        .bindPopup(currentCity)
        .openPopup();
      
      updateWeatherMap();
    };
    document.head.appendChild(script);
    
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://cdn.jsdelivr.net/npm/leaflet@1.7.1/dist/leaflet.css';
    document.head.appendChild(linkElement);
  } else {
    map.setView([currentCoords.lat, currentCoords.lon], 8);
    map.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        layer.setLatLng([currentCoords.lat, currentCoords.lon])
          .bindPopup(currentCity)
          .openPopup();
      }
    });
    
    updateWeatherMap();
  }
}

// Update weather map layers
function updateWeatherMap() {
  if (!map) return;
  
  map.eachLayer(layer => {
    if (layer instanceof L.TileLayer && layer._url.includes('openweathermap')) {
      map.removeLayer(layer);
    }
  });
  
  let weatherLayer;
  switch (mapLayer) {
    case 'temp':
      weatherLayer = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
      break;
    case 'clouds':
      weatherLayer = `https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
      break;
    case 'precipitation':
      weatherLayer = `https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
      break;
    case 'wind':
      weatherLayer = `https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
      break;
    default:
      weatherLayer = `https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${API_KEY}`;
  }
  
  L.tileLayer(weatherLayer, {
    attribution: 'Weather data © OpenWeatherMap',
    opacity: 0.6
  }).addTo(map);
}

// Get weather icon class based on weather ID
function getWeatherIconClass(weatherId) {
  if (weatherId >= 200 && weatherId < 300) {
    return 'fa-bolt';
  } else if (weatherId >= 300 && weatherId < 400) {
    return 'fa-cloud-rain';
  } else if (weatherId >= 500 && weatherId < 600) {
    return weatherId >= 511 ? 'fa-cloud-showers-heavy' : 'fa-cloud-rain';
  } else if (weatherId >= 600 && weatherId < 700) {
    return 'fa-snowflake';
  } else if (weatherId >= 700 && weatherId < 800) {
    return 'fa-smog';
  } else if (weatherId === 800) {
    return 'fa-sun';
  } else if (weatherId > 800 && weatherId < 900) {
    return weatherId === 801 ? 'fa-cloud-sun' : 'fa-cloud';
  } else {
    return 'fa-cloud-sun';
  }
}

// Set temperature unit
function setTemperatureUnit(newUnits) {
  if (units === newUnits) return;
  
  units = newUnits;
  localStorage.setItem('units', units);
  
  if (units === 'metric') {
    celsiusToggle.classList.add('active');
    fahrenheitToggle.classList.remove('active');
  } else {
    celsiusToggle.classList.remove('active');
    fahrenheitToggle.classList.add('active');
  }
  
  document.querySelector(`input[name="units"][value="${units}"]`).checked = true;
  
  if (currentCity) {
    fetchWeatherData();
  }
}

// Settings functions
function openSettings() {
  settingsModal.style.display = 'flex';
}

function closeSettings() {
  settingsModal.style.display = 'none';
}

// Load settings from localStorage
function loadSettings() {
  document.querySelector(`input[name="units"][value="${units}"]`).checked = true;
  document.querySelector(`input[name="theme"][value="${theme}"]`).checked = true;
  document.querySelector('input[name="notify-severe"]').checked = notifySettings.severe;
  document.querySelector('input[name="notify-daily"]').checked = notifySettings.daily;
  applyTheme();
}

// Save settings
function saveSettings() {
  const newUnits = document.querySelector('input[name="units"]:checked').value;
  if (units !== newUnits) {
    setTemperatureUnit(newUnits);
  }
  
  const newTheme = document.querySelector('input[name="theme"]:checked').value;
  if (theme !== newTheme) {
    theme = newTheme;
    localStorage.setItem('theme', theme);
    applyTheme();
  }
  
  notifySettings.severe = document.querySelector('input[name="notify-severe"]').checked;
  notifySettings.daily = document.querySelector('input[name="notify-daily"]').checked;
  
  localStorage.setItem('notify-severe', notifySettings.severe);
  localStorage.setItem('notify-daily', notifySettings.daily);
  
  closeSettings();
}

// Apply theme to the app
function applyTheme() {
  let appliedTheme = theme;
  
  if (theme === 'auto') {
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
    appliedTheme = prefersDarkScheme ? 'dark' : 'light';
  }
  
  // Remove all theme classes
  document.documentElement.classList.remove('light-theme', 'dark-theme');
  document.documentElement.classList.add(`${appliedTheme}-theme`);
  
  // Update settings modal radio buttons
  const themeRadios = document.querySelectorAll('input[name="theme"]');
  themeRadios.forEach(radio => {
    radio.checked = radio.value === theme;
  });
}

// Show/hide error message
function showError(message) {
  errorMessage.textContent = message;
  errorBox.style.display = 'flex';
}

function hideError() {
  errorBox.style.display = 'none';
}

// Show/hide loading spinner
function showLoading() {
  loadingSpinner.style.display = 'flex';
}

function hideLoading() {
  loadingSpinner.style.display = 'none';
}

// Show weather alert notification
function showWeatherAlert(alert) {
  const toast = document.createElement('div');
  toast.classList.add('weather-alert');
  
  toast.innerHTML = `
    <div class="alert-header">
      <i class="fas fa-exclamation-triangle"></i>
      <span>Weather Alert</span>
      <button class="close-alert">×</button>
    </div>
    <div class="alert-body">
      <p class="alert-title">${alert.event}</p>
      <p class="alert-description">${alert.description}</p>
    </div>
  `;
  
  document.body.appendChild(toast);
  
  toast.querySelector('.close-alert').addEventListener('click', () => {
    toast.remove();
  });
  
  setTimeout(() => {
    if (document.body.contains(toast)) {
      toast.remove();
    }
  }, 10000);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (theme === 'auto') {
    applyTheme();
  }
});