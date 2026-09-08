"use client";

// Contract bindings for the two deployed Tuitio contracts, using the
// stellar-sdk contract Client with Freighter as the signer.

import { contract } from "@stellar/stellar-sdk";
import { env } from "./env";

export interface TuitioEscrow {
  create_grant: (args: {
    sponsor: string;
    beneficiary: string;
    institution: string;
    token_id: string;
    term_amount: bigint;
    terms_total: number;
  }) => Promise<contract.AssembledTransaction<number>>;
  attest_term: (args: { grant_id: number; term_index: number }) => Promise<contract.AssembledTransaction<void>>;
  release_term: (args: { grant_id: number; term_index: number }) => Promise<contract.AssembledTransaction<void>>;
  dispute_term: (args: { grant_id: number; term_index: number }) => Promise<contract.AssembledTransaction<void>>;
  resolve_dispute: (args: {
    grant_id: number;
    term_index: number;
    release: boolean;
  }) => Promise<contract.AssembledTransaction<void>>;
  cancel_grant: (args: { grant_id: number }) => Promise<contract.AssembledTransaction<void>>;
}

export interface TuitioRegistry {
  register: (args: {
    caller: string;
    payout: string;
    name: string;
    country: string;
  }) => Promise<contract.AssembledTransaction<void>>;
}

type SignFn = (
  xdr: string,
  opts?: { networkPassphrase?: string; address?: string },
) => Promise<{ signedTxXdr: string; signerAddress: string; error?: unknown }>;

export async function escrowClient(publicKey: string, signTransaction: SignFn) {
  return contract.Client.from<TuitioEscrow>({
    contractId: env.escrowContract,
    rpcUrl: env.rpcUrl,
    networkPassphrase: env.networkPassphrase,
    publicKey,
    signTransaction: signTransaction as never,
  });
}

export async function registryClient(publicKey: string, signTransaction: SignFn) {
  return contract.Client.from<TuitioRegistry>({
    contractId: env.registryContract,
    rpcUrl: env.rpcUrl,
    networkPassphrase: env.networkPassphrase,
    publicKey,
    signTransaction: signTransaction as never,
  });
}
