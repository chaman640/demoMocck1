// controllers/updateUserInfo.js
import User from "../models/User.js";

export const updateUserInfo = async (req, res) => {
    try {
        // 1. userInfo middleware ne req.user me user ka data daal diya hai
        // Toh humein yahan seedha user ki ID mil jayegi
        const userId = req.user._id;

        // 2. Frontend se wo data nikalna jo user update karna chahta hai
        // (Password ko update karne ka route alag banate hain security ke liye)
        const { name, email, phone, address, exam } = req.body;

        // 3. Duplicate check (Agar user apna email ya phone badal raha hai)
        if (email || phone) {
            const existingUser = await User.findOne({
                $or: [{ email }, { phone }],
                _id: { $ne: userId } // Khud ki ID ko chhodkar kisi aur ka check karega
            });

            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: "Ye email ya phone number pehle se kisi aur account me registered hai!"
                });
            }
        }

        // 4. User data ko update karna
        // findByIdAndUpdate(ID, updateData, options)
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                // Jo field aayegi wahi update hogi, jo nahi aayegi wo purani hi rahegi
                $set: {
                    name: name || req.user.name,
                    email: email || req.user.email,
                    phone: phone || req.user.phone,
                    address: address || req.user.address,
                    exam: exam || req.user.exam
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
            message: "Profile successfully update ho gayi!",
            data: updatedUser
        });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};