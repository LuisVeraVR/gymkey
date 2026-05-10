/**
 * Endpoints usados por la app móvil (rol miembro / JWT de usuario).
 * Base URL: API_BASE_URL (puerto vía EXPO_PUBLIC_API_PORT o EXPO_PUBLIC_API_URL).
 */
import api from './api';

export const memberRoutes = {
  profile: '/auth/me',
  mySubscription: '/subscriptions/my-subscription',
  subscriptionHistory: '/subscriptions/history',
  subscribe: '/subscriptions/subscribe',
  plans: '/plans',
  myRoutines: '/routines/my-routines',
  myPayments: '/payments/my-payments',
  myAccessKey: '/access-keys/my-key',
  notifications: '/notifications',
  notificationsUnread: '/notifications/unread-count',
  notificationsMarkAll: '/notifications/mark-all-read',
  classes: '/classes',
  myClassBookings: '/classes/my-bookings',
  validateAccessKey: '/access-keys/validate',
  runtimeSettings: '/settings/runtime-config',
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

export type RoutineExerciseInput = {
  name: string;
  sets?: number;
  reps?: number;
  weight?: string;
  notes?: string;
};

export async function createMyRoutine(payload: {
  name: string;
  exercises: RoutineExerciseInput[];
}) {
  const content = { exercises: payload.exercises };
  const { data } = await api.post('/routines', {
    name: payload.name,
    content,
  });
  return data;
}

export async function updateMyRoutine(
  routineId: string,
  payload: { name: string; exercises: RoutineExerciseInput[] },
) {
  const content = { exercises: payload.exercises };
  const { data } = await api.patch(`/routines/${routineId}`, {
    name: payload.name,
    content,
  });
  return data;
}

export async function deleteMyRoutine(routineId: string) {
  const { data } = await api.delete(`/routines/${routineId}`);
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

export async function fetchSubscriptionHistory() {
  const { data } = await api.get(memberRoutes.subscriptionHistory);
  return data;
}

export type NotificationDto = {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
};

export async function fetchNotifications(limit = 30) {
  const { data } = await api.get<{ items: NotificationDto[] }>(
    `${memberRoutes.notifications}?limit=${limit}`,
  );
  return data.items;
}

export async function fetchUnreadNotificationCount() {
  const { data } = await api.get<{ count: number }>(
    memberRoutes.notificationsUnread,
  );
  return data.count;
}

export async function markNotificationRead(id: string) {
  const { data } = await api.patch<NotificationDto>(
    `${memberRoutes.notifications}/${id}/read`,
  );
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post(memberRoutes.notificationsMarkAll);
  return data;
}

export type GymClassDto = {
  id: string;
  name: string;
  description?: string | null;
  dayOfWeek: number[];
  startTime: string;
  duration: number;
  capacity: number;
  occupied?: number;
  available?: number;
  nextDate?: string | null;
  coach?: { id: string; name?: string | null; email?: string };
};

export type ClassBookingDto = {
  id: string;
  status: string;
  date: string;
  classId?: string;
  gymClass?: GymClassDto;
};

export async function fetchClasses() {
  const { data } = await api.get<GymClassDto[]>(memberRoutes.classes);
  return data;
}

export async function bookClass(classId: string, date: string) {
  const { data } = await api.post<ClassBookingDto>(
    `${memberRoutes.classes}/${classId}/book`,
    { date },
  );
  return data;
}

export async function fetchMyClassBookings() {
  const { data } = await api.get<ClassBookingDto[]>(memberRoutes.myClassBookings);
  return data;
}

export async function cancelClassBooking(classId: string, date: string) {
  const { data } = await api.delete<ClassBookingDto>(
    `${memberRoutes.classes}/${classId}/book/${encodeURIComponent(date)}`,
  );
  return data;
}

export type AccessValidationResult = {
  valid: boolean;
  reason?: string;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    subscription?: string;
  };
};

export async function validateAccessKeyToken(token: string) {
  const { data } = await api.post<AccessValidationResult>(
    memberRoutes.validateAccessKey,
    { token },
  );
  return data;
}

export async function fetchRuntimeSettings() {
  const { data } = await api.get<{
    name: string;
    offlineToleranceMinutes: number;
    showPublicPortal: boolean;
    branding: {
      primaryColor?: string;
      accentColor?: string;
      appName?: string;
    } | null;
  }>(memberRoutes.runtimeSettings);
  return data;
}
