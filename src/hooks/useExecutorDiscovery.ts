import { type Address } from "viem";
import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http } from "viem";
import { ritualChain } from "@/lib/chain";

const TEE_REGISTRY = "0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F" as const;
const CAPABILITY_ID = { llm: 1 } as const;
const RPC_URL = process.env.NEXT_PUBLIC_RITUAL_RPC_URL ?? "https://rpc.ritualfoundation.org";
const MANUAL_EXECUTOR = process.env.NEXT_PUBLIC_MANUAL_LLM_EXECUTOR_ADDRESS as Address | undefined;

// Known working executor on Ritual Testnet (confirmed via working tx)
// Registry returns empty but this executor processes LLM calls successfully.
const KNOWN_EXECUTOR = "0xdbd91abbc81e62ec68c6ee335426210b3a54f8ff" as Address;

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

interface RawService {
  node: {
    paymentAddress: string;
    teeAddress: string;
    teeType: number;
    publicKey: string;
    endpoint: string;
    certPubKeyHash: string;
    capability: number;
  };
  isValid: boolean;
  workloadId: string;
}

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

export interface ExecutorDebugState {
  rpcUrl: string;
  chainId: number;
  registryAddress: string;
  capabilityId: number;
  queryWithValidity: { status: string; rawCount: number; rawData: any };
  queryWithoutValidity: { status: string; rawCount: number; rawData: any };
  selectedExecutor: ExecutorInfo | null;
  selectedIsValid: boolean;
  workloadId: string;
  publicKeyStatus: string;
  error: string | null;
  lastChecked: string;
  manualOverrideActive: boolean;
}

export function useExecutorDiscovery() {
  const [servicesWithValidity, setServicesWithValidity] = useState<RawService[] | null>(null);
  const [servicesWithoutValidity, setServicesWithoutValidity] = useState<RawService[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<string>("");

  const fetchServices = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const client = createPublicClient({
        chain: ritualChain,
        transport: http(RPC_URL),
      });

      const result1 = await client.readContract({
        address: TEE_REGISTRY,
        abi: registryAbi,
        functionName: "getServicesByCapability",
        args: [CAPABILITY_ID.llm, true],
      }) as RawService[];

      console.log("[ExecutorDiscovery] getServicesByCapability(1, true):", result1);
      setServicesWithValidity(result1);

      if (result1.length === 0) {
        const result2 = await client.readContract({
          address: TEE_REGISTRY,
          abi: registryAbi,
          functionName: "getServicesByCapability",
          args: [CAPABILITY_ID.llm, false],
        }) as RawService[];

        console.log("[ExecutorDiscovery] getServicesByCapability(1, false):", result2);
        setServicesWithoutValidity(result2);

        if (result2.length === 0) {
          console.warn("[ExecutorDiscovery] No LLM executor returned by TEEServiceRegistry (checked both true and false validity)");
        }
      } else {
        setServicesWithoutValidity(null);
      }
    } catch (err) {
      console.error("[ExecutorDiscovery] Error querying TEEServiceRegistry:", err);
      setError(err instanceof Error ? err.message : "Failed to query registry");
    } finally {
      setLoading(false);
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices, retryCount]);

  const retry = useCallback(() => setRetryCount((c) => c + 1), []);

  const rawServices = (servicesWithValidity && servicesWithValidity.length > 0)
    ? servicesWithValidity
    : servicesWithoutValidity;

  const bestService = rawServices
    ? (rawServices.find((s) => s.isValid) ?? rawServices[0] ?? null)
    : null;

  const isManualOverride = !bestService && !!MANUAL_EXECUTOR;
  const useKnownFallback = !bestService && !MANUAL_EXECUTOR;

  const fallbackLabel = isManualOverride ? "Manual Override" : useKnownFallback ? "Known Fallback" : null;

  const buildExecutor = (s: RawService): ExecutorInfo => ({
    teeAddress: s.node.teeAddress as Address,
    paymentAddress: s.node.paymentAddress as Address,
    publicKey: s.node.publicKey as `0x${string}`,
    publicKeyPresent: (s.node.publicKey as `0x${string}`).length > 2,
    isValid: s.isValid,
    workloadId: s.workloadId as `0x${string}`,
    teeType: s.node.teeType,
    registry: "TEEServiceRegistry",
    capability: CAPABILITY_ID.llm,
  });

  const executor: ExecutorInfo | null = bestService
    ? buildExecutor(bestService)
    : isManualOverride
    ? {
        teeAddress: MANUAL_EXECUTOR as Address,
        paymentAddress: "0x0000000000000000000000000000000000000000" as Address,
        publicKey: "0x" as `0x${string}`,
        publicKeyPresent: false,
        isValid: false,
        workloadId: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        teeType: 0,
        registry: "Manual Override",
        capability: CAPABILITY_ID.llm,
      }
    : useKnownFallback
    ? {
        teeAddress: KNOWN_EXECUTOR,
        paymentAddress: "0x0000000000000000000000000000000000000000" as Address,
        publicKey: "0x" as `0x${string}`,
        publicKeyPresent: false,
        isValid: false,
        workloadId: "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`,
        teeType: 0,
        registry: "Known Workaround (registry empty)",
        capability: CAPABILITY_ID.llm,
      }
    : null;

  const executors: ExecutorInfo[] = (rawServices ?? []).map(buildExecutor);

  const debug: ExecutorDebugState = {
    rpcUrl: RPC_URL,
    chainId: ritualChain.id,
    registryAddress: TEE_REGISTRY,
    capabilityId: CAPABILITY_ID.llm,
    queryWithValidity: {
      status: servicesWithValidity === null ? "not checked" : `done (${servicesWithValidity.length} services)`,
      rawCount: servicesWithValidity?.length ?? 0,
      rawData: servicesWithValidity,
    },
    queryWithoutValidity: {
      status: servicesWithoutValidity === null ? "not checked" : `done (${servicesWithoutValidity.length} services)`,
      rawCount: servicesWithoutValidity?.length ?? 0,
      rawData: servicesWithoutValidity,
    },
    selectedExecutor: executor,
    selectedIsValid: executor?.isValid ?? false,
    workloadId: executor?.workloadId ?? "none",
    publicKeyStatus: executor?.publicKeyPresent ? "present" : "missing",
    error,
    lastChecked,
    manualOverrideActive: isManualOverride,
  };

  return {
    executor,
    executors,
    isLoading: loading,
    noServices: !loading && !error && !bestService && !isManualOverride && !useKnownFallback,
    isManualOverride,
    useKnownFallback,
    error,
    retry,
    debug,
  };
}
