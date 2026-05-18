import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AnchorEscrow } from "../target/types/anchor_escrow";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Keypair, PublicKey } from "@solana/web3.js";
import {BN} from "bn.js";
import { randomBytes } from "crypto";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createMint,
  getAssociatedTokenAddressSync,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
// import { SYSTEM_PROGRAM_ID } from "@anchor-lang/core/dist/cjs/native/system";
import { SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
const SYSTEM_PROGRAM_ID = SystemProgram.programId;
import { expect } from "chai";

const commitment = "confirmed";

describe("anchor-escrow", () => {
  async function confirmTx(signature: string) {
    const latestBlockHash = await connection.getLatestBlockhash();

    await connection.confirmTransaction(
      {
        signature,
        ...latestBlockHash,
      },
      commitment,
    );
  }

  function confirmTxs(signatures: string[]) {
    return Promise.all(signatures.map(confirmTx));
  }

  async function getOrCreateAtaAddress(
    payer: Keypair,
    mint: PublicKey,
    owner: PublicKey,
  ) {
    const ata = await getOrCreateAssociatedTokenAccount(
      connection,
      payer,
      mint,
      owner,
    );

    return ata.address;
  }

  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const program = anchor.workspace.anchorEscrow as Program<AnchorEscrow>;

  const connection = provider.connection;

  const payer = provider.wallet as NodeWallet;

  const taker = Keypair.generate();
  console.log("Program ID:", program.programId.toBase58());
  let mintA: PublicKey;
  let mintB: PublicKey;

  let makerAtaA: PublicKey;
  let makerAtaB: PublicKey;

  let takerAtaA: PublicKey;
  let takerAtaB: PublicKey;

  let vault: PublicKey;

  const seed = new BN(randomBytes(8));

  const escrow = PublicKey.findProgramAddressSync(
    [Buffer.from("escrow"), payer.publicKey.toBuffer(), seed.toBuffer("le", 8)],
    program.programId,
  )[0];

  it("should request airdrops for payer and taker", async () => {
    const requests = [payer, taker].map(async (k) => {
      return await connection.requestAirdrop(
        k.publicKey,
        100 * anchor.web3.LAMPORTS_PER_SOL,
      );
    });

    await Promise.all(requests).then(confirmTxs);
  });

  it("Mint tokens to maker and taker", async () => {
    mintA = await createMint(
      connection,
      payer.payer,
      provider.publicKey,
      provider.publicKey,
      6,
    );

    console.log("Mint A:", mintA.toBase58());

    mintB = await createMint(
      connection,
      payer.payer,
      provider.publicKey,
      provider.publicKey,
      6,
    );

    console.log("Mint B:", mintB.toBase58());

    vault = getAssociatedTokenAddressSync(mintA, escrow, true);

    makerAtaA = await getOrCreateAtaAddress(
      payer.payer,
      mintA,
      provider.publicKey,
    );

    makerAtaB = await getOrCreateAtaAddress(
      payer.payer,
      mintB,
      provider.publicKey,
    );

    takerAtaA = await getOrCreateAtaAddress(
      payer.payer,
      mintA,
      taker.publicKey,
    );

    takerAtaB = await getOrCreateAtaAddress(
      payer.payer,
      mintB,
      taker.publicKey,
    );

    await mintTo(
      connection,
      payer.payer,
      mintA,
      makerAtaA,
      payer.payer,
      1000_000_000,
    );

    console.log("Minted 1000 token to MakerataA", makerAtaA.toBase58());
    await mintTo(
      connection,
      payer.payer,
      mintB,
      takerAtaB,
      payer.payer,
      1000_000_000,
    );

    console.log("Minted 1000 token to MakerataB", takerAtaB.toBase58());
  });

  it("Make", async () => {
    const initializeMakerAtaBalance = await connection.getTokenAccountBalance(
      makerAtaA,
    );

    console.log(
      "initial makerAta balance:",
      initializeMakerAtaBalance.value.amount,
    );

    const expiresInFiveSeconds = new BN(2);

    const tx = await program.methods
      .make(seed, new BN(1_000_000), new BN(1_000_000), expiresInFiveSeconds)
      .accountsStrict({
        maker: payer.publicKey,
        mintA: mintA,
        mintB: mintB,
        makerAtaA: makerAtaA,
        escrow: escrow,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SYSTEM_PROGRAM_ID,
      })
      .rpc();

    await confirmTx(tx);

    const finalVaultBalance = await connection.getTokenAccountBalance(vault);
    console.log("final vault balance:", finalVaultBalance.value.amount);

    const finalMakerAtaBalance = await connection.getTokenAccountBalance(
      makerAtaA,
    );
    console.log("final makerAta balance:", finalMakerAtaBalance.value.amount);

    console.log("Make Tx:", tx);
  });

  xit("Take", async () => {
    const initializeTakerAtaBalance = await connection.getTokenAccountBalance(
      takerAtaA,
    );

    console.log(
      "initial takerAta balance:",
      initializeTakerAtaBalance.value.amount,
    );

    const tx = await program.methods
      .take()
      .accountsStrict({
        taker: taker.publicKey,
        maker: payer.publicKey,
        takerAtaA: takerAtaA,
        takerAtaB: takerAtaB,
        mintA: mintA,
        mintB: mintB,
        escrow: escrow,
        makerAtaA: makerAtaA,
        makerAtaB: makerAtaB,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SYSTEM_PROGRAM_ID,
      })
      .signers([taker])
      .rpc();

    await confirmTx(tx);

    expect(await connection.getBalance(vault)).to.equal(0);

    const vaultStateInfo = await connection.getAccountInfo(vault);
    expect(vaultStateInfo).to.be.null;

    console.log("Take Tx:", tx);
  });

  it("take should fail if executed after an expiratin time", async () => {
    await new Promise((resolve) => setTimeout(resolve, 5000));

    try {
      await program.methods
        .take()
        .accountsStrict({
          taker: taker.publicKey,
          maker: payer.publicKey,
          takerAtaA: takerAtaA,
          takerAtaB: takerAtaB,
          mintA: mintA,
          mintB: mintB,
          escrow: escrow,
          makerAtaA: makerAtaA,
          makerAtaB: makerAtaB,
          vault: vault,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SYSTEM_PROGRAM_ID,
        })
        .signers([taker])
        .rpc();
    } catch (error:any) {
      expect(error.message).to.include("Escrow has been expired");
    }
  });

  xit("Refund", async () => {
    const tx = await program.methods
      .refund()
      .accountsStrict({
        maker: payer.publicKey,
        escrow: escrow,
        makerAtaA: makerAtaA,
        mintA: mintA,
        vault: vault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SYSTEM_PROGRAM_ID,
      })
      .rpc();

    await confirmTx(tx);

    expect(await connection.getBalance(vault)).to.equal(0);

    const vaultStateInfo = await connection.getAccountInfo(vault);
    expect(vaultStateInfo).to.be.null;

    console.log("Refund Tx:", tx);
  });
});
