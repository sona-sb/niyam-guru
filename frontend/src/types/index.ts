/**
 * Type definitions for the application
 */

// Feature type used in Features section
export interface Feature {
  title: string;
  description: string;
  subFeatures: string[];
}

// Navigation link type
export interface NavLink {
  label: string;
  href: string;
}

// API response wrapper
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

// User type (for future auth)
export interface User {
  id: string;
  email: string;
  name: string;
}
