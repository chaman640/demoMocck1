export const getPromoterDashboard = async (req, res) => {
  try {
    const promoter = req.promoter;
    const frontendUrl = process.env.FRONTEND_URL || req.headers.origin || "http://localhost:5173";

    return res.status(200).json({
      success: true,
      data: {
        name: promoter.name,
        email: promoter.email,
        phone: promoter.phone,
        code: promoter.code,
        referralLink: `${frontendUrl}/#/Singup?ref=${promoter.code}&kind=promoter`,
        mustChangePassword: promoter.mustChangePassword,
        totalStudents: promoter.totalStudents,
        pendingQuestionsCount: promoter.pendingQuestionsCount,
        totalQuestionsAllTime: promoter.totalQuestionsAllTime,
        paymentHistory: promoter.paymentHistory,
      },
    });
  } catch (error) {
    console.error("getPromoterDashboard error:", error);
    return res.status(500).json({ success: false, message: "Dashboard fetch karte waqt error aaya." });
  }
};
