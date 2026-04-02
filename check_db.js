
import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/User.js';
import Payment from './src/models/Payment.js';

async function test() {
  try {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) throw new Error("No MONGO_URI");
    
    await mongoose.connect(MONGO_URI);
    console.log("DB Connected");
    
    const userCount = await User.countDocuments();
    const paymentCount = await Payment.countDocuments();
    
    const users = await User.find({}, 'name email role');
    const payments = await Payment.find();
    
    console.log("Stats:", { userCount, paymentCount });
    console.log("Users:", JSON.stringify(users, null, 2));
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
