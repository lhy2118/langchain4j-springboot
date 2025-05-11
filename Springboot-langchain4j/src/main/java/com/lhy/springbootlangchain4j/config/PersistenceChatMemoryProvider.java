package com.lhy.springbootlangchain4j.config;
import com.lhy.springbootlangchain4j.pojo.ChatMemoryEntity;
import com.lhy.springbootlangchain4j.mapper.ChatMemoryMapper;
import dev.langchain4j.data.message.ChatMessage;
import dev.langchain4j.data.message.ChatMessageDeserializer;
import dev.langchain4j.data.message.ChatMessageSerializer;
import dev.langchain4j.store.memory.chat.ChatMemoryStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;

@Component
public class PersistenceChatMemoryProvider implements ChatMemoryStore {

    private final ChatMemoryMapper chatMemoryMapper;

    @Autowired
    public PersistenceChatMemoryProvider(ChatMemoryMapper chatMemoryMapper) {
        this.chatMemoryMapper = chatMemoryMapper;
    }

    @Override
    public List<ChatMessage> getMessages(Object memoryId) {
        String memoryIdStr = String.valueOf(memoryId);
        try {

            ChatMemoryEntity entity = chatMemoryMapper.findEntityById(memoryIdStr);

            if (entity != null && entity.getMessagesJson() != null && !entity.getMessagesJson().trim().isEmpty()) {

                return ChatMessageDeserializer.messagesFromJson(entity.getMessagesJson());
            }

            return Collections.emptyList();

        } catch (Exception e) {

            System.err.println("错误 信息" + memoryIdStr + ": " + e.getMessage());
            e.printStackTrace();
            return Collections.emptyList();
        }
    }

    @Override
    public void updateMessages(Object memoryId, List<ChatMessage> messages) {
        String memoryIdStr = String.valueOf(memoryId);
        try {

            String messagesJson = ChatMessageSerializer.messagesToJson(messages);

            chatMemoryMapper.upsertMessages(memoryIdStr, messagesJson);

        } catch (Exception e) {

            System.err.println("错误 " + memoryIdStr + ": " + e.getMessage());
            e.printStackTrace();
        }
    }

    @Override
    public void deleteMessages(Object memoryId) {
        String memoryIdStr = String.valueOf(memoryId);
        try {

            chatMemoryMapper.deleteById(memoryIdStr);

        } catch (Exception e) {

            System.err.println("错误 " + memoryIdStr + ": " + e.getMessage());
            e.printStackTrace();
        }
    }
}
