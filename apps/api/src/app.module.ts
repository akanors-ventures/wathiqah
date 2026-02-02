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
import { CacheModule } from '@nestjs/cache-manager';
import config from './config';
import KeyvRedis, { Keyv, RedisClientOptions } from '@keyv/redis';
import { CacheableMemory } from 'cacheable';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { GraphQLError } from 'graphql';

@Module({
  imports: [
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
        const redisPassword =
          configService.getOrThrow<string>('redis.password');
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
      context: ({ req, res }) => ({ req, res }),
      formatError: (error) => {
        const originalError = error.extensions?.originalError as any;
        let message = error.message;

        if (originalError?.message) {
          message = Array.isArray(originalError.message)
            ? originalError.message[0]
            : originalError.message;
        }

        const code = error.extensions?.code || 'INTERNAL_SERVER_ERROR';

        // Enhanced error logging for server errors
        if (code === 'INTERNAL_SERVER_ERROR') {
          const stack = error instanceof GraphQLError ? error.stack : undefined;
          new Logger('GraphQLError').error(
            `[Internal Server Error]: ${error.message}`,
            stack,
          );
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
