package com.logistore.service;

import com.logistore.model.User;
import com.logistore.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    public Optional<User> getUserById(String id) {
        return userRepository.findById(id);
    }

    public Optional<User> getUserByPhone(String phone) {
        return userRepository.findByPhone(phone);
    }

    public User updateUser(String id, User userData) {
        return userRepository.findById(id).map(user -> {
            if (userData.getName() != null)
                user.setName(userData.getName());
            if (userData.getSurname() != null)
                user.setSurname(userData.getSurname());
            if (userData.getEmail() != null)
                user.setEmail(userData.getEmail());
            if (userData.getBirthDate() != null)
                user.setBirthDate(userData.getBirthDate());
            return userRepository.save(user);
        }).orElse(null);
    }
}
