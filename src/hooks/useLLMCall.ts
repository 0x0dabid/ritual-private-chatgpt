import { createPublicClient, http, encodeAbiParameters, decodeAbiParameters, parseAbiParameters, type Address, type Hex } from "viem";
import { ritualChain } from "@/lib/chain";

const LLM_PRECOMPILE = "0x0000000000000000000000000000000000000802" as const;
const RPC_URL = process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";

const publicClient = createPublicClient({
  chain: ritualChain,
  transport: http(RPC_URL),
});

interface RitualReceipt extends Awaited<ReturnType<typeof publicClient.waitForTransactionReceipt>> {
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

export function encodeLLMRequest(req: LLMRequest): Hex {
  const { executor, messages, model = "zai-org/GLM-4.7-FP8", temperature = 0.7, maxTokens = 4096, ttl = 300n } = req;
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

export function decodeLLMOutput(resultHex: Hex): LLMResponse {
  try {
    let actualOutput: Hex;
    try {
      const [_, actual] = decodeAbiParameters(parseAbiParameters("bytes, bytes"), resultHex);
      actualOutput = actual as Hex;
    } catch {
      actualOutput = resultHex;
    }
    const [hasError, completionData, _modelMeta, errorMessage] = decodeAbiParameters(
      parseAbiParameters("bool, bytes, bytes, string, (string,string,string)"), actualOutput,
    );
    if (hasError) {
      return { hasError: true, content: "", errorMessage: errorMessage as string, finishReason: "error", usage: { prompt: 0, completion: 0, total: 0 } };
    }
    try {
      const [_id, _obj, _created, _model, , , choicesCount, choicesData, usageData] = decodeAbiParameters(
        parseAbiParameters("string, string, uint256, string, string, string, uint256, bytes[], bytes"),
        completionData as Hex,
      );
      let content = "";
      let finishReason = "";
      if (choicesCount > 0n && choicesData.length > 0) {
        const [, fr, messageData] = decodeAbiParameters(parseAbiParameters("uint256, string, bytes"), choicesData[0] as Hex);
        finishReason = fr as string;
        const [, msgContent] = decodeAbiParameters(parseAbiParameters("string, string, string, uint256, bytes[]"), messageData as Hex);
        content = msgContent as string;
      }
      let promptTokens = 0, completionTokens = 0, totalTokens = 0;
      if (usageData && (usageData as Hex).length > 2) {
        const [pt, ct, tt] = decodeAbiParameters(parseAbiParameters("uint256, uint256, uint256"), usageData as Hex);
        promptTokens = Number(pt); completionTokens = Number(ct); totalTokens = Number(tt);
      }
      return { hasError: false, content, errorMessage: "", finishReason, usage: { prompt: promptTokens, completion: completionTokens, total: totalTokens } };
    } catch {
      return { hasError: false, content: new TextDecoder().decode(completionData as unknown as Uint8Array), errorMessage: "", finishReason: "unknown", usage: { prompt: 0, completion: 0, total: 0 } };
    }
  } catch {
    return { hasError: true, content: "", errorMessage: "Failed to decode response", finishReason: "error", usage: { prompt: 0, completion: 0, total: 0 } };
  }
}

/// Submit LLM call through SmartAccount.execute() — signed by the EOA owner.
/// tx: EOA → SmartAccount.execute(0x0802, encodedLLMData)
export async function submitLLM(
  txHash: Hex,
  wait: boolean,
): Promise<{ txHash: Hex; response: LLMResponse }> {
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash }) as RitualReceipt;

  if (receipt.spcCalls && receipt.spcCalls.length > 0) {
    return { txHash, response: decodeLLMOutput(receipt.spcCalls[0].output) };
  }
  return { txHash, response: { hasError: true, content: "", errorMessage: "Transaction confirmed, but Ritual did not return LLM output via this call path.", finishReason: "error", usage: { prompt: 0, completion: 0, total: 0 } } };
}
