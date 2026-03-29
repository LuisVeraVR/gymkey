/**
 * Endpoints usados por la app móvil (rol miembro / JWT de usuario).
 * Base URL: API_BASE_URL (puerto vía EXPO_PUBLIC_API_PORT o EXPO_PUBLIC_API_URL).
 */
import api from './api';

export const memberRoutes = {
  profile: '/auth/me',
  mySubscription: '/subscriptions/my-subscription',
  subscribe: '/subscriptions/subscribe',
  plans: '/plans',
  myRoutines: '/routines/my-routines',
  myPayments: '/payments/my-payments',
  myAccessKey: '/access-keys/my-key',
} as const;

export async function fetchMemberProfile() {
  const { data } = await api.get(memberRoutes.profile);
  return data;
}

export async function fetchMySubscription() {
  const { data } = await api.get(memberRoutes.mySubscription);
  return data;
}

export async function fetchPlans() {
  const { data } = await api.get(memberRoutes.plans);
  return data;
}

export async function subscribeToPlan(planId: string) {
  const { data } = await api.post(memberRoutes.subscribe, { planId });
  return data;
}

export async function fetchMyRoutines() {
  const { data } = await api.get(memberRoutes.myRoutines);
  return data;
}

export async function fetchMyPayments() {
  const { data } = await api.get(memberRoutes.myPayments);
  return data;
}

export async function fetchMyAccessKey() {
  const { data } = await api.get(memberRoutes.myAccessKey);
  return data;
}
