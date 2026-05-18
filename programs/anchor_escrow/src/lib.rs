pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("cDksAmQ5ADEPLgHqz1PNPHuHJkApfKrGQAzsPfcAcXd");
#[program]
pub mod anchor_escrow {
    use crate::error::EscrowError;

    use super::*;

    #[instruction(discriminator = 0)]
    pub fn make(
        ctx: Context<Make>,
        seed: u64,
        receive: u64,
        deposit: u64,
        duration: i64,
    ) -> Result<()> {
        ctx.accounts
            .init_escrow(seed, receive, duration, &ctx.bumps)?;
        ctx.accounts.deposit_to_vault(deposit)
    }

    #[instruction(discriminator = 1)]
    pub fn take(ctx: Context<Take>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;

        require!(
            now <= ctx.accounts.escrow.expires_at,
            EscrowError::EscrowExpired
        );

        ctx.accounts.deposit()?;
        ctx.accounts.withdraw_and_close_vault()
    }

    #[instruction(discriminator = 2)]
    pub fn refund(ctx: Context<Refund>) -> Result<()> {
        ctx.accounts.refund_and_close_vault()
    }
}