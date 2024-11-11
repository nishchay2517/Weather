'use client'
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import ClipLoader from 'react-spinners/ClipLoader';

const WeatherDashboard = () => {
  const { theme, setTheme } = useTheme();
  
  const [cities, setCities] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('weatherCities');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [newCity, setNewCity] = useState('');
  const [weatherData, setWeatherData] = useState({});
  const [forecastData, setForecastData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isCelsius, setIsCelsius] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  const api = {
    key: process.env.NEXT_PUBLIC_API,
    base: 'https://api.openweathermap.org/data/2.5/',
  };
  

  // Animation variants for the forecast content
  const forecastVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3,
      },
    },
  };

  // Animation variants for individual forecast days
  const forecastDayVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.3,
      },
    }),
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('weatherCities', JSON.stringify(cities));
    }
    fetchAllWeatherData();

    let refreshInterval;
    if (autoRefreshEnabled && cities.length > 0) {
      refreshInterval = setInterval(fetchAllWeatherData, 300000);
    }
    return () => clearInterval(refreshInterval);
  }, [cities, autoRefreshEnabled]);
  
  const fetchAllWeatherData = async () => {
    setLoading(true);
    const weatherPromises = cities.map(city => fetchCityWeather(city));
    const forecastPromises = cities.map(city => fetchCityForecast(city));
    
    try {
      const [weatherResults, forecastResults] = await Promise.all([
        Promise.all(weatherPromises),
        Promise.all(forecastPromises)
      ]);

      const newWeatherData = {};
      const newForecastData = {};

      weatherResults.forEach((data, index) => {
        if (data) newWeatherData[cities[index]] = data;
      });

      forecastResults.forEach((data, index) => {
        if (data) newForecastData[cities[index]] = data;
      });

      setWeatherData(newWeatherData);
      setForecastData(newForecastData);
    } catch (err) {
      setError('Failed to fetch weather data');
    }
    setLoading(false);
  };

  const fetchCityWeather = async (city) => {
    try {
      const response = await fetch(
        `${api.base}weather?q=${city}&units=metric&APPID=${api.key}`
      );
      if (!response.ok) throw new Error('City not found');
      return await response.json();
    } catch (err) {
      setError(`Failed to fetch weather for ${city}`);
      return null;
    }
  };

  const fetchCityForecast = async (city) => {
    try {
      const response = await fetch(
        `${api.base}forecast?q=${city}&units=metric&APPID=${api.key}`
      );
      if (!response.ok) throw new Error('Forecast not found');
      const data = await response.json();
      
      const dailyForecasts = data.list.reduce((acc, item) => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!acc[date]) {
          acc[date] = item;
        }
        return acc;
      }, {});

      return Object.values(dailyForecasts).slice(0, 5);
    } catch (err) {
      setError(`Failed to fetch forecast for ${city}`);
      return null;
    }
  };

  const convertTemp = (celsius) => {
    return isCelsius ? celsius : (celsius * 9 / 5) + 32;
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  const searchCities = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const response = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${api.key}`
      );
      const data = await response.json();
      setSuggestions(data.map(city => `${city.name}, ${city.country}`));
    } catch (err) {
      setSuggestions([]);
    }
  };

  const addCity = (e) => {
    e.preventDefault();
    if (newCity && !cities.includes(newCity)) {
      setCities([...cities, newCity]);
      setNewCity('');
      setError('');
      setSuggestions([]);
    }
  };

  const removeCity = (cityToRemove) => {
    setCities(cities.filter(city => city !== cityToRemove));
    const newWeatherData = { ...weatherData };
    delete newWeatherData[cityToRemove];
    setWeatherData(newWeatherData);
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <ClipLoader color="#4A90E2" loading={loading} size={80} />
      </div>
    );
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Weather Dashboard</CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span>°C</span>
                <Switch
                  checked={!isCelsius}
                  onCheckedChange={() => setIsCelsius(!isCelsius)}
                />
                <span>°F</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Auto-refresh</span>
                <Switch
                  checked={autoRefreshEnabled}
                  onCheckedChange={setAutoRefreshEnabled}
                />
              </div>
              <Button variant="outline" size="icon" onClick={toggleTheme}>
                {theme === 'dark' ? <Sun /> : <Moon />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={fetchAllWeatherData}
                disabled={loading}
              >
                🔄
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={addCity} className="relative mb-6">
            <div className="flex gap-2">
              <Input
                type="text"
                value={newCity}
                onChange={(e) => {
                  setNewCity(e.target.value);
                  searchCities(e.target.value);
                }}
                placeholder="Enter city name"
                className="flex-grow"
              />
              <Button type="submit">
                ➕ Add City
              </Button>
            </div>
            {suggestions.length > 0 && (
              <Card className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-900">
                <CardContent className="p-2">
                  {suggestions.map((suggestion, index) => (
                    <Button
                      key={index}
                      variant="ghost"
                      className="w-full text-left justify-start"
                      onClick={() => {
                        setNewCity(suggestion);
                        setSuggestions([]);
                      }}
                    >
                      {suggestion}
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </form>

          {error && (
            <div className="text-red-500 mb-4">{error}</div>
          )}

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
          >
            {cities.map(city => (
              <motion.div
                key={city}
                className="relative"
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <Card>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => removeCity(city)}
                  >
                    ❌
                  </Button>
                  <CardHeader>
                    <CardTitle>{city}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="flex items-center justify-center p-4"
                      >
                        🔄 Loading...
                      </motion.div>
                    ) : weatherData[city] ? (
                      <Tabs defaultValue="current" className="w-full">
                        <TabsList className="w-full">
                          <TabsTrigger value="current" className="flex-1">Current</TabsTrigger>
                          <TabsTrigger value="forecast" className="flex-1">5-Day Forecast</TabsTrigger>
                        </TabsList>

                        <AnimatePresence mode="wait">
                          <TabsContent value="current">
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -20 }}
                              transition={{ duration: 0.3 }}
                              className="space-y-4"
                            >
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-3xl font-bold">
                                    {Math.round(convertTemp(weatherData[city].main.temp))}°
                                    {isCelsius ? 'C' : 'F'}
                                  </p>
                                  <p className="capitalize text-lg">
                                    {weatherData[city].weather[0].description}
                                  </p>
                                </div>
                                <img
                                  src={getWeatherIcon(weatherData[city].weather[0].icon)}
                                  alt="Weather icon"
                                  className="w-16 h-16"
                                />
                              </div>
                              <div className="space-y-2 text-sm text-gray-500">
                                <p>Humidity: {weatherData[city].main.humidity}%</p>
                                <p>Wind: {weatherData[city].wind.speed} m/s</p>
                                <p>Pressure: {weatherData[city].main.pressure} hPa</p>
                                <p className="text-xs">
                                  Last updated: {formatTimestamp(weatherData[city].dt)}
                                </p>
                              </div>
                            </motion.div>
                          </TabsContent>

                          <TabsContent value="forecast">
                            <motion.div
                              variants={forecastVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                            >
                              {forecastData[city] ? (
                                <div className="grid grid-cols-5 gap-2">
                                  {forecastData[city].map((day, index) => (
                                    <motion.div
                                      key={index}
                                      variants={forecastDayVariants}
                                      initial="hidden"
                                      animate="visible"
                                      custom={index}
                                      className="text-center p-2"
                                    >
                                      <p className="text-sm font-medium">{formatDate(day.dt)}</p>
                                      <img
                                        src={getWeatherIcon(day.weather[0].icon)}
                                        alt="Weather icon"
                                        className="w-8 h-8 mx-auto"
                                      />
                                      <p className="text-sm font-bold">
                                        {Math.round(convertTemp(day.main.temp))}°
                                        {isCelsius ? 'C' : 'F'}
                                      </p>
                                      <p className="text-xs text-gray-500 capitalize">
                                        {day.weather[0].description}
                                      </p>
                                    </motion.div>
                                  ))}
                                </div>
                              ) : (
                                <p>No forecast available</p>
                              )}
                            </motion.div>
                          </TabsContent>
                        </AnimatePresence>
                      </Tabs>
                    ) : (
                      <p>No data available</p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </CardContent>
      </Card>
    </div>
  );
};

export default WeatherDashboard;