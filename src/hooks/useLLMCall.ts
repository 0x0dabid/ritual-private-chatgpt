import { createPublicClient, createWalletClient, http, encodeAbiParameters, decodeAbiParameters, parseAbiParameters, type Address, type Hex, type Account, type TransactionReceipt } from "viem";
import { ritualChain } from "@/lib/chain";
import { SMART_ACCOUNT_FACTORY, CONSUMER_CONTRACT_ADDRESS } from "@/lib/addresses";
import { smartAccountAbi } from "@/lib/abi";

const LLM_PRECOMPILE = "0x0000000000000000000000000000000000000802" as const;
const RPC_URL = process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";

const publicClient = createPublicClient({
  chain: ritualChain,
  transport: http(RPC_URL),
});

interface RitualReceipt extends TransactionReceipt {
  spcCalls?: Array<{ input: Hex; output: Hex }>;
}

export interface LLMRequest {
  executor: Address;
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  ttl?: bigint;
}

export interface LLMResponse {
  hasError: boolean;
  content: string;
  errorMessage: string;
  finishReason: string;
  usage: { prompt: number; completion: number; total: number };
}

function encodeLLMRequest(req: LLMRequest): Hex {
  const {
    executor,
    messages,
    model = "zai-org/GLM-4.7-FP8",
    temperature = 0.7,
    maxTokens = 4096,
    ttl = 300n,
  } = req;

  return encodeAbiParameters(
    parseAbiParameters([
      "address, bytes[], uint256, bytes[], bytes,",
      "string, string, int256, string, bool, int256, string, string,",
      "uint256, bool, int256, string, bytes, int256, string, string, bool,",
      "int256, bytes, bytes, int256, int256, string, bool,",
      "(string,string,string)",
    ].join("")),
    [
      executor, [], ttl, [], "0x",
      JSON.stringify(messages), model,
      0n, "", false, BigInt(maxTokens), "", "",
      1n, true, 0n, "medium", "0x", -1n, "auto", "",
      false, BigInt(Math.round(temperature * 1000)),
      "0x", "0x", -1n, 1000n, "", false,
      ["gcs", "convos/default.jsonl", ""],
    ],
  );
}

function decodeLLMOutput(resultHex: Hex): LLMResponse {
  try {
    // Try nested ABI decode: (bytes simmedInput, bytes actualOutput)
    let actualOutput: Hex;
    try {
      const [_, actual] = decodeAbiParameters(
        parseAbiParameters("bytes, bytes"), resultHex
      );
      actualOutput = actual as Hex;
    } catch {
      actualOutput = resultHex;
    }

    // Decode LLM response: (bool hasError, bytes completionData, bytes modelMetadata, string errorMessage, (string,string,string))
    const [hasError, completionData, _modelMeta, errorMessage] = decodeAbiParameters(
      parseAbiParameters("bool, bytes, bytes, string, (string,string,string)"),
      actualOutput,
    );

    if (hasError) {
      return { hasError: true, content: "", errorMessage: errorMessage as string, finishReason: "error", usage: { prompt: 0, completion: 0, total: 0 } };
    }

    // Parse completionData: (string id, string object, uint256 created, string model, string systemFingerprint, string serviceTier, uint256 choicesCount, bytes[] choicesData, bytes usageData)
    try {
      const [_id, _obj, _created, _model, , , choicesCount, choicesData, usageData] = decodeAbiParameters(
        parseAbiParameters("string, string, uint256, string, string, string, uint256, bytes[], bytes"),
        completionData as Hex,
      );

      let content = "";
      let finishReason = "";
      if (choicesCount > 0n && choicesData.length > 0) {
        const [, fr, messageData] = decodeAbiParameters(
          parseAbiParameters("uint256, string, bytes"),
          choicesData[0] as Hex,
        );
        finishReason = fr as string;
        const [, msgContent] = decodeAbiParameters(
          parseAbiParameters("string, string, string, uint256, bytes[]"),
          messageData as Hex,
        );
        content = msgContent as string;
      }

      let promptTokens = 0, completionTokens = 0, totalTokens = 0;
      if (usageData && (usageData as Hex).length > 2) {
        const [pt, ct, tt] = decodeAbiParameters(
          parseAbiParameters("uint256, uint256, uint256"),
          usageData as Hex,
        );
        promptTokens = Number(pt);
        completionTokens = Number(ct);
        totalTokens = Number(tt);
      }

      return { hasError: false, content, errorMessage: "", finishReason, usage: { prompt: promptTokens, completion: completionTokens, total: totalTokens } };
    } catch {
      return { hasError: false, content: new TextDecoder().decode(completionData as unknown as Uint8Array), errorMessage: "", finishReason: "unknown", usage: { prompt: 0, completion: 0, total: 0 } };
    }
  } catch {
    return { hasError: true, content: "", errorMessage: "Failed to decode response", finishReason: "error", usage: { prompt: 0, completion: 0, total: 0 } };
  }
}

export async function submitLLMThroughSmartAccount(
  sessionAccount: Account,
  smartAccountAddress: Address,
  req: LLMRequest,
): Promise<{ txHash: Hex; response: LLMResponse }> {
  // Encode the LLM precompile call
  const llmData = encodeLLMRequest(req);

  // Encode SmartAccount.execute(LLM_PRECOMPILE, llmData)
  const executeData = encodeAbiParameters(
    parseAbiParameters("address, bytes"),
    [LLM_PRECOMPILE, llmData],
  );

  const callData = encodeAbiParameters(
    parseAbiParameters("address, bytes"),
    [CONSUMER_CONTRACT_ADDRESS, executeData],
  );

  // Create wallet client from session account
  const walletClient = createWalletClient({
    account: sessionAccount,
    chain: ritualChain,
    transport: http(RPC_URL),
  });

  // Submit through SmartAccount.execute() via the session key
  const txHash = await walletClient.sendTransaction({
    to: smartAccountAddress,
    data: encodeAbiParameters(
      parseAbiParameters("address, bytes"),
      [LLM_PRECOMPILE, llmData],
    ),
    gas: 3_000_000n,
  });

  // Wait for receipt and decode spcCalls
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash }) as RitualReceipt;

  let response: LLMResponse;
  if (receipt.spcCalls && receipt.spcCalls.length > 0) {
    response = decodeLLMOutput(receipt.spcCalls[0].output);
  } else {
    response = { hasError: true, content: "", errorMessage: "No spcCalls in receipt", finishReason: "error", usage: { prompt: 0, completion: 0, total: 0 } };
  }

  return { txHash, response };
}

export async function waitForLLMResult(txHash: Hex): Promise<LLMResponse> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash }) as RitualReceipt;
  if (receipt.spcCalls && receipt.spcCalls.length > 0) {
    return decodeLLMOutput(receipt.spcCalls[0].output);
  }
  return { hasError: true, content: "", errorMessage: "No spcCalls in receipt", finishReason: "error", usage: { prompt: 0, completion: 0, total: 0 } };
}
