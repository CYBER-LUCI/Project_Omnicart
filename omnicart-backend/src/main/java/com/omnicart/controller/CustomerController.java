package com.omnicart.controller;

import com.omnicart.dto.request.CustomerCreateRequest;
import com.omnicart.dto.request.CustomerUpdateRequest;
import com.omnicart.dto.request.EmailRequest;
import com.omnicart.dto.request.PhoneRequest;
import com.omnicart.dto.response.*;
import com.omnicart.service.CustomerService;
import com.omnicart.service.OrderService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customers")
@Tag(name = "Customer Management", description = "APIs for customer profiles, contacts, and dashboard")
public class CustomerController {

    private final CustomerService customerService;
    private final OrderService orderService;

    public CustomerController(CustomerService customerService, OrderService orderService) {
        this.customerService = customerService;
        this.orderService = orderService;
    }

    @PostMapping
    @Operation(summary = "Register customer")
    public ResponseEntity<ApiResponse<CustomerResponse>> createCustomer(@Valid @RequestBody CustomerCreateRequest request) {
        CustomerResponse customer = customerService.createCustomer(request);
        return new ResponseEntity<>(ApiResponse.success("Customer created", customer), HttpStatus.CREATED);
    }

    @GetMapping
    @Operation(summary = "List all customers (paginated)")
    public ResponseEntity<ApiResponse<PageResponse<CustomerResponse>>> getAllCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<CustomerResponse> customers = customerService.getAllCustomers(PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(new PageResponse<>(customers)));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get customer by ID")
    public ResponseEntity<ApiResponse<CustomerResponse>> getCustomerById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerById(id)));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update customer name")
    public ResponseEntity<ApiResponse<CustomerResponse>> updateCustomer(
            @PathVariable Long id,
            @Valid @RequestBody CustomerUpdateRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Customer updated", customerService.updateCustomer(id, request)));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete customer")
    public ResponseEntity<ApiResponse<Void>> deleteCustomer(@PathVariable Long id) {
        customerService.deleteCustomer(id);
        return ResponseEntity.ok(ApiResponse.success("Customer deleted", null));
    }

    @GetMapping("/{id}/emails")
    @Operation(summary = "Get all emails for customer")
    public ResponseEntity<ApiResponse<java.util.List<CustomerEmailResponse>>> getCustomerEmails(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerEmails(id)));
    }

    @PostMapping("/{id}/emails")
    @Operation(summary = "Add secondary email to customer")
    public ResponseEntity<ApiResponse<CustomerEmailResponse>> addEmail(
            @PathVariable Long id,
            @Valid @RequestBody EmailRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Email added", customerService.addEmail(id, request)));
    }

    @DeleteMapping("/{id}/emails/{emailId}")
    @Operation(summary = "Remove customer email by ID")
    public ResponseEntity<ApiResponse<Void>> removeEmail(
            @PathVariable Long id,
            @PathVariable Long emailId,
            @RequestParam(required = false) String email) {
        if (email != null && !email.trim().isEmpty()) {
            customerService.removeEmailByAddress(id, email);
        } else {
            customerService.removeEmail(id, emailId);
        }
        return ResponseEntity.ok(ApiResponse.success("Email removed", null));
    }

    @DeleteMapping("/{id}/emails")
    @Operation(summary = "Remove customer email by address")
    public ResponseEntity<ApiResponse<Void>> removeEmailByQuery(
            @PathVariable Long id,
            @RequestParam String email) {
        customerService.removeEmailByAddress(id, email);
        return ResponseEntity.ok(ApiResponse.success("Email removed", null));
    }

    @GetMapping("/{id}/phones")
    @Operation(summary = "Get all phones for customer")
    public ResponseEntity<ApiResponse<java.util.List<CustomerPhoneResponse>>> getCustomerPhones(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerPhones(id)));
    }

    @PostMapping("/{id}/phones")
    @Operation(summary = "Add secondary phone to customer")
    public ResponseEntity<ApiResponse<CustomerPhoneResponse>> addPhone(
            @PathVariable Long id,
            @Valid @RequestBody PhoneRequest request) {
        return ResponseEntity.ok(ApiResponse.success("Phone added", customerService.addPhone(id, request)));
    }

    @DeleteMapping("/{id}/phones/{phoneId}")
    @Operation(summary = "Remove customer phone by ID")
    public ResponseEntity<ApiResponse<Void>> removePhone(
            @PathVariable Long id,
            @PathVariable Long phoneId,
            @RequestParam(required = false) String phone) {
        if (phone != null && !phone.trim().isEmpty()) {
            customerService.removePhoneByNumber(id, phone);
        } else {
            customerService.removePhone(id, phoneId);
        }
        return ResponseEntity.ok(ApiResponse.success("Phone removed", null));
    }

    @DeleteMapping("/{id}/phones")
    @Operation(summary = "Remove customer phone by number")
    public ResponseEntity<ApiResponse<Void>> removePhoneByQuery(
            @PathVariable Long id,
            @RequestParam String phone) {
        customerService.removePhoneByNumber(id, phone);
        return ResponseEntity.ok(ApiResponse.success("Phone removed", null));
    }

    @GetMapping("/{id}/orders")
    @Operation(summary = "Get order history for customer")
    public ResponseEntity<ApiResponse<PageResponse<OrderResponse>>> getCustomerOrders(
            @PathVariable Long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Page<OrderResponse> orders = orderService.getCustomerOrders(id, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.success(new PageResponse<>(orders)));
    }

    @GetMapping("/{id}/dashboard")
    @Operation(summary = "Get customer dashboard summary (orders, spend, addresses)")
    public ResponseEntity<ApiResponse<CustomerDashboardResponse>> getCustomerDashboard(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.success(customerService.getCustomerDashboard(id)));
    }
}
