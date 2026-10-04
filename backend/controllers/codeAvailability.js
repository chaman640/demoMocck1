// controllers/codeAvailability.js
// GET /codes/check?code=RAHUL&exam=SSC GD  → { available, code, message?, suggestions[] }
// POST /promoter/change-code { code }      → promoter apna referral code khud chune
import Promoter from "../models/Promoter.js";
import { checkRequestedCode, CODE_RULE_TEXT } from "../utils/codeRegistry.js";

export const checkCodeAvailability = async (req, res) => {
  try {
    const result = await checkRequestedCode(req.query.code, { exam: req.query.exam }, { promoterId: req.promoter?._id });
    return res.status(200).json({
      success: true,
      data: {
        available: result.ok,
        code: result.code,
        message: result.ok ? `'${result.code}' is available!` : result.message,
        suggestions: result.suggestions || [],
        rule: CODE_RULE_TEXT,
      },
    });
  } catch (error) {
    console.error("checkCodeAvailability error:", error);
    return res.status(500).json({ success: false, message: "Could not check the code." });
  }
};

export const changePromoterCode = async (req, res) => {
  try {
    const result = await checkRequestedCode(req.body?.code, {}, { promoterId: req.promoter._id });
    if (!result.ok) {
      return res.status(409).json({ success: false, message: result.message, suggestions: result.suggestions || [] });
    }
    if (result.code === req.promoter.code) {
      return res.status(200).json({ success: true, message: "This is already your code.", data: { code: result.code } });
    }
    await Promoter.updateOne({ _id: req.promoter._id }, { $set: { code: result.code } });
    return res.status(200).json({
      success: true,
      message: `Your new code '${result.code}' is set! The old link will no longer work — share the new link.`,
      data: { code: result.code },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Someone just took this code. Choose another one.", suggestions: [] });
    }
    console.error("changePromoterCode error:", error);
    return res.status(500).json({ success: false, message: "Could not change the code." });
  }
};
