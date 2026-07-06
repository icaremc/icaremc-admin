import { adminCanManage, type AdminPermission } from "@/lib/adminRoles";
import type { AdminRole } from "@/lib/types/database";

export function rejectUnlessCanManage(
  role: AdminRole | null | undefined,
  permission: AdminPermission,
): string | null {
  if (!adminCanManage(role, permission)) {
    return "You do not have permission to perform this action";
  }
  return null;
}
