package com.omnicart.service.impl;

import java.util.Optional;
import java.util.List;
import com.omnicart.dto.request.CustomerCreateRequest;
import com.omnicart.dto.request.CustomerUpdateRequest;
import com.omnicart.dto.request.EmailRequest;
import com.omnicart.dto.request.PhoneRequest;
import com.omnicart.dto.response.AddressResponse;
import com.omnicart.dto.response.CustomerDashboardResponse;
import com.omnicart.dto.response.CustomerResponse;
import com.omnicart.dto.response.OrderResponse;
import com.omnicart.dto.response.CustomerEmailResponse;
import com.omnicart.dto.response.CustomerPhoneResponse;
import com.omnicart.entity.Customer;
import com.omnicart.entity.CustomerEmail;
import com.omnicart.entity.CustomerPhone;
import com.omnicart.exception.CustomerNotFoundException;
import com.omnicart.exception.DuplicateEmailException;
import com.omnicart.exception.DuplicatePhoneException;
import com.omnicart.exception.ResourceNotFoundException;
import com.omnicart.mapper.AddressMapper;
import com.omnicart.mapper.CustomerMapper;
import com.omnicart.mapper.OrderMapper;
import com.omnicart.repository.AddressRepository;
import com.omnicart.repository.CustomerEmailRepository;
import com.omnicart.repository.CustomerPhoneRepository;
import com.omnicart.repository.CustomerRepository;
import com.omnicart.repository.OrderRepository;
import com.omnicart.service.CustomerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CustomerServiceImpl implements CustomerService {

    private static final Logger log = LoggerFactory.getLogger(CustomerServiceImpl.class);

    private final CustomerRepository customerRepository;
    private final CustomerEmailRepository customerEmailRepository;
    private final CustomerPhoneRepository customerPhoneRepository;
    private final AddressRepository addressRepository;
    private final OrderRepository orderRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public CustomerServiceImpl(CustomerRepository customerRepository,
                               CustomerEmailRepository customerEmailRepository,
                               CustomerPhoneRepository customerPhoneRepository,
                               AddressRepository addressRepository,
                               OrderRepository orderRepository,
                               org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.customerRepository = customerRepository;
        this.customerEmailRepository = customerEmailRepository;
        this.customerPhoneRepository = customerPhoneRepository;
        this.addressRepository = addressRepository;
        this.orderRepository = orderRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public CustomerResponse createCustomer(CustomerCreateRequest request) {
        if (customerEmailRepository.existsByEmailAddressIgnoreCase(request.getEmail())) {
            throw new DuplicateEmailException(request.getEmail());
        }

        Customer customer = new Customer(request.getFirstName(), request.getLastName());
        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            customer.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        } else {
            customer.setPasswordHash(passwordEncoder.encode("password"));
        }
        Customer savedCustomer = customerRepository.save(customer);

        CustomerEmail email = new CustomerEmail(savedCustomer, request.getEmail(), true);
        customerEmailRepository.save(email);
        savedCustomer.addEmail(email);

        CustomerPhone phone = new CustomerPhone(savedCustomer, request.getPhone(), true);
        customerPhoneRepository.save(phone);
        savedCustomer.addPhone(phone);

        log.info("Registered customer ID: {} ({})", savedCustomer.getId(), request.getEmail());
        return CustomerMapper.toResponse(savedCustomer);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerResponse getCustomerById(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException(id));
        return CustomerMapper.toResponse(customer);
    }

    @Override
    @Transactional
    public CustomerResponse updateCustomer(Long id, CustomerUpdateRequest request) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new CustomerNotFoundException(id));

        if (request.getFirstName() != null && !request.getFirstName().isBlank()) {
            customer.setFirstName(request.getFirstName().trim());
        }
        if (request.getLastName() != null && !request.getLastName().isBlank()) {
            customer.setLastName(request.getLastName().trim());
        }

        if (request.getPassword() != null && !request.getPassword().isBlank()) {
            customer.setPasswordHash(passwordEncoder.encode(request.getPassword().trim()));
        }

        if (request.getEmail() != null && !request.getEmail().isBlank()) {
            String newEmail = request.getEmail().trim().toLowerCase();
            Optional<CustomerEmail> existingWithEmail = customerEmailRepository.findByEmailAddressIgnoreCase(newEmail);
            if (existingWithEmail.isPresent() && !existingWithEmail.get().getCustomer().getId().equals(id)) {
                throw new DuplicateEmailException(newEmail);
            }

            if (existingWithEmail.isPresent() && existingWithEmail.get().getCustomer().getId().equals(id)) {
                CustomerEmail existing = existingWithEmail.get();
                for (CustomerEmail e : customer.getEmails()) {
                    e.setIsPrimary(e.getId() != null && e.getId().equals(existing.getId()));
                }
            } else {
                CustomerEmail primaryEmail = customer.getEmails().stream()
                        .filter(e -> Boolean.TRUE.equals(e.getIsPrimary()))
                        .findFirst()
                        .orElse(customer.getEmails().isEmpty() ? null : customer.getEmails().get(0));

                if (primaryEmail != null) {
                    primaryEmail.setEmailAddress(newEmail);
                    primaryEmail.setIsPrimary(true);
                } else {
                    CustomerEmail newCustEmail = new CustomerEmail(customer, newEmail, true);
                    customer.addEmail(newCustEmail);
                }

                for (CustomerEmail other : customer.getEmails()) {
                    if (primaryEmail != null && other != primaryEmail && Boolean.TRUE.equals(other.getIsPrimary())) {
                        other.setIsPrimary(false);
                    }
                }
            }
        }

        if (request.getPhone() != null && !request.getPhone().isBlank()) {
            String newPhone = request.getPhone().trim();
            CustomerPhone primaryPhone = customer.getPhones().stream()
                    .filter(p -> Boolean.TRUE.equals(p.getIsPrimary()))
                    .findFirst()
                    .orElse(customer.getPhones().isEmpty() ? null : customer.getPhones().get(0));

            if (primaryPhone != null) {
                primaryPhone.setPhoneNumber(newPhone);
                primaryPhone.setIsPrimary(true);
            } else {
                CustomerPhone newCustPhone = new CustomerPhone(customer, newPhone, true);
                customer.addPhone(newCustPhone);
            }

            for (CustomerPhone other : customer.getPhones()) {
                if (primaryPhone != null && other != primaryPhone && Boolean.TRUE.equals(other.getIsPrimary())) {
                    other.setIsPrimary(false);
                }
            }
        }

        Customer updated = customerRepository.saveAndFlush(customer);
        return CustomerMapper.toResponse(updated);
    }

    @Override
    @Transactional
    public void deleteCustomer(Long id) {
        if (!customerRepository.existsById(id)) {
            throw new CustomerNotFoundException(id);
        }
        customerRepository.deleteById(id);
        log.info("Deleted customer ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CustomerResponse> getAllCustomers(Pageable pageable) {
        return customerRepository.findAll(pageable).map(CustomerMapper::toResponse);
    }

    @Override
    @Transactional
    public CustomerEmailResponse addEmail(Long customerId, EmailRequest request) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));

        if (customerEmailRepository.existsByEmailAddressIgnoreCase(request.getEmailAddress())) {
            throw new DuplicateEmailException(request.getEmailAddress());
        }

        CustomerEmail email = new CustomerEmail(customer, request.getEmailAddress(), request.getIsPrimary());
        CustomerEmail saved = customerEmailRepository.save(email);
        customer.addEmail(saved);
        customerRepository.save(customer);
        return new CustomerEmailResponse(saved.getId(), customerId, saved.getEmailAddress(), saved.getIsPrimary(), saved.getCreatedAt());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerEmailResponse> getCustomerEmails(Long customerId) {
        if (!customerRepository.existsById(customerId)) {
            throw new CustomerNotFoundException(customerId);
        }
        return customerEmailRepository.findByCustomerId(customerId).stream()
                .map(e -> new CustomerEmailResponse(
                        e.getId(), customerId, e.getEmailAddress(), e.getIsPrimary(), e.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void removeEmail(Long customerId, Long emailId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));

        List<CustomerEmail> emails = customerEmailRepository.findByCustomerId(customerId);
        CustomerEmail target = emails.stream()
                .filter(e -> e.getId().equals(emailId))
                .findFirst()
                .orElse(null);

        if (target != null) {
            customer.removeEmail(target);
            customerEmailRepository.delete(target);
            customerRepository.save(customer);
        } else {
            customerEmailRepository.findById(emailId).ifPresent(e -> {
                if (e.getCustomer() != null && e.getCustomer().getId().equals(customerId)) {
                    customer.removeEmail(e);
                    customerEmailRepository.delete(e);
                    customerRepository.save(customer);
                }
            });
        }
    }

    @Override
    @Transactional
    public void removeEmailByAddress(Long customerId, String emailAddress) {
        if (emailAddress == null || emailAddress.trim().isEmpty()) return;
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));

        String clean = emailAddress.trim().toLowerCase();
        List<CustomerEmail> emails = customerEmailRepository.findByCustomerId(customerId);
        for (CustomerEmail e : emails) {
            if (e.getEmailAddress() != null && e.getEmailAddress().trim().equalsIgnoreCase(clean)) {
                customer.removeEmail(e);
                customerEmailRepository.delete(e);
            }
        }
        customerRepository.save(customer);
    }

    @Override
    @Transactional
    public CustomerPhoneResponse addPhone(Long customerId, PhoneRequest request) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));

        List<CustomerPhone> existingPhones = customerPhoneRepository.findByCustomerId(customerId);
        String cleanPhone = request.getPhoneNumber().replaceAll("\\D", "");
        boolean isDuplicate = existingPhones.stream().anyMatch(p -> {
            if (p.getPhoneNumber() == null) return false;
            String existingDigits = p.getPhoneNumber().replaceAll("\\D", "");
            return existingDigits.equals(cleanPhone) ||
                   (existingDigits.length() >= 10 && cleanPhone.length() >= 10 &&
                    existingDigits.endsWith(cleanPhone.substring(cleanPhone.length() - 10)));
        });
        if (isDuplicate) {
            throw new DuplicatePhoneException(request.getPhoneNumber());
        }

        CustomerPhone phone = new CustomerPhone(customer, request.getPhoneNumber(), request.getIsPrimary());
        CustomerPhone saved = customerPhoneRepository.save(phone);
        customer.addPhone(saved);
        customerRepository.save(customer);
        return new CustomerPhoneResponse(saved.getId(), customerId, saved.getPhoneNumber(), saved.getIsPrimary(), saved.getCreatedAt());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerPhoneResponse> getCustomerPhones(Long customerId) {
        if (!customerRepository.existsById(customerId)) {
            throw new CustomerNotFoundException(customerId);
        }
        return customerPhoneRepository.findByCustomerId(customerId).stream()
                .map(p -> new CustomerPhoneResponse(
                        p.getId(), customerId, p.getPhoneNumber(), p.getIsPrimary(), p.getCreatedAt()))
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void removePhone(Long customerId, Long phoneId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));

        List<CustomerPhone> phones = customerPhoneRepository.findByCustomerId(customerId);
        CustomerPhone target = phones.stream()
                .filter(p -> p.getId().equals(phoneId))
                .findFirst()
                .orElse(null);

        if (target != null) {
            customer.removePhone(target);
            customerPhoneRepository.delete(target);
            customerRepository.save(customer);
        } else {
            customerPhoneRepository.findById(phoneId).ifPresent(p -> {
                if (p.getCustomer() != null && p.getCustomer().getId().equals(customerId)) {
                    customer.removePhone(p);
                    customerPhoneRepository.delete(p);
                    customerRepository.save(customer);
                }
            });
        }
    }

    @Override
    @Transactional
    public void removePhoneByNumber(Long customerId, String phoneNumber) {
        if (phoneNumber == null || phoneNumber.trim().isEmpty()) return;
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));

        String clean = phoneNumber.replaceAll("\\D", "");
        List<CustomerPhone> phones = customerPhoneRepository.findByCustomerId(customerId);
        for (CustomerPhone p : phones) {
            if (p.getPhoneNumber() != null) {
                String existingDigits = p.getPhoneNumber().replaceAll("\\D", "");
                if (existingDigits.equals(clean) || (existingDigits.length() >= 10 && clean.length() >= 10 && existingDigits.endsWith(clean.substring(clean.length() - 10)))) {
                    customer.removePhone(p);
                    customerPhoneRepository.delete(p);
                }
            }
        }
        customerRepository.save(customer);
    }

    @Override
    @Transactional(readOnly = true)
    public CustomerDashboardResponse getCustomerDashboard(Long customerId) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new CustomerNotFoundException(customerId));

        List<AddressResponse> addresses = addressRepository.findByCustomerId(customerId).stream()
                .map(AddressMapper::toResponse)
                .collect(Collectors.toList());

        long totalOrders = orderRepository.countByCustomerId(customerId);
        BigDecimal totalSpent = orderRepository.calculateCustomerTotalSpent(customerId);
        List<OrderResponse> recentOrders = orderRepository.findByCustomerIdOrderByOrderDateDesc(customerId).stream()
                .limit(5)
                .map(OrderMapper::toResponse)
                .collect(Collectors.toList());

        CustomerDashboardResponse dashboard = new CustomerDashboardResponse();
        dashboard.setCustomer(CustomerMapper.toResponse(customer));
        dashboard.setSavedAddresses(addresses);
        dashboard.setTotalOrders(totalOrders);
        dashboard.setTotalSpent(totalSpent);
        dashboard.setRecentOrders(recentOrders);
        return dashboard;
    }
}
