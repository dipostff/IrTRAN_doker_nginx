FROM maven:3.9-eclipse-temurin-21 AS builder

WORKDIR /workspace
COPY pom.xml ./
RUN mvn -B -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:21-jre

WORKDIR /app
RUN useradd --system --uid 10001 --create-home spring
COPY --from=builder /workspace/target/ai-irtran-*.jar /app/ai-irtran.jar

USER spring
EXPOSE 8081

ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/ai-irtran.jar"]
