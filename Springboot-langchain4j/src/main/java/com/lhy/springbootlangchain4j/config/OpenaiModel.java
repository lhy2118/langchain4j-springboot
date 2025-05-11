package com.lhy.springbootlangchain4j.config;
import com.alibaba.dashscope.assistants.Assistant;
import com.lhy.springbootlangchain4j.service.DocumentTool;
import com.lhy.springbootlangchain4j.service.GaodeMcpTools;
import com.lhy.springbootlangchain4j.service.LangChain4jTools;
import com.lhy.springbootlangchain4j.service.ToolsService;
import dev.langchain4j.community.model.dashscope.QwenEmbeddingModel;
import dev.langchain4j.community.model.dashscope.QwenModelName;
import dev.langchain4j.community.model.dashscope.QwenStreamingChatModel;
import dev.langchain4j.community.model.dashscope.WanxImageModel;
import dev.langchain4j.data.document.Document;
import dev.langchain4j.data.document.loader.ClassPathDocumentLoader;

import dev.langchain4j.data.document.splitter.DocumentBySentenceSplitter;
import dev.langchain4j.data.embedding.Embedding;
import dev.langchain4j.data.segment.TextSegment;
import dev.langchain4j.memory.chat.ChatMemoryProvider;
import dev.langchain4j.memory.chat.MessageWindowChatMemory;
import dev.langchain4j.model.chat.ChatLanguageModel;
import dev.langchain4j.model.chat.StreamingChatLanguageModel;
import dev.langchain4j.model.embedding.DimensionAwareEmbeddingModel;
import dev.langchain4j.model.image.ImageModel;
import dev.langchain4j.model.openai.OpenAiChatModel;
import dev.langchain4j.model.openai.OpenAiImageModel;
import dev.langchain4j.model.openai.OpenAiStreamingChatModel;
import dev.langchain4j.rag.content.retriever.EmbeddingStoreContentRetriever;
import dev.langchain4j.service.*;

import dev.langchain4j.service.tool.ToolProvider;
import dev.langchain4j.store.embedding.EmbeddingStore;
import dev.langchain4j.store.embedding.inmemory.InMemoryEmbeddingStore;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import java.util.Collection;
import java.util.List;


//创建扫描器
@Configuration

public class OpenaiModel {
    //设置模型api
    @Value("${deepseek.api.key}")
    private String apiKey;
    //设置模型访问地址
    @Value("${deepseek.base.url}")
    private String baseUrl;
    //设置响应模型名称
    @Value("${deepseek.chat.model}")
    private String modelName;
    //设置文档路径
    @Value("${documens.path}")
    private String documentsPath;
    //设置阿里向量模型api
    @Value("${aliyun.api.key}")
    private String embeddingApiKey;
    //设置阿里图片模型名称
    @Value("${aliyun.model.name}")
    private String alModelName;
    //设置实现模型记忆对话助理接口
    @Autowired
    private PersistenceChatMemoryProvider persistenceChatMemoryProvider;
    @Autowired
    private ApplicationContext applicationContext;


    public interface Assistant {
        String chat(String message);//实现非流式记忆对话
        @SystemMessage(fromResource = "prompt/my-prompt-template.txt")
        TokenStream streamChat(@UserMessage String message, @V("time")String dateTime );//实现流式记忆对话
    }

    //创建对话隔离助理接口并且实现模型记忆
    public interface AssistantId{

        String chat(@MemoryId int memory, @UserMessage String message);//实现非流式对话隔离
        TokenStream streamChat(@MemoryId int memory, @UserMessage String message);//实现流式对话隔离
    }

    //用于数据库的对话隔离助手接口
    public interface AssistantIdSql{

        String chat(@MemoryId int memory, @UserMessage String message);//实现非流式对话隔离
        TokenStream streamChat(@MemoryId int memory, @UserMessage String message);//实现流式对话隔离
    }


    // 非流式模型 Bean
    @Bean
    @Primary
    public OpenAiChatModel chatModel() {
        return OpenAiChatModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(modelName)
                .build();
    }

    // 流式模型 Bean
    @Bean
    @Primary
    public OpenAiStreamingChatModel streamingChatModel() {

        return OpenAiStreamingChatModel.builder()
                .baseUrl(baseUrl)
                .apiKey(apiKey)
                .modelName(modelName)
                .build();
    }


    //使用阿里图像模型
    @Bean
    public ImageModel imageModel(){
        return WanxImageModel.builder()
                .modelName(alModelName)
                .apiKey(embeddingApiKey)
                .build();
    }

    // 使用阿里的向量模型默认为text-embedding-v2
    @Bean
    public QwenEmbeddingModel embeddingModel() {
        return QwenEmbeddingModel.builder()
                .apiKey(embeddingApiKey)
                .build();
    }

//     使用阿里图像模型
//     将处理好的向量数据存入到内存向量数据库中
    @Bean
    public InMemoryEmbeddingStore<TextSegment> embeddingStore(DimensionAwareEmbeddingModel embeddingModel) {
        List<Document> documents = ClassPathDocumentLoader.loadDocuments(documentsPath);
        DocumentBySentenceSplitter splitter = new DocumentBySentenceSplitter(
                500,
                100
        );
        List<TextSegment> segments = splitter.splitAll(documents);
        List<Embedding> embeddings = embeddingModel.embedAll(segments).content();
        InMemoryEmbeddingStore<TextSegment> embeddingStore = new InMemoryEmbeddingStore<>();
        embeddingStore.addAll(embeddings,segments);
       return embeddingStore;
    }

    //记忆对话代理
    @Bean
    public Assistant assistant(ChatLanguageModel chatModel, StreamingChatLanguageModel streamingChatModel,
                               EmbeddingStore<TextSegment> embeddingStore, DimensionAwareEmbeddingModel embeddingModel
                               , ToolProvider toolProvider) {
        //构建Assistant动态代理     系统会在通过Assistant.class实现对接口的实现类从而返回接口
        Collection<LangChain4jTools> allToolsCollection = applicationContext.getBeansOfType(LangChain4jTools.class).values();
        Object[] toolsArray = allToolsCollection.toArray();
        Assistant assistant = AiServices.builder(Assistant.class)
                .chatLanguageModel(chatModel)//非流式语言模型
                .streamingChatLanguageModel(streamingChatModel)//流式语言模型
                .toolProvider(toolProvider)
                .chatMemory(MessageWindowChatMemory.withMaxMessages(8))//设置最大记忆轮次
                .contentRetriever(EmbeddingStoreContentRetriever.builder().
                        embeddingStore(embeddingStore)
                        .embeddingModel(embeddingModel)
                        .build())
                .build();
        return assistant;
    }

    //创建根据id实现对话隔离
    @Bean
    public AssistantId assistantId(ChatLanguageModel chatModel, StreamingChatLanguageModel streamingChatModel,
                                   EmbeddingStore<TextSegment> embeddingStore,DimensionAwareEmbeddingModel embeddingModel) {

        Collection<LangChain4jTools> allToolsCollection = applicationContext.getBeansOfType(LangChain4jTools.class).values();
        Object[] toolsArray = allToolsCollection.toArray();
          AssistantId assistantId = AiServices.builder(AssistantId.class)
                  .chatLanguageModel(chatModel)
                  .tools(toolsArray)
                  .streamingChatLanguageModel(streamingChatModel)
                  .chatMemoryProvider(memoryId -> MessageWindowChatMemory
                          .builder().maxMessages(8).id(memoryId).build()
                  )
                  .contentRetriever(EmbeddingStoreContentRetriever.builder()
                          .embeddingStore(embeddingStore)
                          .embeddingModel(embeddingModel)
                          .build())
                  .build();

                return assistantId;
    }

    //创建将对话内容存入到数据库中的助手类
    @Bean
    public AssistantIdSql assistantIdSql(ChatLanguageModel chatModel, StreamingChatLanguageModel streamingChatModel,
                                         EmbeddingStore<TextSegment> embeddingStore, DimensionAwareEmbeddingModel embeddingModel) {
        Collection<LangChain4jTools> allToolsCollection = applicationContext.getBeansOfType(LangChain4jTools.class).values();
        Object[] toolsArray = allToolsCollection.toArray();
        ChatMemoryProvider chatMemoryProvider = memoryId -> MessageWindowChatMemory
                    .builder()
                    .id(memoryId)
                    .maxMessages(8)
                    .chatMemoryStore(this.persistenceChatMemoryProvider)
                    .build();
            EmbeddingStoreContentRetriever contentRetriever = EmbeddingStoreContentRetriever.builder()
                    .embeddingStore(embeddingStore)
                    .embeddingModel(embeddingModel)
                    .build();
               AssistantIdSql assistantIdSql = AiServices.builder(AssistantIdSql.class)
                    .chatLanguageModel(chatModel)
                    .streamingChatLanguageModel(streamingChatModel).tools(toolsArray)
                    .chatMemoryProvider(chatMemoryProvider).contentRetriever(contentRetriever)
                    .build();

              return assistantIdSql;
    }

}
