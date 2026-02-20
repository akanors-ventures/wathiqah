import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  // Sensitive fields to redact from variables
  private readonly sensitiveFields = [
    'password',
    'token',
    'refreshToken',
    'accessToken',
    'verificationToken',
    'resetToken',
    'currentPassword',
    'newPassword',
  ];

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    // Check if it's a GraphQL request
    if ((context.getType() as string) === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context);
      const info = gqlContext.getInfo();
      const request = gqlContext.getContext().req;

      if (info) {
        const parentType = info.parentType.name;
        const fieldName = info.fieldName;
        const clientOperationName = info.operation?.name?.value || 'Unnamed';
        const operationName = `${parentType}.${fieldName} (${clientOperationName})`;
        const requestId = request?.id || 'unknown';
        const ip = request?.ip || 'unknown';
        const user = request?.user ? request.user.id : 'anonymous';
        const args = gqlContext.getArgs() as Record<string, unknown>;

        // Redact sensitive variables
        const redactedArgs = this.redactVariables(args);

        this.logger.log(
          `[${requestId}] 🚀 GQL START: ${operationName} | User: ${user} | IP: ${ip} | Args: ${JSON.stringify(redactedArgs)}`,
        );

        const now = Date.now();
        return next.handle().pipe(
          tap(() => {
            const responseTime = Date.now() - now;
            this.logger.log(
              `[${requestId}] ✅ GQL END: ${operationName} | Status: Success | Time: ${responseTime}ms`,
            );
          }),
          catchError((error) => {
            const responseTime = Date.now() - now;
            this.logger.error(
              `[${requestId}] ❌ GQL ERROR: ${operationName} | Status: Failed | Time: ${responseTime}ms | Error: ${error.message}`,
              error.stack,
            );
            return throwError(() => error);
          }),
        );
      }
    }

    // Fallback for REST requests (though we primarily use GraphQL)
    if (context.getType() === 'http') {
      const request = context.switchToHttp().getRequest();
      const { method, url, body, query, ip, user } = request;
      const requestId = request.id || 'unknown';
      const userId = user?.id || 'anonymous';

      // Redact sensitive data
      const redactedBody = this.redactVariables(
        body as Record<string, unknown>,
      );
      const redactedQuery = this.redactVariables(
        query as Record<string, unknown>,
      );

      this.logger.log(
        `[${requestId}] 🚀 HTTP START: ${method} ${url} | User: ${userId} | IP: ${ip} | Body: ${JSON.stringify(redactedBody)} | Query: ${JSON.stringify(redactedQuery)}`,
      );

      const now = Date.now();
      return next.handle().pipe(
        tap(() => {
          const responseTime = Date.now() - now;
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          this.logger.log(
            `[${requestId}] ✅ HTTP END: ${method} ${url} | Status: ${statusCode} | Time: ${responseTime}ms`,
          );
        }),
        catchError((error) => {
          const responseTime = Date.now() - now;
          this.logger.error(
            `[${requestId}] ❌ HTTP ERROR: ${method} ${url} | Status: Failed | Time: ${responseTime}ms | Error: ${error.message}`,
            error.stack,
          );
          return throwError(() => error);
        }),
      );
    }

    return next.handle();
  }

  private redactVariables(
    args: Record<string, unknown>,
  ): Record<string, unknown> {
    if (!args || typeof args !== 'object') return args;

    const redacted = { ...args };
    for (const key in redacted) {
      if (this.sensitiveFields.includes(key)) {
        redacted[key] = '***';
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactVariables(
          redacted[key] as Record<string, unknown>,
        );
      }
    }
    return redacted;
  }
}
