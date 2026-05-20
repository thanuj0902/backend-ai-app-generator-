export {
  extractSubdomain,
  resolveSubdomain,
  resolveByProjectId,
  getAppRoutes,
  createRoute,
  updateRoute,
  deleteRoute,
  syncRoutesFromGeneration,
  getRuntimeConfig,
  upsertRuntimeConfig,
  deleteRuntimeConfig,
  getRuntimeConfigValue,
} from "./runtime.service"
export type { ResolvedApp, RouteDefinition, RuntimeConfigData } from "./runtime.service"
export { parsePreviewPath, resolvePreviewRoute, handlePreviewRequest, buildPreviewIframeUrl } from "./preview.service"
