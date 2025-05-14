// API Key + base url
const API_KEY = '969c6e8498d0b6569c9664f9a0b92cd0';
const BASE_URL = 'https://api.openweathermap.org/data/2.5/';

// accessing DOM Elements
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const locationBtn = document.getElementById('locationBtn');
const recentSearches = document.getElementById('recentSearches');
const errorMsg = document.getElementById('errorMsg');
const loader = document.getElementById('loader');
const weatherData = document.getElementById('weatherData');
const forecastContainer = document.getElementById('forecastContainer');

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners
    searchBtn.addEventListener('click', searchWeather);
    locationBtn.addEventListener('click', getCurrentLocationWeather);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchWeather();
    });

    //when you are going to type in search, toggle all recently 
    //searched locations from local storage
    cityInput.addEventListener('focus', toggleRecentSearches);
    document.addEventListener('click', (e) => {
        if (!cityInput.contains(e.target) && !recentSearches.contains(e.target)) {
            recentSearches.classList.add('hidden');
        }
    });
    
    // Load recent searches from local storage
    loadRecentSearches();
});

// Search weather for the city input
function searchWeather() {
    const city = cityInput.value.trim();
    if (city === '') {
        showError('Please enter a city name');
        return;
    }
    
    fetchWeatherData(city);
}

// Get weather for current location
function getCurrentLocationWeather() {
    if (navigator.geolocation) {
        showLoader();
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                fetchWeatherByCoords(latitude, longitude);
            },
            (error) => {
                hideLoader();
                showError('Unable to retrieve your location. Please allow location access or enter a city name.');
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

// Fetch weather data by city name
async function fetchWeatherData(city) {
    showLoader();
    try {
        // Fetch current weather
        const weatherResponse = await fetch(`${BASE_URL}/weather?q=${city}&appid=${API_KEY}&units=metric`);
        
        if (!weatherResponse.ok) {
            throw new Error('City not found. Please check the spelling and try again.');
        }
        
        const weatherData = await weatherResponse.json();
        
        // Save to recent searches
        saveRecentSearch(weatherData.name);
        
        // Fetch 5-day forecast
        const forecastResponse = await fetch(`${BASE_URL}/forecast?q=${city}&appid=${API_KEY}&units=metric`);
        const forecastData = await forecastResponse.json();
        
        // Display weather data
        displayWeatherData(weatherData, forecastData);
        hideLoader();
        
    } catch (error) {
        hideLoader();
        showError(error.message);
    }
}

// Fetch weather data by coordinates
async function fetchWeatherByCoords(lat, lon) {
    try {
        // Fetch current weather
        const weatherResponse = await fetch(`${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        const weatherData = await weatherResponse.json();
        
        // Save to recent searches
        saveRecentSearch(weatherData.name);
        
        // Fetch 5-day forecast
        const forecastResponse = await fetch(`${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        const forecastData = await forecastResponse.json();
        
        // Display weather data
        displayWeatherData(weatherData, forecastData);
        hideLoader();
        
    } catch (error) {
        hideLoader();
        showError('Error fetching weather data. Please try again.');
    }
}

// Display weather data
function displayWeatherData(weather, forecast) {
    // Hide error message if visible
    errorMsg.classList.add('hidden');
    
    // Show weather data container
    weatherData.classList.remove('hidden');
    
    // Current weather
    document.getElementById('cityName').textContent = `${weather.name}, ${weather.sys.country}`;
    document.getElementById('currentDate').textContent = formatDate(new Date());
    document.getElementById('temperature').textContent = `${Math.round(weather.main.temp)}°C`;
    document.getElementById('weatherDescription').textContent = weather.weather[0].description;
    document.getElementById('feelsLike').textContent = `${Math.round(weather.main.feels_like)}°C`;
    document.getElementById('humidity').textContent = `${weather.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${weather.wind.speed} m/s`;
    document.getElementById('weatherIcon').src = `https://openweathermap.org/img/wn/${weather.weather[0].icon}@2x.png`;
    
    // 5-day forecast
    displayForecast(forecast);
    
    // Input the city name in the search box
    cityInput.value = weather.name;
}

// Display 5-day forecast
function displayForecast(forecastData) {
    forecastContainer.innerHTML = '';
    
    // Group forecast by day (12:00 PM)
    const dailyForecasts = {};
    
    forecastData.list.forEach(item => {
        const date = new Date(item.dt * 1000);
        const day = date.toLocaleDateString();
        const hour = date.getHours();
        
        // Use forecast for around noon (12:00 PM) for each day
        if ((hour >= 11 && hour <= 13) || !dailyForecasts[day]) {
            dailyForecasts[day] = item;
        }
    });
    
    // Get the first 5 days
    const forecasts = Object.values(dailyForecasts).slice(0, 5);
    
    // Create forecast cards
    forecasts.forEach(item => {
        const date = new Date(item.dt * 1000);
        const card = document.createElement('div');
        card.className = 'bg-white rounded-lg shadow-md p-4';
        card.innerHTML = `
            <p class="font-medium text-gray-800">${formatDayDate(date)}</p>
            <div class="flex justify-center my-2">
                <img src="https://openweathermap.org/img/wn/${item.weather[0].icon}.png" alt="${item.weather[0].description}" class="w-12 h-12">
            </div>
            <p class="text-xl font-bold text-center">${Math.round(item.main.temp)}°C</p>
            <div class="mt-2 text-sm text-gray-600">
                <p><i class="fas fa-wind mr-2"></i>${item.wind.speed} m/s</p>
                <p><i class="fas fa-droplet mr-2"></i>${item.main.humidity}%</p>
            </div>
        `;
        forecastContainer.appendChild(card);
    });
}

// Save recent search to local storage
function saveRecentSearch(cityName) {
    let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
    
    // Remove if already exists (to avoid duplicates)
    recentSearches = recentSearches.filter(city => city !== cityName);
    
    recentSearches.unshift(cityName);
    recentSearches = recentSearches.slice(0,5);
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    
    // Update the dropdown
    loadRecentSearches();
}

// Load recent searches from local storage
function loadRecentSearches() {
    const recentSearchesList = JSON.parse(localStorage.getItem('recentSearches')) || [];
    recentSearches.innerHTML = '';
    
    if (recentSearchesList.length === 0) {
        return;
    }
    
    //goes through each recently searched city and creates a div
    recentSearchesList.forEach(city => {
        const item = document.createElement('div');
        item.className = 'px-4 py-2 hover:bg-gray-100 cursor-pointer';
        item.textContent = city;
        item.addEventListener('click', () => {
            cityInput.value = city;
            recentSearches.classList.add('hidden');
            fetchWeatherData(city);
        });
        recentSearches.appendChild(item);
    });
}


//here lies util functions

// Toggle recent searches dropdown
function toggleRecentSearches() {
    const recentSearchesList = JSON.parse(localStorage.getItem('recentSearches')) || [];
    if (recentSearchesList.length > 0) {
        recentSearches.classList.remove('hidden');
    }
}

// Format date (e.g., Wednesday, May 14, 2025)
function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Format day and date (e.g., Wed, May 14)
function formatDayDate(date) {
    return date.toLocaleDateString('en-US', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

// Show error message
function showError(message) {
    errorMsg.textContent = message;
    errorMsg.classList.remove('hidden');
}

// Show loader
function showLoader() {
    loader.classList.remove('hidden');
    weatherData.classList.add('hidden');
    errorMsg.classList.add('hidden');
}

// Hide loader
function hideLoader() {
    loader.classList.add('hidden');
}