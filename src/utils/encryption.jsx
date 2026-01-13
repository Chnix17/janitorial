import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.REACT_APP_ENCRYPTION_KEY || 'LEBVEpkgXGREZq4U6AjS8dP7yz7DJx17';

export const SecureStorage = {
    // Simple encryption method
    encrypt: (data) => {
        return CryptoJS.AES.encrypt(JSON.stringify(data), ENCRYPTION_KEY).toString();
    },

    // Simple decryption method
    decrypt: (ciphertext) => {
        try {
            const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch {
            return null;
        }
    },

    // Storage methods
    setLocalItem: (key, value) => {
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString();
        localStorage.setItem(key, encrypted);
    },

    getLocalItem: (key) => {
        const encrypted = localStorage.getItem(key);
        if (!encrypted) return null;
        
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
            const decryptedStr = bytes.toString(CryptoJS.enc.Utf8);
            return JSON.parse(decryptedStr);
        } catch (error) {
            console.error('Error decrypting local storage value:', error);
            return null;
        }
    },

    setSessionItem: (key, value) => {
        const encrypted = CryptoJS.AES.encrypt(JSON.stringify(value), ENCRYPTION_KEY).toString();
        sessionStorage.setItem(key, encrypted);
    },

    getSessionItem: (key) => {
        const encrypted = sessionStorage.getItem(key);
        if (!encrypted) return null;
        
        try {
            const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch {
            return null;
        }
    }
};