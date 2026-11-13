FROM maven:3.10-eclipse-temurin-25-alpine@sha256:908342738213796918a85cffc2065924ba82e4a9ab87d2756073e01da6b05d78 AS build
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:go-offline
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:25-jdk-alpine@sha256:c7c3d0bdf7f2bbc5a05a6712ed334d198360105634ea9adf76fca94f381b1e3f
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
