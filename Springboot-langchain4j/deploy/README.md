# Springboot-langchain4j 部署指南

## 系统要求
- JDK 17 或更高版本
- MySQL 8.0 或更高版本
- Maven 3.6 或更高版本
- 高德地图 API 密钥

## 部署步骤

1. 配置数据库
```sql
CREATE DATABASE data;
USE data;
-- 执行数据库初始化脚本
```

2. 配置环境变量
```bash
# 编辑 application.properties
vim /opt/Springboot-langchain4j/application.properties

# 确保以下配置正确：
spring.datasource.url=jdbc:mysql://localhost:3308/data
spring.datasource.username=root
spring.datasource.password=your_password
gaode.api.key=your_gaode_api_key
```

3. 部署应用
```bash
# 给部署脚本添加执行权限
chmod +x deploy.sh

# 执行部署脚本
./deploy.sh
```

4. 配置系统服务
```bash
# 复制服务文件
cp Springboot-langchain4j.service /etc/systemd/system/

# 重新加载 systemd
systemctl daemon-reload

# 启动服务
systemctl start Springboot-langchain4j

# 设置开机自启
systemctl enable Springboot-langchain4j
```

5. 验证部署
```bash
# 检查服务状态
systemctl status Springboot-langchain4j

# 查看日志
tail -f /opt/Springboot-langchain4j/app.log
```

## 访问应用
- 登录页面：http://your-server-ip:8080/login
- 主页面：http://your-server-ip:8080/index

## 故障排除
1. 检查日志文件
```bash
tail -f /opt/Springboot-langchain4j/app.log
```

2. 检查服务状态
```bash
systemctl status Springboot-langchain4j
```

3. 重启服务
```bash
systemctl restart Springboot-langchain4j
```

## 注意事项
- 确保服务器防火墙开放 8080 端口
- 确保数据库服务正常运行
- 确保高德地图 API 密钥有效
- 定期备份数据库 