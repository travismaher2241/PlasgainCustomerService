import { Request, Response, NextFunction } from "express";
import { WorkspaceSession } from "../../server";

export type SystemRole = "Rep" | "Manager" | "Admin";

/**
 * Maps a verified user session to one of the three core system roles:
 * - Admin: Explicit isAdmin flag or Director/Admin title.
 * - Manager: Management or Team Lead titles.
 * - Rep: Standard commercial representative.
 */
export function getSystemRole(session: WorkspaceSession): SystemRole {
  if (session.isAdmin) return "Admin";
  const r = (session.role || "").toLowerCase();
  if (r.includes("admin") || r.includes("director")) return "Admin";
  if (r.includes("manager") || r.includes("lead")) return "Manager";
  return "Rep";
}

/**
 * Restricts destructive or administrative actions to specified roles.
 * CRITICAL POLICY: Reads and standard edits are open to all authenticated users ("everyone sees everything").
 * Roles govern destructive and administrative actions ONLY (e.g. delete, merge, editing another's logs).
 */
export function requireRole(allowedRoles: SystemRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const session = (req as any).session as WorkspaceSession | undefined;
    if (!session) {
      return res.status(401).json({ error: "Sign in again — this action requires a verified profile." });
    }

    const role = getSystemRole(session);
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({
        error: `Forbidden: This action requires ${allowedRoles.join(" or ")} privileges. Current role: ${role}.`
      });
    }

    next();
  };
}
