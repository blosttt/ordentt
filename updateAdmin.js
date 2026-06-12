require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');
const Usuario = require('./backend/models/Usuario');
const connectDB = require('./backend/config/db');

async function run() {
    await connectDB();
    const adminUser = await Usuario.findOne({ carnet: 'admin' });
    if (adminUser) {
        adminUser.password = '12345';
        await adminUser.save();
        console.log('Admin password updated to 12345');
    } else {
        console.log('Admin user not found in DB');
    }
    process.exit(0);
}
run();
