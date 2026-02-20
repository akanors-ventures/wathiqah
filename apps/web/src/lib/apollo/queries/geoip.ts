import type { GetGeoIpInfoQuery, GetGeoIpInfoQueryVariables } from "@/types/__generated__/graphql";
import { gql, type TypedDocumentNode } from "@apollo/client";

export const GET_GEOIP_INFO: TypedDocumentNode<GetGeoIpInfoQuery, GetGeoIpInfoQueryVariables> = gql`
  query GetGeoIPInfo {
    getGeoIPInfo {
      ip
      countryCode
      countryName
      regionName
      cityName
      currencyCode
      isVpn
    }
  }
`;
