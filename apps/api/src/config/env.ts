import dotenv from 'dotenv';
import path from 'path';

// Load .env from root of apps/api
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnv = ['DATABASE_URL'];

const checkEnv = () => {
    const missing = requiredEnv.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
        process.exit(1);
    }
};

export const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 4000,
    DATABASE_URL: process.env.DATABASE_URL!,
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    checkEnv,
};
