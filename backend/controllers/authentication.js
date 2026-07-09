// controllers/loginUser.js
import User from "../models/User.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const loginUser = async (req, res) => {
    try {
        // 1. Frontend se data nikalna (phone aur password)
        const { phone, password } = req.body;

        // Validation: Check karna ki dono fields bhari hain ya nahi
        if (!phone || !password) {
            return res.status(400).json({ 
                success: false, 
                message: "Phone number aur password dono bharna zaroori hai!" 
            });
        }

        // 2. Check karna ki is number ka user exist karta hai ya nahi
        const user = await User.findOne({ phone });
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Is number se koi account nahi mila. Kripya pehle signup karein." 
            });
        }

        // 3. Password match karna (Bcrypt ka use karke)
        // bcrypt.compare(plain_password, hashed_password_from_db)
        const isPasswordCorrect = await bcrypt.compare(password, user.password);

        if (!isPasswordCorrect) {
            return res.status(401).json({ 
                success: false, 
                message: "Galat password! Kripya sahi password darj karein." 
            });
        }

        // 4. Sab sahi hone par JWT Token Generate karna
        const token = jwt.sign(
            { userId: user._id }, 
            process.env.JWT_SECRET || "mera_super_secret_key", 
            { expiresIn: "7d" } // 7 din ke liye valid
        );

        // 5. Cookie Options Set karna
        const cookieOptions = {
            httpOnly: true, // Frontend JS se bachaane ke liye
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax", 
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 din (millisecond me)
        };

        // 6. Cookie set karna aur success response bhejna
        res.status(200)
           .cookie("token", token, cookieOptions) 
           .json({ 
               success: true, 
               message: "Login successful!", 
               data: {
                   _id: user._id,
                   name: user.name,
                   email: user.email,
                   phone: user.phone,
                   exam: user.exam
                   // Password yahan bhi wapas nahi bhejna hai
               } 
           });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};