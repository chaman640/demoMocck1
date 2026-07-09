// controllers/addUser.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"; // 👈 Password hash karne ke liye import kiya

export const addUser = async (req, res) => {
    try {
        // 1. Frontend se saara data nikalna
        const { name, email, phone, password, address, exam } = req.body;

        // 2. Validation check: Koi field khali toh nahi hai
        if (!name || !email || !phone || !password || !address || !exam) {
            return res.status(400).json({ success: false, message: "Sabhi fields bharna zaroori hai!" });
        }

        // (Extra Safety) Check karna ki is email ya phone se pehle koi account toh nahi
        const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: "Is email ya phone number se account pehle hi bana hua hai!" 
            });
        }

        // 3. Password ko bcrypt se encrypt (hash) karna
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 4. User ko database me save karna (hashed password ke sath)
        const newUser = new User({ 
            name, 
            email, 
            phone, 
            password: hashedPassword, // 👈 Encrypted password save kar rahe hain
            address, 
            exam 
        });
        await newUser.save();

        // 5. JWT Token Generate karna (User ki nayi _id se)
        const token = jwt.sign(
            { userId: newUser._id }, 
            process.env.JWT_SECRET || "mera_super_secret_key", 
            { expiresIn: "7d" }
        );

        // 6. Cookie Options Set karna
        const cookieOptions = {
            httpOnly: true, // Frontend JavaScript ise read nahi kar payegi
            secure: process.env.NODE_ENV === "production", 
            sameSite: "lax", 
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 din ke liye valid
        };

        // 7. Cookie set karna aur response bhejna
        res.status(201)
           .cookie("token", token, cookieOptions) 
           .json({ 
               success: true, 
               message: "User successfully registered & logged in!", 
               data: {
                   _id: newUser._id,
                   name: newUser.name,
                   email: newUser.email,
                   phone: newUser.phone,
                   exam: newUser.exam
                   // ⚠️ Yahan password kabhi wapas nahi bhejna chahiye
               } 
           });
           
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};