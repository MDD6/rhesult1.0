/**
 * useQuery Hook
 * Encapsulates data fetching logic with loading and error states
 * Implements the Composition Pattern for reusable logic
 * Follows React Hooks best practices
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { AppError, ErrorCode, isAppError } from "@/shared";

export interface UseQueryState<T> {
  data: T | null;
  isLoading: boolean;
  error: AppError | null;
  isError: boolean;
  isSuccess: boolean;
}

export interface UseQueryOptions {
  enabled?: boolean;
  retry?: boolean;
  onSuccess?: (data: unknown) => void;
  onError?: (error: AppError) => void;
}

/**
 * Custom hook for data fetching with error handling
 * @template T - Return data type
 * @param queryFn - Function that performs the fetch
 * @param options - Configuration options
 * @returns Query state with data, loading, and error states
 */
export function useQuery<T>(
  queryFn: () => Promise<T>,
  options: UseQueryOptions = {},
): UseQueryState<T> & { refetch: () => Promise<void> } {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AppError | null>(null);

  const { enabled = true, retry = true, onSuccess, onError } = options;

  // Ref to avoid infinite loop when consumer passes inline queryFn
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  const execute = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await queryFnRef.current();
      setData(result);
      onSuccessRef.current?.(result);
    } catch (err) {
      let appError: AppError;

      if (isAppError(err)) {
        appError = err;
      } else {
        appError = new AppError({
          code: ErrorCode.INTERNAL_SERVER_ERROR,
          message: err instanceof Error ? err.message : "Unknown error",
          statusCode: 500,
        });
      }

      setError(appError);
      onErrorRef.current?.(appError);

      if (retry) {
        console.warn(`Query failed, will retry:`, appError.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, [enabled, retry]);

  useEffect(() => {
    execute();
  }, [execute]);

  return {
    data,
    isLoading,
    error,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    refetch: execute,
  };
}

/**
 * useMutation Hook
 * Encapsulates mutation logic (POST, PUT, DELETE) with loading and error states
 */
export interface UseMutationState<T> {
  data: T | null;
  isLoading: boolean;
  error: AppError | null;
  isError: boolean;
  isSuccess: boolean;
}

export interface UseMutationOptions<T = unknown> {
  onSuccess?: (data: T) => void;
  onError?: (error: AppError) => void;
  onMutate?: () => void;
}

/**
 * Custom hook for mutations
 * @template TData - Data type to return
 * @template TPayload - Payload type to send
 * @param mutationFn - Function that performs the mutation
 * @param options - Configuration options
 */
export function useMutation<TData = unknown, TPayload = unknown>(
  mutationFn: (payload: TPayload) => Promise<TData>,
  options: UseMutationOptions<TData> = {},
) {
  const [data, setData] = useState<TData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);

  const { onSuccess, onError, onMutate } = options;

  const mutate = useCallback(
    async (payload: TPayload) => {
      setIsLoading(true);
      setError(null);
      onMutate?.();

      try {
        const result = await mutationFn(payload);
        setData(result);
        onSuccess?.(result);
        return result;
      } catch (err) {
        let appError: AppError;

        if (isAppError(err)) {
          appError = err;
        } else {
          appError = new AppError({
            code: ErrorCode.INTERNAL_SERVER_ERROR,
            message: err instanceof Error ? err.message : "Unknown error",
            statusCode: 500,
          });
        }

        setError(appError);
        onError?.(appError);
        throw appError;
      } finally {
        setIsLoading(false);
      }
    },
    [mutationFn, onSuccess, onError, onMutate],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    data,
    isLoading,
    error,
    isError: error !== null,
    isSuccess: data !== null && error === null,
    mutate,
    reset,
  };
}
