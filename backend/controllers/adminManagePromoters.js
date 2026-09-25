import bcrypt from "bcrypt";
import Promoter from "../models/Promoter.js";
import Coupon from "../models/Coupon.js";
import { sendPromoterCredentialsEmail } from "../utils/mailer.js";

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const generatePromoterCode = () => {
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
};

const generateUniquePromoterCode = async () => {
  let code;
  let isUnique = false;
  let attempts = 0;

  while (!isUnique && attempts < 5) {
    code = generatePromoterCode();
    const [existingPromoter, existingCoupon] = await Promise.all([
      Promoter.findOne({ code }),
      Coupon.findOne({ code }),
    ]);
    if (!existingPromoter && !existingCoupon) isUnique = true;
    attempts++;
  }

  return isUnique ? code : null;
};

const buildReferralLink = (req, code) => {
  const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || "http://localhost:5173";
  return `${frontendUrl}/#/Singup?ref=${code}&kind=promoter`;
};

const buildLoginLink = (req) => {
  const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || "http://localhost:5173";
  return `${frontendUrl}/#/PromoterLogin`;
};

export const adminCreatePromoter = async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Naam, email, phone aur password sabhi zaroori hain!",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Sahi email daalein!" });
    }
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: "Phone number bilkul 10 anko ka hona chahiye!" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password kam se kam 6 characters ka hona chahiye!" });
    }

    const existing = await Promoter.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Is email ya phone se promoter account pehle hi maujood hai!",
      });
    }

    const code = await generateUniquePromoterCode();
    if (!code) {
      return res.status(500).json({
        success: false,
        message: "Promoter code generate karne mein dikkat aa rahi hai, dobara try karein.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newPromoter = new Promoter({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      password: hashedPassword,
      code,
      status: "active",
      mustChangePassword: true,
    });
    await newPromoter.save();

    const loginLink = buildLoginLink(req);
    const referralLink = buildReferralLink(req, code);

    let emailSent = true;
    try {
      await sendPromoterCredentialsEmail(normalizedEmail, {
        name: newPromoter.name,
        email: normalizedEmail,
        password,
        loginLink,
      });
    } catch (emailError) {
      emailSent = false;
      console.error("sendPromoterCredentialsEmail failed:", emailError.message);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? "Promoter ban gaya aur credentials email bhej diye gaye hain!"
        : "Promoter ban gaya, lekin email bhejne mein dikkat aayi — code/password khud bata dein.",
      data: {
        promoterId: newPromoter._id,
        code,
        referralLink,
        emailSent,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Is email, phone ya code se account pehle hi maujood hai.",
      });
    }
    console.error("adminCreatePromoter error:", error);
    return res.status(500).json({ success: false, message: "Promoter banate waqt error aaya." });
  }
};

export const adminListPromoters = async (req, res) => {
  try {
    const promoters = await Promoter.find().select("-password").sort({ createdAt: -1 });

    const data = promoters.map((p) => ({
      _id: p._id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      code: p.code,
      status: p.status,
      mustChangePassword: p.mustChangePassword,
      totalStudents: p.totalStudents,
      pendingQuestionsCount: p.pendingQuestionsCount,
      totalQuestionsAllTime: p.totalQuestionsAllTime,
      paymentHistory: p.paymentHistory,
      referralLink: buildReferralLink(req, p.code),
      createdAt: p.createdAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("adminListPromoters error:", error);
    return res.status(500).json({ success: false, message: "Promoters list karte waqt error aaya." });
  }
};

export const adminUpdatePromoter = async (req, res) => {
  try {
    const { promoterId } = req.params;
    const { name, email, phone, newPassword } = req.body;

    const promoter = await Promoter.findById(promoterId);
    if (!promoter) {
      return res.status(404).json({ success: false, message: "Promoter nahi mila!" });
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: "Sahi email daalein!" });
      }
      const emailTaken = await Promoter.findOne({ email: normalizedEmail, _id: { $ne: promoterId } });
      if (emailTaken) {
        return res.status(400).json({ success: false, message: "Ye email pehle se kisi aur promoter ke pass hai!" });
      }
      promoter.email = normalizedEmail;
    }

    if (phone) {
      const normalizedPhone = String(phone).trim();
      if (!/^\d{10}$/.test(normalizedPhone)) {
        return res.status(400).json({ success: false, message: "Phone number bilkul 10 anko ka hona chahiye!" });
      }
      const phoneTaken = await Promoter.findOne({ phone: normalizedPhone, _id: { $ne: promoterId } });
      if (phoneTaken) {
        return res.status(400).json({ success: false, message: "Ye phone number pehle se kisi aur promoter ke pass hai!" });
      }
      promoter.phone = normalizedPhone;
    }

    if (name) promoter.name = String(name).trim();

    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ success: false, message: "Password kam se kam 6 characters ka hona chahiye!" });
      }
      const salt = await bcrypt.genSalt(10);
      promoter.password = await bcrypt.hash(newPassword, salt);
      promoter.mustChangePassword = true;
    }

    await promoter.save();

    return res.status(200).json({
      success: true,
      message: "Promoter update ho gaya!",
      data: {
        _id: promoter._id,
        name: promoter.name,
        email: promoter.email,
        phone: promoter.phone,
        code: promoter.code,
        status: promoter.status,
        mustChangePassword: promoter.mustChangePassword,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Is email ya phone se account pehle hi maujood hai." });
    }
    console.error("adminUpdatePromoter error:", error);
    return res.status(500).json({ success: false, message: "Promoter update karte waqt error aaya." });
  }
};

export const adminSetPromoterStatus = async (req, res) => {
  try {
    const { promoterId } = req.params;
    const { status } = req.body;

    if (!["active", "removed"].includes(status)) {
      return res.status(400).json({ success: false, message: "status 'active' ya 'removed' hona chahiye!" });
    }

    const promoter = await Promoter.findByIdAndUpdate(promoterId, { status }, { new: true }).select("-password");
    if (!promoter) {
      return res.status(404).json({ success: false, message: "Promoter nahi mila!" });
    }

    return res.status(200).json({
      success: true,
      message: status === "removed" ? "Promoter remove kar diya gaya." : "Promoter active kar diya gaya.",
      data: promoter,
    });
  } catch (error) {
    console.error("adminSetPromoterStatus error:", error);
    return res.status(500).json({ success: false, message: "Status badalte waqt error aaya." });
  }
};
