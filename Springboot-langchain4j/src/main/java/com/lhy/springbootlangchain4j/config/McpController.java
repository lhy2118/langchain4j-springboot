package com.lhy.springbootlangchain4j.config;

import dev.langchain4j.mcp.McpToolProvider;
import dev.langchain4j.mcp.client.DefaultMcpClient;
import dev.langchain4j.mcp.client.McpClient;
import dev.langchain4j.mcp.client.transport.McpTransport;
import dev.langchain4j.mcp.client.transport.stdio.StdioMcpTransport;
import dev.langchain4j.service.tool.ToolProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


import java.util.List;
import java.util.Map;


@Configuration
public class McpController {

    @Value("${gaode.api.key}")
    private String gaodeApiKey;
    @Value("${Puppeteer.edgeExecutable.path}")
    private String edgeExecutablePath;
    //配置GAoDe的MCPService信息
    @Bean
    public McpClient GaoDeClient(){

        McpTransport transport = new StdioMcpTransport.Builder()
                .command(List.of("cmd",
                        "/c",
                        "npx",
                        "-y",
                        "@amap/amap-maps-mcp-server"))
                .environment(Map.of("AMAP_MAPS_API_KEY",gaodeApiKey))
                .logEvents(true)
                .build();
        McpClient client = new DefaultMcpClient.Builder()
                .transport(transport)
                .build();
        return client;
    }

    @Bean
    public McpClient FileTreatmentClient(){
        McpTransport transport = new StdioMcpTransport.Builder()
                .command(List.of("cmd",
                        "/c",
                        "npx",
                        "-y",
                        "@modelcontextprotocol/server-filesystem" ,
                        "D:\\"
                ))
                .logEvents(true)
                .build();
        McpClient client = new DefaultMcpClient.Builder()
                .transport(transport)
                .build();
        return client;
    }

//    @Bean
//    public McpClient PlayWrightClient(){
//        McpTransport transport = new StdioMcpTransport.Builder()
//                .command(List.of("cmd",
//                        "/c",
//                        "npx",
//                        "@playwright/mcp@latest",
//                        "--headless"))
//                .logEvents(true)
//                .build();
//        McpClient client = new DefaultMcpClient.Builder()
//                .transport(transport)
//                .build();
//        return client;
//    }

    @Bean
    public McpClient PuppeteerClient(){
        String puppeteerLaunchOptionsJson = String.format(
                "{ \"headless\": false, \"executablePath\": \"%s\", \"args\": [] }",
                edgeExecutablePath
        );
        McpTransport transport = new StdioMcpTransport.Builder()
                .command(List.of("cmd",
                        "/c",
                        "npx",
                        "@modelcontextprotocol/server-puppeteer"
                ))
                .environment(Map.of("PUPPETEER_LAUNCH_OPTIONS", puppeteerLaunchOptionsJson))
                .logEvents(true)
                .build();
        McpClient client = new DefaultMcpClient.Builder()
                .transport(transport)
                .build();
        return client;
    }
//
//    @Bean
//    public McpClient EdgeOnePagesClient(){
//        McpTransport transport = new StdioMcpTransport.Builder()
//                .command(List.of("cmd",
//                        "/c",
//                        "npx",
//                        "edgeone-pages-mcp"))
//                .logEvents(true)
//                .build();
//        McpClient client = new DefaultMcpClient.Builder()
//                .transport(transport)
//                .build();
//        return client;
//    }

    @Bean
    public McpClient SequentialThinkingClient(){
        McpTransport transport = new StdioMcpTransport.Builder()
                .command(List.of("cmd",
                        "/c",
                        "npx",
                        "-y",
                        "@modelcontextprotocol/server-sequential-thinking"))
                .logEvents(true)
                .build();
        McpClient client = new DefaultMcpClient.Builder()
                .transport(transport)
                .build();
        return client;
    }

    //配置总的MCP服务的工具提供器
    @Bean
    public ToolProvider mcpToolProvider(List<McpClient> clients){
        return  McpToolProvider.builder()
                .mcpClients(clients)
                .build();
    }
}
