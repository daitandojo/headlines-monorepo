// scripts/reset-admin-password.js (version 4.0 - Quote Stripping)
const dotenv = require('dotenv');
const path = require('path');
const mongoose = require('mongoose');
const { subtle, getRandomValues } = require('node:crypto');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { MONGO_URI, NEXT_PUBLIC_ADMIN_EMAIL, NEXT_PUBLIC_ADMIN_PASSWORD } = process.env;
const encoder = new TextEncoder();

// Manually define the Subscriber model to avoid dependency issues
const { Schema } = mongoose;
const SubscriberSchema = new Schema({ email: { type: String, required: true, unique: true }, password: { type: String, required: true }, firstName: { type: String, required: true }, role: { type: String, default: 'user' }, isActive: { type: Boolean, default: true }, }, { timestamps: true, collection: 'subscribers' });
const Subscriber = mongoose.models.Subscriber || mongoose.model('Subscriber', SubscriberSchema);

async function hashPassword(password) {
    const salt = getRandomValues(new Uint8Array(16));
    const keyMaterial = await subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']);
    const derivedBits = await subtle.deriveBits({ name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' }, keyMaterial, 256);
    const hash = Buffer.from(derivedBits);
    return `${Buffer.from(salt).toString('hex')}:${hash.toString('hex')}`;
}

async function run() {
    if (!MONGO_URI || !NEXT_PUBLIC_ADMIN_EMAIL || !NEXT_PUBLIC_ADMIN_PASSWORD) {
        console.error('❌ ERROR: MONGO_URI, NEXT_PUBLIC_ADMIN_EMAIL, and NEXT_PUBLIC_ADMIN_PASSWORD must be set in your .env file.');
        process.exit(1);
    }
    
    // DEFINITIVE FIX: Strip quotes from the password read from .env
    const cleanPassword = NEXT_PUBLIC_ADMIN_PASSWORD.replace(/^"|"$/g, '');

    let connection;
    try {
        console.log('Connecting to MongoDB...');
        connection = await mongoose.connect(MONGO_URI);
        console.log('✅ MongoDB connection successful.');

        await Subscriber.deleteOne({ email: NEXT_PUBLIC_ADMIN_EMAIL });
        console.log(`✓ Previous user record for ${NEXT_PUBLIC_ADMIN_EMAIL} deleted.`);

        console.log(`Hashing password "${cleanPassword}" for ${NEXT_PUBLIC_ADMIN_EMAIL}...`);
        const hashedPassword = await hashPassword(cleanPassword);
        console.log(`✓ Password hashed successfully.`);

        const newUser = await Subscriber.create({ email: NEXT_PUBLIC_ADMIN_EMAIL, password: hashedPassword, firstName: 'Admin', role: 'admin', isActive: true });
        console.log(`✅ SUCCESS: Admin user has been created/reset with ID: ${newUser._id}`);

    } catch (error) {
        console.error('❌ CRITICAL FAILURE:', error);
    } finally {
        if (connection) {
            await mongoose.disconnect();
            console.log('Database connection closed.');
        }
    }
}

run();
