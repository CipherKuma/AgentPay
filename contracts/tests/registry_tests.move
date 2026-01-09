#[test_only]
/// Tests for the AgentPay registry module
module AgentPay::registry_tests {
    use std::string;
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::timestamp;
    use AgentPay::registry;

    fun setup_timestamp(aptos_framework: &signer) {
        timestamp::set_time_has_started_for_testing(aptos_framework);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    fun test_initialize(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        registry::initialize(admin);

        assert!(registry::is_initialized(signer::address_of(admin)), 0);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 2, location = AgentPay::registry)]
    fun test_double_initialize_fails(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        registry::initialize(admin);
        registry::initialize(admin); // Should fail
    }

    #[test(admin = @AgentPay, owner = @0x123, aptos_framework = @aptos_framework)]
    fun test_register_service(
        admin: &signer,
        owner: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let owner_addr = signer::address_of(owner);
        let service_id = string::utf8(b"my-llm-service");
        let name = string::utf8(b"My LLM Service");
        let price = 1000000; // 0.01 MOVE

        registry::register_service(
            owner,
            admin_addr,
            service_id,
            name,
            price
        );

        // Verify service exists
        assert!(registry::service_exists(admin_addr, service_id), 0);
        assert!(registry::is_active(admin_addr, service_id), 1);
        assert!(!registry::is_verified(admin_addr, service_id), 2);

        // Verify service info
        let (svc_owner, svc_name, svc_price, svc_verified) = registry::get_service(
            admin_addr,
            service_id
        );
        assert!(svc_owner == owner_addr, 3);
        assert!(svc_name == name, 4);
        assert!(svc_price == price, 5);
        assert!(!svc_verified, 6);
    }

    #[test(admin = @AgentPay, owner = @0x123, aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 2, location = AgentPay::registry)]
    fun test_register_duplicate_service_fails(
        admin: &signer,
        owner: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let service_id = string::utf8(b"my-service");

        registry::register_service(
            owner,
            admin_addr,
            service_id,
            string::utf8(b"Service 1"),
            1000000
        );

        // Try to register same service_id again
        registry::register_service(
            owner,
            admin_addr,
            service_id,
            string::utf8(b"Service 2"),
            2000000
        );
    }

    #[test(admin = @AgentPay, owner = @0x123, aptos_framework = @aptos_framework)]
    fun test_verify_service(
        admin: &signer,
        owner: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let service_id = string::utf8(b"my-service");

        registry::register_service(
            owner,
            admin_addr,
            service_id,
            string::utf8(b"My Service"),
            1000000
        );

        assert!(!registry::is_verified(admin_addr, service_id), 0);

        // Admin verifies service
        registry::verify_service(admin, service_id);

        assert!(registry::is_verified(admin_addr, service_id), 1);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 5, location = AgentPay::registry)]
    fun test_verify_nonexistent_service_fails(
        admin: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        registry::initialize(admin);

        // Try to verify non-existent service
        registry::verify_service(admin, string::utf8(b"nonexistent"));
    }

    #[test(admin = @AgentPay, owner = @0x123, aptos_framework = @aptos_framework)]
    fun test_deactivate_service(
        admin: &signer,
        owner: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let service_id = string::utf8(b"my-service");

        registry::register_service(
            owner,
            admin_addr,
            service_id,
            string::utf8(b"My Service"),
            1000000
        );

        assert!(registry::is_active(admin_addr, service_id), 0);

        // Owner deactivates
        registry::deactivate_service(owner, admin_addr, service_id);

        assert!(!registry::is_active(admin_addr, service_id), 1);
        // Service still exists
        assert!(registry::service_exists(admin_addr, service_id), 2);
    }

    #[test(admin = @AgentPay, owner = @0x123, other = @0x456, aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 1, location = AgentPay::registry)]
    fun test_deactivate_by_non_owner_fails(
        admin: &signer,
        owner: &signer,
        other: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner));
        account::create_account_for_test(signer::address_of(other));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let service_id = string::utf8(b"my-service");

        registry::register_service(
            owner,
            admin_addr,
            service_id,
            string::utf8(b"My Service"),
            1000000
        );

        // Non-owner tries to deactivate
        registry::deactivate_service(other, admin_addr, service_id);
    }

    #[test(admin = @AgentPay, owner = @0x123, aptos_framework = @aptos_framework)]
    fun test_update_price(
        admin: &signer,
        owner: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let service_id = string::utf8(b"my-service");

        registry::register_service(
            owner,
            admin_addr,
            service_id,
            string::utf8(b"My Service"),
            1000000
        );

        assert!(registry::get_service_price(admin_addr, service_id) == 1000000, 0);

        // Update price
        registry::update_price(owner, admin_addr, service_id, 2000000);

        assert!(registry::get_service_price(admin_addr, service_id) == 2000000, 1);
    }

    #[test(admin = @AgentPay, owner = @0x123, other = @0x456, aptos_framework = @aptos_framework)]
    #[expected_failure(abort_code = 1, location = AgentPay::registry)]
    fun test_update_price_by_non_owner_fails(
        admin: &signer,
        owner: &signer,
        other: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner));
        account::create_account_for_test(signer::address_of(other));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let service_id = string::utf8(b"my-service");

        registry::register_service(
            owner,
            admin_addr,
            service_id,
            string::utf8(b"My Service"),
            1000000
        );

        // Non-owner tries to update price
        registry::update_price(other, admin_addr, service_id, 2000000);
    }

    #[test(admin = @AgentPay, aptos_framework = @aptos_framework)]
    fun test_nonexistent_service_checks(admin: &signer, aptos_framework: &signer) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);
        let fake_id = string::utf8(b"nonexistent");

        // These should return false, not error
        assert!(!registry::service_exists(admin_addr, fake_id), 0);
        assert!(!registry::is_verified(admin_addr, fake_id), 1);
        assert!(!registry::is_active(admin_addr, fake_id), 2);
    }

    #[test(admin = @AgentPay, owner1 = @0x123, owner2 = @0x456, aptos_framework = @aptos_framework)]
    fun test_multiple_services(
        admin: &signer,
        owner1: &signer,
        owner2: &signer,
        aptos_framework: &signer
    ) {
        setup_timestamp(aptos_framework);
        account::create_account_for_test(signer::address_of(admin));
        account::create_account_for_test(signer::address_of(owner1));
        account::create_account_for_test(signer::address_of(owner2));

        registry::initialize(admin);

        let admin_addr = signer::address_of(admin);

        // Owner 1 registers two services
        registry::register_service(
            owner1,
            admin_addr,
            string::utf8(b"service-1a"),
            string::utf8(b"Service 1A"),
            1000000
        );

        registry::register_service(
            owner1,
            admin_addr,
            string::utf8(b"service-1b"),
            string::utf8(b"Service 1B"),
            2000000
        );

        // Owner 2 registers one service
        registry::register_service(
            owner2,
            admin_addr,
            string::utf8(b"service-2"),
            string::utf8(b"Service 2"),
            3000000
        );

        // All services exist
        assert!(registry::service_exists(admin_addr, string::utf8(b"service-1a")), 0);
        assert!(registry::service_exists(admin_addr, string::utf8(b"service-1b")), 1);
        assert!(registry::service_exists(admin_addr, string::utf8(b"service-2")), 2);

        // Check owners
        let (owner, _, _, _) = registry::get_service(admin_addr, string::utf8(b"service-1a"));
        assert!(owner == signer::address_of(owner1), 3);

        let (owner, _, _, _) = registry::get_service(admin_addr, string::utf8(b"service-2"));
        assert!(owner == signer::address_of(owner2), 4);
    }
}
