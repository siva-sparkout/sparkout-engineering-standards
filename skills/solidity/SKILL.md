---
name: solidity-standard
description: Use when writing, reviewing, or modifying Solidity or EVM smart contract code. Enforces the Solidity Engineering Standard v2.0 — implementation locking, token transfer safety, reentrancy, access control, rounding, oracles, signatures and upgrade safety.
---

# Solidity Standard

Apply to **new and changed code**. Do not retrofit existing code unless asked.
**The artifact is immutable and holds value from the moment it is deployed.** A rule here is not a style preference.

## The ten that prevent losses

**1. Lock every implementation.** An upgradeable implementation disables its own initializers in its constructor. Without it, anyone can call `initialize()` on the implementation directly and take ownership of it.

```solidity
/// @custom:oz-upgrades-unsafe-allow constructor
constructor() { _disableInitializers(); }
```

`_authorizeUpgrade` is implemented and restricted. An empty, unguarded one is upgradeable by anyone.

**2. Check every token transfer.** Use `SafeERC20`. Some tokens return `false` instead of reverting; some return nothing, which makes a bare call succeed against a non-contract address.

```solidity
token.transfer(to, amount);        // ❌
token.safeTransfer(to, amount);    // ✅
```

Where fee-on-transfer tokens are supported, credit the **observed balance delta**, not the requested amount.

**3. Never let the caller choose `from`.** A `transferFrom` whose `from` comes from calldata drains every user who has granted an allowance.

```solidity
function deposit(address from, uint256 amount) external {           // ❌
    token.safeTransferFrom(from, address(this), amount);
}
function deposit(uint256 amount) external {                         // ✅
    token.safeTransferFrom(msg.sender, address(this), amount);
}
```

**4. Checks, effects, interactions — and a guard.** State is updated before any external call. Any external call can reenter: token transfers, ETH sends, hooks, receiver callbacks, oracle reads. Add `nonReentrant` where cross-function or callback reentrancy remains possible. Read-only reentrancy counts. Prefer pull over push where a failing receiver could block global progress.

**5. Authorisation is a role.** Never `tx.origin`. Separate upgrade, pause, configuration, treasury, settlement and oracle powers when blast radius differs — one `onlyOwner` over all of them means one key loss is total. Ownership transfers are two-step. Route guards, frontend restrictions, `private` functions and obscure calldata are never authorisation. Tests enumerate every role and prove an unauthorised caller reverts on every privileged entry point.

**6. Rounding has a direction, always against the user.** A deposit/mint and withdraw/redeem pair cannot be rounded so that cycling extracts value. Use full-precision `mulDiv` where intermediate multiplication can overflow or truncation is material. `unchecked` carries a proven bound and focused tests — never used for style. Every amount has a defined unit and decimal scale at every boundary.

**7. Validate every oracle read.** Freshness, decimals, sign and range, round completeness, sequencer status.

```solidity
(uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = feed.latestRoundData();
if (price <= 0) revert InvalidPrice();
if (answeredInRound < roundId) revert StaleRound();
if (block.timestamp - updatedAt > MAX_STALENESS) revert PriceTooOld();
```

A spot price from a manipulable pool is never a trusted oracle without a manipulation-cost analysis — a flash loan makes it free to move. Stale, zero, negative, extreme or unavailable data has an explicit fail-closed, fallback or pause behaviour. User trades carry amount bounds, slippage protection and deadlines.

**8. Signatures bind everything; nonces are single-use.** A typed signature binds chain id, domain, verifying contract, action, every security-relevant parameter, a nonce and a deadline. The nonce is consumed before or atomically with the action. **A relayer cannot substitute recipient, amount, fee, token, market, calldata or deadline** — anything omitted from the signed payload is something the relayer chooses. Reject malleable signatures; use a vetted library, never raw `ecrecover`.

**9. No unbounded loop on a liveness-critical path.** An array a user can grow becomes a permanent denial of service once iterating it exceeds the block gas limit. Use pull settlement — each account claims its own.

**10. Nothing on chain is private or random.** `private` restricts Solidity access, not storage reads. `block.timestamp`, `blockhash`, `prevrandao` and transaction ordering are never secure randomness.

## Also never

- Storage reordering or type replacement in an upgrade. Layout compatibility is machine-checked every time.
- Initializers that are not idempotence-protected, or that skip an inherited initializer.
- `selfdestruct`, `delegatecall`, assembly, transient storage or experimental opcodes without documented necessity, target-chain analysis and tests.
- Unvalidated low-level `call` / `staticcall` / `delegatecall` results and returndata.
- A rescue function that can extract user liabilities, collateral, claimable rewards or protocol-owned assets.
- Copying unaudited snippets for cryptography, fixed-point math, signatures, proxies, Merkle proofs or token transfers.
- Claiming a contract is safe, audited or vulnerability-free. State tool limitations and unverified assumptions.

## Always

- SPDX identifier and a compatible pragma on every production file. Explicit state visibility.
- Custom errors for stable failure categories. Events let an indexer reconstruct state transitions; event data and state cannot disagree about amounts, recipients, IDs or status.
- Enums or explicit state machines for lifecycle phases — never inferred from several loosely related booleans.
- Every state transition defines caller, preconditions, effects, interactions, events, replay behaviour and recovery path.
- Non-obvious financial formulas document derivation, units, rounding direction, valid domain and precision bound.
- Names encode unit or domain where ambiguity can lose funds: `collateralAmount`, `feeBps`, `deadlineTimestamp`, `priceWad`.
- A bug fix includes a test that fails on the vulnerable revision and passes with the fix.
- Solvency, conservation and no-free-profit properties expressed as **executable invariants**.
- Tests cover zero, one unit, minimum, maximum, exact division, one below and above a boundary, repeated operations, skewed reserves and decimal mismatch.
- Adversarial mocks: reentrant, reverting, gas-griefing, non-returning, false-returning, fee-on-transfer, rebasing and callback tokens.

## Before you finish

1. Is every privileged path protected by the correct role — including initializer, upgrade, pause, oracle, mint, burn, sweep, settlement?
2. Can any role escalate itself, bypass delay, seize user assets, or permanently freeze the system?
3. Do assets, liabilities, shares, supply, fees and reserves reconcile after every path?
4. Can zero, dust, donation, first deposit, repeated rounding or maximum values create free value or insolvency?
5. Can any call, token, hook, receiver, oracle or callback reenter or fail unexpectedly?
6. Is every `unchecked` block proven safe?
7. Is replay impossible across users, actions, contracts, chains and upgrades?
8. Is the implementation locked and storage layout machine-checked?

Coverage is a gap detector; high coverage with weak assertions is not a pass. Static-analysis output is evidence requiring triage, not proof.

Full rule set, review checklist and PR template: **Solidity Engineering Standard v2.0**.
