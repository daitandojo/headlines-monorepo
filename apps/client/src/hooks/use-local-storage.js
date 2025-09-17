"use client";

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage(key, initialValue) {
    const [storedValue, setStoredValue] = useState(initialValue);

    useEffect(() => {
        // This check ensures localStorage is only accessed on the client side.
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const item = window.localStorage.getItem(key);
            if (item) {
                setStoredValue(JSON.parse(item));
            }
        } catch (error) {
            console.error(`Error reading localStorage key “${key}”:`, error);
        }
    }, [key]);

    const setValue = useCallback((value) => {
        if (typeof window === 'undefined') {
            console.warn(`Tried to set localStorage key “${key}” on the server`);
            return;
        }
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(`Error setting localStorage key “${key}”:`, error);
        }
    }, [key, storedValue]);
    
    return [storedValue, setValue];
}