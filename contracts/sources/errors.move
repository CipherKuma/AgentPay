/// Error codes for the AgentPay treasury module
module AgentPay::errors {
    /// Caller is not the admin
    const E_NOT_ADMIN: u64 = 1;
    /// Treasury is already initialized
    const E_ALREADY_INITIALIZED: u64 = 2;
    /// Treasury is not initialized
    const E_NOT_INITIALIZED: u64 = 3;
    /// Invalid payment amount (must be > 0)
    const E_INVALID_AMOUNT: u64 = 4;

    /// Returns the error code for non-admin caller
    public fun not_admin(): u64 { E_NOT_ADMIN }

    /// Returns the error code for already initialized treasury
    public fun already_initialized(): u64 { E_ALREADY_INITIALIZED }

    /// Returns the error code for not initialized treasury
    public fun not_initialized(): u64 { E_NOT_INITIALIZED }

    /// Returns the error code for invalid amount
    public fun invalid_amount(): u64 { E_INVALID_AMOUNT }
}
