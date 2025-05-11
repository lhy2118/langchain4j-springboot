package com.lhy.springbootlangchain4j.service;

import com.lhy.springbootlangchain4j.mapper.UserMapper;
import com.lhy.springbootlangchain4j.pojo.User;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

@Service
public class UserService {

    private final UserMapper userMapper;

    @Autowired
    public UserService(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    public String login(String account, String password) {
        User user = userMapper.findByAccount(account);
        if (user == null) {
            return "login";
        }
        if (!user.getPassword().equals(password)) {
            return "login";
        }
        return "index";
    }
}
