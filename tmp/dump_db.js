
import 'dotenv/config';
import mongoose from 'mongoose';
import connectToDatabase from '../src/lib/db.js';
import User from '../src/models/User.js';
import Payment from '../src/models/Payment.js';

async function test() {
  try {
    // Manually set MONGO_URI if needed from process.env
    console.log("Using URI:", process.env.MONGO_URI?.substring(0, 20) + "...");
    await connectToDatabase();
    console.log("DB Connected");
    
    const users = await User.find({}, 'name email role');
    const payments = await Payment.find();
    
    console.log("Total Users:", users.length);
    console.log("User details:", JSON.stringify(users, null, 2));
    console.log("Total Payments:", payments.length);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
