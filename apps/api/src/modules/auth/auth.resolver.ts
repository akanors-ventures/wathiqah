import { Resolver, Mutation, Args, Query, Context } from '@nestjs/graphql';
import { AuthService } from './auth.service';
import { AuthPayload } from './entities/auth-payload.entity';
import { SignupInput } from './dto/signup.input';
import { LoginInput } from './dto/login.input';
import { RefreshTokenInput } from './dto/refresh-token.input';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { GqlAuthGuard } from '../../common/guards/gql-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { AcceptInvitationInput } from './dto/accept-invitation.input';
import { ForgotPasswordInput } from './dto/forgot-password.input';
import { ResetPasswordInput } from './dto/reset-password.input';
import { ChangePasswordInput } from './dto/change-password.input';
import { Witness } from '../witnesses/entities/witness.entity';
import { Request, Response } from 'express';
import * as ms from 'ms';
import { ConfigService } from '@nestjs/config';

@Resolver(() => AuthPayload)
export class AuthResolver {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setCookies(res: Response, payload: AuthPayload) {
    const isProd = process.env.NODE_ENV === 'production';
    const domain = this.configService.get<string>('app.cookieDomain');

    console.log(
      `[AuthResolver] Setting cookies. Domain: ${domain || 'none'}, isProd: ${isProd}`,
    );

    // Security Note: SameSite: 'lax' is safer than 'none' and works across subdomains
    // of the same root domain (e.g., wathiqah-api.akanors.com and wathiqah.akanors.com).
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/',
      ...(domain ? { domain } : {}),
    };

    res.cookie('accessToken', payload.accessToken, {
      ...cookieOptions,
      maxAge: ms('15m'),
    });

    res.cookie('refreshToken', payload.refreshToken, {
      ...cookieOptions,
      maxAge: ms('7d'),
    });

    res.cookie('isLoggedIn', 'true', {
      ...cookieOptions,
      httpOnly: false, // JS needs to read this to sync AuthContext state
      maxAge: ms('7d'),
    });
  }

  private clearCookies(res: Response) {
    const domain = this.configService.get<string>('app.cookieDomain');
    const options = { path: '/', ...(domain ? { domain } : {}) };

    console.log(`[AuthResolver] Clearing cookies. Domain: ${domain || 'none'}`);

    res.clearCookie('accessToken', options);
    res.clearCookie('refreshToken', options);
    res.clearCookie('isLoggedIn', options);
  }

  @Mutation(() => AuthPayload)
  async signup(@Args('signupInput') signupInput: SignupInput) {
    const user = await this.authService.signup(signupInput);
    return { user };
  }

  @Mutation(() => AuthPayload)
  async verifyEmail(
    @Args('token') token: string,
    @Context('res') res: Response,
  ) {
    const payload = await this.authService.verifyEmail(token);
    this.setCookies(res, payload);
    return payload;
  }

  @Mutation(() => AuthPayload)
  async login(
    @Args('loginInput') loginInput: LoginInput,
    @Context('res') res: Response,
  ) {
    const payload = await this.authService.login(loginInput);
    this.setCookies(res, payload);
    return payload;
  }

  @Mutation(() => AuthPayload)
  async refreshToken(
    @Args('refreshTokenInput') refreshTokenInput: RefreshTokenInput,
    @Context('req') req: Request,
    @Context('res') res: Response,
  ) {
    const refreshToken =
      refreshTokenInput.refreshToken || req.cookies?.refreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }
    const payload = await this.authService.refreshToken(refreshToken);
    this.setCookies(res, payload);
    return payload;
  }

  @Mutation(() => Boolean)
  async logout(@Context('req') req: Request, @Context('res') res: Response) {
    // If we have a valid session, also invalidate it in the DB
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const payload = await this.authService.verifyRefreshToken(refreshToken);
        if (payload?.sub) {
          await this.authService.logout(payload.sub);
        }
      } catch (error) {
        // Ignore verification errors during logout, we still want to clear cookies
        console.debug(
          '[AuthResolver] Error during logout session invalidation:',
          error.message,
        );
      }
    }
    this.clearCookies(res);
    return true;
  }

  @Mutation(() => AuthPayload)
  async acceptInvitation(
    @Args('acceptInvitationInput') acceptInvitationInput: AcceptInvitationInput,
    @Context('res') res: Response,
  ) {
    const payload = await this.authService.acceptInvitation(
      acceptInvitationInput,
    );
    this.setCookies(res, payload);
    return payload;
  }

  @Query(() => Witness)
  witnessInvitation(@Args('token') token: string) {
    return this.authService.getWitnessInvitation(token);
  }

  @Mutation(() => Boolean)
  forgotPassword(
    @Args('forgotPasswordInput') forgotPasswordInput: ForgotPasswordInput,
  ) {
    return this.authService.forgotPassword(forgotPasswordInput);
  }

  @Mutation(() => Boolean)
  resetPassword(
    @Args('resetPasswordInput') resetPasswordInput: ResetPasswordInput,
  ) {
    return this.authService.resetPassword(resetPasswordInput);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  changePassword(
    @CurrentUser() user: User,
    @Args('changePasswordInput') changePasswordInput: ChangePasswordInput,
  ) {
    return this.authService.changePassword(user.id, changePasswordInput);
  }

  @Mutation(() => Boolean)
  resendVerificationEmail(@Args('email') email: string) {
    return this.authService.resendVerificationEmail(email);
  }
}
