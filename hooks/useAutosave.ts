import { useState, useEffect, useCallback, useRef } from "react";
import { useDebounce } from "./useDebounce";

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
  const abortControllerRef = useRef<AbortController | null>(null);
  const onSaveRef = useRef(onSave);
  const onErrorRef = useRef(onError);
  const dataKeyRef = useRef<string>("");

  // Detect significant data changes (e.g., switching between different pages/entities)
  // and reset the hook state to prevent incorrect comparisons
  useEffect(() => {
    const currentKey = JSON.stringify(data);
    const previousKey = dataKeyRef.current;

    // On first run, just store the key
    if (!previousKey) {
      dataKeyRef.current = currentKey;
      return;
    }

    // If the data structure changes significantly (e.g., different page loaded),
    // reset the first render flag and previous data ref
    if (currentKey !== previousKey) {
      // For objects, compare key fields to detect entity changes
      // If title changed significantly, it's likely a new entity
      try {
        const currentObj = JSON.parse(currentKey);
        const previousObj = JSON.parse(previousKey);

        // Check if title changed - this indicates a different page/entity was loaded
        const titleChanged = currentObj.title !== previousObj.title;

        // If title changed, it's likely a new entity - reset the hook
        if (titleChanged) {
          console.log("[useAutosave] 🔄 Title changed, resetting state:", {
            previousTitle: previousObj.title?.substring(0, 50),
            currentTitle: currentObj.title?.substring(0, 50),
          });
          isFirstRender.current = true;
          previousDataRef.current = null;
        }
      } catch (e) {
        // If parsing fails, just update the key
        console.warn("[useAutosave] Failed to parse data for comparison:", e);
      }
    }

    dataKeyRef.current = currentKey;
  }, [data]);

  // Debug: Log when hook is initialized
  useEffect(() => {
    console.log(
      "[useAutosave] 🚀 Hook initialized with data:",
      JSON.stringify(data).substring(0, 150)
    );
  }, []);

  // Debug: Log when data or debouncedData changes
  useEffect(() => {
    console.log("[useAutosave] 📊 Data changed:", {
      data: JSON.stringify(data).substring(0, 150),
      debouncedData: JSON.stringify(debouncedData).substring(0, 150),
      delay,
      dataEqual: JSON.stringify(data) === JSON.stringify(debouncedData),
    });
  }, [data, debouncedData, delay]);

  // Keep refs up to date
  useEffect(() => {
    onSaveRef.current = onSave;
    onErrorRef.current = onError;
  }, [onSave, onError]);

  // Optimized deep comparison for objects
  const hasDataChanged = useCallback(
    (current: T, previous: T | null): boolean => {
      if (previous === null) {
        console.log("[useAutosave] Previous data is null, no change");
        return false;
      }

      // Fast path for primitive types
      if (typeof current !== "object" || current === null) {
        const changed = current !== previous;
        console.log("[useAutosave] Primitive comparison:", {
          current,
          previous,
          changed,
        });
        return changed;
      }

      // For objects, compare keys and values
      if (typeof previous !== "object" || previous === null) {
        console.log("[useAutosave] Type mismatch, changed");
        return true;
      }

      const currentKeys = Object.keys(current);
      const previousKeys = Object.keys(previous);

      if (currentKeys.length !== previousKeys.length) {
        console.log("[useAutosave] Key count mismatch, changed");
        return true;
      }

      // Use JSON.stringify for reliable comparison
      // This is more reliable than manual comparison for complex objects
      const currentStr = JSON.stringify(current);
      const previousStr = JSON.stringify(previous);
      const changed = currentStr !== previousStr;

      console.log("[useAutosave] Object comparison:", {
        changed,
        currentKeys,
        previousKeys,
        currentStr: currentStr.substring(0, 100),
        previousStr: previousStr.substring(0, 100),
      });

      return changed;
    },
    []
  );

  // Use a ref to always get the latest debouncedData
  const debouncedDataRef = useRef(debouncedData);
  useEffect(() => {
    debouncedDataRef.current = debouncedData;
  }, [debouncedData]);

  const saveData = useCallback(async () => {
    // Get the latest debouncedData from ref
    const currentData = debouncedDataRef.current;

    // Skip first render - set initial reference
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousDataRef.current = currentData;
      console.log("[useAutosave] ⏭️ First render, setting initial reference:", {
        data: JSON.stringify(currentData).substring(0, 150),
        hasData: !!currentData,
      });
      return;
    }

    // Safety check: if previousData is null but we're past first render,
    // something went wrong - reset it
    if (!previousDataRef.current) {
      console.log(
        "[useAutosave] ⚠️ Previous data is null after first render, resetting"
      );
      previousDataRef.current = currentData;
      return;
    }

    // Skip if save is already in progress
    if (saveInProgressRef.current) {
      console.log("[useAutosave] ⏭️ Save already in progress, skipping");
      return;
    }

    // Check if data has changed using JSON comparison
    const currentStr = JSON.stringify(currentData);
    const previousStr = previousDataRef.current
      ? JSON.stringify(previousDataRef.current)
      : "null";
    const dataChanged = currentStr !== previousStr;

    // Log detailed comparison for debugging
    console.log("[useAutosave] 🔍 Checking for changes:", {
      dataChanged,
      currentStr: currentStr.substring(0, 200),
      previousStr: previousStr.substring(0, 200),
      currentStrLength: currentStr.length,
      previousStrLength: previousStr.length,
      hasPrevious: !!previousDataRef.current,
      isFirstRender: isFirstRender.current,
      saveInProgress: saveInProgressRef.current,
      currentData: currentData,
      previousData: previousDataRef.current,
    });

    // Skip if data hasn't changed
    if (!dataChanged) {
      console.log("[useAutosave] ⏭️ Data unchanged, skipping save");
      return;
    }

    console.log("[useAutosave] ✅ Data changed! Triggering save...");

    // Cancel any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    // Mark as in progress
    saveInProgressRef.current = true;
    setIsSaving(true);
    setError(null);

    try {
      console.log(
        "[useAutosave] 🔄 Calling onSave callback with data:",
        JSON.stringify(currentData).substring(0, 200)
      );

      // Call the save function and check if it actually saved
      const saveResult = await onSaveRef.current(currentData);

      // Check if request was aborted
      if (abortController.signal.aborted) {
        console.log("[useAutosave] ❌ Request was aborted");
        return;
      }

      // Check if save was actually performed (not skipped)
      // If onSave returns undefined or a falsy value, it might have been skipped
      // We only set lastSaved if the save actually happened
      // For now, we assume if no error was thrown, the save happened
      // But we should verify by checking if an API call was made

      console.log("[useAutosave] ✅ Save callback completed successfully!");
      setLastSaved(new Date());
      // Only update previousDataRef on successful save
      previousDataRef.current = currentData;
    } catch (err) {
      // Ignore abort errors
      if (abortController.signal.aborted) {
        return;
      }

      const error = err as Error;

      // Check if this is a "skip" error (not a real error)
      // Skip errors should not set error state or trigger onError callback
      if (error.message && error.message.startsWith("AUTOSAVE_SKIPPED_")) {
        console.log("[useAutosave] ⏭️ Save skipped:", error.message);
        // Don't set error state or call onError for skip errors
        // Just update previousDataRef to prevent retrying
        // Use currentData from ref, not debouncedData from closure
        previousDataRef.current = currentData;
        return;
      }

      // Real error - log it and handle it
      console.error("[useAutosave] ❌ Save error:", error.message || error);
      setError(error);
      if (onErrorRef.current) {
        onErrorRef.current(error);
      }
      // IMPORTANT: Update previousDataRef even on error to prevent infinite retry loop
      // The error might be temporary or a client-side issue, and we don't want to
      // keep retrying the same data that's causing the error
      previousDataRef.current = currentData;
    } finally {
      // Only clear in-progress flag if this wasn't aborted
      if (!abortController.signal.aborted) {
        setIsSaving(false);
        saveInProgressRef.current = false;
      }
      abortControllerRef.current = null;
    }
  }, []);

  // Trigger save when debouncedData changes
  useEffect(() => {
    console.log("[useAutosave] 🔔 debouncedData changed, triggering saveData");
    saveData();
  }, [debouncedData, saveData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isSaving,
    lastSaved,
    error,
  };
}
