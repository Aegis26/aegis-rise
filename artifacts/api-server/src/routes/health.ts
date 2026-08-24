import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const healthHandler = (_req: Parameters<typeof router.get>[1], res: any) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
};

router.get("/health", healthHandler);
router.get("/healthz", healthHandler);
router.get("/readyz", async (request, response): Promise<void> => {
  try {
    await pool.query("SELECT 1");
    response.json(HealthCheckResponse.parse({ status: "ok" }));
  } catch (error) {
    request.log.error({ err: error }, "Database readiness check failed");
    response
      .status(503)
      .json(HealthCheckResponse.parse({ status: "unavailable" }));
  }
});

export default router;
