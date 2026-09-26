FROM maven:3.9-eclipse-temurin-25-alpine@sha256:781f1da87cd3d142e66e47cc149c4582a652fb7f574648206d1e956170c0dc90 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:25-jdk-alpine@sha256:3fd2d245c4e0eba615fe366a71b8bd25f5db7104f53e4026b24bf508b880bd2a
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
