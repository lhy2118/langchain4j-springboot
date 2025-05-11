# MCP智能服务平台

## 项目简介

MCP智能服务平台是一个基于SpringBoot + WebFlux + LangChain4j + MyBatis的响应式多模型多模态AI服务框架。该平台采用现代化的响应式编程范式，提供高性能、可扩展的AI服务集成解决方案。

## 核心特性

### 🧠 多模型接入
- 支持同时接入多种大语言模型
- 实现智能交互、文本生成和知识推理
- 灵活的模型调度和管理机制

### 🎨 多模态处理
- 处理文本、图像、语音等多种数据类型
- 提供全方位智能交互体验
- 统一的多模态数据处理流程

### 🗺️ 地理信息集成
- 集成高德地图API
- 提供位置服务、路线规划功能
- 支持地理编码等地理信息服务

### ⚡ 响应式架构
- 基于Spring WebFlux的非阻塞I/O模型
- 高效的流式数据处理能力
- 优异的系统吞吐量和伸缩性

## 技术栈

- **Spring Boot** (3.x) - 应用框架
- **Spring WebFlux** - 响应式Web框架
- **LangChain4j** - AI编排框架
- **MyBatis** - 数据访问层
- **Maven** (3.6+) - 项目管理工具
- **Java** (17+) - 开发语言

## 系统架构

### 工作流程

1. **用户请求**
   - 通过前端界面发起文本、图像或语音请求
   - 支持多种输入模态

2. **WebFlux处理**
   - 非阻塞式请求接收
   - 高效请求分发机制

3. **LangChain4j编排**
   - 智能模型选择
   - 服务编排和调度

4. **模型交互与数据处理**
   - 大模型API调用
   - 地理信息服务集成
   - 数据持久化处理

5. **响应式返回**
   - 流式数据返回
   - 异步响应机制

## 开发环境要求

- JDK 17 或更高版本
- MySQL 8.0.20 或更高版本
- Maven 3.6 或更高版本
- Node.js v18.19.0
- IntelliJ IDEA (推荐)
- 高德地图 API 密钥

## 部署指南

### 本地部署

```bash
# 1. 克隆项目仓库
git clone [repository-url]

# 2. 配置application.yml
# 设置数据库连接信息和API密钥

# 3. Maven构建
mvn clean package

# 4. 运行应用
java -jar target/mcp-service.jar
```

### Docker部署

```bash
# 构建Docker镜像
docker build -t mcp-service .

# 运行容器
docker run -p 8080:8080 mcp-service
```

## 配置说明

```properties
# 数据库配置
spring.datasource.url=jdbc:mysql://localhost:3308/data
spring.datasource.username=root
spring.datasource.password=your_password

# API配置
gaode.api.key=your_gaode_api_key
```

### 性能优化
- 深度优化响应式数据链路
- 引入分布式缓存与消息队列
- 探索 GraalVM AOT 编译

## 注意事项

- 确保服务器防火墙开放 8080 端口
- 定期进行数据库备份
- 确保API密钥的有效性和安全性
- 监控系统资源使用情况


## 联系方式

- GitHub: [项目仓库地址]
- 问题反馈: [Issues页面] 
