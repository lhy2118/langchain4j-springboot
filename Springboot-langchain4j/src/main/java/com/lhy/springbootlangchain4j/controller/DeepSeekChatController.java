package com.lhy.springbootlangchain4j.controller;


import com.lhy.springbootlangchain4j.config.OpenaiModel;
import dev.langchain4j.data.image.Image;
import dev.langchain4j.model.chat.response.ChatResponse;
import dev.langchain4j.model.chat.response.StreamingChatResponseHandler;
import dev.langchain4j.model.image.ImageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;

import dev.langchain4j.model.output.Response;
import dev.langchain4j.service.TokenStream;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import reactor.core.publisher.Flux;

import java.time.LocalDate;

//使用
@RestController
@RequestMapping("/deepseek")
@CrossOrigin(origins = "*", allowedHeaders = "*")
public class DeepSeekChatController {
    private  final OpenAiChatModel chatModel; // 注入非流式模型
    private  final OpenAiStreamingChatModel streamingChatModel; // 注入流式模型
    private  final ImageModel imageModel;//注入图片模型
    private  final OpenaiModel.Assistant assistant;//注入聊天记忆助手内部接口
    private  final OpenaiModel.AssistantId assistantId;//注入对话隔离聊天记忆助手内部接口
    private  final OpenaiModel.AssistantIdSql assistantIdSql;//注入用于将对话内容存储到数据库的助手接口
    //使用构造方法注入流式模型，非流式模型
    @Autowired
    public DeepSeekChatController(OpenAiChatModel chatModel,
                                  OpenAiStreamingChatModel streamingChatModel, ImageModel imageModel,
                                  OpenaiModel.Assistant assistant,
                                  OpenaiModel.AssistantId assistantId, OpenaiModel.AssistantIdSql assistantIdSql) {
        this.chatModel = chatModel;
        this.streamingChatModel = streamingChatModel;
        this.imageModel = imageModel;
        this.assistant = assistant;
        this.assistantId = assistantId;
        this.assistantIdSql = assistantIdSql;
    }

    //非流式响应
    @RequestMapping("/chat")
    public String chat(@RequestParam("content") String question) {
           return chatModel.chat(question);
    }

    //流式响应
    @RequestMapping(value = "/stream", produces = "text/event-stream;charset=UTF-8")
    public Flux<String> streamingChat(@RequestParam("content") String question) {
        return Flux.create(fluxSink -> {
            StreamingChatResponseHandler handler = new StreamingChatResponseHandler() {
                @Override
                public void onPartialResponse(String partialResponse) {
                    fluxSink.next(partialResponse);
                }

                @Override
                public void onCompleteResponse(ChatResponse completeResponse) {
                    fluxSink.complete();
                }

                @Override
                public void onError(Throwable error) {
                    fluxSink.error(error);
                }
            };

            try {
                streamingChatModel.chat(question, handler);
            } catch (Exception e) {
                fluxSink.error(e);
            }
        });
    }
//    @RequestMapping("stream")
//    public void streamingChat(@RequestParam("content") String question) {
//          streamingChatModel.chat(question, new StreamingChatResponseHandler() {
//              @Override
//              public void onPartialResponse(String partialResponse) {
//                  System.out.println(partialResponse);
//              }
//
//              @Override
//              public void onCompleteResponse(ChatResponse completeResponse) {
//                  System.out.println(completeResponse);
//              }
//
//              @Override
//              public void onError(Throwable error) {
//                  error.printStackTrace();
//              }
//          });
//    }
    //非流式实现聊天记忆
    @RequestMapping("chatMemory")
    public String chatMemory(@RequestParam("content") String question) {
        return assistant.chat(question);
    }
    //流式实现聊天记忆
    @RequestMapping(value = "streamChatMemory", produces = "text/event-stream;charset=UTF-8")
    public Flux<String> streamChatMemory(@RequestParam("content") String question) {
        TokenStream tokenStream = assistant.streamChat(question, LocalDate.now().toString());
        return Flux.create(sink -> {
            tokenStream.onPartialResponse(token -> sink.next(token));
            tokenStream.onCompleteResponse(chatResponse -> sink.complete());
            tokenStream.onError(sink::error).start();
        });
    }
    //非流式对话隔离
    @RequestMapping("chatMemoryId")
    public String chatMemoryId(@RequestParam("content") String question, @RequestParam("id") Integer memoryId) {
        return assistantId.chat( memoryId, question );
    }
    //流式对话隔离
    @RequestMapping(value = "streamChatMemoryId", produces = "text/event-stream;charset=UTF-8")
    public Flux<String> streamChatMemoryId(@RequestParam("content") String question, @RequestParam("id") Integer memoryId) {
        TokenStream tokenStream = assistantId.streamChat( memoryId, question );
        return Flux.create(sink -> {
            tokenStream.onPartialResponse(token -> sink.next(token));
            tokenStream.onCompleteResponse(chatResponse -> sink.complete());
            tokenStream.onError(sink::error).start();
        });
    }
    //将聊天数据存储到数据库
    @RequestMapping(value = "streamChatMemoryIdSql", produces = "text/event-stream;charset=UTF-8")
    public Flux<String> streamChatMemoryIdSql(@RequestParam("content") String question, @RequestParam("id") Integer memoryId) {
        TokenStream tokenStream = assistantIdSql.streamChat( memoryId, question );
        return Flux.create(sink -> {
            tokenStream.onPartialResponse(token -> sink.next(token));
            tokenStream.onCompleteResponse(chatResponse -> sink.complete());
            tokenStream.onError(sink::error).start();
        });
    }
    @RequestMapping("imageChat")
    public String imageChat(@RequestParam("content") String question) {
        Response<Image> response = imageModel.generate(question);
        return response.content().url().toString();
    }
}
