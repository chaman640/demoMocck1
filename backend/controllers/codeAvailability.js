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
        message: result.ok ? `'${result.code}' available hai!` : result.message,
        suggestions: result.suggestions || [],
        rule: CODE_RULE_TEXT,
      },
    });
  } catch (error) {
    console.error("checkCodeAvailability error:", error);
    return res.status(500).json({ success: false, message: "Code check nahi ho paya." });
  }
};

export const changePromoterCode = async (req, res) => {
  try {
    const result = await checkRequestedCode(req.body?.code, {}, { promoterId: req.promoter._id });
    if (!result.ok) {
      return res.status(409).json({ success: false, message: result.message, suggestions: result.suggestions || [] });
    }
    if (result.code === req.promoter.code) {
      return res.status(200).json({ success: true, message: "Ye pehle se aapka code hai.", data: { code: result.code } });
    }
    await Promoter.updateOne({ _id: req.promoter._id }, { $set: { code: result.code } });
    return res.status(200).json({
      success: true,
      message: `Aapka naya code '${result.code}' set ho gaya! Purana link ab kaam nahi karega — naya link share karein.`,
      data: { code: result.code },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Ye code abhi-abhi kisi ne le liya. Doosra chunein.", suggestions: [] });
    }
    console.error("changePromoterCode error:", error);
    return res.status(500).json({ success: false, message: "Code badal nahi paya." });
  }
};
