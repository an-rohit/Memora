
import userModel from "../../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken"

import type{ Request, Response } from "express";
import { signupSchema,signinSchema } from "../../validators/auth.validator.js";


export const signup=async(req:Request,res:Response)=>{
    try {

        const parsed=signupSchema.safeParse(req.body);

        if(!parsed.success){
            return res.status(400).json({
                message:parsed.error.issues[0]?.message ?? "Invalid input"
            })
        };

        // typed + trimmed data, never the raw req.body
        const {username,password}=parsed.data;

        const existingUser=await userModel.findOne({username});
        if(existingUser){
            return res.status(409).json({
                message:"user already exists"
            }) 
        }


        const hashPassword= await bcrypt.hash(password,10);

        const user=await userModel.create({
            username:username,
            password:hashPassword
        });

        return res.status(200).json({
            message:"User created Successfully",
            user:{
               id: user._id,
               username:user.username
            }
        });
    
    } catch (error) {
        return res.status(500).json({
            message:`SERVER FAILED :- ${console.error(error)}`
        });
    }

};


export const signin=async(req:Request,res:Response)=>{
    try {
        const parsed=signinSchema.safeParse(req.body);

        if(!parsed.success){
            return res.status(400).json({
                message:parsed.error.issues[0]?.message ?? "Invalid input"
            })
        };

        const {username,password}=parsed.data;

        const existingUser= await userModel.findOne({
            username
            
        });
        

        if(!existingUser){
            return res.status(401).json({
                message:"username or password is invalid"
            })
        };

        const matchedPassword=await bcrypt.compare(password,existingUser.password);

        if(!matchedPassword){
            return res.status(401).json({
                message:"username or password is invalid"
            })
        }

        const token=jwt.sign({id:existingUser._id},process.env.JWT_SECRET!,{expiresIn:"7d"});

        return res.status(200).json({
            message:"User signed in Successfully!!!",
            token:token,
        })
    } catch (error) {
         return res.status(500).json({
            message:`SERVER FAILED :- ${console.error(error)}`
        });

    }

};


export const getProfile=async(req:Request,res:Response)=>{
    try {
        // authMiddleware has already verified the token and set req.userId
        const user=await userModel.findById(req.userId).select("-password");

        if(!user){
            return res.status(404).json({
                message:"User not found"
            })
        }

        return res.status(200).json({
            user
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message:"SERVER FAILED"
        });
    }
};