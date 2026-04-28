import { useReadContract, useAccount } from "wagmi";
import { type Address } from "viem";
import { useEffect } from "react";

const TEE_REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;

const registryAbi = [
  {
    type: "function" as const,
    name: "getServicesByCapability",
    inputs: [
      { name: "capability", type: "uint8" },
      { name: "checkValidity", type: "bool" },
    ],
    outputs: [
      {
        type: "tuple[]",
        components: [
          {
            name: "node",
            type: "tuple",
            components: [
              { name: "paymentAddress", type: "address" },
              { name: "teeAddress", type: "address" },
              { name: "teeType", type: "uint8" },
              { name: "publicKey", type: "bytes" },
              { name: "endpoint", type: "string" },
              { name: "certPubKeyHash", type: "bytes32" },
              { name: "capability", type: "uint8" },
            ],
          },
          { name: "isValid", type: "bool" },
          { name: "workloadId", type: "bytes32" },
        ],
      },
    ],
    stateMutability: "view" as const,
  },
] as const;

const CAPABILITY_ID = { llm: 1 } as const;

export interface ExecutorInfo {
  teeAddress: Address;
  paymentAddress: Address;
  publicKey: `0x${string}`;
  publicKeyPresent: boolean;
  isValid: boolean;
  workloadId: `0x${string}`;
  teeType: number;
  registry: string;
  capability: number;
}

export function useExecutorDiscovery() {
  const { address } = useAccount();

  // Step 1: Try with validity check first
  const queryWithValidity = useReadContract({
    address: TEE_REGISTRY,
    abi: registryAbi,
    functionName: "getServicesByCapability",
    args: [CAPABILITY_ID.llm, true],
    query: { enabled: !!address },
  });

  // Step 2: If empty, try without validity check
  const queryWithoutValidity = useReadContract({
    address: TEE_REGISTRY,
    abi: registryAbi,
    functionName: "getServicesByCapability",
    args: [CAPABILITY_ID.llm, false],
    query: { enabled: !!address && queryWithValidity.isFetched && (queryWithValidity.data?.length ?? 0) === 0 },
  });

  // Log raw results for debugging
  useEffect(() => {
    if (queryWithValidity.data) {
      console.log("[ExecutorDiscovery] getServicesByCapability(1, true):", queryWithValidity.data);
    }
    if (queryWithoutValidity.data) {
      console.log("[ExecutorDiscovery] getServicesByCapability(1, false):", queryWithoutValidity.data);
    }
    if (queryWithValidity.isFetched && (queryWithValidity.data?.length ?? 0) === 0 && (queryWithoutValidity.data?.length ?? 0) === 0) {
      console.warn("[ExecutorDiscovery] No LLM executor returned by TEEServiceRegistry (checked both true and false validity)");
    }
  }, [queryWithValidity.data, queryWithoutValidity.data, queryWithValidity.isFetched]);

  // Step 3: Pick best executor
  const rawServices = (queryWithValidity.data?.length ?? 0) > 0
    ? queryWithValidity.data
    : queryWithoutValidity.data;

  const bestService = rawServices
    ? (rawServices.find((s: any) => s.isValid) ?? rawServices[0] ?? null)
    : null;

  const executors: ExecutorInfo[] = (rawServices ?? []).map((s: any) => ({
    teeAddress: s.node.teeAddress as Address,
    paymentAddress: s.node.paymentAddress as Address,
    publicKey: s.node.publicKey as `0x${string}`,
    publicKeyPresent: (s.node.publicKey as `0x${string}`).length > 2,
    isValid: s.isValid,
    workloadId: s.workloadId as `0x${string}`,
    teeType: s.node.teeType,
    registry: "TEEServiceRegistry",
    capability: CAPABILITY_ID.llm,
  }));

  const isLoading = queryWithValidity.isLoading || queryWithoutValidity.isLoading;
  const noServices = queryWithValidity.isFetched && (queryWithoutValidity.isFetched || !queryWithoutValidity.isEnabled) && !bestService;

  return {
    executors,
    executor: bestService
      ? {
          teeAddress: bestService.node.teeAddress as Address,
          paymentAddress: bestService.node.paymentAddress as Address,
          publicKey: bestService.node.publicKey as `0x${string}`,
          publicKeyPresent: (bestService.node.publicKey as `0x${string}`).length > 2,
          isValid: bestService.isValid,
          workloadId: bestService.workloadId as `0x${string}`,
          teeType: bestService.node.teeType,
          registry: "TEEServiceRegistry",
          capability: CAPABILITY_ID.llm,
        }
      : null,
    isLoading,
    noServices,
    checkedWithValidity: queryWithValidity.isFetched,
    checkedWithoutValidity: queryWithoutValidity.isFetched || !queryWithoutValidity.isEnabled,
    rawServices,
  };
}
