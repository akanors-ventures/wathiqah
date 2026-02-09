import { useQuery } from "@apollo/client/react";
import { GET_GEOIP_INFO } from "../lib/apollo/queries/geoip";

export function useGeoIP() {
  const { data, loading, error } = useQuery(GET_GEOIP_INFO);

  const geoIP = data?.getGeoIPInfo;

  return {
    geoIP,
    loading,
    error,
    isNigeria: geoIP?.countryCode === "NG",
    isUK: geoIP?.countryCode === "GB",
    isVpn: geoIP?.isVpn || false,
    currencyCode: geoIP?.currencyCode || "USD",
  };
}
