/// Treasury module for AgentPay - tracks payments and revenue
/// The x402 facilitator handles actual MOVE transfers; this contract
/// is for accounting and future provider revenue sharing
module AgentPay::treasury {
    use std::string::String;
    use std::signer;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use AgentPay::errors;

    /// Treasury resource - stores aggregate stats
    struct Treasury has key {
        admin: address,
        total_revenue: u64,    // Total MOVE received (in octas)
        total_requests: u64,   // Total API requests processed
        total_payouts: u64,    // Total paid to providers
    }

    #[event]
    /// Emitted when a payment is recorded
    struct PaymentReceived has drop, store {
        payer: address,
        amount: u64,
        service_type: String,  // "inference", "image", "compute"
        model: String,
        provider: String,
        timestamp: u64,
    }

    #[event]
    /// Emitted when a payout is made to a provider
    struct PayoutMade has drop, store {
        provider: String,
        amount: u64,
        timestamp: u64,
    }

    /// Initialize the treasury (called once by admin)
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);

        assert!(
            !exists<Treasury>(admin_addr),
            errors::already_initialized()
        );

        move_to(admin, Treasury {
            admin: admin_addr,
            total_revenue: 0,
            total_requests: 0,
            total_payouts: 0,
        });
    }

    /// Record a payment (called by admin after x402 verification)
    public entry fun record_payment(
        admin: &signer,
        payer: address,
        amount: u64,
        service_type: String,
        model: String,
        provider: String,
    ) acquires Treasury {
        let admin_addr = signer::address_of(admin);

        assert!(
            exists<Treasury>(admin_addr),
            errors::not_initialized()
        );

        let treasury = borrow_global_mut<Treasury>(admin_addr);

        assert!(
            treasury.admin == admin_addr,
            errors::not_admin()
        );

        assert!(amount > 0, errors::invalid_amount());

        // Update treasury stats
        treasury.total_revenue = treasury.total_revenue + amount;
        treasury.total_requests = treasury.total_requests + 1;

        // Emit payment event for off-chain indexing
        event::emit(PaymentReceived {
            payer,
            amount,
            service_type,
            model,
            provider,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Record a payout to a provider
    public entry fun record_payout(
        admin: &signer,
        provider: String,
        amount: u64,
    ) acquires Treasury {
        let admin_addr = signer::address_of(admin);

        assert!(
            exists<Treasury>(admin_addr),
            errors::not_initialized()
        );

        let treasury = borrow_global_mut<Treasury>(admin_addr);

        assert!(
            treasury.admin == admin_addr,
            errors::not_admin()
        );

        assert!(amount > 0, errors::invalid_amount());

        treasury.total_payouts = treasury.total_payouts + amount;

        event::emit(PayoutMade {
            provider,
            amount,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ============ View Functions ============

    #[view]
    /// Get total revenue collected
    public fun get_total_revenue(treasury_addr: address): u64 acquires Treasury {
        assert!(exists<Treasury>(treasury_addr), errors::not_initialized());
        borrow_global<Treasury>(treasury_addr).total_revenue
    }

    #[view]
    /// Get total number of requests processed
    public fun get_total_requests(treasury_addr: address): u64 acquires Treasury {
        assert!(exists<Treasury>(treasury_addr), errors::not_initialized());
        borrow_global<Treasury>(treasury_addr).total_requests
    }

    #[view]
    /// Get total payouts made to providers
    public fun get_total_payouts(treasury_addr: address): u64 acquires Treasury {
        assert!(exists<Treasury>(treasury_addr), errors::not_initialized());
        borrow_global<Treasury>(treasury_addr).total_payouts
    }

    #[view]
    /// Get all treasury stats: (revenue, requests, payouts)
    public fun get_stats(treasury_addr: address): (u64, u64, u64) acquires Treasury {
        assert!(exists<Treasury>(treasury_addr), errors::not_initialized());
        let treasury = borrow_global<Treasury>(treasury_addr);
        (treasury.total_revenue, treasury.total_requests, treasury.total_payouts)
    }

    #[view]
    /// Check if treasury is initialized at address
    public fun is_initialized(addr: address): bool {
        exists<Treasury>(addr)
    }

    #[view]
    /// Get admin address
    public fun get_admin(treasury_addr: address): address acquires Treasury {
        assert!(exists<Treasury>(treasury_addr), errors::not_initialized());
        borrow_global<Treasury>(treasury_addr).admin
    }
}
