package com.omnicart.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class SellerUpdateRequest {
    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "Contact email is required")
    @Email
    private String contactEmail;

    @NotBlank(message = "Contact phone is required")
    @Size(max = 20)
    private String contactPhone;

    @Size(max = 100)
    private String city;

    @Size(max = 100)
    private String state;

    @Size(max = 100)
    private String password;

    public SellerUpdateRequest() {}

    public String getCompanyName() { return companyName; }
    public void setCompanyName(String companyName) { this.companyName = companyName; }

    public String getContactEmail() { return contactEmail; }
    public void setContactEmail(String contactEmail) { this.contactEmail = contactEmail; }

    public String getContactPhone() { return contactPhone; }
    public void setContactPhone(String contactPhone) { this.contactPhone = contactPhone; }

    public String getCity() { return city; }
    public void setCity(String city) { this.city = city; }

    public String getState() { return state; }
    public void setState(String state) { this.state = state; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
