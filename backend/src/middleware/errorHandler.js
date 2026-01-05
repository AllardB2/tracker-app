import { ZodError } from "zod";

export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err);

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation Error",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
  }

  // Prisma errors
  if (err.code === "P2002") {
    return res.status(409).json({
      error: "Conflict",
      message: "A record with this data already exists",
    });
  }

  // Default error
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.name || "Internal Server Error",
    message: err.message || "Something went wrong",
  });
};
