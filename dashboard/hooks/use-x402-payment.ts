import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  Aptos,
  AptosConfig,
  Network,
  AccountAuthenticatorEd25519,
  Ed25519PublicKey,
  Ed25519Signature,
} from "@aptos-labs/ts-sdk";
import { buildAptosLikePaymentHeader } from "x402plus";
import { runInference, parseSSEStream } from "@/lib/api";

const MOVEMENT_RPC = "https://mainnet.movementnetwork.xyz/v1";

// Convert wallet's {0: byte, 1: byte, ...} object to Uint8Array
const toBytes = (obj: Record<string, number>) =>
  new Uint8Array(Object.keys(obj).map(Number).sort((a, b) => a - b).map(k => obj[k]));

export function useX402Payment() {
  const { account, signTransaction } = useWallet();

  const payForAccess = async (paymentRequirements: any): Promise<string> => {
    if (!account) throw new Error("Wallet not connected");

    const aptos = new Aptos(new AptosConfig({ network: Network.CUSTOM, fullnode: MOVEMENT_RPC }));
    const tx = await aptos.transaction.build.simple({
      sender: account.address,
      data: {
        function: "0x1::aptos_account::transfer",
        functionArguments: [paymentRequirements.payTo, paymentRequirements.maxAmountRequired],
      },
    });

    const signed = await signTransaction({ transactionOrPayload: tx });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const auth = signed.authenticator as any;
    const pubKeyBytes = toBytes(auth.public_key.key.data);
    const sigBytes = toBytes(auth.signature.data.data);
    const authenticator = new AccountAuthenticatorEd25519(
      new Ed25519PublicKey(pubKeyBytes),
      new Ed25519Signature(sigBytes)
    );

    return buildAptosLikePaymentHeader(paymentRequirements, {
      signatureBcsBase64: Buffer.from(authenticator.bcsToBytes()).toString("base64"),
      transactionBcsBase64: Buffer.from(tx.bcsToBytes()).toString("base64"),
    });
  };

  const payForInference = async (
    model: string,
    prompt: string,
    options: { maxTokens?: number; temperature?: number }
  ): Promise<string> => {
    // First request without payment to get price
    const initialRes = await runInference(model, prompt, options);

    if (initialRes.status === 402) {
      const paymentRequirements = await initialRes.json();
      const paymentHeader = await payForAccess(paymentRequirements);

      // Retry with payment
      const paidRes = await runInference(model, prompt, options, paymentHeader);
      if (!paidRes.ok) {
        const err = await paidRes.text();
        throw new Error(`Request failed: ${err}`);
      }
      const data = await paidRes.json();
      return data.text || data.content || JSON.stringify(data, null, 2);
    }

    if (!initialRes.ok) {
      const err = await initialRes.text();
      throw new Error(`Request failed: ${err}`);
    }

    const data = await initialRes.json();
    return data.text || data.content || JSON.stringify(data, null, 2);
  };

  async function* payForInferenceStream(
    model: string,
    prompt: string,
    options: { maxTokens?: number; temperature?: number }
  ): AsyncGenerator<string, void, unknown> {
    // First request without payment to get price
    const initialRes = await runInference(model, prompt, { ...options, stream: true });

    if (initialRes.status === 402) {
      const paymentRequirements = await initialRes.json();
      const paymentHeader = await payForAccess(paymentRequirements);

      // Retry with payment and streaming
      const paidRes = await runInference(model, prompt, { ...options, stream: true }, paymentHeader);
      if (!paidRes.ok) {
        const err = await paidRes.text();
        throw new Error(`Request failed: ${err}`);
      }

      // Parse SSE stream and yield chunks
      for await (const chunk of parseSSEStream(paidRes)) {
        yield chunk;
      }
      return;
    }

    if (!initialRes.ok) {
      const err = await initialRes.text();
      throw new Error(`Request failed: ${err}`);
    }

    // Parse SSE stream and yield chunks
    for await (const chunk of parseSSEStream(initialRes)) {
      yield chunk;
    }
  }

  return { payForAccess, payForInference, payForInferenceStream, isConnected: !!account };
}
