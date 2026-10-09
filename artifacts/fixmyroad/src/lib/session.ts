import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { Role, User } from './types';

export function useSession() {
  const query = useQuery({
    queryKey: ['session'],
    queryFn: async (): Promise<User | null> => {
      try {
        const data = await api<{ user: User }>('/api/auth/me');
        return data.user;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) return null;
        throw err;
      }
    },
    staleTime: 60_000,
    retry: false,
  });
  return { user: query.data ?? null, isLoading: query.isLoading };
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string; role: Role }) =>
      api<{ user: User }>('/api/auth/login', { method: 'POST', body: input }),
    onSuccess: (data) => queryClient.setQueryData(['session'], data.user),
  });
}

export function useSignup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { name: string; email: string; password: string; role: Role }) =>
      api<{ user: User }>('/api/auth/signup', { method: 'POST', body: input }),
    onSuccess: (data) => queryClient.setQueryData(['session'], data.user),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
    onSuccess: () => {
      queryClient.setQueryData(['session'], null);
      queryClient.invalidateQueries();
    },
  });
}
