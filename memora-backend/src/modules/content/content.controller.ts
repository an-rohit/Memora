import mongoose from "mongoose";
import contentModel from "../../models/content.model.js";
import collectionModel from "../../models/collection.model.js";

import type{Request,Response} from "express";
import linkModel from "../../models/link.model.js";
import { hash } from "../../utils/hashingLink.util.js";
import { toWebLink } from "../../utils/validateLink.util.js";
import { addContentSchema, deleteManyContentSchema, importDriveFolderSchema } from "../../validators/content.validator.js";
import userModel from "../../models/user.model.js";
import { extractDriveFolderId, fetchDriveFolderFiles } from "../../utils/googleDrive.util.js";

export const addContent=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId

        if(!userId){
            return res.status(401).json({
                message:"Unauthorized"
            })
        }

        const parsed=addContentSchema.safeParse(req.body);

        if(!parsed.success){
            return res.status(400).json({
                message:parsed.error.issues[0]?.message ?? "Invalid input"
            })
        };

        // typed + trimmed, unknown fields like tags are dropped
        const {link,type,title,description,collectionId}=parsed.data;

        const webLink=toWebLink(link);

        if(!webLink){
            return res.status(400).json({
                message:"Provide a valid web link (http or https)"
            })
        };

        // only check ownership when a collection is given
        if(collectionId!==null){
            const collectionExists=await collectionModel.exists({_id:collectionId,userId});

            if(!collectionExists){
                return res.status(404).json({
                    message:"Collection not Found"
                })
            };
        };

        let resolvedType = type;
        const linkLower = (link || "").toLowerCase();
        const titleLower = (title || "").toLowerCase();
        if (
            resolvedType === "article" &&
            (
                linkLower.includes(".pdf") ||
                linkLower.includes("/pdf") ||
                linkLower.includes("arxiv.org/pdf") ||
                linkLower.includes("arxiv.org/abs") ||
                linkLower.includes("drive.google.com") ||
                linkLower.includes("docs.google.com") ||
                linkLower.includes("format=pdf") ||
                linkLower.includes("download=pdf") ||
                linkLower.includes("type=pdf") ||
                linkLower.includes("openreview.net/pdf") ||
                titleLower.endsWith(".pdf") ||
                titleLower.includes(".pdf")
            )
        ) {
            resolvedType = "pdf";
        }

        const content = await contentModel.create({
            link: webLink,
            type: resolvedType,
            title,
            description,
            userId,
            collectionId
        });

        return res.status(201).json({
            message:"Content created SuccessFully",
            content
        });
    } catch (error) {
        console.error("addContent content:", error);
         if(error instanceof mongoose.mongo.MongoServerError && error.code===11000) {
            return res.status(409).json({
                message: "You have already saved this link to your vault."
            });
        }
        return res.status(500).json({
            message: "Failed to create content"
        });
    }
};

// updating the content (title, description, or which collection it is in)
export const updateContent=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;
        const contentId=req.params.contentId;
        const {title,description,collectionId}=req.body;

        if(!userId){
            return res.status(401).json({
                message:"Unauthorized"
            })
        };

        if(!contentId || !mongoose.isValidObjectId(contentId)){
            return res.status(400).json({
                message:"Provide valid Content ID"
            })
        };

        // only the fields that are sent go in here
        const update:{title?:string; description?:string; collectionId?:string|null}={};

        if(title!==undefined){
            if(typeof title!=="string" || !title.trim()){
                return res.status(400).json({
                    message:"Title must be a non-empty string"
                })
            };
            update.title=title.trim();
        };

        if(description!==undefined){
            if(typeof description!=="string"){
                return res.status(400).json({
                    message:"Description must be a string"
                })
            };
            update.description=description;
        };

        // null -> move back to "All content", string -> move into that collection
        if(collectionId!==undefined){
            if(collectionId!==null){
                if(typeof collectionId!=="string" || !mongoose.isValidObjectId(collectionId)){
                    return res.status(400).json({
                        message:"Provide valid Collection ID"
                    })
                };

                const collectionExists=await collectionModel.exists({_id:collectionId,userId});

                if(!collectionExists){
                    return res.status(404).json({
                        message:"collection not found"
                    })
                };
            };
            update.collectionId=collectionId;
        };

        if(Object.keys(update).length===0){
            return res.status(400).json({
                message:"Nothing to update"
            })
        };

        const content=await contentModel.findOneAndUpdate(
            {_id:contentId,userId},
            {$set:update},
            {returnDocument:"after",runValidators:true}
        );

        if(!content){
            return res.status(404).json({
                message:"content not found"
            })
        };

        return res.status(200).json({
            message:"Content updated Successfully",
            content
        })
    } catch (error) {
        // same link already saved in the collection it is being moved into (unique index on userId + link + collectionId)
        if(error instanceof mongoose.mongo.MongoServerError && error.code===11000){
            return res.status(409).json({
                message:"This link is already saved in that collection"
            })
        };
        console.error("updateContent failed",error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
};

// displays the content on the screen (all of it, or only one collection's)
export const fetchContent=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;
        const {collectionId}=req.query;

        if(!userId){
            return res.status(401).json({
                message:"Unauthorized"
            })
        };

        // always only this user's content
        const filter:{userId:string; collectionId?:string}={userId};

        // ?collectionId=<id> -> only that collection's content
        if(collectionId!==undefined){
            if(typeof collectionId!=="string" || !mongoose.isValidObjectId(collectionId)){
                return res.status(400).json({
                    message:"Provide valid Collection ID"
                })
            };
            filter.collectionId=collectionId;
        };

        // oldest first (sort kept from rohit's PR #3)
        const content=await contentModel.find(filter).sort({ _id: 1 }).populate("userId","username");

        return res.status(200).json({
            message:"Here is your content",
            content
        })
    } catch (error) {
        console.error("fetchContent failed",error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
};

export const deleteContent=async(req:Request,res:Response)=>{
    try {

        const userId=req.userId;
        const contentId=req.params.contentId;

        if(!userId ){
            return res.status(401).json({
                message:"Unauthorized"
            })
        };

        if (!contentId || !mongoose.isValidObjectId(contentId)){
            return res.status(400).json({
                message:"Provide valid Content ID !!"
            });
        }

        const result= await contentModel.deleteOne({
            _id:contentId,
            userId,
            
        });

        if(result.deletedCount===0){
            return res.status(404).json({
                message:"content not found"
            })
        }


        return res.status(200).json({
            message:"Content Deleted Successfully",
        });
     } catch (error) {
        console.error("deletedContent failed",error);
        return res.status(500).json({
            message:`Internal Server Error`
        })
        
    }

};

export const shareContent=async(req:Request,res:Response)=>{
    try {

        const userId=req.userId

        if(!userId){
            return res.status(401).json({
                message:"Unauthorized"
            })
        }

        // req.body is undefined when no body is sent
        const {share}=req.body ?? {};
        if(typeof share !=="boolean"){
            return res.status(400).json({
                message:"share must be true or false"
            })
        }

        if( share===true){
        
        const existingLink=await linkModel.findOne({
            userId,
        })

        // user can not share multiple links so , that is why , 

        if(existingLink){
            return res.status(200).json({
                message:"here is your Link",
                link:`/share/${existingLink.hash}`
            })
        }

        const shareHash=hash(10);

        
           const link=await linkModel.create({
                hash:shareHash,
                userId
            })

            return res.status(201).json({
                message: "Share link created successfully",
                link: `/share/${link.hash}`
            });
        }
    
    else{
            await linkModel.deleteOne({
                userId
            })
            return res.status(200).json({
            message:"Sharing turned off",
           
        })
        }
    } catch (error) {
        console.error("shareContent failed",error);

        return res.status(500).json({
            message: "Internal server error"
        });
        
    }

};

export const fetchSharedContent=async(req:Request,res:Response)=>{
    try {
        const hash=req.params.shareLink;

        if(!hash){
            return res.status(400).json({
                message:"Provide the proper params"
            })
        }
        
        const link=await linkModel.findOne({
            hash
         });
         

            if(!link){
               return res.status(404).json({
                    message:"Share Link not Found"
                })
            };
                     // i also want user Info;

            const user=await userModel.findOne({
                _id:link.userId
            }).select("username");

            

            if(!user){
                return res.status(404).json({
                    message:"User not Found"
                })
            }
            

            // now we have got the link , now i want the load the content of the user 
            //for other users


            const content = await contentModel.find({
                userId: link.userId,
                type: { $ne: "shared_brain" }
            }).sort({ _id: 1 }).select(" link type title description");
          
           
      return res.status(200).json({
    message:"Here is the shared brain",
    username:user.username,
    content
});
} catch (error) {
        console.error("fetchSharedContent failed",error);
           return res.status(500).json({
            message: "Internal server error"
        });
        
    }

};


// deletes all the notes the user selected, in one go
export const deleteManyContent=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;

        if(!userId){
            return res.status(401).json({
                message:"Unauthorized"
            })
        };

        // also handles a missing body (req.body is undefined in Express 5)
        const parsed=deleteManyContentSchema.safeParse(req.body);

        if(!parsed.success){
            return res.status(400).json({
                message:parsed.error.issues[0]?.message ?? "Invalid input"
            })
        };

        // same note selected twice → count it once
        const ids=[...new Set(parsed.data.ids)];

        // userId in the filter: another user's ids never match, so they can't be deleted
        const result=await contentModel.deleteMany({
            _id:{$in:ids},
            userId
        });

        if(result.deletedCount===0){
            return res.status(404).json({
                message:"No notes found"
            })
        };

        return res.status(200).json({
            message:"Notes deleted Successfully",
            deletedCount:result.deletedCount
        })
    } catch (error) {
        console.error("deleteManyContent failed",error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
};
/*-----------------------------------------------------------------------------------*/

// from here rohit PR logic begins

export const fetchMetadata = async (req: Request, res: Response) => {
    try {
        const urlStr = req.query.url as string;
        if (!urlStr) {
            return res.status(400).json({ message: "URL is required" });
        }

        const targetUrl = urlStr.startsWith("http") ? urlStr : `https://${urlStr}`;
        const parsedUrl = new URL(targetUrl);
        const favicon = `https://www.google.com/s2/favicons?domain=${parsedUrl.hostname}&sz=64`;

        // Check if URL is a direct PDF or Google Drive/arXiv document link
        const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
        const lastSegment = pathParts[pathParts.length - 1] || "";
        const isPdfUrl = 
            targetUrl.toLowerCase().includes(".pdf") || 
            lastSegment.toLowerCase().endsWith(".pdf") ||
            targetUrl.toLowerCase().includes("arxiv.org/pdf") ||
            targetUrl.toLowerCase().includes("arxiv.org/abs") ||
            targetUrl.toLowerCase().includes("openreview.net/pdf") ||
            targetUrl.toLowerCase().includes("format=pdf") ||
            targetUrl.toLowerCase().includes("download=pdf") ||
            targetUrl.toLowerCase().includes("type=pdf");

        const isGoogleDriveDoc = parsedUrl.hostname.includes("drive.google.com") || parsedUrl.hostname.includes("docs.google.com");

        if (isPdfUrl || isGoogleDriveDoc) {
            let cleanName = lastSegment ? decodeURIComponent(lastSegment) : `PDF Document (${parsedUrl.hostname})`;
            let driveImage = "";

            if (isGoogleDriveDoc) {
                const gdMatch = targetUrl.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/.*[?&]id=)([a-zA-Z0-9_-]+)/);
                if (gdMatch && gdMatch[1]) {
                    driveImage = `https://drive.google.com/thumbnail?id=${gdMatch[1]}&sz=w800`;
                }
                cleanName = cleanName === "view" || !cleanName ? "Google Drive PDF Document" : cleanName;
            }

            return res.status(200).json({
                title: cleanName,
                description: "PDF Document",
                image: driveImage,
                favicon,
                domain: parsedUrl.hostname,
                isPdf: true,
                type: "pdf"
            });
        }

        const response = await fetch(targetUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf;q=0.8,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5"
            },
            redirect: "follow",
            signal: AbortSignal.timeout(8000)
        });

        const contentTypeHeader = response.headers.get("content-type") || "";
        if (contentTypeHeader.includes("application/pdf")) {
            const cleanName = lastSegment ? decodeURIComponent(lastSegment) : `PDF Document (${parsedUrl.hostname})`;
            return res.status(200).json({
                title: cleanName,
                description: "PDF Document",
                image: "",
                favicon,
                domain: parsedUrl.hostname,
                isPdf: true,
                type: "pdf"
            });
        }

        const html = await response.text();

        // Helper: extract meta tag content (handles both property and name, and both attribute orderings)
        const getMetaContent = (property: string): string | null => {
            const p1 = new RegExp(`<meta[^>]*?(?:property|name)\\s*=\\s*["']${property}["'][^>]*?content\\s*=\\s*["']([^"']+)["']`, 'i');
            const p2 = new RegExp(`<meta[^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?(?:property|name)\\s*=\\s*["']${property}["']`, 'i');
            const match = html.match(p1) || html.match(p2);
            return (match && match[1]) ? match[1].trim() : null;
        };

        // Title extraction: try OG, then twitter, then <title> tag
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const rawTitle = getMetaContent("og:title") 
            || getMetaContent("twitter:title") 
            || (titleMatch && titleMatch[1] ? titleMatch[1].replace(/\s+/g, ' ').trim() : null);
        
        const title = rawTitle 
            ? rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'") 
            : (lastSegment || parsedUrl.hostname);
        
        const description = getMetaContent("og:description") || getMetaContent("twitter:description") || getMetaContent("description") || "";

        // Image: resolve relative URLs to absolute
        let image = getMetaContent("og:image") || getMetaContent("twitter:image") || getMetaContent("twitter:image:src") || "";
        if (image && !image.startsWith("http")) {
            if (image.startsWith("//")) {
                image = `https:${image}`;
            } else {
                image = new URL(image, targetUrl).href;
            }
        }

        const isDetectedPdf = title.toLowerCase().includes(".pdf") || description.toLowerCase().includes("pdf document");

        return res.status(200).json({
            title,
            description: description.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"'),
            image,
            favicon,
            domain: parsedUrl.hostname,
            isPdf: isDetectedPdf,
            type: isDetectedPdf ? "pdf" : "article"
        });
    } catch (error) {
        console.error("Fetch metadata error:", error);
        const fallbackDomain = (() => {
            try { return new URL(req.query.url as string).hostname; } catch { return ""; }
        })();
        const fallbackPath = (() => {
            try { 
                const p = new URL(req.query.url as string).pathname.split("/").filter(Boolean);
                return p[p.length - 1] || "";
            } catch { return ""; }
        })();
        return res.status(200).json({
            title: fallbackPath ? decodeURIComponent(fallbackPath) : (fallbackDomain || "Saved PDF / Link"),
            description: "PDF Document",
            image: "",
            favicon: fallbackDomain ? `https://www.google.com/s2/favicons?domain=${fallbackDomain}&sz=64` : "",
            domain: fallbackDomain
        });
    }
};

// Save / clone an entire shared brain (all cards and collections) into the user's vault
export const saveSharedBrainContent = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const shareLink = req.params.shareLink;
        if (!shareLink) {
            return res.status(400).json({ message: "Provide a valid share link" });
        }

        const link = await linkModel.findOne({ hash: shareLink });
        if (!link) {
            return res.status(404).json({ message: "Brain collection not found or link is private." });
        }

        const ownerUser = await userModel.findById(link.userId).select("username");
        if (!ownerUser) {
            return res.status(404).json({ message: "Owner user not found" });
        }

        const ownerUserId = link.userId;
        const targetUserId = new mongoose.Types.ObjectId(userId);

        // If user is owner saving their own brain:
        if (ownerUserId.toString() === userId.toString()) {
            return res.status(200).json({
                message: "This is your own brain! All memories are already in your vault.",
                isOwner: true,
                savedCount: 0
            });
        }

        // 1. Prevent duplicate saves: check if user already saved this brain
        const existingBrainEntry = await contentModel.findOne({
            userId: targetUserId,
            type: "shared_brain",
            $or: [
                { link: `/share/${shareLink}` },
                { link: { $regex: new RegExp(`share/${shareLink}$`) } },
                { title: `${ownerUser.username}'s Brain` }
            ]
        });

        if (existingBrainEntry) {
            return res.status(200).json({
                message: `${ownerUser.username}'s Brain is already in your shared brains!`,
                alreadySaved: true,
                savedCount: 0
            });
        }

        // 2. Create the single "shared_brain" connection entry
        await contentModel.create({
            userId: targetUserId,
            type: "shared_brain",
            title: `${ownerUser.username}'s Brain`,
            link: `/share/${shareLink}`,
            description: `Public Knowledge Collection shared by ${ownerUser.username}`,
            tags: []
        });

        // 2. Fetch all memories belonging to the shared user (excluding shared_brain pointers)
        const sourceContents = await contentModel.find({
            userId: ownerUserId,
            type: { $ne: "shared_brain" }
        }).sort({ _id: 1 });

        // Map original collectionIds to new/existing collectionIds for the target user
        const collectionMap = new Map<string, mongoose.Types.ObjectId>();

        let clonedCount = 0;
        for (const item of sourceContents) {
            try {
                let targetCollectionId: mongoose.Types.ObjectId | null = null;

                if (item.collectionId) {
                    const sourceColIdStr = item.collectionId.toString();
                    if (collectionMap.has(sourceColIdStr)) {
                        targetCollectionId = collectionMap.get(sourceColIdStr)!;
                    } else {
                        const sourceCol = await collectionModel.findById(item.collectionId);
                        if (sourceCol) {
                            let targetCol = await collectionModel.findOne({
                                userId: targetUserId,
                                title: sourceCol.title
                            });
                            if (!targetCol) {
                                targetCol = await collectionModel.create({
                                    userId: targetUserId,
                                    title: sourceCol.title,
                                    icon: sourceCol.icon || "📁"
                                });
                            }
                            targetCollectionId = targetCol._id as mongoose.Types.ObjectId;
                            collectionMap.set(sourceColIdStr, targetCol._id as mongoose.Types.ObjectId);
                        }
                    }
                }

                // Check if user already has this link saved in this collection or general vault
                const existing = await contentModel.findOne({
                    userId: targetUserId,
                    link: item.link,
                    collectionId: targetCollectionId
                });

                if (!existing) {
                    await contentModel.create({
                        userId: targetUserId,
                        link: item.link,
                        type: item.type,
                        title: item.title,
                        description: item.description || "",
                        tags: item.tags || [],
                        collectionId: targetCollectionId
                    });
                    clonedCount++;
                }
            } catch (err) {
                console.error("Error cloning memory from shared brain:", err);
            }
        }

        const message = clonedCount > 0
            ? `Saved ${ownerUser.username}'s Brain with ${clonedCount} memories to your vault! 🎉`
            : `All memories from ${ownerUser.username}'s Brain are already up to date in your vault!`;

        return res.status(200).json({
            message,
            savedCount: clonedCount,
            totalSourceItems: sourceContents.length
        });
    } catch (error) {
        console.error("saveSharedBrainContent failed", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * Ingests an entire Google Drive folder (and nested subfolders) into Memora,
 * automatically creating a dedicated Collection and mapping all files to memories.
 */
export const importDriveFolder = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const parsed = importDriveFolderSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: parsed.error.issues[0]?.message ?? "Invalid input"
            });
        }

        const { url, collectionTitle, apiKey, maxDepth } = parsed.data;

        const folderId = extractDriveFolderId(url);
        if (!folderId) {
            return res.status(400).json({
                message: "Invalid Google Drive folder link. Please provide a link formatted as https://drive.google.com/drive/folders/YOUR_FOLDER_ID"
            });
        }

        // Fetch folder contents (supports both zero-API-key public scraping and official Drive API v3)
        const driveResult = await fetchDriveFolderFiles(folderId, apiKey, maxDepth);
        const resolvedTitle = collectionTitle || driveResult.folderName || "Google Drive Folder";

        // 1. Create or find root Collection for this folder
        let collection = await collectionModel.findOne({
            userId,
            title: resolvedTitle,
            parentId: null
        });

        if (!collection) {
            collection = await collectionModel.create({
                userId,
                title: resolvedTitle,
                icon: "📁",
                parentId: null
            });
        }

        const rootCollectionId = collection._id as mongoose.Types.ObjectId;

        // 2. Map folder paths to Collection ObjectIds
        const pathMap = new Map<string, mongoose.Types.ObjectId>();
        pathMap.set("", rootCollectionId);

        // Sort folders by depth so parent folders are created before their children
        const sortedFolders = (driveResult.folders || []).slice().sort((a, b) => {
            const depthA = a.path.split("/").length;
            const depthB = b.path.split("/").length;
            return depthA - depthB;
        });

        for (const folder of sortedFolders) {
            const parentColId = pathMap.get(folder.parentPath) || rootCollectionId;
            let subCol = await collectionModel.findOne({
                userId,
                title: folder.name,
                parentId: parentColId
            });

            if (!subCol) {
                subCol = await collectionModel.create({
                    userId,
                    title: folder.name,
                    icon: "📁",
                    parentId: parentColId
                });
            }

            pathMap.set(folder.path, subCol._id as mongoose.Types.ObjectId);
        }

        // 3. Collect existing memories across all touched collections to deduplicate
        const allCollectionIds = Array.from(pathMap.values());
        const existingDocs = await contentModel.find({
            userId,
            collectionId: { $in: allCollectionIds }
        }).select("link collectionId").lean();

        const existingSet = new Set(existingDocs.map((d) => `${d.collectionId?.toString() ?? ""}:${d.link}`));
        const seenInBatch = new Set<string>();
        const docsToInsert = [];
        let skippedCount = 0;

        for (const file of driveResult.files) {
            const folderPath = (file.subfolderPath || "").replace(/\/$/, "");
            const targetCollectionId = pathMap.get(folderPath) || rootCollectionId;
            const dedupeKey = `${targetCollectionId.toString()}:${file.link}`;

            if (existingSet.has(dedupeKey) || seenInBatch.has(dedupeKey)) {
                skippedCount++;
                continue;
            }
            seenInBatch.add(dedupeKey);

            const description = folderPath 
                ? `Imported from Google Drive: ${resolvedTitle} / ${folderPath}`
                : `Imported from Google Drive Folder: ${resolvedTitle}`;

            docsToInsert.push({
                userId,
                link: file.link,
                type: file.type,
                title: file.name,
                description,
                tags: [],
                collectionId: targetCollectionId
            });
        }

        let insertedDocs: Array<{ _id: unknown; title: string; type: string; link: string }> = [];
        if (docsToInsert.length > 0) {
            try {
                const result = await contentModel.insertMany(docsToInsert, { ordered: false });
                insertedDocs = result;
            } catch (bulkErr: unknown) {
                if (bulkErr && typeof bulkErr === "object" && "insertedDocs" in bulkErr && Array.isArray((bulkErr as { insertedDocs: unknown[] }).insertedDocs)) {
                    insertedDocs = (bulkErr as { insertedDocs: Array<{ _id: unknown; title: string; type: string; link: string }> }).insertedDocs;
                } else {
                    console.error("importDriveFolder bulk insert partial error:", bulkErr);
                }
            }
        }

        const importedCount = insertedDocs.length;

        let message = "";
        if (importedCount > 0) {
            message = `Successfully imported ${importedCount} file${importedCount === 1 ? "" : "s"} across folder tree into "${resolvedTitle}"! 🎉`;
        } else if (skippedCount > 0) {
            message = `All ${skippedCount} file${skippedCount === 1 ? "" : "s"} in "${resolvedTitle}" are already in your vault!`;
        } else {
            message = `No files found to import in "${resolvedTitle}".`;
        }

        return res.status(200).json({
            message,
            collection,
            importedCount,
            skippedCount,
            totalFound: driveResult.files.length,
            subfoldersScanned: driveResult.subfolderCount,
            files: insertedDocs.map(d => ({
                _id: d._id,
                title: d.title,
                type: d.type,
                link: d.link
            }))
        });
    } catch (error: unknown) {
        console.error("importDriveFolder failed", error);
        const errMsg = error instanceof Error ? error.message : "Failed to import Google Drive folder";
        return res.status(400).json({
            message: errMsg.includes("404") || errMsg.includes("403") || errMsg.includes("permissions") || errMsg.includes("No files could be retrieved")
                ? errMsg
                : "Failed to import Google Drive folder. Please ensure the link is public ('Anyone with the link can view')."
        });
    }
};



