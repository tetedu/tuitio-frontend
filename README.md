<p align="center">
  <img src="banner.svg" alt="Tuitio" width="480">
</p>

# Tuitio · Frontend

[![CI](https://github.com/adelekevictor12/tuitio-frontend/actions/workflows/ci.yml/badge.svg)](https://github.com/adelekevictor12/tuitio-frontend/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache--2.0-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](package.json)

**Next.js web app for the Tuitio protocol.** Sponsors fund tuition grants,
institutions attest completed terms, and every state change lands on-chain
through the Soroban contracts via a Freighter wallet.

## Pages

- **Dashboard** — protocol stats, grants with escrowed amounts, live activity
  feed from the indexer.
- **Grant detail** — per-term timeline (pending → attested → released /
  disputed → refunded) with role-gated actions: the institution attests, the
  sponsor disputes or cancels, and release is permissionless once the dispute
  window closes.
- **Institutions** — registered schools with verification status.
- **Fund a grant** — the sponsor flow: pick a verified institution, name the
  student, set per-term amount and term count; the full commitment transfers
  into escrow on submission.

Writes go through the stellar-sdk contract `Client` with Freighter as the
signer; reads come from the [`tuitio-backend`](https://github.com/adelekevictor12/tuitio-backend) REST API.

## Quick start

```bash
pnpm install
cp .env.example .env.local   # point NEXT_PUBLIC_API_URL at the backend
pnpm dev
```

For an instant local demo without provisioning anything, run the backend's
devstack first (`go run ./cmd/devstack` in tuitio-backend), then this app with
`NEXT_PUBLIC_API_URL=http://localhost:8080`.

Wallet actions need the [Freighter](https://freighter.app) extension on
Stellar testnet. The wallet must hold the tuition token (wrapped XLM via the
SAC on testnet).

## Configuration

See [.env.example](.env.example): backend API URL, RPC URL, network
passphrase, deployed contract addresses, and the demo token contract/symbol.

## Related repositories

- [`tuitio-contract`](https://github.com/adelekevictor12/tuitio-contract) — the Soroban contracts (Rust)
- [`tuitio-backend`](https://github.com/adelekevictor12/tuitio-backend) — Go indexer and REST API

## Maintainers

| Name | Role | Contact |
|---|---|---|
| [adelekevictor12](https://github.com/adelekevictor12) | Maintainer | adelekevat@gmail.com |

## Contributing

Issues labeled `Stellar Wave` are part of the [Drips Wave](https://www.drips.network/wave/stellar)
program and carry point values. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0. See [LICENSE](LICENSE).
