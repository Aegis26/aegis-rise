import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { updateProfileSchema } from "../../artifacts/api-server/src/routes/members.ts";
import { loadSavedNewsInterests } from "../../artifacts/aegis-rise-web/src/pages/components/profile-news-preferences.ts";
import type { NewsInterest } from "@workspace/api-client-react";

const allInterests: NewsInterest[] = [
  "business",
  "construction",
  "real_estate",
  "cooking",
  "entertainment",
  "politics",
  "world_news",
  "health_wellness",
  "cybersecurity_it",
  "general_contractor",
  "travel",
  "stock_market",
  "financial",
  "diy",
];

describe("member news preference persistence", () => {
  it("validates a saved selection and reloads every selected interest", () => {
    const savedUpdate = updateProfileSchema.parse({
      newsInterests: allInterests,
    });
    const reloaded = loadSavedNewsInterests({
      newsInterests: savedUpdate.newsInterests ?? [],
    });

    assert.deepEqual(reloaded, allInterests);
    assert.notEqual(reloaded, savedUpdate.newsInterests);
  });

  it("allows clearing all saved interests", () => {
    const savedUpdate = updateProfileSchema.parse({ newsInterests: [] });
    assert.deepEqual(
      loadSavedNewsInterests({ newsInterests: savedUpdate.newsInterests ?? [] }),
      [],
    );
  });

  it("rejects duplicate interests before persistence", () => {
    assert.throws(() =>
      updateProfileSchema.parse({
        newsInterests: ["business", "business"],
      }),
    );
  });
});