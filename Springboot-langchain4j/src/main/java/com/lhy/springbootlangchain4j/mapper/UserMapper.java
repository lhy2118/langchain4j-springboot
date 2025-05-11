package com.lhy.springbootlangchain4j.mapper;

import com.lhy.springbootlangchain4j.pojo.User;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {

        User findByAccount(@Param("account") String account);

}
