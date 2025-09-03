// Polyfills for Web3Auth in browser environment
import { Buffer } from 'buffer';
import process from 'process/browser';

// Add global polyfills
if (typeof window !== 'undefined') {
  (window as any).global = window;
  (window as any).process = process;
  (window as any).Buffer = Buffer;
}

// Export to ensure the file is imported
const polyfills = {};
export default polyfills;
