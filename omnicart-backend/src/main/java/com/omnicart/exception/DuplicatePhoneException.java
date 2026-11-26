package com.omnicart.exception;

public class DuplicatePhoneException extends RuntimeException {
    public DuplicatePhoneException(String phone) {
        super("Phone number already registered: " + phone);
    }
}
