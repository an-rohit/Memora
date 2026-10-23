import { z } from "zod";

// 200 = same limit as Drive import folder titles
const title=z.string({error:"Title is required"})
    .trim()
    .min(1,{error:"Title is required"})
    .max(200,{error:"Title must be at most 200 characters"});

// exactly one emoji, e.g. 📁 (the v flag understands multi-part emojis like 👨‍👩‍👧‍👦)
const isEmoji=(value:string)=>/^\p{RGI_Emoji}$/v.test(value);

// only the built-in icons: every frontend preset comes from img.icons8.com.
// links to any other site are refused, so a shared page can't load images from a stranger's server
const isBuiltInIcon=(value:string)=>/^https:\/\/img\.icons8\.com\/\S+$/.test(value);

// frontend presets are icons8 links; 📁 is the schema default and the Drive import icon
const icon=z.string({error:"Icon must be one of the built-in icons"})
    .trim()
    .max(300,{error:"Icon must be at most 300 characters"})
    .refine((value)=>isEmoji(value) || isBuiltInIcon(value),{error:"Icon must be one of the built-in icons"});

// createCollection: no icon → schema default 📁
export const createCollectionSchema=z.object({
    title,
    icon:icon.optional()
},{error:"Request body must be a JSON object"});

// updateCollection: only the fields that are sent get changed
export const updateCollectionSchema=z.object({
    title:title.optional(),
    icon:icon.optional()
},{error:"Request body must be a JSON object"})
    .refine((data)=>data.title!==undefined || data.icon!==undefined,{error:"Nothing to update"});
