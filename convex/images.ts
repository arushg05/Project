"use node";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api"; // For calling mutations/queries in other files
import OpenAI from "openai";
import { Id } from "./_generated/dataModel";
import type { ActionCtx } from "./_generated/server";

const openai = new OpenAI({
  baseURL: process.env.CONVEX_OPENAI_BASE_URL,
  apiKey: process.env.CONVEX_OPENAI_API_KEY,
});

export const classifyImageAction = internalAction({
  args: {
    imageId: v.id("images"),
    storageId: v.id("_storage"),
    prompt: v.string(),
  },
  handler: async (ctx: ActionCtx, args: { imageId: Id<"images">, storageId: Id<"_storage">, prompt: string }) => {
    // Call the query in imageFunctions.ts using ctx.runQuery
    const imageUrl: string | null = await ctx.runQuery(internal.imageFunctions.getImageUrl, {
      storageId: args.storageId,
    });

    if (!imageUrl) {
      console.error(`Could not get URL for storageId: ${args.storageId}`);
      // Call the mutation in imageFunctions.ts using ctx.runMutation
      await ctx.runMutation(internal.imageFunctions.updateImageClassification, {
        imageId: args.imageId,
        classification: "Error: Could not retrieve image for analysis.",
      });
      return;
    }

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: args.prompt },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
      });
      const classification = response.choices[0].message.content;
      if (!classification) {
        throw new Error("No content in OpenAI response");
      }
      // Call the mutation in imageFunctions.ts using ctx.runMutation
      await ctx.runMutation(internal.imageFunctions.updateImageClassification, {
        imageId: args.imageId,
        classification: classification,
      });
    } catch (error) {
      console.error("Error classifying image with OpenAI:", error);
      // Call the mutation in imageFunctions.ts using ctx.runMutation
      await ctx.runMutation(internal.imageFunctions.updateImageClassification, {
        imageId: args.imageId,
        classification: "Error: Failed to classify image.",
      });
    }
  },
});
