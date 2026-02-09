import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class GeoIPInfo {
  @Field()
  countryCode: string;

  @Field()
  countryName: string;

  @Field()
  regionName: string;

  @Field()
  cityName: string;

  @Field({ nullable: true })
  currencyCode?: string;

  @Field()
  isVpn: boolean;

  @Field()
  ip: string;
}
