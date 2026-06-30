import { Module, Logger } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { WitnessesModule } from './modules/witnesses/witnesses.module';
import { PromisesModule } from './modules/promises/promises.module';
import { SharedAccessModule } from './modules/shared-access/shared-access.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { PaymentModule } from './modules/payment/payment.module';
import { SupportModule } from './modules/support/support.module';
import { ExchangeRateModule } from './modules/exchange-rate/exchange-rate.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { AdminModule } from './modules/admin/admin.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ProjectsModule } from './modules/projects/projects.module';
import { PersonalEntriesModule } from './modules/personal-entries/personal-entries.module';
import { GeoIPModule } from './modules/geoip/geoip.module';
import { OrganisationsModule } from './modules/organisations/organisations.module';
import { OrgEventsModule } from './modules/org-events/org-events.module';
import { NotesModule } from './modules/notes/notes.module';
import config from './config';
import KeyvRedis, { Keyv, RedisClientOptions } from '@keyv/redis';
import { CacheableMemory } from 'cacheable';
import { QueueModule } from './common/queue/queue.module';
import { PubSubModule } from './common/pubsub/pubsub.module';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { GraphQLError } from 'graphql';
import { buildGraphQLContext, parseCookies } from './common/utils/ws-context';

@Module({
  imports: [
    PubSubModule,
    ConfigModule.forRoot({
      load: config,
      cache: true,
      isGlobal: true,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isProduction = configService.get('app.env') === 'production';
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: isProduction
              ? undefined
              : {
                  target: 'pino-pretty',
                  options: {
                    singleLine: false,
                    translateTime: 'SYS:standard',
                    colorize: true,
                    levelFirst: true,
                    ignore: 'pid,hostname,req,res,context',
                    messageFormat: '{context} - {msg}',
                  },
                },
            autoLogging: {
              ignore: (req) => {
                // Ignore GraphQL requests in auto-logging to avoid double logging with the interceptor
                return req.url?.includes('/graphql');
              },
            },
            genReqId: (req) =>
              (req.headers['x-request-id'] as string) || uuidv4(),
            redact: {
              paths: [
                'req.headers.authorization',
                'req.body.password',
                'req.body.token',
                'req.body.verificationToken',
                'req.body.resetToken',
              ],
              censor: '***',
            },
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                params: req.params,
                ip: req.remoteAddress,
                userAgent: req.headers['user-agent'],
              }),
            },
          },
        };
      },
    }),
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const redisHost = configService.getOrThrow<string>('redis.host');
        const redisPort = configService.getOrThrow<number>('redis.port');
        const redisUsername = configService.get<string>('redis.username');
        const redisPassword = configService.get<string>('redis.password');
        const redisDb = configService.get<number>('redis.db') ?? 0;

        const credentials =
          redisUsername && redisPassword
            ? `${redisUsername}:${redisPassword}@`
            : redisPassword
              ? `:${redisPassword}@`
              : '';

        const redisUrl = `redis://${credentials}${redisHost}:${redisPort}/${redisDb}`;

        return {
          stores: [
            new KeyvRedis({
              url: redisUrl,
            } as RedisClientOptions),
            new Keyv({
              store: new CacheableMemory({ ttl: 60000, lruSize: 5000 }),
            }),
          ],
        };
      },
      inject: [ConfigService],
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      useGlobalPrefix: true,
      context: buildGraphQLContext,
      subscriptions: {
        'graphql-ws': {
          onConnect: (ctx) => {
            // Light connection-time gate: reject sockets with no auth cookie
            // at all. Real verification happens per-operation via the
            // existing GqlAuthGuard (see buildGraphQLContext), same as HTTP.
            const request = (
              ctx.extra as { request?: { headers: { cookie?: string } } }
            )?.request;
            const cookies = parseCookies(request?.headers.cookie);
            return Boolean(cookies.accessToken);
          },
        },
      },
      formatError: (error) => {
        const originalError = error.extensions?.originalError as {
          message?: string | string[];
          statusCode?: number;
        };
        let message = error.message;

        if (originalError?.message) {
          message = Array.isArray(originalError.message)
            ? originalError.message[0]
            : originalError.message;
        }

        const HTTP_STATUS_TO_CODE: Record<number, string> = {
          400: 'BAD_USER_INPUT',
          401: 'UNAUTHENTICATED',
          403: 'FORBIDDEN',
          404: 'NOT_FOUND',
          409: 'CONFLICT',
          422: 'UNPROCESSABLE_ENTITY',
          429: 'TOO_MANY_REQUESTS',
        };

        const rawCode = error.extensions?.code as string | undefined;
        const code =
          (rawCode && rawCode !== 'INTERNAL_SERVER_ERROR'
            ? rawCode
            : originalError?.statusCode
              ? (HTTP_STATUS_TO_CODE[originalError.statusCode] ??
                'INTERNAL_SERVER_ERROR')
              : null) ??
          rawCode ??
          'INTERNAL_SERVER_ERROR';

        // Enhanced error logging for server errors
        if (code === 'INTERNAL_SERVER_ERROR') {
          const stack = error instanceof GraphQLError ? error.stack : undefined;
          new Logger('GraphQLError').error(
            `[Internal Server Error]: ${error.message}`,
            stack,
          );

          // Mask internal server errors in production or when they leak technical details
          if (
            process.env.NODE_ENV === 'production' ||
            message.includes('Prisma') ||
            message.includes('invocation in') ||
            message.includes('Server has closed the connection')
          ) {
            message = 'Something went wrong. Please try again later.';
          }
        }

        return {
          message,
          extensions: {
            ...error.extensions,
            code,
          },
        };
      },
    }),
    PrismaModule,
    TransactionsModule,
    UsersModule,
    AuthModule,
    ContactsModule,
    WitnessesModule,
    PromisesModule,
    SharedAccessModule,
    SubscriptionModule,
    PaymentModule,
    SupportModule,
    ExchangeRateModule,
    MaintenanceModule,
    AdminModule,
    ProjectsModule,
    PersonalEntriesModule,
    QueueModule,
    GeoIPModule,
    OrganisationsModule,
    OrgEventsModule,
    NotesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
