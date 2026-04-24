import Payment from "@/models/Payment";
import User from "@/models/User";
import JobApplication from "@/models/JobApplication";

/**
 * Fetch all transactions (payments) for the admin dashboard
 */
export const getAllTransactions = async (req, res) => {
  try {
    const transactions = await Payment.find()
      .populate("user", "name email")
      .sort({ timestamp: -1 });
    
    res.status(200).json(transactions);
  } catch (error) {
    console.error("Error fetching all transactions:", error);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};

/**
 * Fetch dashboard stats for admin
 */
export const getAdminStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalPayments = await Payment.countDocuments({ status: 'paid' });
    const totalRevenue = await Payment.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.status(200).json({
      totalUsers,
      totalPayments,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch stats" });
  }
};

/**
 * Fetch all job applications for the admin dashboard
 */
export const getAllJobApplications = async (req, res) => {
  try {
    const applications = await JobApplication.find().sort({ appliedAt: -1 });
    res.status(200).json(applications);
  } catch (error) {
    console.error("Error fetching job applications:", error);
    res.status(500).json({ message: "Failed to fetch applications" });
  }
};
