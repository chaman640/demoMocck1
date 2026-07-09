// middlewares/authMiddleware.js (Ya jahan bhi aap userInfo rakhna chahein)
import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const userInfo = async (req, res, next) => {
    try {
        // 1. Browser ki cookies se token nikalna
        // (Iske liye app.js me cookie-parser setup hona zaroori hai)
        const token = req.cookies.token;

        // Agar token nahi mila matlab user logged in nahi hai
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: "Aap logged in nahi hain. Kripya pehle login karein!" 
            });
        }

        // 2. Token ko verify (decrypt) karna
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "mera_super_secret_key");

        // 3. Database se user ka saara data nikalna
        // .select("-password") ka matlab hai ki password field ko chhod kar baki sab le aao
        const user = await User.findById(decoded.userId).select("-password");

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: "Account nahi mila ya delete ho chuka hai!" 
            });
        }

        // 4. User data ko 'req' object me attach karna
        // Ab ye data aage kisi bhi controller me 'req.user' likhne par mil jayega
        req.user = user;

        // 5. next() call karna zaroori hai, taaki aage wala controller chal sake
        next();

    } catch (error) {
        console.error("Auth Error:", error.message);
        
        // Agar token expire ho gaya ho ya galat ho (kisi ne chhedkhani ki ho)
        return res.status(401).json({ 
            success: false, 
            message: "Session expire ho gaya hai ya token galat hai. Phir se login karein." 
        });
    }
};