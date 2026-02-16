import { NestFactory } from "@nestjs/core";
import { ValidationPipe, BadRequestException } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import * as bodyParser from "body-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    // Don't parse body for webhook endpoints - we need raw body for Stripe signature verification
    rawBody: true,
  });

  // Configure raw body for webhook endpoints
  app.use("/webhooks/stripe", bodyParser.raw({ type: "application/json" }));

  // Enable CORS - allow all origins in development
  app.enableCors({
    origin: true, // Reflects the request origin in Access-Control-Allow-Origin
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "X-Workspace-Id",
      "x-workspace-id",
    ],
  });

  // Global validation pipe with detailed error messages
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false, // Allow extra properties to support flexible AI flow
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => {
          const constraints = error.constraints
            ? Object.values(error.constraints).join(", ")
            : "Unknown validation error";
          const children = error.children?.length
            ? ` [nested: ${error.children.map((c) => c.property).join(", ")}]`
            : "";
          return `${error.property}: ${constraints}${children}`;
        });
        console.error("[ValidationPipe] Validation failed:", messages);
        return new BadRequestException({
          message: messages,
          error: "Validation failed",
          statusCode: 400,
        });
      },
    }),
  );

  // Swagger API documentation
  const config = new DocumentBuilder()
    .setTitle("AlvoBot API")
    .setDescription("Backend API for complex integrations and workflows")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT || process.env.BACKEND_PORT || 3000;
  await app.listen(port);

  console.log(`🚀 AlvoBot Backend running on: http://localhost:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
