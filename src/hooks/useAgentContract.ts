'use client'

import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { Program, AnchorProvider, BN } from '@coral-xyz/anchor'
import { useMemo, useCallback, useState } from 'react'
import { IDL } from '@/lib/idl/agent_marketplace'
import { PROGRAM_ID, TREASURY_WALLET, getMarketplacePDA, getAgentPDA, getRequestPDA } from '@/lib/contracts'

// Main hook to get the Anchor program instance
export function useProgram() {
  const { connection } = useConnection()
  const wallet = useWallet()

  const program = useMemo(() => {
    if (!wallet.publicKey || !wallet.signTransaction) return null

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    )

    return new Program(IDL as any, provider)
  }, [connection, wallet])

  return program
}

// Hook to create/register an agent
export function useCreateAgent() {
  const program = useProgram()
  const wallet = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const createAgent = useCallback(
    async (
      name: string,
      specialization: string,
      aiModel: string,
      metadataUri: string,
      priceInSol: number,
      endpointUrl: string,
    ) => {
      if (!program || !wallet.publicKey) return
      setIsPending(true)
      setError(null)

      try {
        const [marketplacePDA] = getMarketplacePDA()
        const marketplace = await (program.account as any).marketplace.fetch(marketplacePDA)
        const agentId = marketplace.totalAgents.toNumber()
        const [agentPDA] = getAgentPDA(agentId)

        const priceLamports = Math.floor(priceInSol * LAMPORTS_PER_SOL)

        const tx = await (program.methods as any)
          .createAgent(name, specialization, aiModel, metadataUri, new BN(priceLamports), endpointUrl)
          .accounts({
            agent: agentPDA,
            marketplace: marketplacePDA,
            owner: wallet.publicKey,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        setTxHash(tx)
        return tx
      } catch (err: any) {
        setError(err)
        throw err
      } finally {
        setIsPending(false)
      }
    },
    [program, wallet]
  )

  return { createAgent, isPending, error, txHash }
}

// Hook to send a request to an agent (pays in SOL)
// Payment: 95% to creator wallet, 5% to treasury (8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP)
export function useCreateRequest() {
  const program = useProgram()
  const wallet = useWallet()
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [txHash, setTxHash] = useState<string | null>(null)

  const createRequest = useCallback(
    async (agentId: number, prompt: string) => {
      if (!program || !wallet.publicKey) return
      setIsPending(true)
      setError(null)

      try {
        const [marketplacePDA] = getMarketplacePDA()
        const marketplace = await (program.account as any).marketplace.fetch(marketplacePDA)
        const requestId = marketplace.totalRequests.toNumber()
        const [requestPDA] = getRequestPDA(requestId)
        const [agentPDA] = getAgentPDA(agentId)

        const agent = await (program.account as any).agent.fetch(agentPDA)

        const tx = await (program.methods as any)
          .createRequest(prompt)
          .accounts({
            request: requestPDA,
            agent: agentPDA,
            agentMut: agentPDA,
            marketplace: marketplacePDA,
            user: wallet.publicKey,
            agentOwner: agent.owner,
            treasury: TREASURY_WALLET,
            systemProgram: SystemProgram.programId,
          })
          .rpc()

        setTxHash(tx)
        return tx
      } catch (err: any) {
        setError(err)
        throw err
      } finally {
        setIsPending(false)
      }
    },
    [program, wallet]
  )

  return { createRequest, isPending, error, txHash }
}

// Hook to rate an agent
export function useRateAgent() {
  const program = useProgram()
  const wallet = useWallet()
  const [isPending, setIsPending] = useState(false)

  const rateAgent = useCallback(
    async (agentId: number, rating: number) => {
      if (!program || !wallet.publicKey) return
      setIsPending(true)

      try {
        const [agentPDA] = getAgentPDA(agentId)

        const tx = await (program.methods as any)
          .rateAgent(rating)
          .accounts({
            agent: agentPDA,
            rater: wallet.publicKey,
          })
          .rpc()

        return tx
      } finally {
        setIsPending(false)
      }
    },
    [program, wallet]
  )

  return { rateAgent, isPending }
}

// Hook to fetch all agents
export function useFetchAgents() {
  const program = useProgram()

  const fetchAgents = useCallback(async () => {
    if (!program) return []

    const agents = await (program.account as any).agent.all()
    return agents.map((a: any) => ({
      publicKey: a.publicKey.toBase58(),
      owner: a.account.owner.toBase58(),
      agentId: a.account.agentId.toNumber(),
      name: a.account.name,
      specialization: a.account.specialization,
      aiModel: a.account.aiModel,
      endpointUrl: a.account.endpointUrl,
      pricePerRequest: a.account.pricePerRequest.toNumber(),
      priceSol: a.account.pricePerRequest.toNumber() / LAMPORTS_PER_SOL,
      totalRequests: a.account.totalRequests.toNumber(),
      totalEarnings: a.account.totalEarnings.toNumber(),
      totalEarningsSol: a.account.totalEarnings.toNumber() / LAMPORTS_PER_SOL,
      ratingSum: a.account.ratingSum.toNumber(),
      ratingCount: a.account.ratingCount.toNumber(),
      isActive: a.account.isActive,
      createdAt: a.account.createdAt.toNumber(),
      rating: a.account.ratingCount.toNumber() > 0
        ? (a.account.ratingSum.toNumber() / a.account.ratingCount.toNumber()).toFixed(1)
        : '0.0',
    }))
  }, [program])

  return { fetchAgents }
}

// Hook to get SOL balance
export function useSolBalance() {
  const { connection } = useConnection()
  const wallet = useWallet()
  const [balance, setBalance] = useState<number>(0)

  const fetchBalance = useCallback(async () => {
    if (!wallet.publicKey) return 0
    const lamports = await connection.getBalance(wallet.publicKey)
    const sol = lamports / LAMPORTS_PER_SOL
    setBalance(sol)
    return sol
  }, [connection, wallet])

  return { balance, fetchBalance }
}
