// Location API utilities for Indian states and districts from our backend

// Base API configuration - use our backend
const API_BASE_URL = 'http://localhost:5000/api';

// Cache for location data to avoid repeated API calls
const locationCache = {
  states: null,
  districts: {}
};

/**
 * Fetch all Indian states from our backend
 */
export const fetchStates = async () => {
  if (locationCache.states) {
    return locationCache.states;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/locations/states`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const states = await response.json();
    
    // Sort with Maharashtra at top, others alphabetically
    const sortedStates = states.sort((a, b) => {
      if (a.name === 'Maharashtra') return -1;
      if (b.name === 'Maharashtra') return 1;
      return a.name.localeCompare(b.name);
    });

    locationCache.states = sortedStates;
    return sortedStates;
  } catch (error) {
    console.error('Error fetching states from backend:', error);
    
    // Return empty array if backend fails completely
    locationCache.states = [];
    return [];
  }
};

/**
 * Fetch districts for a given state from our backend
 */
export const fetchDistricts = async (stateId, stateName) => {
  const cacheKey = `${stateId}_${stateName}`;
  
  if (locationCache.districts[cacheKey]) {
    return locationCache.districts[cacheKey];
  }

  try {
    const response = await fetch(`${API_BASE_URL}/locations/districts?state=${encodeURIComponent(stateName)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const districts = await response.json();
    
    locationCache.districts[cacheKey] = districts;
    return districts;
  } catch (error) {
    console.error('Error fetching districts from backend:', error);
    
    // Return empty array if backend fails
    locationCache.districts[cacheKey] = [];
    return [];
  }
};

// Keep the existing taluka and village functions for backward compatibility
// but simplify them since we're now using text inputs

/**
 * Fetch talukas - simplified since we now use text input
 */
export const fetchTalukas = async (districtName, stateName) => {
  // Return empty array since we're using text input now
  console.log('Talukas are now text input - no API call needed');
  return [];
};

/**
 * Fetch villages - simplified since we now use text input
 */
export const fetchVillages = async (talukaName, districtName, stateName) => {
  // Return empty array since we're using text input now
  console.log('Villages are now text input - no API call needed');
  return [];
};

/**
 * Search villages - simplified since we now use text input
 */
export const searchVillages = async (query, talukaName, districtName, stateName) => {
  // Return empty array since we're using text input now
  console.log('Villages are now text input - no API call needed');
  return [];
};
