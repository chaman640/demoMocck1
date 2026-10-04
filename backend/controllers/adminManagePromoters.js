import bcrypt from "bcrypt";
import Promoter from "../models/Promoter.js";
import { checkRequestedCode, generateUniqueCode } from "../utils/codeRegistry.js";
import { sendPromoterCredentialsEmail } from "../utils/mailer.js";

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
    const { name, email, phone, password, code: wantedCode } = req.body;

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone and password are all required!",
      });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedPhone = String(phone).trim();

    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      return res.status(400).json({ success: false, message: "Please enter a valid email!" });
    }
    if (!/^\d{10}$/.test(normalizedPhone)) {
      return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits!" });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters!" });
    }

    const existing = await Promoter.findOne({
      $or: [{ email: normalizedEmail }, { phone: normalizedPhone }],
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: "A promoter account with this email or phone already exists!",
      });
    }

    let code;
    if (wantedCode && String(wantedCode).trim()) {
      const result = await checkRequestedCode(wantedCode);
      if (!result.ok) {
        return res.status(409).json({ success: false, message: result.message, suggestions: result.suggestions || [] });
      }
      code = result.code;
    } else {
      code = await generateUniqueCode("", 8);
    }
    if (!code) {
      return res.status(500).json({
        success: false,
        message: "Problem generating the promoter code, please try again.",
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
        ? "Promoter created and credentials sent by email!"
        : "Promoter created, but the email could not be sent — share the code/password yourself.",
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
        message: "An account with this email, phone or code already exists.",
      });
    }
    console.error("adminCreatePromoter error:", error);
    return res.status(500).json({ success: false, message: "Error while creating the promoter." });
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
    return res.status(500).json({ success: false, message: "Error while listing promoters." });
  }
};

export const adminUpdatePromoter = async (req, res) => {
  try {
    const { promoterId } = req.params;
    const { name, email, phone, newPassword } = req.body;

    const promoter = await Promoter.findById(promoterId);
    if (!promoter) {
      return res.status(404).json({ success: false, message: "Promoter not found!" });
    }

    if (email) {
      const normalizedEmail = String(email).toLowerCase().trim();
      if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
        return res.status(400).json({ success: false, message: "Please enter a valid email!" });
      }
      const emailTaken = await Promoter.findOne({ email: normalizedEmail, _id: { $ne: promoterId } });
      if (emailTaken) {
        return res.status(400).json({ success: false, message: "This email already belongs to another promoter!" });
      }
      promoter.email = normalizedEmail;
    }

    if (phone) {
      const normalizedPhone = String(phone).trim();
      if (!/^\d{10}$/.test(normalizedPhone)) {
        return res.status(400).json({ success: false, message: "Phone number must be exactly 10 digits!" });
      }
      const phoneTaken = await Promoter.findOne({ phone: normalizedPhone, _id: { $ne: promoterId } });
      if (phoneTaken) {
        return res.status(400).json({ success: false, message: "This phone number already belongs to another promoter!" });
      }
      promoter.phone = normalizedPhone;
    }

    if (name) promoter.name = String(name).trim();

    if (newPassword) {
      if (String(newPassword).length < 6) {
        return res.status(400).json({ success: false, message: "Password must be at least 6 characters!" });
      }
      const salt = await bcrypt.genSalt(10);
      promoter.password = await bcrypt.hash(String(newPassword), salt);
      promoter.passwordChangedAt = new Date();
      promoter.mustChangePassword = true;
    }

    await promoter.save();

    return res.status(200).json({
      success: true,
      message: "Promoter updated!",
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
      return res.status(409).json({ success: false, message: "An account with this email or phone already exists." });
    }
    console.error("adminUpdatePromoter error:", error);
    return res.status(500).json({ success: false, message: "Error while updating the promoter." });
  }
};

export const adminSetPromoterStatus = async (req, res) => {
  try {
    const { promoterId } = req.params;
    const { status } = req.body;

    if (!["active", "removed"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be 'active' or 'removed'!" });
    }

    const promoter = await Promoter.findByIdAndUpdate(promoterId, { status }, { new: true }).select("-password");
    if (!promoter) {
      return res.status(404).json({ success: false, message: "Promoter not found!" });
    }

    return res.status(200).json({
      success: true,
      message: status === "removed" ? "Promoter removed." : "Promoter activated.",
      data: promoter,
    });
  } catch (error) {
    console.error("adminSetPromoterStatus error:", error);
    return res.status(500).json({ success: false, message: "Error while changing status." });
  }
};
