import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { customFetch } from "./custom-fetch";

export interface AdminNotificationUser {
  clerkUserId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
}

export interface AdminNotificationSubmission {
  id: number;
  formId: number;
  formTitle: string;
  submittedAt: string;
  data: Record<string, string>;
  user: AdminNotificationUser | null;
}

export interface AdminNotificationsResponse {
  unseenCount: number;
  submissions: AdminNotificationSubmission[];
}

export const ADMIN_NOTIFICATIONS_KEY = ["/api/admin/notifications"] as const;

/**
 * Fetch admin notifications: all submissions for forms flagged notifyAdmins,
 * plus a count of how many are newer than this admin's last "seen" timestamp.
 * Polls periodically so the badge stays fresh while the dashboard is open.
 */
export function useGetAdminNotifications(
  options?: Omit<
    UseQueryOptions<AdminNotificationsResponse>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery<AdminNotificationsResponse>({
    queryKey: ADMIN_NOTIFICATIONS_KEY,
    queryFn: () =>
      customFetch<AdminNotificationsResponse>("/api/admin/notifications", {
        responseType: "json",
      }),
    refetchInterval: 60_000,
    ...options,
  });
}

/**
 * Mark notifications as seen for the current admin. Invalidates the
 * notifications query so the badge clears immediately.
 */
export function useMarkNotificationsSeen() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      customFetch<{ ok: boolean }>("/api/admin/notifications/seen", {
        method: "POST",
        responseType: "json",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_NOTIFICATIONS_KEY });
    },
  });
}
