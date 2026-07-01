use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("AGTx1111111111111111111111111111111111111111");

// Platform treasury wallet - menerima 5% fee setiap transaksi
pub const TREASURY: &str = "8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP";

#[program]
pub mod agent_marketplace {
    use super::*;

    /// Initialize the marketplace
    pub fn initialize(ctx: Context<Initialize>, platform_fee_bps: u16) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.treasury = ctx.accounts.treasury.key();
        marketplace.platform_fee_bps = platform_fee_bps;
        marketplace.total_agents = 0;
        marketplace.total_requests = 0;
        marketplace.total_volume = 0;
        marketplace.bump = ctx.bumps.marketplace;
        Ok(())
    }

    /// Create a new AI Agent (creator registers their hosted agent)
    pub fn create_agent(
        ctx: Context<CreateAgent>,
        name: String,
        specialization: String,
        ai_model: String,
        metadata_uri: String,
        price_per_request: u64,
        endpoint_url: String,
    ) -> Result<()> {
        require!(name.len() <= 32, AgentError::NameTooLong);
        require!(specialization.len() <= 32, AgentError::SpecializationTooLong);
        require!(endpoint_url.len() <= 200, AgentError::EndpointTooLong);
        require!(price_per_request > 0, AgentError::InvalidPrice);

        let agent = &mut ctx.accounts.agent;
        let marketplace = &mut ctx.accounts.marketplace;

        agent.owner = ctx.accounts.owner.key();
        agent.agent_id = marketplace.total_agents;
        agent.name = name;
        agent.specialization = specialization;
        agent.ai_model = ai_model;
        agent.metadata_uri = metadata_uri;
        agent.endpoint_url = endpoint_url;
        agent.price_per_request = price_per_request;
        agent.total_requests = 0;
        agent.total_earnings = 0;
        agent.rating_sum = 0;
        agent.rating_count = 0;
        agent.total_staked = 0;
        agent.is_active = true;
        agent.created_at = Clock::get()?.unix_timestamp;
        agent.bump = ctx.bumps.agent;

        marketplace.total_agents += 1;

        emit!(AgentCreated {
            agent_id: agent.agent_id,
            owner: agent.owner,
            name: agent.name.clone(),
            specialization: agent.specialization.clone(),
            endpoint_url: agent.endpoint_url.clone(),
        });

        Ok(())
    }

    /// Submit a request to an AI Agent - pays in SOL
    /// Payment split: 95% to agent creator, 5% to platform treasury
    pub fn create_request(
        ctx: Context<CreateRequest>,
        prompt: String,
    ) -> Result<()> {
        let agent = &ctx.accounts.agent;
        let marketplace = &ctx.accounts.marketplace;

        require!(agent.is_active, AgentError::AgentNotActive);
        require!(prompt.len() <= 512, AgentError::PromptTooLong);

        let price = agent.price_per_request;

        // Calculate fee split
        let platform_fee = (price * marketplace.platform_fee_bps as u64) / 10000;
        let creator_share = price - platform_fee;

        // Transfer SOL from user to agent creator (95%)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.agent_owner.to_account_info(),
                },
            ),
            creator_share,
        )?;

        // Transfer SOL from user to platform treasury (5%)
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.treasury.to_account_info(),
                },
            ),
            platform_fee,
        )?;

        // Record the request
        let request = &mut ctx.accounts.request;
        let marketplace_mut = &mut ctx.accounts.marketplace;

        request.request_id = marketplace_mut.total_requests;
        request.agent_id = agent.agent_id;
        request.requester = ctx.accounts.user.key();
        request.amount = price;
        request.creator_share = creator_share;
        request.platform_fee = platform_fee;
        request.prompt = prompt;
        request.response_hash = String::new();
        request.status = RequestStatus::Pending;
        request.created_at = Clock::get()?.unix_timestamp;
        request.completed_at = 0;
        request.bump = ctx.bumps.request;

        marketplace_mut.total_requests += 1;
        marketplace_mut.total_volume += price;

        // Update agent stats
        let agent_mut = &mut ctx.accounts.agent_mut;
        agent_mut.total_requests += 1;
        agent_mut.total_earnings += creator_share;

        emit!(RequestCreated {
            request_id: request.request_id,
            agent_id: agent.agent_id,
            requester: request.requester,
            amount: price,
            creator_share,
            platform_fee,
        });

        Ok(())
    }

    /// Mark request as completed (stores response hash)
    pub fn complete_request(
        ctx: Context<CompleteRequest>,
        response_hash: String,
    ) -> Result<()> {
        let request = &mut ctx.accounts.request;

        require!(
            request.status == RequestStatus::Pending,
            AgentError::InvalidRequestStatus
        );

        request.status = RequestStatus::Completed;
        request.response_hash = response_hash;
        request.completed_at = Clock::get()?.unix_timestamp;

        emit!(RequestCompleted {
            request_id: request.request_id,
            agent_id: request.agent_id,
        });

        Ok(())
    }

    /// Rate an agent (1-5 stars)
    pub fn rate_agent(ctx: Context<RateAgent>, rating: u8) -> Result<()> {
        require!(rating >= 1 && rating <= 5, AgentError::InvalidRating);

        let agent = &mut ctx.accounts.agent;
        require!(ctx.accounts.rater.key() != agent.owner, AgentError::CannotRateSelf);

        agent.rating_sum += rating as u64;
        agent.rating_count += 1;

        emit!(AgentRated {
            agent_id: agent.agent_id,
            rater: ctx.accounts.rater.key(),
            rating,
        });

        Ok(())
    }

    /// Stake SOL on an agent to boost reputation
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount >= 10_000_000, AgentError::BelowMinStake); // Min 0.01 SOL

        // Transfer SOL from staker to stake vault PDA
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.staker.to_account_info(),
                    to: ctx.accounts.stake_vault.to_account_info(),
                },
            ),
            amount,
        )?;

        let stake_account = &mut ctx.accounts.stake_account;
        let agent = &mut ctx.accounts.agent;

        stake_account.staker = ctx.accounts.staker.key();
        stake_account.agent_id = agent.agent_id;
        stake_account.amount = amount;
        stake_account.staked_at = Clock::get()?.unix_timestamp;
        stake_account.is_active = true;
        stake_account.bump = ctx.bumps.stake_account;

        agent.total_staked += amount;

        emit!(Staked {
            staker: stake_account.staker,
            agent_id: agent.agent_id,
            amount,
        });

        Ok(())
    }

    /// Unstake SOL after lock period (7 days)
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        let stake_account = &mut ctx.accounts.stake_account;
        let agent = &mut ctx.accounts.agent;

        require!(stake_account.is_active, AgentError::StakeNotActive);

        let clock = Clock::get()?;
        let lock_period: i64 = 7 * 24 * 3600; // 7 days
        require!(
            clock.unix_timestamp >= stake_account.staked_at + lock_period,
            AgentError::StakeStillLocked
        );

        let amount = stake_account.amount;

        // Transfer SOL from vault back to staker
        let vault_lamports = ctx.accounts.stake_vault.lamports();
        require!(vault_lamports >= amount, AgentError::InsufficientFunds);

        **ctx.accounts.stake_vault.to_account_info().try_borrow_mut_lamports()? -= amount;
        **ctx.accounts.staker.to_account_info().try_borrow_mut_lamports()? += amount;

        agent.total_staked -= amount;
        stake_account.is_active = false;

        emit!(Unstaked {
            staker: stake_account.staker,
            agent_id: agent.agent_id,
            amount,
        });

        Ok(())
    }

    /// Toggle agent active status
    pub fn toggle_agent(ctx: Context<ToggleAgent>) -> Result<()> {
        let agent = &mut ctx.accounts.agent;
        agent.is_active = !agent.is_active;
        Ok(())
    }

    /// Update agent pricing
    pub fn update_pricing(ctx: Context<UpdateAgent>, new_price: u64) -> Result<()> {
        require!(new_price > 0, AgentError::InvalidPrice);
        let agent = &mut ctx.accounts.agent;
        agent.price_per_request = new_price;
        Ok(())
    }

    /// Update agent endpoint URL
    pub fn update_endpoint(ctx: Context<UpdateAgent>, new_endpoint: String) -> Result<()> {
        require!(new_endpoint.len() <= 200, AgentError::EndpointTooLong);
        let agent = &mut ctx.accounts.agent;
        agent.endpoint_url = new_endpoint;
        Ok(())
    }
}

// ========== ACCOUNTS ==========

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Marketplace::INIT_SPACE,
        seeds = [b"marketplace"],
        bump,
    )]
    pub marketplace: Account<'info, Marketplace>,
    /// CHECK: Treasury wallet address - receives platform fees
    #[account(constraint = treasury.key().to_string() == TREASURY)]
    pub treasury: AccountInfo<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateAgent<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Agent::INIT_SPACE,
        seeds = [b"agent", marketplace.total_agents.to_le_bytes().as_ref()],
        bump,
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut, seeds = [b"marketplace"], bump = marketplace.bump)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateRequest<'info> {
    #[account(
        init,
        payer = user,
        space = 8 + Request::INIT_SPACE,
        seeds = [b"request", marketplace.total_requests.to_le_bytes().as_ref()],
        bump,
    )]
    pub request: Account<'info, Request>,
    #[account(seeds = [b"agent", agent.agent_id.to_le_bytes().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    /// Mutable copy of agent for updating stats
    #[account(mut, seeds = [b"agent", agent.agent_id.to_le_bytes().as_ref()], bump = agent.bump)]
    pub agent_mut: Account<'info, Agent>,
    #[account(mut, seeds = [b"marketplace"], bump = marketplace.bump)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: Agent owner receives 95% payment
    #[account(mut, constraint = agent_owner.key() == agent.owner)]
    pub agent_owner: AccountInfo<'info>,
    /// CHECK: Platform treasury receives 5% fee
    #[account(mut, constraint = treasury.key() == marketplace.treasury)]
    pub treasury: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteRequest<'info> {
    #[account(mut)]
    pub request: Account<'info, Request>,
    #[account(seeds = [b"agent", request.agent_id.to_le_bytes().as_ref()], bump)]
    pub agent: Account<'info, Agent>,
    #[account(constraint = owner.key() == agent.owner)]
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct RateAgent<'info> {
    #[account(mut, seeds = [b"agent", agent.agent_id.to_le_bytes().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    pub rater: Signer<'info>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(
        init,
        payer = staker,
        space = 8 + StakeAccount::INIT_SPACE,
        seeds = [b"stake", staker.key().as_ref(), agent.agent_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(mut, seeds = [b"agent", agent.agent_id.to_le_bytes().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub staker: Signer<'info>,
    /// CHECK: Stake vault PDA holds staked SOL
    #[account(
        mut,
        seeds = [b"stake_vault", agent.agent_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub stake_vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(
        mut,
        seeds = [b"stake", staker.key().as_ref(), agent.agent_id.to_le_bytes().as_ref()],
        bump = stake_account.bump,
        constraint = stake_account.staker == staker.key(),
    )]
    pub stake_account: Account<'info, StakeAccount>,
    #[account(mut, seeds = [b"agent", agent.agent_id.to_le_bytes().as_ref()], bump = agent.bump)]
    pub agent: Account<'info, Agent>,
    #[account(mut)]
    pub staker: Signer<'info>,
    /// CHECK: Stake vault PDA
    #[account(
        mut,
        seeds = [b"stake_vault", agent.agent_id.to_le_bytes().as_ref()],
        bump,
    )]
    pub stake_vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ToggleAgent<'info> {
    #[account(mut, seeds = [b"agent", agent.agent_id.to_le_bytes().as_ref()], bump = agent.bump, has_one = owner)]
    pub agent: Account<'info, Agent>,
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct UpdateAgent<'info> {
    #[account(mut, seeds = [b"agent", agent.agent_id.to_le_bytes().as_ref()], bump = agent.bump, has_one = owner)]
    pub agent: Account<'info, Agent>,
    pub owner: Signer<'info>,
}

// ========== STATE ==========

#[account]
#[derive(InitSpace)]
pub struct Marketplace {
    pub authority: Pubkey,
    pub treasury: Pubkey,       // 8McdPygGbvCiZSfkMjNrbumUs2aR8SEHZUYc2SNo5bFP
    pub platform_fee_bps: u16,  // 500 = 5%
    pub total_agents: u64,
    pub total_requests: u64,
    pub total_volume: u64,      // Total SOL volume processed
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Agent {
    pub owner: Pubkey,
    pub agent_id: u64,
    #[max_len(32)]
    pub name: String,
    #[max_len(32)]
    pub specialization: String,
    #[max_len(32)]
    pub ai_model: String,
    #[max_len(200)]
    pub metadata_uri: String,
    #[max_len(200)]
    pub endpoint_url: String,       // Creator's AI endpoint
    pub price_per_request: u64,     // Price in lamports (SOL)
    pub total_requests: u64,
    pub total_earnings: u64,        // Total SOL earned by creator
    pub rating_sum: u64,
    pub rating_count: u64,
    pub total_staked: u64,
    pub is_active: bool,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Request {
    pub request_id: u64,
    pub agent_id: u64,
    pub requester: Pubkey,
    pub amount: u64,            // Total paid in lamports
    pub creator_share: u64,     // 95% to creator
    pub platform_fee: u64,      // 5% to treasury
    #[max_len(512)]
    pub prompt: String,
    #[max_len(64)]
    pub response_hash: String,
    pub status: RequestStatus,
    pub created_at: i64,
    pub completed_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StakeAccount {
    pub staker: Pubkey,
    pub agent_id: u64,
    pub amount: u64,            // Staked SOL in lamports
    pub staked_at: i64,
    pub is_active: bool,
    pub bump: u8,
}

// ========== ENUMS ==========

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum RequestStatus {
    Pending,
    Completed,
    Failed,
}

// ========== EVENTS ==========

#[event]
pub struct AgentCreated {
    pub agent_id: u64,
    pub owner: Pubkey,
    pub name: String,
    pub specialization: String,
    pub endpoint_url: String,
}

#[event]
pub struct RequestCreated {
    pub request_id: u64,
    pub agent_id: u64,
    pub requester: Pubkey,
    pub amount: u64,
    pub creator_share: u64,
    pub platform_fee: u64,
}

#[event]
pub struct RequestCompleted {
    pub request_id: u64,
    pub agent_id: u64,
}

#[event]
pub struct AgentRated {
    pub agent_id: u64,
    pub rater: Pubkey,
    pub rating: u8,
}

#[event]
pub struct Staked {
    pub staker: Pubkey,
    pub agent_id: u64,
    pub amount: u64,
}

#[event]
pub struct Unstaked {
    pub staker: Pubkey,
    pub agent_id: u64,
    pub amount: u64,
}

// ========== ERRORS ==========

#[error_code]
pub enum AgentError {
    #[msg("Agent name too long (max 32 chars)")]
    NameTooLong,
    #[msg("Specialization too long (max 32 chars)")]
    SpecializationTooLong,
    #[msg("Endpoint URL too long (max 200 chars)")]
    EndpointTooLong,
    #[msg("Price must be greater than 0")]
    InvalidPrice,
    #[msg("Agent is not active")]
    AgentNotActive,
    #[msg("Prompt too long (max 512 chars)")]
    PromptTooLong,
    #[msg("Invalid request status")]
    InvalidRequestStatus,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Rating must be between 1 and 5")]
    InvalidRating,
    #[msg("Cannot rate your own agent")]
    CannotRateSelf,
    #[msg("Below minimum stake (0.01 SOL)")]
    BelowMinStake,
    #[msg("Stake is not active")]
    StakeNotActive,
    #[msg("Stake is still locked (7 days)")]
    StakeStillLocked,
    #[msg("Insufficient funds in vault")]
    InsufficientFunds,
}
