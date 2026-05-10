import dotenv from 'dotenv';

dotenv.config();

const config = {
  port: process.env.PORT || '3000',
  mongoURI: process.env.MONGO_URI || '',
  fbVerifyToken: process.env.FB_VERIFY_TOKEN || '',
  fbPageAccessToken: process.env.FB_PAGE_ACCESS_TOKEN || '',
  googleApiKey: process.env.GOOGLE_API_KEY || ''
};

export default config;
