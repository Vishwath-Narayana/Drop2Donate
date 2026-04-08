require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const accounts = [
  { name: 'Demo Donor',          email: 'donor@demo.com',    password: 'password123', role: 'donor' },
  { name: 'Demo NGO',            email: 'ngo@demo.com',      password: 'password123', role: 'ngo',      verified: true },
  { name: 'Demo Delivery Agent', email: 'delivery@demo.com', password: 'password123', role: 'delivery' },
  { name: 'Demo Admin',          email: 'admin@demo.com',    password: 'password123', role: 'admin' },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  for (const account of accounts) {
    const existing = await User.findOne({ email: account.email });
    if (existing) {
      console.log(`  SKIP  ${account.email} (already exists)`);
      continue;
    }
    await User.create(account);
    console.log(`  CREATED ${account.role.padEnd(8)} ${account.email}`);
  }

  await mongoose.disconnect();
  console.log('\nDone. Run: cd backend && npm start');
}

seed().catch((err) => { console.error(err); process.exit(1); });
