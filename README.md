# Anchor Escrow

A decentralized escrow program built on Solana using the Anchor framework.

This project implements a secure SPL token escrow mechanism using Program Derived Addresses (PDAs) and Cross Program Invocations (CPIs). The escrow flow allows two parties to exchange tokens without requiring trust between them.

---

# Architecture

The program is modularized into separate instruction handlers for better scalability and maintainability.

* `make.rs` → Creates and initializes escrow
* `take.rs` → Executes token exchange
* `refund.rs` → Cancels escrow and refunds assets

The escrow vault is controlled using PDA authorities to ensure secure custody of tokens during the trade lifecycle.

---

# Project Structure

```bash
myproject/
│
├── app/
├── migrations/
├── node_modules/
│
├── programs/
│   └── anchor_escrow/
│       ├── src/
│       │   ├── instructions/
│       │   │   ├── make.rs
│       │   │   ├── refund.rs
│       │   │   └── take.rs
│       │   │
│       │   ├── constants.rs
│       │   ├── error.rs
│       │   ├── instructions.rs
│       │   ├── lib.rs
│       │   └── state.rs
│       │
│       └── Cargo.toml
│
├── target/
├── test-ledger/
│
├── tests/
│   └── myproject.ts
│
├── .gitignore
├── .prettierignore
├── Anchor.toml
├── Cargo.lock
├── Cargo.toml
├── package-lock.json
└── package.json
```

---

# Features

* Secure SPL token escrow
* PDA-controlled token vaults
* Escrow initialization
* Token exchange execution
* Escrow refund mechanism
* Modular instruction architecture
* Anchor framework integration
* TypeScript test suite

---

# Core Concepts

## Program Derived Addresses (PDAs)

PDAs are deterministic accounts controlled by the program rather than private keys.

Used for:

* Vault authority
* Escrow state management
* Secure asset custody

## Cross Program Invocation (CPI)

The program interacts with the SPL Token Program for:

* Token transfers
* Vault operations
* Token account management

## Escrow State

The escrow account stores:

* Initializer information
* Token mint details
* Deposit amount
* Expected amount
* Vault metadata

---

# Escrow Flow

## 1. Make Escrow

The initializer:

* Creates escrow state
* Deposits Token A into PDA vault
* Defines expected Token B amount

## 2. Take Escrow

The taker:

* Transfers Token B to initializer
* Receives Token A from vault
* Closes escrow account

## 3. Refund Escrow

If no taker accepts the trade:

* Initializer can reclaim deposited tokens
* Vault gets closed
* Escrow state is removed

---

# Requirements

Install the following dependencies before running the project:

* Rust
* Solana CLI
* Anchor Framework
* Node.js

Verify installations:

```bash
rustc --version
solana --version
anchor --version
node --version
```

---

# Installation

Clone the repository:

```bash
git clone https://github.com/sahkunal/anchor_escrow_k.git
cd anchor_escrow_k
```

Install dependencies:

```bash
npm install
```

---

# Build

Compile the program:

```bash
anchor build
```

---

# Local Validator

Run Solana local validator:

```bash
solana-test-validator
```

Configure localhost cluster:

```bash
solana config set --url localhost
```

---

# Deploy

Deploy the program locally:

```bash
anchor deploy
```

---

# Testing

Run Anchor tests:

```bash
anchor test
```

---

# Development Notes

The project follows Anchor's modular instruction design pattern:

* Instruction handlers separated into dedicated files
* Shared account state managed centrally
* Error handling abstracted into `error.rs`
* Constants isolated for maintainability

This structure improves:

* Readability
* Scalability
* Auditability
* Instruction isolation

---

# Useful Commands

Check Solana configuration:

```bash
solana config get
```

Request local airdrop:

```bash
solana airdrop 2
```

Clean build artifacts:

```bash
anchor clean
```

---

# Tech Stack

* Solana
* Anchor Framework
* Rust
* SPL Token Program
* TypeScript
* Mocha

---

# Author

Kunal

GitHub: [https://github.com/sahkunal](https://github.com/sahkunal)
