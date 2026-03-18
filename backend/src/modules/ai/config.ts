import 'dotenv/config';

export const AI_CONFIG = {
  API_KEY: process.env.TONGYI_API_KEY as string,
  API_URL: process.env.API_URL as string,
  MODEL: process.env.TONGYI_MODEL_NAME as string,
  TIMEOUT: Number(process.env.TONGYI_API_TIMEOUT) || 30000,
};
