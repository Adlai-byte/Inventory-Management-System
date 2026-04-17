import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(100, "Username must be at most 100 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password must be at most 255 characters"),
  full_name: z.string()
    .min(1, "Full name is required")
    .max(255, "Full name must be at most 255 characters"),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be at most 255 characters")
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "manager", "staff"], { message: "Invalid role" }),
});

export const updateUserSchema = z.object({
  username: z.string()
    .min(3, "Username must be at least 3 characters")
    .max(100, "Username must be at most 100 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
    .optional(),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(255, "Password must be at most 255 characters")
    .optional()
    .or(z.literal("")), // Allow empty string to skip password update
  full_name: z.string()
    .min(1, "Full name is required")
    .max(255, "Full name must be at most 255 characters")
    .optional(),
  email: z.string()
    .email("Invalid email address")
    .max(255, "Email must be at most 255 characters")
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "manager", "staff"], { message: "Invalid role" }).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
