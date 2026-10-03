import { proxyAdminRequestToBackend } from "@/lib/backend/proxy";

type RouteContext = { params: Promise<{ path?: string[] }> };

async function handle(request: Request, context: RouteContext) {
  const { path } = await context.params;
  const adminPath = (path ?? []).join("/");
  return proxyAdminRequestToBackend(request, adminPath);
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
