import { useCallback } from "react";
import { useAccount, useSendTransaction } from "wagmi";
import { encodeAbiParameters, decodeAbiParameters, parseAbiParameters, type Address, type Hex } from "viem";

const LLM_PRECOMPILE = "0x0000000000000000000000000000000000000802" as const;

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

export function useLLMCall() {
  const { sendTransactionAsync } = useSendTransaction();
  const { address } = useAccount();

  const submit = useCallback(
    async (req: LLMRequest): Promise<{ txHash: Hex }> => {
      if (!address) throw new Error("Wallet not connected");

      const {
        executor,
        messages,
        model = "zai-org/GLM-4.7-FP8",
        temperature = 0.7,
        maxTokens = 4096,
        ttl = 300n,
      } = req;

      // Encode the 30-field LLM precompile request
      const encoded = encodeAbiParameters(
        parseAbiParameters([
          "address, bytes[], uint256, bytes[], bytes,",
          "string, string, int256, string, bool, int256, string, string,",
          "uint256, bool, int256, string, bytes, int256, string, string, bool,",
          "int256, bytes, bytes, int256, int256, string, bool,",
          "(string,string,string)",
        ].join("")),
        [
          executor,
          [],                    // encryptedSecrets (empty for basic use)
          ttl,                   // ttl (300 blocks default)
          [],                    // secretSignatures
          "0x",                  // userPublicKey
          JSON.stringify(messages), // messages array
          model,                 // model name
          0n,                    // frequencyPenalty
          "",                    // logitBiasJson
          false,                 // logprobs
          BigInt(maxTokens),     // maxCompletionTokens
          "",                    // metadataJson
          "",                    // modalitiesJson
          1n,                    // n (1 completion)
          true,                  // parallelToolCalls
          0n,                    // presencePenalty
          "medium",              // reasoningEffort
          "0x",                  // responseFormatData
          -1n,                   // seed (null)
          "auto",                // serviceTier
          "",                    // stopJson
          false,                 // stream (false for non-streaming)
          BigInt(Math.round(temperature * 1000)), // temperature ×1000
          "0x",                  // toolChoiceData
          "0x",                  // toolsData
          -1n,                   // topLogprobs (null)
          1000n,                 // topP (1.0 × 1000)
          "",                    // user
          false,                 // piiEnabled
          ["gcs", "convos/default.jsonl", ""] as [string, string, string], // convoHistory
        ]
      );

      const txHash = await sendTransactionAsync({
        to: LLM_PRECOMPILE,
        data: encoded,
        gas: 3_000_000n,
      });

      return { txHash };
    },
    [address, sendTransactionAsync]
  );

  const decodeResponse = useCallback((resultHex: Hex): LLMResponse => {
    // Short-running async envelope: (bytes simmedInput, bytes actualOutput)
    let actualOutput: Hex;
    try {
      const decoded = parseAbiParameters("bytes, bytes");
      const [_, actual] = decodeAbiParameters(decoded, resultHex as Hex);
      actualOutput = actual as Hex;
    } catch {
      actualOutput = resultHex;
    }

    // Decode LLM response: (bool hasError, bytes completionData, bytes modelMetadata, string errorMessage, (string,string,string) updatedConvoHistory)
    const responseTypes = parseAbiParameters("bool, bytes, bytes, string, (string,string,string)");
    const [hasError, completionData, _modelMeta, errorMessage] = decodeAbiParameters(
      responseTypes,
      actualOutput
    );

    if (hasError) {
      return {
        hasError: true,
        content: "",
        errorMessage: errorMessage as string,
        finishReason: "error",
        usage: { prompt: 0, completion: 0, total: 0 },
      };
    }

    // Parse completionData: (string id, string object, uint256 created, string model,
    //   string systemFingerprint, string serviceTier,
    //   uint256 choicesCount, bytes[] choicesData, bytes usageData)
    try {
      const completionTypes = parseAbiParameters(
        "string, string, uint256, string, string, string, uint256, bytes[], bytes"
      );
      const [_id, _obj, _created, _model, , , choicesCount, choicesData, usageData] =
        decodeAbiParameters(completionTypes, completionData as Hex);

      // Parse first choice: (uint256 index, string finishReason, bytes messageData)
      let content = "";
      let finishReason = "";
      if (choicesCount > 0n && choicesData.length > 0) {
        const choiceTypes = parseAbiParameters("uint256, string, bytes");
        const [, fr, messageData] = decodeAbiParameters(choiceTypes, choicesData[0] as Hex);
        finishReason = fr as string;

        // Parse messageData: (string role, string content, string refusal, uint256 toolCallsCount, bytes[] toolCallsData)
        const msgTypes = parseAbiParameters("string, string, string, uint256, bytes[]");
        const [, msgContent] = decodeAbiParameters(msgTypes, messageData as Hex);
        content = msgContent as string;
      }

      // Parse usageData: (uint256 promptTokens, uint256 completionTokens, uint256 totalTokens)
      let promptTokens = 0, completionTokens = 0, totalTokens = 0;
      if (usageData && (usageData as Hex).length > 2) {
        const usageTypes = parseAbiParameters("uint256, uint256, uint256");
        const [pt, ct, tt] = decodeAbiParameters(usageTypes, usageData as Hex);
        promptTokens = Number(pt);
        completionTokens = Number(ct);
        totalTokens = Number(tt);
      }

      return {
        hasError: false,
        content,
        errorMessage: "",
        finishReason,
        usage: { prompt: promptTokens, completion: completionTokens, total: totalTokens },
      };
    } catch {
        return {
          hasError: false,
          content: new TextDecoder().decode(completionData as unknown as Uint8Array<ArrayBufferLike>),
          errorMessage: "",
          finishReason: "unknown",
          usage: { prompt: 0, completion: 0, total: 0 },
        };
    }
  }, []);

  return { submit, decodeResponse };
}
