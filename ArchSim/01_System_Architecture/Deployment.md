# ArchSim Deployment Specification

This document details the containerization, Kubernetes configuration, and AWS target deployment infrastructure for ArchSim.

---

## 1. Containerization (Docker)
ArchSim is packaged into lightweight Docker images. Each service has a dedicated `Dockerfile` configured for multi-stage builds.

```dockerfile
# Example multi-stage Dockerfile for Spring Boot Backend
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
COPY --from=build /app/target/archsim-backend-*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseG1GC", "-jar", "app.jar"]
```

---

## 2. Infrastructure Architecture (AWS Target)
In production environments, ArchSim runs on AWS using managed services to ensure scalability and reliability.

```
                        [Route 53 (DNS)]
                                │
                        [AWS WAF (Shield)]
                                │
                  [Application Load Balancer]
                                │
          +─────────────────────┴─────────────────────+
          │                                           │
  [Amazon ECS / EKS] (Private Subnet)         [CloudFront (CDN)]
    ├── Web/API Service Containers                     │
    ├── Simulation Core Containers             [Amazon S3] (Static Assets)
    └── Telemetry Processor Containers
          │
  +───────┴───────────────────────────────────────────+
  │                                                   │
[Amazon RDS Postgres]                             [ElastiCache Redis]
```

* **Frontend Hosting**: React static production builds are hosted in an **Amazon S3** bucket and distributed globally using an **Amazon CloudFront** CDN.
* **Orchestration**: The backend services run in an **Amazon Elastic Kubernetes Service (EKS)** cluster across multiple availability zones.
* **Managed Storage**:
  * PostgreSQL: Hosted on **Amazon RDS PostgreSQL** with Multi-AZ replication.
  * Cache & Pub/Sub: Hosted on **Amazon ElastiCache Redis** cluster.
  * Metrics: Run on dedicated TimescaleDB managed database nodes.

---

## 3. Kubernetes Deployment Manifest Topology
For orchestrating services within the EKS cluster, manifests define the following resources:
* **Deployments**: Configures container replicas, health checks (liveness/readiness probes targeting `/actuator/health`), and resource allocations (CPU limits, memory footprints).
* **Services**: Exposes the pods internally. A cluster-internal DNS routes traffic between components.
* **Ingress**: Integrates with the AWS ALB Ingress Controller to route HTTPS and WebSocket (`wss://`) connections from the internet to the API Gateway.
* **ConfigMaps & Secrets**: Manages environment parameters, database credentials, and OAuth tokens.
