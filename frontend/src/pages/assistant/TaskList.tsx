import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { taskService } from "@/services/taskService"
import PageHeader from "@/components/shared/PageHeader"
import StatusBadge from "@/components/shared/StatusBadge"
import { Task, TaskStatus } from "@/types"
import { TASK_TYPE_LABELS, TASK_TYPE_COLORS } from "@/lib/constants"
import { Upload, Download, Clock, CheckCircle2, AlertCircle, ListTodo, X, FileImage } from "lucide-react"
import { cn } from "@/lib/utils"

const FILTERS: { label: string; value: TaskStatus | "all" }[] = [
  { label: "Tất cả", value: "all" },
  { label: "Chờ làm", value: "assigned" },
  { label: "Đang làm", value: "in_progress" },
  { label: "Đã nộp", value: "submitted" },
  { label: "Cần sửa", value: "revision_required" },
  { label: "Đã duyệt", value: "approved" },
]

function DeadlineBadge({ deadline }: { deadline: string }) {
  const diff = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000)
  if (diff < 0) return <span className="text-xs text-red-600 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" />Quá hạn</span>
  if (diff === 0) return <span className="text-xs text-orange-600 font-medium flex items-center gap-1"><Clock className="w-3 h-3" />Hôm nay</span>
  if (diff <= 2) return <span className="text-xs text-yellow-600 font-medium flex items-center gap-1"><Clock className="w-3 h-3" />{diff} ngày</span>
  return <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{diff} ngày</span>
}

function SubmitModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const qc = useQueryClient()
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState("")
  const [error, setError] = useState("")

  const mutation = useMutation({
    mutationFn: (_fd: FormData) => taskService.submit(task.id, { taskId: task.id, fileUrl: "", note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); onClose() },
    onError: () => setError("Nộp thất bại. Vui lòng thử lại."),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) { setError("Vui lòng chọn file."); return }
    const fd = new FormData()
    fd.append("file", file)
    if (note) fd.append("note", note)
    mutation.mutate(fd)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-card rounded-xl border border-border shadow-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h2 className="font-semibold text-sm">Nộp công việc</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{TASK_TYPE_LABELS[task.taskType]} — Trang {task.pageId}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">File hoàn thiện * (PNG / PSD)</label>
            <div
              className={cn("border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                file ? "border-primary/40 bg-primary/5" : "border-border hover:border-primary/40")}
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-sm">
                  <FileImage className="w-4 h-4 text-primary" />
                  <span className="font-medium text-primary">{file.name}</span>
                  <span className="text-muted-foreground">({(file.size/1024/1024).toFixed(1)} MB)</span>
                </div>
              ) : (
                <div>
                  <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Kéo thả hoặc click để chọn file</p>
                  <p className="text-xs text-muted-foreground mt-0.5">PNG, PSD — tối đa 50MB</p>
                </div>
              )}
              <input id="file-upload" type="file" accept=".png,.psd,.jpg" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Ghi chú (tuỳ chọn)</label>
            <textarea rows={3} placeholder="Ghi chú cho tác giả..." value={note} onChange={e => setNote(e.target.value)} className="w-full resize-none" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-md border border-border hover:bg-accent">Huỷ</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {mutation.isPending ? "Đang nộp..." : "Nộp bài"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TaskCard({ task, onSubmit }: { task: Task; onSubmit: (t: Task) => void }) {
  const isOverdue = new Date(task.deadline) < new Date() && task.status !== "approved"
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", isOverdue ? "border-red-200" : "border-border")}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", TASK_TYPE_COLORS[task.taskType])}>{TASK_TYPE_LABELS[task.taskType]}</span>
            <StatusBadge status={task.status} />
          </div>
          <p className="text-sm font-medium mt-1.5">Chapter {task.chapterId} · Trang {task.pageId}</p>
        </div>
        <DeadlineBadge deadline={task.deadline} />
      </div>
      {task.instructions && (
        <div className="rounded-md bg-muted px-3 py-2">
          <p className="text-xs text-muted-foreground font-medium mb-0.5">Hướng dẫn từ tác giả</p>
          <p className="text-sm">{task.instructions}</p>
        </div>
      )}
      {task.status === "revision_required" && task.revisionNote && (
        <div className="rounded-md bg-orange-50 border border-orange-200 px-3 py-2">
          <p className="text-xs text-orange-700 font-medium mb-0.5 flex items-center gap-1"><AlertCircle className="w-3 h-3" />Yêu cầu chỉnh sửa</p>
          <p className="text-sm text-orange-800">{task.revisionNote}</p>
        </div>
      )}
      <div className="rounded-md bg-muted h-20 flex items-center justify-center">
        <p className="text-xs text-muted-foreground">Xem vùng được giao</p>
      </div>
      <div className="flex gap-2 pt-1">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-border hover:bg-accent transition-colors flex-1 justify-center">
          <Download className="w-3.5 h-3.5" />Tải file
        </button>
        {["assigned","in_progress","revision_required"].includes(task.status) && (
          <button onClick={() => onSubmit(task)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex-1 justify-center">
            <Upload className="w-3.5 h-3.5" />{task.status === "revision_required" ? "Nộp lại" : "Nộp bài"}
          </button>
        )}
        {task.status === "approved" && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-700 bg-green-50 rounded-md flex-1 justify-center">
            <CheckCircle2 className="w-3.5 h-3.5" />Đã duyệt
          </div>
        )}
      </div>
    </div>
  )
}

export default function TaskList() {
  const [filter, setFilter] = useState<TaskStatus | "all">("all")
  const [submitTask, setSubmitTask] = useState<Task | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", "my", filter],
    queryFn: () => taskService.getMyTasks({ status: filter === "all" ? undefined : filter }),
    refetchInterval: 30_000,
  })

  const tasks = data?.data ?? []
  const counts = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc }, {} as Record<string, number>)

  return (
    <div>
      <PageHeader title="Công việc của tôi" description="Danh sách các trang được giao, sắp xếp theo deadline" />
      <div className="grid grid-cols-3 gap-3 mb-5">
        {[
          { label: "Đang chờ", count: (counts.assigned ?? 0) + (counts.in_progress ?? 0), icon: ListTodo, color: "text-blue-600" },
          { label: "Cần sửa", count: counts.revision_required ?? 0, icon: AlertCircle, color: "text-orange-600" },
          { label: "Đã duyệt", count: counts.approved ?? 0, icon: CheckCircle2, color: "text-green-600" },
        ].map(s => (
          <div key={s.label} className="rounded-lg bg-secondary p-3 text-center">
            <s.icon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
            <p className="text-lg font-semibold">{s.count}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-1 mb-5 border-b border-border overflow-x-auto pb-px">
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={cn("flex items-center gap-1.5 px-3 py-2 text-sm border-b-2 -mb-px whitespace-nowrap transition-colors",
              filter === f.value ? "border-primary text-primary font-medium" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {f.label}
            {f.value !== "all" && (counts[f.value] ?? 0) > 0 && (
              <span className="text-[10px] bg-muted rounded-full px-1.5 py-0.5">{counts[f.value]}</span>
            )}
          </button>
        ))}
      </div>
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-48 rounded-lg bg-muted animate-pulse" />)}
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <ListTodo className="w-10 h-10 mx-auto mb-3 opacity-25" />
          <p className="text-sm font-medium">Không có công việc nào</p>
          <p className="text-xs mt-1">{filter === "all" ? "Tác giả chưa giao việc cho bạn" : "Không có task ở trạng thái này"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {tasks.map(task => <TaskCard key={task.id} task={task} onSubmit={setSubmitTask} />)}
        </div>
      )}
      {submitTask && <SubmitModal task={submitTask} onClose={() => setSubmitTask(null)} />}
    </div>
  )
}
