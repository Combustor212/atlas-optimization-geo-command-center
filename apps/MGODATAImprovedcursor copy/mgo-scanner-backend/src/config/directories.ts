/**
 * Directory targets for citation checking
 */
import { DirectoryTarget } from '../types';

export const directoryTargets: DirectoryTarget[] = [
  {
    name: "Yelp",
    matchStrategy: "queryUrl",
    baseUrl: "https://www.yelp.com",
    searchUrlPattern: "https://www.yelp.com/search?find_desc={business}&find_loc={city}"
  },
  {
    name: "BBB",
    matchStrategy: "queryUrl",
    baseUrl: "https://www.bbb.org",
    searchUrlPattern: "https://www.bbb.org/search?find_text={business}&find_loc={city}"
  },
  {
    name: "YellowPages",
    matchStrategy: "queryUrl",
    baseUrl: "https://www.yellowpages.com",
    searchUrlPattern: "https://www.yellowpages.com/search?search_terms={business}&geo_location_terms={city}"
  },
  {
    name: "Facebook",
    matchStrategy: "queryUrl",
    baseUrl: "https://www.facebook.com",
    searchUrlPattern: "https://www.facebook.com/search/top/?q={business} {city}"
  },
  {
    name: "MapQuest",
    matchStrategy: "queryUrl",
    baseUrl: "https://www.mapquest.com",
    searchUrlPattern: "https://www.mapquest.com/search/results?query={business}&location={city}"
  },
  {
    name: "ChamberOfCommerce",
    matchStrategy: "queryUrl",
    baseUrl: "https://www.chamberofcommerce.com",
    searchUrlPattern: "https://www.chamberofcommerce.com/search?q={business}&location={city}"
  },
  {
    name: "Foursquare",
    matchStrategy: "queryUrl",
    baseUrl: "https://foursquare.com",
    searchUrlPattern: "https://foursquare.com/search?q={business}&near={city}"
  },
  {
    name: "Hotfrog",
    matchStrategy: "queryUrl",
    baseUrl: "https://www.hotfrog.com",
    searchUrlPattern: "https://www.hotfrog.com/search/{city}/{business}"
  }
];

/**
 * Build search URL for a directory
 */
export function buildDirectorySearchUrl(
  directory: DirectoryTarget,
  businessName: string,
  city: string
): string {
  return directory.searchUrlPattern
    .replace("{business}", encodeURIComponent(businessName))
    .replace("{city}", encodeURIComponent(city));
}

