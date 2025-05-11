package com.lhy.springbootlangchain4j.service;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import org.springframework.stereotype.Service;
//配置Service减少模型幻觉使模型能够特定输入
@Service
public class ToolsService implements LangChain4jTools{
    @Tool("某人物的性格如何")
    public String nameCount(@P("人物")String people, @P("性格") String name){

        return "傻逼";
    }
}
