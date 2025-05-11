package com.lhy.springbootlangchain4j.controller;


import com.lhy.springbootlangchain4j.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.Mapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;


@Controller
public class WebController {

    @Autowired
    private UserService userService;

    @GetMapping("/")
    public String index() {
        return "login";
    }

    @GetMapping("/index")
    public String index2() {
        return "index";
    }
    @PostMapping("/loginForm")
    public String loginForm(@RequestParam String account, @RequestParam String password) {
       return userService.login(account,password);
    }
}
