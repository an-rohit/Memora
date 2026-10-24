import express from "express";
import { authMiddleware } from "../../middlewares/auth.middleware.js";

import { 
    addContent, 
    deleteContent, 
    deleteManyContent, 
    fetchContent, 
    fetchMetadata, 
    fetchSharedContent, 
    importDriveFolder,
    saveSharedBrainContent, 
    shareContent, 
    updateContent 
} from "./content.controller.js";

const router=express.Router();

router.post("/",authMiddleware,addContent);
router.get("/",authMiddleware,fetchContent);
router.put("/:contentId",authMiddleware,updateContent);
router.patch("/:contentId",authMiddleware,updateContent);
router.get("/preview/metadata",authMiddleware,fetchMetadata);
router.delete("/:contentId",authMiddleware,deleteContent);
router.post("/delete-many",authMiddleware,deleteManyContent);
router.post("/share",authMiddleware,shareContent);
router.post("/save-brain/:shareLink",authMiddleware,saveSharedBrainContent);
router.post("/import/drive-folder",authMiddleware,importDriveFolder);
router.get("/:shareLink",fetchSharedContent);

export default router;