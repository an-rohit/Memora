import type {Request,Response} from "express";
import mongoose from "mongoose";
import collectionModel from "../../models/collection.model.js";
import contentModel from "../../models/content.model.js";
import { hash } from "../../utils/hashingLink.util.js";
import userModel from "../../models/user.model.js";
import { createCollectionSchema, updateCollectionSchema } from "../../validators/collection.validator.js";



//creating new collection
export const createCollection=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;

        if(!userId){
            return res.status(401).json({
                message:"user Unauthorized"
            })
        };

        const parsed=createCollectionSchema.safeParse(req.body);

        if(!parsed.success){
            return res.status(400).json({
                message:parsed.error.issues[0]?.message ?? "Invalid input"
            })
        };

        // typed + trimmed, never the raw req.body
        const {title,icon}=parsed.data;

        // only set icon when it was sent, so the schema default 📁 is used otherwise
        const data:{title:string; userId:string; icon?:string}={title,userId};
        if(icon!==undefined) data.icon=icon;

        const collection=await collectionModel.create(data);

        return res.status(201).json({
            message:"Collection Created !",
            collection:collection
        });
    } catch (error) {
        console.error("createCollection failed",error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
};

// fetching the collection
export const getCollection=async(req:Request,res:Response)=>{
    try {

        const userId=req.userId;

        if(!userId){
            return res.status(401).json({
                message:"Unauthorized user !"
            })
        };

        const collection=await collectionModel.find({userId}).sort({createdAt:-1})

        // createdAt: -1 puts the newest collection at the top of the sidebar, and 1 puts the oldest first

        return res.status(200).json({
            message:"Collection Fetched !",
            data:{
                collection
            }
        });
    }catch (error) {
    console.error("fetching collection failed",error);
    return res.status(500).json({
        message:"Internal server error"
    });
}
};

// renames a collection or changes its icon
export const updateCollection=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;
        const id=req.params.id;

        if(!userId){
            return res.status(401).json({
                message:"user is Unauthorized"
            })
        };

        if(!id || !mongoose.isValidObjectId(id)){
            return res.status(400).json({
                message:"provides Params Id is Incorrect"
            })
        };

        const parsed=updateCollectionSchema.safeParse(req.body);

        if(!parsed.success){
            return res.status(400).json({
                message:parsed.error.issues[0]?.message ?? "Invalid input"
            })
        };

        const {title,icon}=parsed.data;

        const collection=await collectionModel.findOne({_id:id,userId});

        if(!collection){
            return res.status(404).json({
                message:"collection not found !"
            })
        };

        // not sent → leave it as it is
        if(title!==undefined) collection.title=title;
        if(icon!==undefined) collection.icon=icon;

        await collection.save();

        return res.status(200).json({
            message:"Collection updated Successfully !!",
            updatedCollection:{
                collection
            }
        })
    } catch (error) {
        console.error("updateCollection failed",error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
};


// deletes a collection; its notes move back to "All content"
export const deleteCollection=async(req:Request,res:Response)=>{
    try {
        const userId=req.userId;
        const id=req.params.id;

        if(!userId){
            return res.status(401).json({
                message:"Unauthorized"
            })
        };

        if(!id || !mongoose.isValidObjectId(id)){
            return res.status(400).json({
                message:"Provide valid Collection ID"
            })
        };

        const collection=await collectionModel.findOne({_id:id,userId});

        if(!collection){
            return res.status(404).json({
                message:"collection not found"
            })
        };

        // links this user already has in "All content"
        const linksInAllContent=await contentModel.distinct("link",{userId,collectionId:null});

        // same link is already in "All content", so these copies are duplicates.
        // they must go first, or the move below breaks the unique index (11000)
        await contentModel.deleteMany({
            userId,
            collectionId:id,
            link:{$in:linksInAllContent}
        });

        // move the remaining notes back to "All content"
        await contentModel.updateMany(
            {collectionId:id,userId},
            {$set:{collectionId:null}}
        );

        await collectionModel.deleteOne({_id:id,userId});

        return res.status(200).json({
            message:"Collection deleted Successfully"
        })
    } catch (error) {
        console.error("deleteCollection failed",error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
};



export const shareCollection=async(req:Request,res:Response)=>{
    try {

        const userId=req.userId;

        if(!userId){
            return res.status(401).json({
                message:"Unauthorized"
            })
        }

        const id =req.params.id;

        if(!id || !mongoose.isValidObjectId(id)){
            return res.status(400).json({
                message:"Provide params id is not valid"
            })
        };

        const {share}=req.body;

        if(typeof share !== "boolean"){
            return res.status(400).json({
                message:"share must be in Boolean state either true or false"
            })
        };

        const collection = await collectionModel.findOne({_id:id,userId});

        if(!collection){
            return res.status(404).json({
                message:"Collection Not Found !!"
            })
        };

        if(share===true){
            if(!collection.shareHash){
                collection.shareHash=hash(10);
                await collection.save();
            }

        return res.status(200).json({
            message:  "Shared Link is Ready",
            link: "/share/c/" + collection.shareHash 
        });
        }
        
        await collectionModel.updateOne({_id:id,userId} ,
            {$unset:{
                shareHash:""
        }});

        return res.status(200).json(
            {
                message:"Sharing turned off"
            }
        )
        
    } catch (error) {
         console.error("shareCollection failed",error);
        return res.status(500).json({
        message:"Internal server error"
    });
        
    }
};



export const getSharedCollection=async(req:Request,res:Response)=>{
    try {
        const shareHash=req.params.shareHash;

        if(!shareHash){
            return res.status(400).json({
                message:"provide valide Link"
            })
        };

        const collection = await collectionModel.findOne({shareHash});

        if(!collection){
            return res.status(404).json({
                message:"Collection not Found"
            })
        };
        const user=await userModel.findById(collection.userId).select("username");

        if(!user){
            return res.status(404).json({
                message:"Owner not Found"
            })
        };

        const content = await contentModel.find({ collectionId: collection._id }).sort({ _id: 1 }).select("link type title description");
        

        return res.status(200).json({
            message:"collection Fetched !!",
            data:{
                username:user.username,
                collection:{
                    _id:collection._id,
                    title:collection.title,
                    icon:collection.icon,
                    },
                content
            }
        });
    } catch (error) {
        console.error("getSharedCollection failed",error);
        return res.status(500).json({
            message:"Internal server error"
        });
    }
};

// save / clone a shared collection into the logged-in user's vault
export const saveSharedCollection = async (req: Request, res: Response) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const shareHash = req.params.shareHash;
        if (!shareHash) {
            return res.status(400).json({ message: "Provide a valid share link" });
        }

        const sourceCollection = await collectionModel.findOne({ shareHash });
        if (!sourceCollection) {
            return res.status(404).json({ message: "Collection not found or share link has expired" });
        }

        // If the user already owns this collection
        if (sourceCollection.userId.toString() === userId.toString()) {
            return res.status(200).json({
                message: "This collection is already in your vault!",
                isOwner: true,
                collection: sourceCollection,
                savedCount: 0
            });
        }

        // Check if target user already has a collection with this title or create one
        let targetCollection = await collectionModel.findOne({
            userId,
            title: sourceCollection.title
        });

        if (!targetCollection) {
            targetCollection = await collectionModel.create({
                title: sourceCollection.title,
                icon: sourceCollection.icon || "📁",
                userId
            });
        }

        // Find all memories inside this source collection
        const sourceContents = await contentModel.find({
            collectionId: sourceCollection._id
        });

        let savedCount = 0;
        for (const item of sourceContents) {
            try {
                const existing = await contentModel.findOne({
                    userId,
                    link: item.link,
                    collectionId: targetCollection._id
                });

                if (!existing) {
                    await contentModel.create({
                        link: item.link,
                        type: item.type,
                        title: item.title,
                        description: item.description || "",
                        tags: item.tags || [],
                        userId,
                        collectionId: targetCollection._id
                    });
                    savedCount++;
                }
            } catch (itemErr) {
                console.error("Error creating item during collection clone:", itemErr);
            }
        }

        const message = savedCount > 0
            ? `Collection "${targetCollection.title}" saved to your vault with ${savedCount} memories! 🎉`
            : `Collection "${targetCollection.title}" is up to date in your vault!`;

        return res.status(200).json({
            message,
            collection: targetCollection,
            savedCount
        });
    } catch (error) {
        console.error("saveSharedCollection failed", error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
