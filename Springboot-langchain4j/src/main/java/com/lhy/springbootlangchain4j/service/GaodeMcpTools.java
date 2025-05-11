package com.lhy.springbootlangchain4j.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import dev.langchain4j.agent.tool.P;
import dev.langchain4j.agent.tool.Tool;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


@Service
public class GaodeMcpTools implements LangChain4jTools {
    private static final Logger log = LoggerFactory.getLogger(GaodeMcpTools.class);

    @Value("${gaode.api.key}")
    private String apiKey;
    @Value("${gaode.geo.url}")
    private String geoUrl;
    @Value("${gaode.walking.url}")
    private String walkingUrl;
    @Value("${gaode.weather.url}")
    private String weatherUrl;
    @Value("${geode.district.url}")
    private String districtUrl;

    private final HttpClient httpClient = HttpClient.newHttpClient();
    private final ObjectMapper objectMapper = new ObjectMapper();


    @Tool("使用高德地图精确查询地点、区域或详细地址的经纬度坐标。可以指定城市")
    public String getAddress(@P("详细地址") String addressm, @P("城市") String city) {

        try {
            // 1. 构建 URL (暂时保持不变)
            StringBuilder urlBuilder = new StringBuilder(geoUrl);
            urlBuilder.append("?key=").append(apiKey);
            urlBuilder.append("&address=").append(URLEncoder.encode(addressm, StandardCharsets.UTF_8));
            urlBuilder.append("&output=JSON");
            if (city != null && !city.isBlank()) {
                urlBuilder.append("&city=").append(URLEncoder.encode(city, StandardCharsets.UTF_8));
            }
            String url = urlBuilder.toString();
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(Duration.ofSeconds(10))
                    .GET()
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            JsonNode rootNode = objectMapper.readTree(response.body());
            JsonNode geocodes = rootNode.path("geocodes");
            if (geocodes.isArray() && !geocodes.isEmpty()) {
                return geocodes.get(0).path("location").asText();
            }
            log.warn("未找到地址 '{}' 的坐标。", addressm);
            return String.format("未找到地址 '%s' 对应的坐标。", addressm);
        } catch (NullPointerException e) {
            log.error("处理地理编码时发生空指针异常，可能是输入参数 addressm 为 null: {}", e.getMessage(), e);
            return "错误：输入参数无效（地址可能为空），无法进行地理编码。";
        } catch (IOException e) {
            log.error("调用高德 API 时发生 IO 异常: {}", e.getMessage(), e);
            return "错误：与高德地图服务通信时发生网络或数据解析错误。";
        } catch (InterruptedException e) {
            log.warn("调用高德 API 时线程被中断: {}", e.getMessage());
            Thread.currentThread().interrupt();
            return "错误：查询高德地图的操作被中断。";
        } catch (Exception e) {
            log.error("处理地理编码时发生未知错误: {}", e.getMessage(), e);
            return "错误：处理地理编码请求时发生未知内部错误。";
        }
    }

    @Tool("使用高德地图根据出发地和目的地的详细地址可以规划路径")
    public String getRoute(@P("出发地") String start, @P("目的地") String end) throws IOException, InterruptedException {
        String information = null;
        if (start == null || end == null) {
            log.error("出发地或目的地为空。");
            information = "出发地或目的地为空。";
        }


        String startLocation = getAddress(start, null);
        String endLocation = getAddress(end, null);
        if (startLocation == null || endLocation == null) {

            log.error("出发地或目的地坐标转化出错");
            information = "出发地或目的地坐标转化出错";
        }
        StringBuilder urlBuilder = new StringBuilder(walkingUrl);
        urlBuilder.append("?key=").append(apiKey);
        urlBuilder.append("&origin=").append(startLocation);
        urlBuilder.append("&destination=").append(endLocation);

        String url = urlBuilder.toString();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode rootNode = objectMapper.readTree(response.body());

        information = rootNode.toString();
        return information;
    }

//    @Tool("使用高德地图获取地区的编码")
//    public String getDistrictAdcode(@P("地区") String keywords, @P("单独的省或者自治区名字") String district) throws IOException, InterruptedException { // Renamed for clarity
//
//        String information = "";
//        int subdistrict = 0;
//        if (keywords.endsWith("省") || keywords.endsWith("自治区")) {
//            subdistrict = 0;
//        } else if (keywords.endsWith("市")) {
//            subdistrict = 1;
//        } else if (keywords.endsWith("区") || keywords.endsWith("县")) {
//            subdistrict = 2;
//        } else {
//            subdistrict = 3;
//        }
//
//
//        StringBuilder urlBuilder = new StringBuilder(districtUrl);
//        urlBuilder.append("?key=").append(apiKey);
//        urlBuilder.append("&keywords=").append(URLEncoder.encode(district, StandardCharsets.UTF_8));
//        urlBuilder.append("&subdistrict=").append(subdistrict);
//        urlBuilder.append("&extensions=base");
//
//        String url = urlBuilder.toString();
//        System.out.println(url);
//        System.out.println(keywords);
//        HttpRequest request = HttpRequest.newBuilder()
//                .uri(URI.create(url))
//                .timeout(Duration.ofSeconds(15))
//                .GET()
//                .build();
//
//        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
//
//        JsonNode rootNode = objectMapper.readTree(response.body());
//
//        JsonNode districtsNode = rootNode.path("districts");
//        if (districtsNode.isArray() && !districtsNode.isEmpty()) {
//            JsonNode firstDistrict = districtsNode.get(0);
//            String adcode = firstDistrict.path("adcode").asText();
//            if (!adcode.isEmpty() && !adcode.equals("[]")) {
//                information = adcode;
//            } else
//                information = "不存在";
//
//        } else
//            information = "未找到相关信息";
//        return information;
//    }

    @Tool("使用高德地图查询某地的天气，从本地知识库中获取到这个地点对应的行政区划代码")
    public String getWeather(@P("行政区划代码") String city) throws IOException, InterruptedException {
        String information = "";
        String lives = "";
        String forecast = "";
        System.out.println(city);
        StringBuilder urlBuilder = new StringBuilder(weatherUrl);
        urlBuilder.append("?key=").append(apiKey);
        urlBuilder.append("&city=").append(city);

        String url = urlBuilder.toString();
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        JsonNode root = objectMapper.readTree(response.body());
        if (root.hasNonNull("lives") && root.path("lives").isArray() && root.path("lives").size() > 0) {
            lives = root.path("lives").get(0).toString();
            if (root.hasNonNull("forecasts") && root.path("forecasts").isArray() && root.path("forecasts").size() > 0) {
                forecast = root.path("forecasts").get(0).toString();
                information = lives + forecast;
            } else
                information = lives+"未找到该地点的天气预报信息";
        }
        else
            information = "未找到该地点的天气信息";
        System.out.println(information);
        return information;
    }

}
