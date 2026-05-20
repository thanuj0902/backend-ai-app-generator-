import type { ProjectStatus } from "@prisma/client"

interface ApiResponse<T> { data: T }
interface PaginatedResponse<T> { data: T[]; pagination: { total: number; page: number; limit: number; totalPages: number; hasMore: boolean } }

interface UserProfile { id: string; email: string; name: string | null; avatarUrl: string | null; stats: { projects: number; workflows: number } }
interface ProjectData { id: string; name: string; slug: string | null; description: string | null; status: ProjectStatus; userId: string; organizationId: string | null; createdAt: string; updatedAt: string }
interface WorkflowData { id: string; projectId: string; name: string; trigger: string; steps: any; status: string; lastRunAt: string | null; createdById: string; createdAt: string; updatedAt: string }
interface GenerationData { id: string; projectId: string; prompt: string; status: string; result: any; errorMessage: string | null; startedAt: string | null; completedAt: string | null; createdAt: string; updatedAt: string }
interface CreateProjectInput { name: string; description?: string }
interface UpdateProjectInput { name?: string; description?: string; status?: ProjectStatus }
interface CreateWorkflowInput { projectId: string; name: string; trigger?: string; steps: any }
interface UpdateWorkflowInput { name?: string; trigger?: string; steps?: any; status?: string }
interface GenerateInput { projectId: string; prompt: string }

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"

class ApiClient {
  private baseUrl: string
  private token: string | null = null
  constructor(baseUrl: string = BASE_URL) { this.baseUrl = baseUrl }

  setToken(token: string | null) { this.token = token }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" }
    if (this.token) h["Authorization"] = `Bearer ${this.token}`
    return h
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, { ...options, headers: { ...this.headers(), ...options?.headers } })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }))
      throw new ApiClientError(res.status, err.error || "Request failed")
    }
    return res.json()
  }

  async getMe(): Promise<ApiResponse<UserProfile>> { return this.request("/api/me") }

  async listProjects(params?: { search?: string; page?: number; limit?: number }): Promise<PaginatedResponse<ProjectData>> {
    const sp = new URLSearchParams()
    if (params?.search) sp.set("search", params.search)
    if (params?.page) sp.set("page", String(params.page))
    if (params?.limit) sp.set("limit", String(params.limit))
    const qs = sp.toString()
    return this.request(`/api/projects${qs ? `?${qs}` : ""}`)
  }

  async createProject(input: CreateProjectInput): Promise<ApiResponse<ProjectData>> {
    return this.request("/api/projects", { method: "POST", body: JSON.stringify(input) })
  }

  async getProject(id: string): Promise<ApiResponse<ProjectData>> { return this.request(`/api/projects/${id}`) }

  async updateProject(id: string, input: UpdateProjectInput): Promise<ApiResponse<ProjectData>> {
    return this.request(`/api/projects/${id}`, { method: "PATCH", body: JSON.stringify(input) })
  }

  async deleteProject(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/api/projects/${id}`, { method: "DELETE" })
  }

  async listWorkflows(params?: { projectId?: string; page?: number; limit?: number }): Promise<PaginatedResponse<WorkflowData>> {
    const sp = new URLSearchParams()
    if (params?.projectId) sp.set("projectId", params.projectId)
    if (params?.page) sp.set("page", String(params.page))
    if (params?.limit) sp.set("limit", String(params.limit))
    const qs = sp.toString()
    return this.request(`/api/workflows${qs ? `?${qs}` : ""}`)
  }

  async createWorkflow(input: CreateWorkflowInput): Promise<ApiResponse<WorkflowData>> {
    return this.request("/api/workflows", { method: "POST", body: JSON.stringify(input) })
  }

  async getWorkflow(id: string): Promise<ApiResponse<WorkflowData>> { return this.request(`/api/workflows/${id}`) }

  async updateWorkflow(id: string, input: UpdateWorkflowInput): Promise<ApiResponse<WorkflowData>> {
    return this.request(`/api/workflows/${id}`, { method: "PATCH", body: JSON.stringify(input) })
  }

  async deleteWorkflow(id: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.request(`/api/workflows/${id}`, { method: "DELETE" })
  }

  async startGeneration(input: GenerateInput): Promise<ApiResponse<GenerationData>> {
    return this.request("/api/generate", { method: "POST", body: JSON.stringify(input) })
  }

  async getGeneration(id: string): Promise<ApiResponse<GenerationData>> { return this.request(`/api/generate/${id}`) }
  async listGenerations(projectId?: string): Promise<ApiResponse<GenerationData[]>> {
    const qs = projectId ? `?projectId=${projectId}` : ""
    return this.request(`/api/generate${qs}`)
  }
}

export class ApiClientError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "ApiClientError" }
}

export const api = new ApiClient()
