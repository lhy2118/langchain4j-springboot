#!/bin/bash

# 停止已运行的实例
echo "Stopping existing application..."
pkill -f "Springboot-langchain4j"

# 清理旧的构建文件
echo "Cleaning old build files..."
rm -rf target/

# 构建项目
echo "Building project..."
mvn clean package -DskipTests

# 创建部署目录
echo "Creating deployment directory..."
mkdir -p /opt/Springboot-langchain4j

# 复制构建文件
echo "Copying build files..."
cp target/Springboot-langchain4j-0.0.1-SNAPSHOT.jar /opt/Springboot-langchain4j/
cp -r src/main/resources/static /opt/Springboot-langchain4j/
cp -r src/main/resources/templates /opt/Springboot-langchain4j/

# 启动应用
echo "Starting application..."
cd /opt/Springboot-langchain4j
nohup java -jar Springboot-langchain4j-0.0.1-SNAPSHOT.jar > app.log 2>&1 &

echo "Deployment completed!" 