import type {Request,Response,NextFunction} from "express";
import jwt from "jsonwebtoken";

// checks the Bearer token and puts the user's id on req.userId
export const authMiddleware=(req:Request,res:Response,next:NextFunction)=>{
    try {
        const authToken=req.headers.authorization;

        if(!authToken || !authToken.startsWith("Bearer ")){
            return res.status(401).json({
                message:"Unauthorized"
            })
        };

        const token=authToken.split(" ")[1];

        if(!token){
            return res.status(401).json({
                message:"Unauthorized"
            })
        };

        // throws if the token is fake, changed or expired → goes to catch
        const decodedToken=jwt.verify(token,process.env.JWT_SECRET!);

        // a valid signature isn't enough, the payload must carry a string id
        if(typeof decodedToken==="string" || typeof decodedToken.id!=="string"){
            return res.status(401).json({
                message:"Unauthorized"
            })
        };

        req.userId=decodedToken.id;
        next();
    } catch (error) {
        if(error instanceof jwt.TokenExpiredError){
            return res.status(401).json({
                message:"Session expired, please log in again"
            })
        };
        return res.status(401).json({
            message:"invalid token"
        })
    }
};
