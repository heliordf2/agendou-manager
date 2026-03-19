/**
 * 🔒 Sistema Seguro de Logging HelioRDF
 * Sanitiza informações sensíveis antes de logar xxx
git config --global user.name "HelioRDF" 

*/

export enum LogLevel {
  DEBUG = "DEBUG",
  INFO = "INFO",
  WARN = "WARN",
  ERROR = "ERROR",
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  requestId?: string;
}

/**
 * Sanitiza dados sensíveis antes de logar
 */
function sanitize(data: unknown): unknown {
  if (typeof data !== "object" || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitize);
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    // Não logar campos sensíveis
    if (
      key.toLowerCase().includes("password") ||
      key.toLowerCase().includes("token") ||
      key.toLowerCase().includes("secret") ||
      key.toLowerCase().includes("phone") ||
      key.toLowerCase().includes("email") ||
      key.toLowerCase().includes("auth")
    ) {
      sanitized[key] = "***REDACTED***";
      continue;
    }

    // Não logar stack traces em produção
    if (key === "stack" && process.env.NODE_ENV === "production") {
      sanitized[key] = "***REDACTED***";
      continue;
    }

    sanitized[key] = sanitize(value);
  }

  return sanitized;
}

/**
 * Logger centralizado e seguro
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DEBUG] ${message}`, sanitize(context));
    }
  },

  info(message: string, context?: Record<string, unknown>) {
    console.log(`[INFO] ${message}`, sanitize(context));
  },

  warn(message: string, context?: Record<string, unknown>) {
    console.warn(`[WARN] ${message}`, sanitize(context));
  },

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>) {
    const errorData: Record<string, unknown> = {
      ...context,
    };

    if (error instanceof Error) {
      errorData.errorMessage = error.message;
      // Stack trace apenas em desenvolvimento
      if (process.env.NODE_ENV === "development") {
        errorData.stack = error.stack;
      }
    } else if (typeof error === "object") {
      errorData.error = error;
    }

    console.error(`[ERROR] ${message}`, sanitize(errorData));
  },
};

/**
 * Classificador de erros para tratamento específico
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const ErrorCodes = {
  // Autenticação
  UNAUTHORIZED: "UNAUTHORIZED",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validação
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Recurso
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate Limiting
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

  // Servidor
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_API_ERROR: "EXTERNAL_API_ERROR",

  // Negócio
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_OPERATION: "INVALID_OPERATION",
  BUSINESS_RULE_VIOLATION: "BUSINESS_RULE_VIOLATION",
} as const;

/**
 * Factory para criar erros específicos
 */
export const createError = {
  unauthorized: (message = "Não autorizado") =>
    new AppError(message, ErrorCodes.UNAUTHORIZED, 401),

  invalidCredentials: (message = "Email ou senha incorretos") =>
    new AppError(message, ErrorCodes.INVALID_CREDENTIALS, 401),

  notFound: (resource = "Recurso") =>
    new AppError(`${resource} não encontrado`, ErrorCodes.NOT_FOUND, 404),

  alreadyExists: (resource = "Recurso") =>
    new AppError(`${resource} já existe`, ErrorCodes.ALREADY_EXISTS, 409),

  validation: (message: string) =>
    new AppError(message, ErrorCodes.VALIDATION_ERROR, 400),

  rateLimited: (message = "Muitas requisições. Tente novamente em alguns minutos.") =>
    new AppError(message, ErrorCodes.RATE_LIMIT_EXCEEDED, 429),

  internal: (message = "Erro interno do servidor") =>
    new AppError(message, ErrorCodes.INTERNAL_ERROR, 500, false),

  databaseError: (message = "Erro ao acessar o banco de dados") =>
    new AppError(message, ErrorCodes.DATABASE_ERROR, 500, false),
};
