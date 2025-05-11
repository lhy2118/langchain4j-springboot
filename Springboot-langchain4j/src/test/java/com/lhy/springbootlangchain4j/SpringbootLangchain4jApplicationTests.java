package com.lhy.springbootlangchain4j;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.community.model.dashscope.QwenChatModel;
import dev.langchain4j.community.model.dashscope.QwenEmbeddingModel;
import dev.langchain4j.community.model.dashscope.QwenStreamingChatModel;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.langchain4j.model.embedding.EmbeddingModel;
import dev.langchain4j.model.openai.OpenAiEmbeddingModel;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import reactor.core.publisher.Flux;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

@SpringBootTest
class SpringbootLangchain4jApplicationTests {
//    @Value("${aliyun.api.key}")
//    private String apiKey;
//    @Value("${aliyun.model3.name}")
//    private String embeddingModel;
//    private HttpClient httpClient = HttpClient.newHttpClient();
//    private ObjectMapper objectMapper = new ObjectMapper();

//    @Test
//    void contextLoads() {
//        QwenChatModel model = QwenChatModel.builder()
//                .apiKey(apiKey)
//                .modelName(embeddingModel)
//                .build();
//        System.out.println(model.chat("你好今天天气好吗"));
//
//    }

    @Test
    void fiux(){
        Flux<Integer> flux = Flux.just(1, 2, 3, 4, 5);
        flux.subscribe(i-> System.out.println(i));
    }

}
