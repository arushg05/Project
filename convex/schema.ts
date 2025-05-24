import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  images: defineTable({
    storageId: v.id("_storage"),
    userId: v.id("users"),
    classification: v.optional(v.string()),
    prompt: v.optional(v.string()), // To store the prompt used for classification
  }).index("by_userId", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
