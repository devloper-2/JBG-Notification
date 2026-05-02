import { Unit } from '../types/rawMaterial';
import { api } from '../utils/apiClient';

// Use shared API client with centralized token expiration handling
const unitApi = api;



export interface UnitsResponse {
  message: string;
  units: Unit[];
  count: number;
}

const unitService = {
  // Get all units
  async getUnits(): Promise<UnitsResponse> {
    try {
      console.log('Fetching units...');
      const response = await unitApi.get('/get-unit');
      console.log('Units fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching units:', error);
      throw error;
    }
  },
};

export default unitService;
