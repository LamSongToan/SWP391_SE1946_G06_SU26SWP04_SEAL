# === BƯỚC 1: ĐÓNG GÓI ỨNG DỤNG (BUILD STAGE) ===
# Dùng hình ảnh Maven chính thức tích hợp sẵn OpenJDK 21 siêu ổn định
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app

# Copy toàn bộ mã nguồn backend vào trong môi trường ảo Docker
COPY . .

# Chạy lệnh Maven để biên dịch và đóng gói dự án thành file .jar (Bỏ qua chạy test để build nhanh hơn)
RUN mvn clean package -DskipTests

# === BƯỚC 2: KHỞI CHẠY ỨNG DỤNG (RUN STAGE) ===
# Dùng JRE 21 bản Alpine siêu nhẹ (chỉ khoảng 50MB) giúp tiết kiệm RAM cho gói Render Free
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Lấy file .jar vừa được build xong ở Bước 1 bỏ sang Bước 2
COPY --from=build /app/target/*.jar app.jar

# Mở cổng mạng 8080 để Render có thể truy cập vào
EXPOSE 8080

# Câu lệnh chạy ứng dụng: Ép hệ thống luôn bật cấu hình 'prod' để đọc file application-prod.properties kết nối Azure SQL
ENTRYPOINT ["java", "-Xmx300m", "-Xms300m", "-jar", "-Dspring.profiles.active=prod", "-Dserver.port=${PORT:8080}", "app.jar"]
