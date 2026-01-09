/// On-chain service registry for AgentPay marketplace
/// Services register on-chain with metadata stored on IPFS
module AgentPay::registry {
    use std::string::String;
    use std::signer;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};
    use AgentPay::errors;

    /// On-chain service registry
    struct Registry has key {
        admin: address,
        services: Table<u64, ServiceInfo>,
        owner_services: Table<address, vector<u64>>,
        service_counter: u64,
    }

    /// On-chain service info
    struct ServiceInfo has store, drop, copy {
        owner: address,
        name: String,
        endpoint_url: String,
        metadata_uri: String,      // IPFS URI for description, category, tags, schemas
        price_per_request: u64,    // In octas
        is_verified: bool,
        is_active: bool,
        created_at: u64,
    }

    #[event]
    struct ServiceRegistered has drop, store {
        service_id: u64,
        owner: address,
        name: String,
        endpoint_url: String,
        metadata_uri: String,
        price_per_request: u64,
        timestamp: u64,
    }

    #[event]
    struct ServiceUpdated has drop, store {
        service_id: u64,
        endpoint_url: String,
        metadata_uri: String,
        price_per_request: u64,
        timestamp: u64,
    }

    #[event]
    struct ServiceVerified has drop, store {
        service_id: u64,
        timestamp: u64,
    }

    #[event]
    struct ServiceDeactivated has drop, store {
        service_id: u64,
        timestamp: u64,
    }

    #[event]
    struct ServiceActivated has drop, store {
        service_id: u64,
        timestamp: u64,
    }

    /// Initialize the registry
    public entry fun initialize(admin: &signer) {
        let admin_addr = signer::address_of(admin);

        assert!(
            !exists<Registry>(admin_addr),
            errors::already_initialized()
        );

        move_to(admin, Registry {
            admin: admin_addr,
            services: table::new(),
            owner_services: table::new(),
            service_counter: 0,
        });
    }

    /// Register a service on-chain (returns service_id via event)
    public entry fun register_service(
        owner: &signer,
        registry_addr: address,
        name: String,
        endpoint_url: String,
        metadata_uri: String,
        price_per_request: u64,
    ) acquires Registry {
        let owner_addr = signer::address_of(owner);

        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        assert!(price_per_request > 0, errors::invalid_amount());

        let registry = borrow_global_mut<Registry>(registry_addr);

        // Auto-generate service ID
        let service_id = registry.service_counter + 1;
        registry.service_counter = service_id;

        let service = ServiceInfo {
            owner: owner_addr,
            name,
            endpoint_url,
            metadata_uri,
            price_per_request,
            is_verified: false,
            is_active: true,
            created_at: timestamp::now_seconds(),
        };

        table::add(&mut registry.services, service_id, service);

        // Track owner's services
        if (!table::contains(&registry.owner_services, owner_addr)) {
            table::add(&mut registry.owner_services, owner_addr, vector::empty());
        };
        let owner_list = table::borrow_mut(&mut registry.owner_services, owner_addr);
        vector::push_back(owner_list, service_id);

        event::emit(ServiceRegistered {
            service_id,
            owner: owner_addr,
            name,
            endpoint_url,
            metadata_uri,
            price_per_request,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Owner updates their service
    public entry fun update_service(
        owner: &signer,
        registry_addr: address,
        service_id: u64,
        endpoint_url: String,
        metadata_uri: String,
        price_per_request: u64,
    ) acquires Registry {
        let owner_addr = signer::address_of(owner);

        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        assert!(price_per_request > 0, errors::invalid_amount());

        let registry = borrow_global_mut<Registry>(registry_addr);

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        let service = table::borrow_mut(&mut registry.services, service_id);
        assert!(service.owner == owner_addr, errors::not_admin());

        service.endpoint_url = endpoint_url;
        service.metadata_uri = metadata_uri;
        service.price_per_request = price_per_request;

        event::emit(ServiceUpdated {
            service_id,
            endpoint_url,
            metadata_uri,
            price_per_request,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Admin verifies a service
    public entry fun verify_service(
        admin: &signer,
        service_id: u64,
    ) acquires Registry {
        let admin_addr = signer::address_of(admin);

        assert!(exists<Registry>(admin_addr), errors::not_initialized());

        let registry = borrow_global_mut<Registry>(admin_addr);
        assert!(registry.admin == admin_addr, errors::not_admin());

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        let service = table::borrow_mut(&mut registry.services, service_id);
        service.is_verified = true;

        event::emit(ServiceVerified {
            service_id,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Owner deactivates their service
    public entry fun deactivate_service(
        owner: &signer,
        registry_addr: address,
        service_id: u64,
    ) acquires Registry {
        let owner_addr = signer::address_of(owner);

        assert!(exists<Registry>(registry_addr), errors::not_initialized());

        let registry = borrow_global_mut<Registry>(registry_addr);

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        let service = table::borrow_mut(&mut registry.services, service_id);
        assert!(service.owner == owner_addr, errors::not_admin());

        service.is_active = false;

        event::emit(ServiceDeactivated {
            service_id,
            timestamp: timestamp::now_seconds(),
        });
    }

    /// Owner reactivates their service
    public entry fun activate_service(
        owner: &signer,
        registry_addr: address,
        service_id: u64,
    ) acquires Registry {
        let owner_addr = signer::address_of(owner);

        assert!(exists<Registry>(registry_addr), errors::not_initialized());

        let registry = borrow_global_mut<Registry>(registry_addr);

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        let service = table::borrow_mut(&mut registry.services, service_id);
        assert!(service.owner == owner_addr, errors::not_admin());

        service.is_active = true;

        event::emit(ServiceActivated {
            service_id,
            timestamp: timestamp::now_seconds(),
        });
    }

    // ============ View Functions ============

    #[view]
    /// Get full service info
    public fun get_service(
        registry_addr: address,
        service_id: u64
    ): (address, String, String, String, u64, bool, bool) acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        let service = table::borrow(&registry.services, service_id);
        (
            service.owner,
            service.name,
            service.endpoint_url,
            service.metadata_uri,
            service.price_per_request,
            service.is_verified,
            service.is_active
        )
    }

    #[view]
    /// Get service owner
    public fun get_service_owner(
        registry_addr: address,
        service_id: u64
    ): address acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        table::borrow(&registry.services, service_id).owner
    }

    #[view]
    /// Get service endpoint URL
    public fun get_service_endpoint(
        registry_addr: address,
        service_id: u64
    ): String acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        table::borrow(&registry.services, service_id).endpoint_url
    }

    #[view]
    /// Get service price
    public fun get_service_price(
        registry_addr: address,
        service_id: u64
    ): u64 acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        table::borrow(&registry.services, service_id).price_per_request
    }

    #[view]
    /// Get service metadata URI
    public fun get_metadata_uri(
        registry_addr: address,
        service_id: u64
    ): String acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);

        assert!(
            table::contains(&registry.services, service_id),
            errors::service_not_found()
        );

        table::borrow(&registry.services, service_id).metadata_uri
    }

    #[view]
    /// Check if service is verified
    public fun is_verified(
        registry_addr: address,
        service_id: u64
    ): bool acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);

        if (table::contains(&registry.services, service_id)) {
            table::borrow(&registry.services, service_id).is_verified
        } else {
            false
        }
    }

    #[view]
    /// Check if service is active
    public fun is_active(
        registry_addr: address,
        service_id: u64
    ): bool acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);

        if (table::contains(&registry.services, service_id)) {
            table::borrow(&registry.services, service_id).is_active
        } else {
            false
        }
    }

    #[view]
    /// Check if service exists
    public fun service_exists(
        registry_addr: address,
        service_id: u64
    ): bool acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);
        table::contains(&registry.services, service_id)
    }

    #[view]
    /// Check if registry is initialized
    public fun is_initialized(addr: address): bool {
        exists<Registry>(addr)
    }

    #[view]
    /// Get total service count
    public fun get_service_count(registry_addr: address): u64 acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);
        registry.service_counter
    }

    #[view]
    /// Get services by owner
    public fun get_owner_services(
        registry_addr: address,
        owner: address
    ): vector<u64> acquires Registry {
        assert!(exists<Registry>(registry_addr), errors::not_initialized());
        let registry = borrow_global<Registry>(registry_addr);

        if (table::contains(&registry.owner_services, owner)) {
            *table::borrow(&registry.owner_services, owner)
        } else {
            vector::empty()
        }
    }
}
