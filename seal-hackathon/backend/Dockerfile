# Bước 1: Dùng Maven image chính thức với JDK 21 để build file .jar
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Bước 2: Dùng JDK 21 siêu nhẹ để chạy ứng dụng nhằm tiết kiệm RAM cho gói Free
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]