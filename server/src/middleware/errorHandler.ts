import type { ErrorRequestHandler } from "express";
import { HttpError } from "../errors/HttpError.js";

export const errorHandler: ErrorRequestHandler = (
  error: HttpError,
  _request,
  response,
  _next,
) => {
  const statusCode = error instanceof HttpError ? error.statusCode : 500;
  if (statusCode >= 500) {
    console.error(error instanceof Error ? error.message : "Unknown server error");
  }
  response.status(statusCode).json({
    error:
      statusCode >= 500
        ? error instanceof Error
          ? error.message
          : "An unexpected server error occurred."
        : error.message,
  });
};
