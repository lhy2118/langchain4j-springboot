package com.lhy.springbootlangchain4j.service;

import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;
import org.springframework.stereotype.Service;

import java.io.*;

@Service
public class DocumentTool implements LangChain4jTools{

    @Tool("将某路径下的某文件文件复制到另外某路径下")
    public String copyFile(@P("源路径") String sourcePath, @P("源文件名") String sourceFileName, @P("目标路径") String targetPath) throws IOException {
        String operation = null;
        File sourceFilePath = new File(sourcePath+"\\"+sourceFileName);
        File targetFilePath = new File(targetPath+"\\"+sourceFileName);


            BufferedInputStream bufferedInputStream = new BufferedInputStream(new FileInputStream(sourceFilePath));
            BufferedOutputStream bufferedOutputStream = new BufferedOutputStream(new FileOutputStream(targetFilePath));

            byte[] bytes = new byte[1024];
            int len =0;

            while ((len = bufferedInputStream.read(bytes))!=-1){
                bufferedOutputStream.write(bytes,0,len);
            }

            bufferedInputStream.close();
            bufferedOutputStream.close();


        if(targetFilePath.exists())
            operation = "复制成功";
        else
            operation = "复制失败";
        return operation;
    }

    @Tool("将某路径下的某文件文件删除")
    public String deleteFile(@P("文件的绝对路径") String filePath) {
        File file = new File(filePath);
        String operation = null;
        if(file.exists()) {
            if (file.delete())
                operation = "删除成功";
            else
                operation = "删除失败";
        }
        else
            operation = "文件不存在";
        return operation;
    }

    @Tool("将某路径下的添加某文件")
    public String addFile(@P("文件的绝对路径") String filePath) throws IOException {
        File file = new File(filePath);
         String operation = null;
        if(file.exists())
            operation = "文件已存在";
        else{
            if(file.createNewFile())
                operation = "添加成功";
            else
                operation = "添加失败";
        }
        return operation;
    }

    @Tool("将某路径下的某文件移动到另一路径下")
    public String moveFile(@P("源路径") String sourcePath, @P("源文件名") String sourceFileName, @P("目标路径") String targetPath) throws IOException {
        String operation = null;
        File sourceFilePath = new File(sourcePath+"\\"+sourceFileName);
        File targetFilePath = new File(targetPath+"\\"+sourceFileName);


             BufferedInputStream bufferedInputStream = new BufferedInputStream(new FileInputStream(sourceFilePath));
             BufferedOutputStream bufferedOutputStream = new BufferedOutputStream(new FileOutputStream(targetFilePath));

            byte[] bytes = new byte[1024];
            int len =0;

            while ((len = bufferedInputStream.read(bytes))!=-1){
                bufferedOutputStream.write(bytes,0,len);
            }

            bufferedInputStream.close();
            bufferedOutputStream.close();

        if(targetFilePath.exists()){
            sourceFilePath.delete();
            operation = "移动成功";
        }
        else
            operation = "移动失败";
        return operation;
    }

}
