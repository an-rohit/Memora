import { z } from "zod";
import mongoose from "mongoose";
import { contentType } from "../models/content.model.js";

// addContent: link is checked again by toWebLink in the handler
export const addContentSchema=z.object({
    link:z.string({error:"Link is required"}),
    type:z.enum(contentType,{error:"Type must be one of: "+contentType.join(", ")}),
    title:z.string({error:"Title is required"})
        .trim()
        .min(1,{error:"Title is required"})
        .max(200,{error:"Title must be at most 200 characters"}),
    description:z.string({error:"Description must be text"})
        .trim()
        .max(5000,{error:"Description must be at most 5000 characters"})
        .default(""),
    collectionId:z.string({error:"Enter valid CollectionID"})
        .refine((id)=>mongoose.isValidObjectId(id),{error:"Enter valid CollectionID"})
        .nullable()
        .default(null)
},{error:"Request body must be a JSON object"});

export const importDriveFolderSchema=z.object({
    url:z.string({error:"Google Drive folder URL is required"})
        .trim()
        .min(1,{error:"Google Drive folder URL is required"}),
    collectionTitle:z.string()
        .trim()
        .max(200,{error:"Collection title must be at most 200 characters"})
        .optional(),
    apiKey:z.string()
        .trim()
        .optional(),
    maxDepth:z.coerce.number()
        .int()
        .min(0,{error:"Depth must be at least 0"})
        .max(3,{error:"Depth cannot exceed 3"})
        .default(2)
},{error:"Request body must be a JSON object"});


// deleteManyContent: the notes the user selected (max 100 per request)
export const deleteManyContentSchema=z.object({
    ids:z.array(
        z.string({error:"Enter valid Content ID"})
            .refine((id)=>mongoose.isValidObjectId(id),{error:"Enter valid Content ID"}),
        {error:"ids must be a list of Content IDs"}
    )
        .min(1,{error:"Select at least one note"})
        .max(100,{error:"You can delete at most 100 notes at once"})
},{error:"Request body must be a JSON object"});

