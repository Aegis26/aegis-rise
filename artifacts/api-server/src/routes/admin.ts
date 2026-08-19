import { Router, type IRouter } from "express";
import { asc, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { db, membersTable } from "../db";
import { requireAdmin } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();
const memberIdSchema = z.string().uuid();

function parseMemberId(id: string | string[] | undefined): string {
  const result = memberIdSchema.safeParse(id);
  if (!result.success) {
    throw new HttpError(400, "A valid member ID is required.");
  }
  return result.data;
}

router.get("/admin/pending-members", requireAdmin, async (_request, response, next) => {
  try {
    const members = await db
      .select({
        id: membersTable.id,
        email: membersTable.email,
        name: membersTable.name,
        title: membersTable.title,
        company: membersTable.company,
        bio: membersTable.bio,
        createdAt: membersTable.createdAt,
      })
      .from(membersTable)
      .where(eq(membersTable.status, "pending"))
      .orderBy(asc(membersTable.createdAt));

    response.json({ members });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/members/:id/approve", requireAdmin, async (request, response, next) => {
  try {
    const id = parseMemberId(request.params.id);
    const [member] = await db
      .update(membersTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(membersTable.id, id))
      .returning({
        id: membersTable.id,
        email: membersTable.email,
        name: membersTable.name,
        role: membersTable.role,
        status: membersTable.status,
        updatedAt: membersTable.updatedAt,
      });

    if (!member) {
      throw new HttpError(404, "Member not found.");
    }

    response.json({ member });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/members/:id/deny", requireAdmin, async (request, response, next) => {
  try {
    const id = parseMemberId(request.params.id);
    const [member] = await db
      .delete(membersTable)
      .where(eq(membersTable.id, id))
      .returning({ id: membersTable.id });

    if (!member) {
      throw new HttpError(404, "Member not found.");
    }

    response.json({ message: "Member application denied." });
  } catch (error) {
    next(error);
  }
});

router.patch("/admin/members/:id/ban", requireAdmin, async (request, response, next) => {
  try {
    const id = parseMemberId(request.params.id);
    const [member] = await db
      .update(membersTable)
      .set({ status: "banned", updatedAt: new Date() })
      .where(eq(membersTable.id, id))
      .returning({
        id: membersTable.id,
        email: membersTable.email,
        name: membersTable.name,
        role: membersTable.role,
        status: membersTable.status,
        updatedAt: membersTable.updatedAt,
      });

    if (!member) {
      throw new HttpError(404, "Member not found.");
    }

    response.json({ member });
  } catch (error) {
    next(error);
  }
});

export default router;