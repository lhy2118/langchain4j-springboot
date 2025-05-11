package com.lhy.springbootlangchain4j.mapper;

import com.lhy.springbootlangchain4j.pojo.ChatMemoryEntity;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ChatMemoryMapper {

    //根据 memoryId 查询完整的 ChatMemoryEntity 对象。
    ChatMemoryEntity findEntityById(@Param("memoryId") String memoryId);
    //插入或更新记录
    int upsertMessages(@Param("memoryId") String memoryId, @Param("messagesJson") String messagesJson);
    //删除memoryId记录
    int deleteById(@Param("memoryId") String memoryId);
}
