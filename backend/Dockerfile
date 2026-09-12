FROM maven:3.9-eclipse-temurin-25-alpine@sha256:d4517045882c5e7459afbfab27ada9c682a0da6f15e96c4bb52a8597d5e3c2b8 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:25-jdk-alpine@sha256:09349d79941fd53bb3d487b393ca118d8853c08c09193f416fe6a8718df9e732
VOLUME /tmp
WORKDIR /app
RUN mkdir -p /app/data
ARG APP_GIT_TAG=dev
ARG APP_GIT_COMMIT=unknown
ARG APP_BUILD_TIME=unknown
ENV APP_GIT_TAG=${APP_GIT_TAG}
ENV APP_GIT_COMMIT=${APP_GIT_COMMIT}
ENV APP_BUILD_TIME=${APP_BUILD_TIME}
COPY --from=build /app/target/*.jar app.jar
ENTRYPOINT ["java","--enable-preview","-jar","app.jar"]
