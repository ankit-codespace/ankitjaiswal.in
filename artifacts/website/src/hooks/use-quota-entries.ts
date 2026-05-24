import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface QuotaEntry {
  id: number;
  email: string;
  service: string;
  folder: string | null;
  profile: number | null;
  resetAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface QuotaEntryInput {
  email: string;
  service: string;
  folder?: string;
  profile?: number;
  resetAt: string;
}

async function parseOrThrow(res: Response) {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || "Request failed");
  }
  if (res.status === 204) return null;
  return res.json();
}

export function useQuotaEntries() {
  return useQuery<QuotaEntry[]>({
    queryKey: ["/api/quota-entries"],
    queryFn: async () => {
      const res = await fetch("/api/quota-entries");
      return parseOrThrow(res);
    },
  });
}

export function useCreateQuotaEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: QuotaEntryInput) => {
      const res = await fetch("/api/quota-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseOrThrow(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/quota-entries"] }),
  });
}

export function useUpdateQuotaEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: QuotaEntryInput }) => {
      const res = await fetch(`/api/quota-entries/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      return parseOrThrow(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/quota-entries"] }),
  });
}

export function useDeleteQuotaEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/quota-entries/${id}`, { method: "DELETE" });
      return parseOrThrow(res);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/quota-entries"] }),
  });
}
