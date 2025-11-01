import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from './useDebounce';

interface AutosaveOptions {
  delay?: number;
  onSave: (data: any) => Promise<void>;
  onError?: (error: Error) => void;
}

export function useAutosave<T>(data: T, options: AutosaveOptions) {
  const { delay = 2000, onSave, onError } = options;
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const debouncedData = useDebounce(data, delay);
  const isFirstRender = useRef(true);
  const previousDataRef = useRef<T | null>(null);
  const saveInProgressRef = useRef(false);
  const onSaveRef = useRef(onSave);
  const onErrorRef = useRef(onError);

  // Keep refs up to date
  useEffect(() => {
    onSaveRef.current = onSave;
    onErrorRef.current = onError;
  }, [onSave, onError]);

  // Check if data actually changed
  const hasDataChanged = useCallback((current: T, previous: T | null): boolean => {
    if (previous === null) return false;
    return JSON.stringify(current) !== JSON.stringify(previous);
  }, []);

  const saveData = useCallback(async () => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousDataRef.current = debouncedData;
      return;
    }

    // Skip if save is already in progress
    if (saveInProgressRef.current) {
      return;
    }

    // Skip if data hasn't changed
    if (!hasDataChanged(debouncedData, previousDataRef.current)) {
      return;
    }

    // Mark as in progress
    saveInProgressRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      await onSaveRef.current(debouncedData);
      setLastSaved(new Date());
      // Only update previousDataRef on successful save
      previousDataRef.current = debouncedData;
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
      // IMPORTANT: Update previousDataRef even on error to prevent infinite retry loop
      // The error might be temporary or a client-side issue, and we don't want to
      // keep retrying the same data that's causing the error
      previousDataRef.current = debouncedData;
    } finally {
      setIsSaving(false);
      saveInProgressRef.current = false;
    }
  }, [debouncedData, hasDataChanged]);

  useEffect(() => {
    saveData();
  }, [saveData]);

  return {
    isSaving,
    lastSaved,
    error,
  };
}

