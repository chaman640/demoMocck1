// controllers/updateUserInfo.js
import User from "../models/User.js";

export const updateUserInfo = async (req, res) => {
    try {
        // 1. userInfo middleware ne req.user me user ka data daal diya hai
        // Toh humein yahan seedha user ki ID mil jayegi
        const userId = req.user._id;

        // 2. Frontend se wo data nikalna jo user update karna chahta hai
        // (Password ko update karne ka route alag banate hain security ke liye)
        const { name, address, exam } = req.body;

        // Email/phone ko signup jaisa hi normalize + validate karo — warna
        // "A@x.com" / " 98..." jaise duplicate ban jaate the aur login/reset toot jaata tha
        const email = req.body.email ? String(req.body.email).toLowerCase().trim() : "";
        const phone = req.body.phone ? String(req.body.phone).trim() : "";
        if (email && !/^\S+@\S+\.\S+$/.test(email)) {
            return res.status(400).json({ success: false, message: "Enter a valid email address!" });
        }
        if (phone && !/^\d{10}$/.test(phone)) {
            return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits!" });
        }

        const taken = [];
        if (email) taken.push({ email });
        if (phone) taken.push({ phone });
        if (taken.length) {
            const existingUser = await User.findOne({
                $or: taken,
                _id: { $ne: userId } // Khud ki ID ko chhodkar kisi aur ka check karega
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "This email or phone number is already registered to another account!"
                });
            }
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                // Jo field aayegi wahi update hogi, jo nahi aayegi wo purani hi rahegi
                $set: {
                    name: name ? String(name).trim() : req.user.name,
                    email: email || req.user.email,
                    phone: phone || req.user.phone,
                    address: address ? String(address).trim() : req.user.address,
                    exam: exam ? String(exam).trim() : req.user.exam
                }
            },
            { 
                new: true, // Ye true karne se database naya update hua data return karega
                runValidators: true // Ye schema ke rules (jaise required) ko enforce karega
            }
        ).select("-password"); // Password humein response me nahi bhejna hai

        // 5. Success response
        res.status(200).json({
            success: true,
            message: "Profile updated successfully!",
            data: updatedUser
        });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};