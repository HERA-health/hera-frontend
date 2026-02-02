/**
 * Client Service
 * Handles API calls for client profile management including location
 */

import { api } from './api';

// ============================================================================
// TYPES
// ============================================================================

export interface ClientLocation {
  homeAddress: string;
  homeCity: string;
  homePostalCode: string;
  homeCountry: string;
  homeLat: number | null;
  homeLng: number | null;
  hasLocation: boolean;
}

export interface ClientProfile {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  avatar: string | null;
  birthDate: string | null;
  gender: string | null;
  occupation: string | null;
  completedQuestionnaire: boolean;
  // Location fields
  homeAddress: string;
  homeCity: string;
  homePostalCode: string;
  homeCountry: string;
  homeLat: number | null;
  homeLng: number | null;
  hasLocation: boolean;
}

export interface ClientProfileUpdateData {
  homeAddress?: string;
  homeCity?: string;
  homePostalCode?: string;
  homeCountry?: string;
  homeLat?: number | null;
  homeLng?: number | null;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get current client's profile
 */
export const getMyClientProfile = async (): Promise<ClientProfile> => {
  const response = await api.get<ApiResponse<ClientProfile>>('/clients/me/profile');
  return response.data.data;
};

/**
 * Update current client's profile (including location)
 */
export const updateMyClientProfile = async (
  data: ClientProfileUpdateData
): Promise<ClientProfile> => {
  const response = await api.put<ApiResponse<ClientProfile>>('/clients/me/profile', data);
  return response.data.data;
};

/**
 * Update client location specifically
 * Convenience wrapper that only sends location fields
 */
export const updateClientLocation = async (location: {
  address: string;
  city: string;
  postalCode: string;
  country: string;
  lat: number;
  lng: number;
}): Promise<ClientProfile> => {
  return updateMyClientProfile({
    homeAddress: location.address,
    homeCity: location.city,
    homePostalCode: location.postalCode,
    homeCountry: location.country,
    homeLat: location.lat,
    homeLng: location.lng,
  });
};

/**
 * Clear client location
 */
export const clearClientLocation = async (): Promise<ClientProfile> => {
  return updateMyClientProfile({
    homeAddress: '',
    homeCity: '',
    homePostalCode: '',
    homeCountry: 'Spain',
    homeLat: null,
    homeLng: null,
  });
};
