
import mongoose from 'mongoose';
import connectToDatabase from './src/lib/db.js';
import User from './src/models/User.js';
import Payment from './src/models/Payment.js';

async function test() {
  try {
    await connectToDatabase();
    console.log("DB Connected");
    
    const userCount = await User.countDocuments();
    const paymentCount = await Payment.countDocuments();
    
    console.log("Total Users:", userCount);
    console.log("Total Payments:", paymentCount);
    
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

test();
