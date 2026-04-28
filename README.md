# Ritual Private ChatGPT

Your private onchain AI assistant — powered by **Ritual Chain Persistent Agent** infrastructure.

This is **not** an offchain ChatGPT wrapper. It is designed as an onchain Ritual agent app where:

- **Default mode**: Uses the **Persistent Agent precompile (0x0820)** for long-lived, monitored agent instances with identity, memory, and recoverability
- **Async lifecycle**: Every prompt goes through Ritual's 9-state async transaction flow (submitting → committed → executor processing → settled)
- **TEE-verified**: All AI inference runs inside hardware-isolated TEE enclaves on Ritual Chain's executor network
- **Onchain state**: Agent metadata, prompt history, and responses are stored on-chain

## How It Works

### Persistent Agent Flow

1. User connects wallet (MetaMask, WalletConnect, etc.)
2. User configures agent (name, provider, model, system prompt)
3. Frontend calls **PersistentAgentFactory (0xD4AA9D...)** to deploy a new agent instance
4. Deployed agent is registered in the **ChatGPTAgent** consumer contract via `registerAgent()`
5. User sends a prompt → frontend generates a deterministic `jobId` and calls `submitPrompt()`
6. The LLM precompile (0x0802) processes the prompt asynchronously
7. **AsyncDelivery (0x5A16...)** delivers the result via `onAgentResult()` callback
8. Frontend receives the `AgentResponseDelivered` event and displays the response

### Architecture

```
User Wallet ──▶ Frontend (Next.js + wagmi)
                    │
                    ├──▶ PersistentAgentFactory (0xD4AA9D...)
                    │       └── Deploys agent instance
                    │
                    ├──▶ ChatGPTAgent Consumer Contract
                    │       ├── registerAgent() — store metadata
                    │       ├── submitPrompt() — record prompt intent
                    │       └── onAgentResult() — callback from AsyncDelivery
                    │
                    └──▶ LLM Precompile (0x0802)
                            └── Async prompt processing in TEE
```

## Tech Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Blockchain**: wagmi v2, viem v2, RainbowKit
- **Contracts**: Solidity 0.8.20, Foundry
- **State**: Zustand with persist middleware

## Prerequisites

- Node.js 18+
- Foundry (for contract development)
- MetaMask or any WalletConnect-compatible wallet
- Testnet RITUAL tokens from [faucet.ritualfoundation.org](https://faucet.ritualfoundation.org)
- WalletConnect Project ID from [cloud.walletconnect.com](https://cloud.walletconnect.com)

## Setup

### 1. Clone and Install

```bash
git clone <repo-url> ritual-private-chatgpt
cd ritual-private-chatgpt
npm install
```

### 2. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` with:
- `NEXT_PUBLIC_WC_PROJECT_ID` — get from WalletConnect Cloud
- `NEXT_PUBLIC_CONSUMER_CONTRACT` — set after deploying (see below)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Smart Contracts

### ChatGPTAgent

The consumer contract at `contracts/src/ChatGPTAgent.sol` manages:

- **Agent registration**: Stores name, provider, model, system prompt
- **Prompt submission**: Records prompt intent, emits lifecycle events
- **Async callbacks**: Receives agent responses from AsyncDelivery, stores results

### Events

| Event | Description |
|-------|-------------|
| `AgentCreated` | New persistent agent registered |
| `PromptSubmitted` | User prompt recorded |
| `JobCreated` | Async job created for prompt processing |
| `AgentResponseDelivered` | Agent response delivered via callback |
| `AgentError` | Error during agent processing |

### Deploy to Ritual Testnet

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
forge build
forge script script/Deploy.s.sol --rpc-url ritual --broadcast -vv
```

After deployment, set the address in `.env.local`:
```
NEXT_PUBLIC_CONSUMER_CONTRACT=0x<deployed-address>
```

### Run Tests

```bash
cd contracts
forge test -vv
```

## Ritual Testnet Details

| Parameter | Value |
|-----------|-------|
| Chain Name | Ritual Testnet |
| Chain ID | 1979 |
| Native Currency | RITUAL (18 decimals) |
| HTTP RPC | https://rpc.ritualfoundation.org |
| WebSocket RPC | wss://rpc.ritualfoundation.org/ws |
| Explorer | https://explorer.ritualfoundation.org |
| Faucet | https://faucet.ritualfoundation.org |

### System Contract Addresses

| Contract | Address |
|----------|---------|
| RitualWallet | `0x532F0dF0896F353d8C3DD8cc134e8129DA2a3948` |
| AsyncJobTracker | `0xC069FFCa0389f44eCA2C626e55491b0ab045AEF5` |
| TEEServiceRegistry | `0x9644e8562cE0Fe12b4deeC4163c064A8862Bf47F` |
| AsyncDelivery | `0x5A16214fF555848411544b005f7Ac063742f39F6` |
| Scheduler | `0x56e776BAE2DD60664b69Bd5F865F1180ffB7D58B` |
| PersistentAgentFactory | `0xD4AA9D55215dc8149Af57605e70921Ea16b73591` |
| SovereignAgentFactory | `0x9dC4C054e53bCc4Ce0A0Ff09E890A7a8e817f304` |

### Precompile Addresses

| Precompile | Address |
|------------|---------|
| HTTP Call | `0x0000...0801` |
| LLM Inference | `0x0000...0802` |
| Persistent Agent | `0x0000...0820` |
| Sovereign Agent | `0x0000...080C` |

## Async Transaction Lifecycle

Ritual precompile calls pass through up to 9 states:

```
SUBMITTING → PENDING_COMMITMENT → COMMITTED → EXECUTOR_PROCESSING
→ RESULT_READY → PENDING_SETTLEMENT → SETTLED
```

Terminal states: `SETTLED`, `FAILED`, `EXPIRED`

Each state maps to specific on-chain events from `AsyncJobTracker`:
- `JobAdded` → COMMITTED
- `Phase1Settled` → RESULT_READY (long-running only)
- `ResultDelivered(success=true)` → SETTLED
- `ResultDelivered(success=false)` → FAILED

## Scripts

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm start            # Start production server
```

## Design

- **Background**: `#F5F0E8` (warm paper-like)
- **Buttons**: `#2F795A` with white text
- **Text**: Black
- **Layout**: Clean, minimal, responsive (desktop 3-col grid / mobile tabs)
- **No dark mode**: Light theme only

## Security Notes

- API keys are never stored in frontend localStorage in plain text
- Secret API keys must be encrypted via ECIES to the TEE executor's public key
- The `onAgentResult` callback is guarded by `msg.sender == ASYNC_DELIVERY`
- Contract ownership controls agent creation and management

## License

MIT
