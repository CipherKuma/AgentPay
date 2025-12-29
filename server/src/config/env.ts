import 'dotenv/config';

export const config = {
  port: process.env.PORT || 4402,
  nodeEnv: process.env.NODE_ENV || 'development',
  movement: {
    network: process.env.MOVEMENT_NETWORK || 'testnet',
    rpcUrl: process.env.MOVEMENT_RPC_URL || 'https://aptos.testnet.bardock.movementlabs.xyz/v1',
    asset: '0x1::aptos_coin::AptosCoin',
    payTo: process.env.MOVEMENT_PAY_TO,
    facilitatorUrl: process.env.MOVEMENT_FACILITATOR_URL || 'https://facilitator.stableyard.fi',
    treasuryAddress: process.env.MOVEMENT_TREASURY_ADDRESS,
    adminPrivateKey: process.env.MOVEMENT_ADMIN_PRIVATE_KEY || '',
  },
  providers: {
    openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    openaiApiKey: process.env.OPENAI_API_KEY,
    replicateApiToken: process.env.REPLICATE_API_TOKEN || '',
    togetherApiKey: process.env.TOGETHER_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
  },
  compute: {
    provider: process.env.COMPUTE_PROVIDER || 'mock',
    apiUrl: process.env.COMPUTE_API_URL || '',
    apiKey: process.env.COMPUTE_API_KEY || '',
  },
  database: {
    url: process.env.DATABASE_URL || '',
  },
  pricing: {
    marginPercent: 15, // 15% margin
  },
};

export type Config = typeof config;
