#[test_only]
/// Tests for the AgentPay treasury module
module AgentPay::treasury_tests {
    use std::string;
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use AgentPay::treasury;

    // Test helper to set up timestamp for testing
    fun setup_timestamp(aptos_framework: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    fun test_initialize(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        treasury::initialize(admin);

        let admin_addr = signer::address_of(admin);
        assert!(treasury::is_initialized(admin_addr), 0);
        assert!(treasury::get_total_revenue(admin_addr) == 0, 1);
        assert!(treasury::get_total_requests(admin_addr) == 0, 2);
        assert!(treasury::get_total_payouts(admin_addr) == 0, 3);
        assert!(treasury::get_admin(admin_addr) == admin_addr, 4);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 2, location = AgentPay::treasury)]
    fun test_double_initialize_fails(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        treasury::initialize(admin);
        treasury::initialize(admin); // Should fail
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    fun test_record_payment(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        treasury::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let payer = @0x123;
        let amount = 1000000; // 1 MOVE in octas

        treasury::record_payment(
            admin,
            payer,
            amount,
            string::utf8(b"inference"),
            string::utf8(b"llama-3-70b"),
            string::utf8(b"together"),
        );

        assert!(treasury::get_total_revenue(admin_addr) == amount, 0);
        assert!(treasury::get_total_requests(admin_addr) == 1, 1);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    fun test_multiple_payments(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        treasury::initialize(admin);

        let admin_addr = signer::address_of(admin);

        // First payment
        treasury::record_payment(
            admin,
            @0x123,
            1000000,
            string::utf8(b"inference"),
            string::utf8(b"llama-3-70b"),
            string::utf8(b"together"),
        );

        // Second payment
        treasury::record_payment(
            admin,
            @0x456,
            500000,
            string::utf8(b"image"),
            string::utf8(b"sdxl"),
            string::utf8(b"replicate"),
        );

        assert!(treasury::get_total_revenue(admin_addr) == 1500000, 0);
        assert!(treasury::get_total_requests(admin_addr) == 2, 1);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 4, location = AgentPay::treasury)]
    fun test_zero_amount_fails(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        treasury::initialize(admin);

        treasury::record_payment(
            admin,
            @0x123,
            0, // Zero amount should fail
            string::utf8(b"inference"),
            string::utf8(b"llama-3-70b"),
            string::utf8(b"together"),
        );
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    fun test_record_payout(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        treasury::initialize(admin);

        let admin_addr = signer::address_of(admin);

        treasury::record_payout(
            admin,
            string::utf8(b"together"),
            800000,
        );

        assert!(treasury::get_total_payouts(admin_addr) == 800000, 0);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    fun test_get_stats(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        treasury::initialize(admin);

        let admin_addr = signer::address_of(admin);

        treasury::record_payment(
            admin,
            @0x123,
            1000000,
            string::utf8(b"inference"),
            string::utf8(b"llama-3-70b"),
            string::utf8(b"together"),
        );

        treasury::record_payout(
            admin,
            string::utf8(b"together"),
            850000,
        );

        let (revenue, requests, payouts) = treasury::get_stats(admin_addr);
        assert!(revenue == 1000000, 0);
        assert!(requests == 1, 1);
        assert!(payouts == 850000, 2);
    }

    #[test(other = @0x999, aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 3, location = AgentPay::treasury)]
    fun test_payment_without_init_fails(
        other: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(other));

        // Try to record payment without initializing
        treasury::record_payment(
            other,
            @0x123,
            1000000,
            string::utf8(b"inference"),
            string::utf8(b"llama-3-70b"),
            string::utf8(b"together"),
        );
    }
}
