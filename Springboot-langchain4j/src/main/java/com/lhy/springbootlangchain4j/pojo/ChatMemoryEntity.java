package com.lhy.springbootlangchain4j.pojo;
import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChatMemoryEntity {
    private Long id;
    private String memoryId;
    private String messagesJson;
    private LocalDateTime lastUpdated;

}
