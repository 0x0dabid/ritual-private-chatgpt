import { useSendTransaction } from "wagmi";
import { encodeFunctionData, type Abi, type Address } from "viem";
import { useCallback } from "react";

export function useRitualWrite() {
  const { sendTransactionAsync } = useSendTransaction();

  const write = useCallback(
    async ({
      address,
      abi,
      functionName,
      args = [],
      value,
      gas = 1_000_000n,
    }: {
      address: Address;
      abi: Abi;
      functionName: string;
      args?: unknown[];
      value?: bigint;
      gas?: bigint;
    }) => {
      const data = encodeFunctionData({ abi, functionName, args });
      return sendTransactionAsync({
        to: address,
        data,
        value,
        gas,
      });
    },
    [sendTransactionAsync]
  );

  return { write };
}
