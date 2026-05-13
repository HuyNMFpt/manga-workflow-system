import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { taskService } from "@/services/taskService"
import { TaskStatus } from "@/types"

export function useMyTasks(status?: TaskStatus) {
  return useQuery({
    queryKey: ["tasks", "my", status],
    queryFn: () => taskService.getMyTasks({ status }),
    refetchInterval: 30_000, // auto-refetch mỗi 30 giây
  })
}

export function usePageTasks(pageId: string) {
  return useQuery({
    queryKey: ["tasks", "page", pageId],
    queryFn: () => taskService.getByPage(pageId),
    enabled: !!pageId,
  })
}

export function useApproveTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (taskId: string) => taskService.approve(taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}

export function useRequestRevision() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, note }: { taskId: string; note: string }) =>
      taskService.requestRevision(taskId, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] })
    },
  })
}
