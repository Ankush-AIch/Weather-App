const cityInput = document.getElementById('city-input');
const searchBtn = document.getElementById('search-btn');
const suggestionsList = document.getElementById('suggestions-list');
const weatherContent = document.getElementById('weather-content');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const errorText = document.getElementById('error-text');

// WMO Weather interpretation codes (WW)
const weatherCodes = {
    0: { desc: "Clear sky", icon: "fa-sun" },
    1: { desc: "Mainly clear", icon: "fa-sun" },
    2: { desc: "Partly cloudy", icon: "fa-cloud-sun" },
    3: { desc: "Overcast", icon: "fa-cloud" },
    45: { desc: "Fog", icon: "fa-smog" },
    48: { desc: "Depositing rime fog", icon: "fa-smog" },
    51: { desc: "Light drizzle", icon: "fa-cloud-rain" },
    53: { desc: "Moderate drizzle", icon: "fa-cloud-rain" },
    55: { desc: "Dense drizzle", icon: "fa-cloud-rain" },
    56: { desc: "Light freezing drizzle", icon: "fa-cloud-rain" },
    57: { desc: "Dense freezing drizzle", icon: "fa-cloud-rain" },
    61: { desc: "Slight rain", icon: "fa-cloud-showers-heavy" },
    63: { desc: "Moderate rain", icon: "fa-cloud-showers-heavy" },
    65: { desc: "Heavy rain", icon: "fa-cloud-showers-heavy" },
    66: { desc: "Light freezing rain", icon: "fa-cloud-showers-heavy" },
    67: { desc: "Heavy freezing rain", icon: "fa-cloud-showers-heavy" },
    71: { desc: "Slight snow fall", icon: "fa-snowflake" },
    73: { desc: "Moderate snow fall", icon: "fa-snowflake" },
    75: { desc: "Heavy snow fall", icon: "fa-snowflake" },
    77: { desc: "Snow grains", icon: "fa-snowflake" },
    80: { desc: "Slight rain showers", icon: "fa-cloud-showers-water" },
    81: { desc: "Moderate rain showers", icon: "fa-cloud-showers-water" },
    82: { desc: "Violent rain showers", icon: "fa-cloud-showers-water" },
    85: { desc: "Slight snow showers", icon: "fa-snowflake" },
    86: { desc: "Heavy snow showers", icon: "fa-snowflake" },
    95: { desc: "Thunderstorm", icon: "fa-bolt" },
    96: { desc: "Thunderstorm with light hail", icon: "fa-bolt" },
    99: { desc: "Thunderstorm with heavy hail", icon: "fa-bolt" }
};

searchBtn.addEventListener('click', () => {
    const city = cityInput.value.trim();
    if (city) {
        getWeather(city);
        suggestionsList.style.display = 'none';
    }
});

cityInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const city = cityInput.value.trim();
        if (city) {
            getWeather(city);
            suggestionsList.style.display = 'none';
        }
    }
});

let debounceTimer;

cityInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    const query = e.target.value.trim();
    
    if (query.length < 2) {
        suggestionsList.style.display = 'none';
        return;
    }
    
    debounceTimer = setTimeout(() => {
        fetchSuggestions(query);
    }, 300);
});

document.addEventListener('click', (e) => {
    if (!cityInput.contains(e.target) && !suggestionsList.contains(e.target)) {
        suggestionsList.style.display = 'none';
    }
});

async function fetchSuggestions(query) {
    try {
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            renderSuggestions(data.results);
        } else {
            suggestionsList.style.display = 'none';
        }
    } catch (error) {
        console.error("Error fetching suggestions:", error);
    }
}

function renderSuggestions(results) {
    suggestionsList.innerHTML = '';
    
    const uniqueLocations = new Set();
    
    results.forEach(location => {
        const locationKey = `${location.name}-${location.country}`;
        if (uniqueLocations.has(locationKey)) return;
        uniqueLocations.add(locationKey);

        const li = document.createElement('li');
        
        let details = location.country;
        if (location.admin1) {
            details = `${location.admin1}, ${location.country}`;
        }
        
        li.innerHTML = `
            <span class="suggestion-name">${location.name}</span>
            <span class="suggestion-details">${details}</span>
        `;
        
        li.addEventListener('click', () => {
            cityInput.value = location.name;
            suggestionsList.style.display = 'none';
            getWeather(location.name);
        });
        
        suggestionsList.appendChild(li);
    });
    
    suggestionsList.style.display = 'block';
}

async function getWeather(city) {
    // UI State Loading
    weatherContent.style.display = 'none';
    errorMessage.style.display = 'none';
    loader.style.display = 'flex';

    try {
        // 1. Geocode the city name to get lat and long using Open-Meteo Geocoding API
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) {
            throw new Error("City not found");
        }

        const location = geoData.results[0];
        const lat = location.latitude;
        const lon = location.longitude;
        const cityName = location.name;
        const country = location.country;

        // 2. Fetch weather using lat and long
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m&timezone=auto`);
        const weatherData = await weatherResponse.json();
        
        const current = weatherData.current;
        updateUI(cityName, country, current);

    } catch (error) {
        showError(error.message);
    }
}

function updateUI(city, country, current) {
    const code = current.weather_code;
    const weatherInfo = weatherCodes[code] || { desc: "Unknown", icon: "fa-cloud" };
    
    // Check if it's night and adjust icon for clear/cloudy if needed
    let iconClass = weatherInfo.icon;
    if (current.is_day === 0 && iconClass === 'fa-sun') {
        iconClass = 'fa-moon';
    } else if (current.is_day === 0 && iconClass === 'fa-cloud-sun') {
        iconClass = 'fa-cloud-moon';
    }

    const html = `
        <div class="weather-main">
            <div class="weather-icon-container">
                <i class="fas ${iconClass}"></i>
            </div>
            <h1 class="temp">${Math.round(current.temperature_2m)}°C</h1>
            <h2 class="city-name">${city}, ${country}</h2>
            <p class="condition">${weatherInfo.desc}</p>
        </div>
        <div class="weather-details">
            <div class="detail-card">
                <div class="detail-icon">
                    <i class="fas fa-temperature-half"></i>
                </div>
                <div class="detail-info">
                    <span>Feels Like</span>
                    <strong>${Math.round(current.apparent_temperature)}°C</strong>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">
                    <i class="fas fa-droplet"></i>
                </div>
                <div class="detail-info">
                    <span>Humidity</span>
                    <strong>${current.relative_humidity_2m}%</strong>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">
                    <i class="fas fa-wind"></i>
                </div>
                <div class="detail-info">
                    <span>Wind</span>
                    <strong>${current.wind_speed_10m} km/h</strong>
                </div>
            </div>
            <div class="detail-card">
                <div class="detail-icon">
                    <i class="fas fa-cloud-showers-heavy"></i>
                </div>
                <div class="detail-info">
                    <span>Precipitation</span>
                    <strong>${current.precipitation} mm</strong>
                </div>
            </div>
        </div>
    `;

    weatherContent.innerHTML = html;
    loader.style.display = 'none';
    weatherContent.style.display = 'flex';
}

function showError(msg) {
    loader.style.display = 'none';
    errorText.textContent = msg === "City not found" ? "Sorry, we couldn't find that city." : "Failed to fetch weather data. Please check your connection.";
    errorMessage.style.display = 'block';
}
