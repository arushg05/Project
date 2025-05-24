import { v } from "convex/values";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { api, internal } from "./_generated/api"; // api for public, internal for internal calls
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export const generateUploadUrl = mutation({
  handler: async (ctx: MutationCtx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not logged in");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveImage = mutation({
  args: {
    storageId: v.id("_storage"),
    prompt: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { storageId: Id<"_storage">, prompt: string }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not logged in");
    }
    const imageId = await ctx.db.insert("images", {
      storageId: args.storageId,
      userId,
      prompt: args.prompt,
    });

    // Schedule the action which is in images.ts (Node runtime)
    await ctx.scheduler.runAfter(0, internal.images.classifyImageAction, {
      imageId,
      storageId: args.storageId,
      prompt: args.prompt,
    });
    return imageId;
  },
});

// This is now an internalQuery, as it's called by an internalAction
export const getImageUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx: QueryCtx, args: { storageId: Id<"_storage"> }) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const updateImageClassification = internalMutation({
  args: {
    imageId: v.id("images"),
    classification: v.string(),
  },
  handler: async (ctx: MutationCtx, args: { imageId: Id<"images">, classification: string }) => {
    await ctx.db.patch(args.imageId, { classification: args.classification });
  },
});

export const getUserImages = query({
  handler: async (ctx: QueryCtx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }
    const images = await ctx.db
      .query("images")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // We need to get the URL for each image.
    // getImageUrl is internal, so we can't call it directly from a public query's map.
    // Instead, we fetch URLs directly here.
    return Promise.all(
      images.map(async (image) => {
        const url = await ctx.storage.getUrl(image.storageId);
        return {
          ...image,
          url, // Add the URL to the image object
        };
      })
    );
  },
});

export const getImage = query({
  args: { imageId: v.id("images") },
  handler: async (ctx: QueryCtx, args: { imageId: Id<"images">}) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const image = await ctx.db.get(args.imageId);
    if (!image || image.userId !== userId) {
      return null;
    }
    const url = await ctx.storage.getUrl(image.storageId); // Get URL directly
    return { ...image, url };
  }
});
