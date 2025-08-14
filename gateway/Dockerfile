FROM maven:3.9.6-eclipse-temurin-17 AS build
WORKDIR /app
COPY demo/ .
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
COPY --from=build /app/src/main/resources/application.yml .
COPY --from=build /app/src/main/resources/application.properties .
EXPOSE 8080
CMD ["java", "-jar", "app.jar"] 