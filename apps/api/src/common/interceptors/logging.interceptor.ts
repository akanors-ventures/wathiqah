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

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const gqlContext = GqlExecutionContext.create(context);
    const info = gqlContext.getInfo();
    const request = gqlContext.getContext().req;

    // Check if it's a GraphQL request
    if (info) {
      const parentType = info.parentType.name;
      const fieldName = info.fieldName;
      const clientOperationName = info.operation?.name?.value || 'Unnamed';
      const operationName = `${parentType}.${fieldName} (${clientOperationName})`;
      const requestId = request?.id || 'unknown';
      const ip = request?.ip || 'unknown';
      const user = request?.user ? request.user.id : 'anonymous';
      const args = gqlContext.getArgs();

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

    // Fallback for REST requests (though we primarily use GraphQL)
    return next.handle();
  }

  private redactVariables(args: any): any {
    if (!args || typeof args !== 'object') return args;

    const redacted = { ...args };
    for (const key in redacted) {
      if (this.sensitiveFields.includes(key)) {
        redacted[key] = '***';
      } else if (typeof redacted[key] === 'object' && redacted[key] !== null) {
        redacted[key] = this.redactVariables(redacted[key]);
      }
    }
    return redacted;
  }
}
