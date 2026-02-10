import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import { Observable, from } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { GeoIPService } from '../../modules/geoip/geoip.service';

@Injectable()
export class GeoIPInterceptor implements NestInterceptor {
  constructor(private readonly geoIPService: GeoIPService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = GqlExecutionContext.create(context);
    const req = ctx.getContext().req || context.switchToHttp().getRequest();

    if (req && !req.geoip) {
      // Get IP from headers or connection
      const ip =
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip;

      const clientIp = Array.isArray(ip) ? ip[0] : ip.split(',')[0].trim();

      return from(this.geoIPService.lookup(clientIp)).pipe(
        switchMap((geoip) => {
          req.geoip = geoip;
          return next.handle();
        }),
      );
    }

    return next.handle();
  }
}
