package com.omnicart.mapper;

import com.omnicart.dto.response.AddressResponse;
import com.omnicart.entity.Address;

public class AddressMapper {
    public static AddressResponse toResponse(Address address) {
        if (address == null) return null;
        AddressResponse res = new AddressResponse();
        res.setId(address.getId());
        res.setCustomerId(address.getCustomer() != null ? address.getCustomer().getId() : null);
        res.setAddressType(address.getAddressType() != null ? address.getAddressType().getTypeName() : null);
        res.setHouseNumber(address.getHouseNumber());
        res.setStreet(address.getStreet());
        res.setCity(address.getCity());
        res.setPinCode(address.getPinCode());
        res.setCreatedAt(address.getCreatedAt());

        String state = "Uttar Pradesh";
        if (address.getCity() != null) {
            String cityLower = address.getCity().trim().toLowerCase();
            if (cityLower.contains("varanasi")) {
                state = "Uttar Pradesh";
            } else if (cityLower.contains("bengaluru") || cityLower.contains("bangalore")) {
                state = "Karnataka";
            } else if (cityLower.contains("mumbai") || cityLower.contains("pune")) {
                state = "Maharashtra";
            } else if (cityLower.contains("delhi")) {
                state = "Delhi";
            } else if (cityLower.contains("kolkata")) {
                state = "West Bengal";
            } else if (cityLower.contains("chennai")) {
                state = "Tamil Nadu";
            } else if (cityLower.contains("hyderabad")) {
                state = "Telangana";
            }
        }
        res.setState(state);
        return res;
    }
}
