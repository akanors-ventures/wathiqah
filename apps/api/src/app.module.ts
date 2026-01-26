import { Module } from '@nestjs/common';
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
                    singleLine: true,
                    translateTime: 'SYS:standard',
                  },
                },
            autoLogging: true,
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
        const redisUsername =
          configService.getOrThrow<string>('redis.username');
        const redisPassword =
          configService.getOrThrow<string>('redis.password');
        const redisDb = configService.getOrThrow<number>('redis.db');
        return {
          stores: [
            new KeyvRedis({
              // redis[s]://[[username][:password]@][host][:port][/db-number]
              url: `redis://${redisUsername}:${redisPassword}@${redisHost}:${redisPort}/${redisDb}`,
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
