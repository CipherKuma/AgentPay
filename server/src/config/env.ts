import 'dotenv/config';

export const config = {
  port: process.env.PORT || 4402,
  nodeEnv: process.env.NODE_ENV || 'development',
  movement: {
    network: 'movement-testnet',
    asset: '0x1::aptos_coin::AptosCoin',
    payTo: process.env.MOVEMENT_PAY_TO,
    facilitatorUrl: process.env.MOVEMENT_FACILITATOR_URL || 'https://facilitator.stableyard.fi',
    treasuryAddress: process.env.MOVEMENT_TREASURY_ADDRESS,
  },
  providers: {
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openaiApiKey: process.env.OPENAI_API_KEY,
    replicateApiToken: process.env.REPLICATE_API_TOKEN || '',
  },
  compute: {
    provider: process.env.COMPUTE_PROVIDER || 'mock',
    apiUrl: process.env.COMPUTE_API_URL || '',
    apiKey: process.env.COMPUTE_API_KEY || '',
  },
  pricing: {
    marginPercent: 15, // 15% margin
  },
};

export type Config = typeof config;
