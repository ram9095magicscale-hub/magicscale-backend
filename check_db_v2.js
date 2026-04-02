
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: String,
  role: String,
  name: String
});
const User = mongoose.models.User || mongoose.model('User', userSchema);

const paymentSchema = new mongoose.Schema({
  amount: Number,
  status: String
});
const Payment = mongoose.models.Payment || mongoose.model('Payment', paymentSchema);

async function test() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) throw new Error("No MONGO_URI");
    
    await mongoose.connect(MONGO_URI);
    console.log("DB Connected");
    
    const userCount = await User.countDocuments();
    const paymentCount = await Payment.countDocuments();
    
    const users = await User.find({}, 'name email role');
    
    console.log("Stats:", { userCount, paymentCount });
    console.log("Users List:", JSON.stringify(users, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
