package com.omnicart.security;

import com.omnicart.entity.Customer;
import com.omnicart.entity.Seller;
import com.omnicart.repository.CustomerRepository;
import com.omnicart.repository.SellerRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final CustomerRepository customerRepository;
    private final SellerRepository sellerRepository;
    private final PasswordEncoder passwordEncoder;

    public CustomUserDetailsService(CustomerRepository customerRepository, SellerRepository sellerRepository, PasswordEncoder passwordEncoder) {
        this.customerRepository = customerRepository;
        this.sellerRepository = sellerRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {

        Optional<Customer> customerOpt = customerRepository.findByEmail(email);
        if (customerOpt.isPresent()) {
            Customer c = customerOpt.get();
            String hash = (c.getPasswordHash() != null && !c.getPasswordHash().isBlank())
                    ? c.getPasswordHash()
                    : "";
            return new UserPrincipal(c.getId(), email, hash, Role.CUSTOMER);
        }

        Optional<Seller> sellerOpt = sellerRepository.findByContactEmailIgnoreCase(email);
        if (sellerOpt.isPresent()) {
            Seller s = sellerOpt.get();
            String hash = (s.getPasswordHash() != null && !s.getPasswordHash().isBlank())
                    ? s.getPasswordHash()
                    : "";
            return new UserPrincipal(s.getId(), email, hash, Role.SELLER);
        }

        if ("admin@omnicart.com".equalsIgnoreCase(email)) {
            return new UserPrincipal(0L, email, passwordEncoder.encode("admin123"), Role.ADMIN);
        }

        throw new UsernameNotFoundException("User not found with email: " + email);
    }
}
