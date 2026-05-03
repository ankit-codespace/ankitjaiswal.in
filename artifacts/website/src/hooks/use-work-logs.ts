import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface WorkLog {
  id: number;
  title: string;
  description: string;
  category: string;
  imageUrl: string | null;
  stats: string | null;
  tags: string[] | null;
  date: string | null;
}

export interface InsertWorkLog {
  title: string;
  description: string;
  category: string;
  imageUrl?: string | null;
  stats?: string | null;
  tags?: string[] | null;
}

export function useWorkLogs() {
  return useQuery<WorkLog[]>({
    queryKey: ["/api/work-logs"],
    queryFn: async () => {
      const res = await fetch("/api/work-logs");
      if (!res.ok) throw new Error("Failed to fetch work logs");
      return res.json();
    },
  });
}

export function useCreateWorkLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (newLog: InsertWorkLog) => {
      const res = await fetch("/api/work-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLog),
      });

      if (!res.ok) {
        throw new Error("Failed to create work log");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/work-logs"] });
    },
  });
}
