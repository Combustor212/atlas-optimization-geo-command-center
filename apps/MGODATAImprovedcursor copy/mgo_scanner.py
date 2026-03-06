#!/usr/bin/env python3
"""
MGO Visibility Score Calculator
Calculates proprietary MGO Visibility Score (0-100) for local businesses
using Google Places API (MEO) and OpenAI API (GEO).
"""

import os
import re
import json
import sys
from typing import Dict, Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup
import googlemaps
from openai import OpenAI
from dotenv import load_dotenv
from thefuzz import fuzz

# Load environment variables
load_dotenv()

# Initialize API clients - allow override via environment or use defaults
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY') or os.getenv('PLACES_API_KEY') or 'AIzaSyBVdZG8MygN9Ms-FRQr6wP2CYdzHrdnk5w'
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') or ''

if not GOOGLE_API_KEY or GOOGLE_API_KEY == '':
    raise ValueError("GOOGLE_API_KEY not found. Set GOOGLE_API_KEY or PLACES_API_KEY environment variable.")
if not OPENAI_API_KEY or OPENAI_API_KEY == '':
    raise ValueError("OPENAI_API_KEY not found. Set OPENAI_API_KEY environment variable.")

print(f"[DEBUG] Google API Key: {GOOGLE_API_KEY[:20]}..." if len(GOOGLE_API_KEY) > 20 else f"[DEBUG] Google API Key: {GOOGLE_API_KEY}", file=sys.stderr)
print(f"[DEBUG] OpenAI API Key: {OPENAI_API_KEY[:20]}..." if len(OPENAI_API_KEY) > 20 else f"[DEBUG] OpenAI API Key: {OPENAI_API_KEY}", file=sys.stderr)

gmaps = googlemaps.Client(key=GOOGLE_API_KEY)
openai_client = OpenAI(api_key=OPENAI_API_KEY)


class Colors:
    """Terminal colors for output"""
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    RESET = '\033[0m'
    BOLD = '\033[1m'


def normalize_phone(phone_str: str) -> str:
    """
    Normalize phone number for comparison.
    Removes all non-digit characters (parentheses, dashes, spaces, +1 country codes).
    """
    if not phone_str:
        return ""
    # Remove all non-digit characters (parentheses, dashes, spaces, +, etc.)
    digits = re.sub(r'\D', '', phone_str)
    # For US numbers, keep last 10 digits (remove country code if present)
    if len(digits) >= 10:
        return digits[-10:]
    return digits


def normalize_address(addr_str: str) -> str:
    """
    Normalize address for comparison.
    Converts to lowercase, removes punctuation, and standardizes abbreviations.
    """
    if not addr_str:
        return ""
    # Convert to lowercase and strip
    normalized = addr_str.lower().strip()
    # Remove punctuation (commas, periods, etc.)
    normalized = re.sub(r'[^\w\s]', ' ', normalized)
    # Remove extra spaces
    normalized = re.sub(r'\s+', ' ', normalized)
    # Standardize common abbreviations
    replacements = {
        'street': 'st', 'avenue': 'ave', 'road': 'rd', 'boulevard': 'blvd',
        'drive': 'dr', 'lane': 'ln', 'court': 'ct', 'circle': 'cir',
        'suite': 'ste', 'apartment': 'apt', 'unit': 'unit',
        'north': 'n', 'south': 's', 'east': 'e', 'west': 'w',
        'northeast': 'ne', 'northwest': 'nw', 'southeast': 'se', 'southwest': 'sw'
    }
    for full, abbr in replacements.items():
        normalized = normalized.replace(full, abbr)
    return normalized.strip()


def scrape_website_nap(website_url: str) -> Dict[str, Optional[str]]:
    """
    Scrape phone number and address from website footer/contact page.
    Returns dict with 'phone' and 'address' keys.
    """
    nap_data = {'phone': None, 'address': None}
    
    try:
        print(f"[DEBUG] Scraping NAP from: {website_url}", file=sys.stderr)
        # Realistic browser headers to avoid 403 blocks
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        response = requests.get(website_url, headers=headers, timeout=15, allow_redirects=True)
        
        # Check for 403 or other blocking
        if response.status_code == 403:
            print(f"[ERROR] Scraping blocked (403 Forbidden) - website may be blocking scrapers", file=sys.stderr)
            return nap_data
        
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Try to find phone number (common patterns)
        phone_patterns = [
            r'\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # US format
            r'\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}',  # International
            r'\d{3}[-.\s]?\d{3}[-.\s]?\d{4}'  # Simple format
        ]
        
        # Search in footer, contact sections, and all text
        footer = (soup.find('footer') or 
                 soup.find('div', class_=re.compile(r'footer|contact', re.I)) or
                 soup.find('div', id=re.compile(r'footer|contact', re.I)))
        search_areas = [footer] if footer else [soup]
        
        for area in search_areas:
            if not area:
                continue
            text = area.get_text()
            
            # Find phone
            if not nap_data['phone']:
                for pattern in phone_patterns:
                    matches = re.findall(pattern, text)
                    if matches:
                        nap_data['phone'] = matches[0].strip()
                        print(f"[DEBUG] Found phone: {nap_data['phone']}", file=sys.stderr)
                        break
            
            # Find address (look for common address patterns)
            if not nap_data['address']:
                address_patterns = [
                    r'\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir)[\s,]+[A-Za-z\s,]+(?:[A-Z]{2}|[A-Za-z]+)[\s,]*\d{5}',
                    r'\d+\s+[A-Za-z0-9\s,]+(?:St|Ave|Rd|Blvd|Dr|Ln|Ct|Cir)[\s,]+[A-Za-z\s,]+(?:[A-Z]{2}|[A-Za-z]+)[\s,]*\d{5}',
                    r'\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd)[\s,]+[A-Za-z\s,]+(?:[A-Z]{2})[\s,]*\d{5}'  # More lenient
                ]
                
                for pattern in address_patterns:
                    matches = re.findall(pattern, text, re.IGNORECASE)
                    if matches:
                        nap_data['address'] = matches[0].strip()
                        print(f"[DEBUG] Found address: {nap_data['address']}", file=sys.stderr)
                        break
            
            if nap_data['phone'] and nap_data['address']:
                break
        
        # If not found in footer, try contact page
        if not nap_data['phone'] or not nap_data['address']:
            print(f"[DEBUG] NAP not found in footer, trying contact page...", file=sys.stderr)
            contact_links = soup.find_all('a', href=re.compile(r'contact|about', re.I))
            for link in contact_links[:3]:  # Try first 3 contact links
                try:
                    contact_url = urljoin(website_url, link.get('href', ''))
                    print(f"[DEBUG] Trying contact page: {contact_url}", file=sys.stderr)
                    contact_response = requests.get(contact_url, headers=headers, timeout=15, allow_redirects=True)
                    
                    # Check for 403
                    if contact_response.status_code == 403:
                        print(f"[DEBUG] Contact page blocked (403)", file=sys.stderr)
                        continue
                    
                    contact_response.raise_for_status()
                    contact_soup = BeautifulSoup(contact_response.content, 'html.parser')
                    contact_text = contact_soup.get_text()
                    
                    # Search for phone
                    if not nap_data['phone']:
                        for pattern in phone_patterns:
                            matches = re.findall(pattern, contact_text)
                            if matches:
                                nap_data['phone'] = matches[0].strip()
                                print(f"[DEBUG] Found phone in contact page: {nap_data['phone']}", file=sys.stderr)
                                break
                    
                    # Search for address
                    if not nap_data['address']:
                        address_patterns = [
                            r'\d+\s+[A-Za-z0-9\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir)[\s,]+[A-Za-z\s,]+(?:[A-Z]{2}|[A-Za-z]+)[\s,]*\d{5}',
                            r'\d+\s+[A-Za-z0-9\s,]+(?:St|Ave|Rd|Blvd|Dr|Ln|Ct|Cir)[\s,]+[A-Za-z\s,]+(?:[A-Z]{2}|[A-Za-z]+)[\s,]*\d{5}'
                        ]
                        for pattern in address_patterns:
                            matches = re.findall(pattern, contact_text, re.IGNORECASE)
                            if matches:
                                nap_data['address'] = matches[0].strip()
                                print(f"[DEBUG] Found address in contact page: {nap_data['address']}", file=sys.stderr)
                                break
                    
                    if nap_data['phone'] and nap_data['address']:
                        break
                except Exception as e:
                    print(f"[DEBUG] Error accessing contact page: {e}", file=sys.stderr)
                    continue
        
        if not nap_data['phone']:
            print(f"[DEBUG] Phone not found on website", file=sys.stderr)
        if not nap_data['address']:
            print(f"[DEBUG] Address not found on website", file=sys.stderr)
                    
    except Exception as e:
        print(f"[WARNING] Could not scrape website NAP: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    return nap_data


def calculate_meo_score(place_id: str, website_url: Optional[str] = None) -> Tuple[int, Dict[str, any]]:
    """
    Calculate MEO Score (Map Engine Optimization) - 100 points total.
    
    Returns:
        Tuple of (score, details_dict)
    """
    details = {
        'nap_consistency': {'score': 0, 'max': 40, 'details': ''},
        'review_volume': {'score': 0, 'max': 20, 'details': ''},
        'star_rating': {'score': 0, 'max': 20, 'details': ''},
        'listing_completeness': {'score': 0, 'max': 20, 'details': ''}
    }
    
    try:
        print(f"[DEBUG] Fetching place details for place_id: {place_id}", file=sys.stderr)
        
        # Fetch place details from Google Places API
        place_details = gmaps.place(
            place_id=place_id,
            fields=['name', 'formatted_address', 'formatted_phone_number', 
                   'international_phone_number', 'rating', 'user_ratings_total',
                   'photos', 'types', 'website', 'business_status', 'opening_hours']
        )
        
        print(f"[DEBUG] Google Places API response status: {place_details.get('status')}", file=sys.stderr)
        
        if place_details.get('status') != 'OK':
            error_msg = place_details.get('error_message', 'Unknown error')
            raise ValueError(f"Google Places API error: {place_details.get('status')} - {error_msg}")
        
        result = place_details.get('result', {})
        
        if not result:
            raise ValueError("Google Places API returned empty result")
        
        print(f"[DEBUG] Place name: {result.get('name', 'N/A')}", file=sys.stderr)
        print(f"[DEBUG] Rating: {result.get('rating', 0)}, Reviews: {result.get('user_ratings_total', 0)}", file=sys.stderr)
        print(f"[DEBUG] Has photos: {bool(result.get('photos'))}, Types count: {len(result.get('types', []))}", file=sys.stderr)
        
        # 1. NAP Consistency (40 pts)
        google_phone_raw = result.get('international_phone_number') or result.get('formatted_phone_number') or ''
        google_address_raw = result.get('formatted_address', '')
        
        google_phone = normalize_phone(google_phone_raw)
        google_address = normalize_address(google_address_raw)
        
        # Verbose logging: Print raw values from Google Places
        print(f"[NAP CHECK] Google Places Phone (raw): {google_phone_raw}", file=sys.stderr)
        print(f"[NAP CHECK] Google Places Phone (normalized): {google_phone}", file=sys.stderr)
        print(f"[NAP CHECK] Google Places Address (raw): {google_address_raw}", file=sys.stderr)
        print(f"[NAP CHECK] Google Places Address (normalized): {google_address}", file=sys.stderr)
        
        if website_url:
            website_nap = scrape_website_nap(website_url)
            website_phone_raw = website_nap.get('phone', '')
            website_address_raw = website_nap.get('address', '')
            
            website_phone = normalize_phone(website_phone_raw)
            website_address = normalize_address(website_address_raw)
            
            # Verbose logging: Print raw values from website
            print(f"[NAP CHECK] Website Phone (raw): {website_phone_raw}", file=sys.stderr)
            print(f"[NAP CHECK] Website Phone (normalized): {website_phone}", file=sys.stderr)
            print(f"[NAP CHECK] Website Address (raw): {website_address_raw}", file=sys.stderr)
            print(f"[NAP CHECK] Website Address (normalized): {website_address}", file=sys.stderr)
            
            # Phone number comparison (exact match after normalization)
            phone_match = google_phone and website_phone and google_phone == website_phone
            print(f"[NAP CHECK] Phone match: {phone_match} (Google: '{google_phone}' vs Website: '{website_phone}')", file=sys.stderr)
            
            # Address comparison using fuzzy matching
            address_match_score = 0
            if google_address and website_address:
                # Use fuzzy ratio for address comparison
                address_match_score = fuzz.ratio(google_address, website_address)
                print(f"[NAP CHECK] Address fuzzy match score: {address_match_score}% (Google: '{google_address}' vs Website: '{website_address}')", file=sys.stderr)
            
            # Determine NAP consistency score
            if phone_match and address_match_score >= 85:
                details['nap_consistency']['score'] = 40
                details['nap_consistency']['details'] = f'Exact NAP match (Phone: match, Address: {address_match_score}% match)'
            elif phone_match and address_match_score >= 70:
                details['nap_consistency']['score'] = 30
                details['nap_consistency']['details'] = f'Strong NAP match (Phone: match, Address: {address_match_score}% match)'
            elif phone_match or address_match_score >= 70:
                details['nap_consistency']['score'] = 20
                details['nap_consistency']['details'] = f'Partial NAP match (Phone: {"match" if phone_match else "mismatch"}, Address: {address_match_score}% match)'
            else:
                details['nap_consistency']['score'] = 0
                details['nap_consistency']['details'] = f'NAP mismatch (Phone: {"match" if phone_match else "mismatch"}, Address: {address_match_score}% match)'
        else:
            details['nap_consistency']['score'] = 20  # Partial credit if no website
            details['nap_consistency']['details'] = 'No website URL provided for NAP verification'
        
        # 2. Review Volume (20 pts)
        review_count = result.get('user_ratings_total', 0) or 0
        print(f"[DEBUG] Review count: {review_count}", file=sys.stderr)
        
        if review_count > 100:
            details['review_volume']['score'] = 20
            details['review_volume']['details'] = f'{review_count} reviews'
        elif review_count >= 50:
            details['review_volume']['score'] = 10
            details['review_volume']['details'] = f'{review_count} reviews'
        else:
            details['review_volume']['score'] = 0
            details['review_volume']['details'] = f'{review_count} reviews (need 50+)'
        
        # 3. Star Rating (20 pts)
        rating = result.get('rating', 0) or 0
        print(f"[DEBUG] Rating: {rating}", file=sys.stderr)
        
        if rating > 4.5:
            details['star_rating']['score'] = 20
            details['star_rating']['details'] = f'{rating:.1f} stars'
        elif rating >= 4.0:
            details['star_rating']['score'] = 10
            details['star_rating']['details'] = f'{rating:.1f} stars'
        else:
            details['star_rating']['score'] = 0
            details['star_rating']['details'] = f'{rating:.1f} stars (need 4.0+)'
        
        # 4. Listing Completeness (20 pts)
        photos = result.get('photos', [])
        has_photos = bool(photos and len(photos) > 0)
        types = result.get('types', [])
        type_count = len(types)
        has_multiple_types = type_count > 1
        
        print(f"[DEBUG] Has photos: {has_photos}, Type count: {type_count}", file=sys.stderr)
        
        if has_photos and has_multiple_types:
            details['listing_completeness']['score'] = 20
            details['listing_completeness']['details'] = f'Has photos and {type_count} categories'
        else:
            details['listing_completeness']['score'] = 0
            missing = []
            if not has_photos:
                missing.append('photos')
            if not has_multiple_types:
                missing.append('multiple categories')
            details['listing_completeness']['details'] = f'Missing: {", ".join(missing)}'
        
        total_score = sum(d['score'] for d in details.values())
        print(f"[DEBUG] Total MEO Score: {total_score}/100", file=sys.stderr)
        return total_score, details
        
    except Exception as e:
        print(f"[ERROR] Error calculating MEO score: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        # Return partial scores instead of 0
        total_score = sum(d['score'] for d in details.values())
        return total_score, details


def scrape_homepage_text(website_url: str) -> str:
    """
    Scrape and extract text content from homepage.
    Returns empty string if scraping fails or text is too short.
    """
    try:
        print(f"[DEBUG] Scraping homepage: {website_url}", file=sys.stderr)
        
        # Realistic browser headers to avoid 403 blocks
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        
        response = requests.get(website_url, headers=headers, timeout=15, allow_redirects=True)
        
        print(f"[DEBUG] Response status: {response.status_code}, Content-Type: {response.headers.get('Content-Type', 'unknown')}", file=sys.stderr)
        
        # Check for 403 or other blocking
        if response.status_code == 403:
            print(f"[ERROR] Scraping blocked (403 Forbidden) - website may be blocking scrapers", file=sys.stderr)
            return ""
        
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "noscript"]):
            script.decompose()
        
        # Get text content
        text = soup.get_text()
        # Clean up whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = ' '.join(chunk for chunk in chunks if chunk)
        
        # Check if text is too short
        if len(text) < 100:
            print(f"[ERROR] Scraped text too short ({len(text)} chars) - Scraping Failed", file=sys.stderr)
            return ""
        
        # Limit to first 8000 characters (to stay within token limits)
        result = text[:8000]
        
        # Debug: Print first 200 characters
        preview = result[:200]
        print(f"[DEBUG] Extracted {len(result)} characters from homepage", file=sys.stderr)
        print(f"[DEBUG] First 200 characters of scraped text: {preview}...", file=sys.stderr)
        
        return result
    except requests.exceptions.HTTPError as e:
        print(f"[ERROR] HTTP error scraping homepage: {e}", file=sys.stderr)
        if e.response and e.response.status_code == 403:
            print(f"[ERROR] Scraping blocked (403 Forbidden) - Scraping Failed", file=sys.stderr)
        return ""
    except Exception as e:
        print(f"[ERROR] Could not scrape homepage: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return ""


def check_schema(website_url: str) -> Tuple[bool, str]:
    """
    Check for LocalBusiness or MedicalBusiness schema in JSON-LD.
    Returns: (found, schema_type)
    """
    try:
        # Realistic browser headers to avoid 403 blocks
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        response = requests.get(website_url, headers=headers, timeout=15, allow_redirects=True)
        
        if response.status_code == 403:
            print(f"[WARNING] Schema check blocked (403 Forbidden)", file=sys.stderr)
            return False, ""
        
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find all JSON-LD scripts
        json_ld_scripts = soup.find_all('script', type='application/ld+json')
        print(f"[DEBUG] Found {len(json_ld_scripts)} JSON-LD scripts", file=sys.stderr)
        
        for script in json_ld_scripts:
            try:
                script_content = script.string
                if not script_content:
                    continue
                    
                data = json.loads(script_content)
                # Handle both single objects and arrays
                schemas = data if isinstance(data, list) else [data]
                
                for schema in schemas:
                    if not isinstance(schema, dict):
                        continue
                        
                    schema_type = schema.get('@type', '')
                    if isinstance(schema_type, list):
                        schema_type = schema_type[0] if schema_type else ''
                    
                    schema_type_str = str(schema_type)
                    if 'LocalBusiness' in schema_type_str or 'MedicalBusiness' in schema_type_str:
                        print(f"[DEBUG] Found schema type: {schema_type_str}", file=sys.stderr)
                        return True, schema_type_str
            except (json.JSONDecodeError, KeyError, AttributeError) as e:
                print(f"[DEBUG] Error parsing JSON-LD: {e}", file=sys.stderr)
                continue
        
        print(f"[DEBUG] No LocalBusiness/MedicalBusiness schema found", file=sys.stderr)
        return False, ""
    except Exception as e:
        print(f"[WARNING] Could not check schema: {e}", file=sys.stderr)
        return False, ""


def check_trust_signals(website_url: str) -> bool:
    """
    Check footer for trust signals: "Privacy Policy", "Terms", "Licensed", or "Copyright [Current Year]"
    Returns: True if found, False otherwise
    """
    try:
        # Realistic browser headers to avoid 403 blocks
        headers = {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Cache-Control': 'max-age=0'
        }
        response = requests.get(website_url, headers=headers, timeout=15, allow_redirects=True)
        
        if response.status_code == 403:
            print(f"[WARNING] Trust signals check blocked (403 Forbidden)", file=sys.stderr)
            return False
        
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find footer - try multiple selectors
        footer = (soup.find('footer') or 
                 soup.find('div', class_=re.compile(r'footer', re.I)) or
                 soup.find('div', id=re.compile(r'footer', re.I)))
        search_area = footer if footer else soup
        
        text = search_area.get_text().lower()
        current_year = str(2025)  # Update as needed
        
        trust_signals = [
            'privacy policy',
            'terms',
            'licensed',
            f'copyright {current_year}',
            f'© {current_year}',
            'copyright',  # More lenient - just check for copyright
            'privacy',  # More lenient
            'terms of service',
            'terms and conditions'
        ]
        
        found = any(signal in text for signal in trust_signals)
        print(f"[DEBUG] Trust signals check: {found}", file=sys.stderr)
        return found
    except Exception as e:
        print(f"[WARNING] Could not check trust signals: {e}", file=sys.stderr)
        return False


def ai_recommendation_test(homepage_text: str, business_name: str, target_address: str) -> int:
    """
    Use OpenAI to analyze homepage text for AI recommendation quality.
    Returns score 0-50.
    """
    if not homepage_text or len(homepage_text.strip()) < 100:
        print(f"[ERROR] Homepage text too short or empty ({len(homepage_text) if homepage_text else 0} chars) - Scraping Failed", file=sys.stderr)
        return 0
    
    print(f"[DEBUG] Sending {len(homepage_text)} chars to OpenAI for analysis", file=sys.stderr)
    
    # Updated prompt with actual scraped text variable
    prompt = f"""Analyze the following website text. Rate it from 0 to 50 based strictly on how clearly it defines the Business Location and Services.

Business: {business_name}
Location: {target_address}

Website Text:
{homepage_text[:4000]}

Return ONLY the integer."""

    try:
        print(f"[DEBUG] Calling OpenAI API with prompt length: {len(prompt)}", file=sys.stderr)
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are an SEO auditor. Analyze the following website text. Rate it from 0 to 50 based strictly on how clearly it defines the Business Location and Services. Return ONLY the integer."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=10,
            temperature=0.3
        )
        
        content = response.choices[0].message.content.strip()
        print(f"[DEBUG] OpenAI raw response: {content}", file=sys.stderr)
        
        # Extract first integer found
        score_match = re.search(r'\d+', content)
        if score_match:
            score = int(score_match.group())
            clamped_score = min(50, max(0, score))  # Clamp between 0-50
            print(f"[DEBUG] AI Recommendation Score: {clamped_score}/50", file=sys.stderr)
            return clamped_score
        print(f"[WARNING] Could not extract score from OpenAI response: {content}", file=sys.stderr)
        return 0
    except Exception as e:
        print(f"[ERROR] OpenAI API error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        return 0


def calculate_geo_score(website_url: str, business_name: str, target_address: str) -> Tuple[int, Dict[str, any]]:
    """
    Calculate GEO Score (Generative Engine Optimization) - 100 points total.
    
    Returns:
        Tuple of (score, details_dict)
    """
    details = {
        'schema_architecture': {'score': 0, 'max': 30, 'details': ''},
        'trust_signals': {'score': 0, 'max': 20, 'details': ''},
        'ai_recommendation': {'score': 0, 'max': 50, 'details': ''}
    }
    
    if not website_url:
        details['schema_architecture']['details'] = 'No website URL provided'
        details['trust_signals']['details'] = 'No website URL provided'
        details['ai_recommendation']['details'] = 'No website URL provided'
        print(f"[DEBUG] No website URL provided for GEO score", file=sys.stderr)
        return 0, details
    
    print(f"[DEBUG] Calculating GEO score for website: {website_url}", file=sys.stderr)
    
    # 1. Schema Architecture (30 pts)
    print(f"[DEBUG] Checking for schema markup...", file=sys.stderr)
    has_schema, schema_type = check_schema(website_url)
    if has_schema:
        details['schema_architecture']['score'] = 30
        details['schema_architecture']['details'] = f'Found {schema_type} schema'
        print(f"[DEBUG] Schema found: {schema_type}", file=sys.stderr)
    else:
        details['schema_architecture']['score'] = 0
        details['schema_architecture']['details'] = 'No LocalBusiness/MedicalBusiness schema found'
        print(f"[DEBUG] No schema found", file=sys.stderr)
    
    # 2. Trust Signals (20 pts)
    print(f"[DEBUG] Checking for trust signals...", file=sys.stderr)
    has_trust_signals = check_trust_signals(website_url)
    if has_trust_signals:
        details['trust_signals']['score'] = 20
        details['trust_signals']['details'] = 'Trust signals found in footer'
        print(f"[DEBUG] Trust signals found", file=sys.stderr)
    else:
        details['trust_signals']['score'] = 0
        details['trust_signals']['details'] = 'Missing trust signals (Privacy Policy, Terms, Licensed, or Copyright)'
        print(f"[DEBUG] No trust signals found", file=sys.stderr)
    
    # 3. AI Recommendation Test (50 pts)
    print(f"[DEBUG] Scraping homepage text...", file=sys.stderr)
    homepage_text = scrape_homepage_text(website_url)
    
    if not homepage_text or len(homepage_text) < 100:
        details['ai_recommendation']['score'] = 0
        details['ai_recommendation']['details'] = 'Scraping Failed - Could not retrieve website text'
        print(f"[ERROR] Cannot calculate AI recommendation score - scraping failed", file=sys.stderr)
    else:
        print(f"[DEBUG] Scraped {len(homepage_text)} characters from homepage", file=sys.stderr)
        ai_score = ai_recommendation_test(homepage_text, business_name, target_address)
        details['ai_recommendation']['score'] = ai_score
        details['ai_recommendation']['details'] = f'AI recommendation score: {ai_score}/50'
    
    total_score = sum(d['score'] for d in details.values())
    print(f"[DEBUG] Total GEO Score: {total_score}/100", file=sys.stderr)
    return total_score, details


def generate_action_plan(meo_details: Dict, geo_details: Dict) -> list:
    """Generate action plan based on failed checks"""
    actions = []
    
    # MEO actions
    if meo_details['nap_consistency']['score'] < 40:
        actions.append("Fix NAP Mismatch - Ensure phone and address match between website and Google listing")
    if meo_details['review_volume']['score'] < 20:
        actions.append(f"Increase Review Volume - Currently {meo_details['review_volume']['details']}, aim for 100+ reviews")
    if meo_details['star_rating']['score'] < 20:
        actions.append(f"Improve Star Rating - Currently {meo_details['star_rating']['details']}, aim for 4.5+ stars")
    if meo_details['listing_completeness']['score'] < 20:
        actions.append("Complete Listing - Add photos and multiple business categories")
    
    # GEO actions
    if geo_details['schema_architecture']['score'] < 30:
        actions.append("Add Schema Markup - Implement LocalBusiness or MedicalBusiness JSON-LD schema")
    if geo_details['trust_signals']['score'] < 20:
        actions.append("Add Trust Signals - Include Privacy Policy, Terms, Licensed status, or Copyright notice in footer")
    if geo_details['ai_recommendation']['score'] < 30:
        actions.append("Optimize for AI - Clearly state service areas and specific services on homepage")
    
    return actions


def print_report(business_name: str, meo_score: int, geo_score: int, 
                 meo_details: Dict, geo_details: Dict, action_plan: list):
    """Print detailed terminal report"""
    final_score = (meo_score + geo_score) // 2
    
    # Determine status color
    if final_score >= 85:
        status_color = Colors.GREEN
        status = "EXCELLENT"
    elif final_score >= 50:
        status_color = Colors.YELLOW
        status = "NEEDS IMPROVEMENT"
    else:
        status_color = Colors.RED
        status = "CRITICAL"
    
    print("\n" + "="*70)
    print(f"{Colors.BOLD}{Colors.BLUE}MGO VISIBILITY SCORE REPORT{Colors.RESET}")
    print("="*70)
    print(f"\n{Colors.BOLD}Business:{Colors.RESET} {business_name}\n")
    
    # MEO Score Breakdown
    print(f"{Colors.BOLD}MEO SCORE (Map Engine Optimization):{Colors.RESET} {meo_score}/100")
    print("-" * 70)
    for key, data in meo_details.items():
        key_name = key.replace('_', ' ').title()
        score_color = Colors.GREEN if data['score'] == data['max'] else Colors.YELLOW if data['score'] > 0 else Colors.RED
        print(f"  {key_name:.<30} {score_color}{data['score']:>3}/{data['max']:<3}{Colors.RESET} - {data['details']}")
    
    print()
    
    # GEO Score Breakdown
    print(f"{Colors.BOLD}GEO SCORE (Generative Engine Optimization):{Colors.RESET} {geo_score}/100")
    print("-" * 70)
    for key, data in geo_details.items():
        key_name = key.replace('_', ' ').title()
        score_color = Colors.GREEN if data['score'] == data['max'] else Colors.YELLOW if data['score'] > 0 else Colors.RED
        print(f"  {key_name:.<30} {score_color}{data['score']:>3}/{data['max']:<3}{Colors.RESET} - {data['details']}")
    
    print()
    print("="*70)
    print(f"{Colors.BOLD}TOTAL MGO VISIBILITY:{Colors.RESET} {status_color}{final_score}/100{Colors.RESET}")
    print(f"{Colors.BOLD}Status:{Colors.RESET} {status_color}{status}{Colors.RESET}")
    print("="*70)
    
    # Action Plan
    if action_plan:
        print(f"\n{Colors.BOLD}ACTION PLAN:{Colors.RESET}")
        print("-" * 70)
        for i, action in enumerate(action_plan, 1):
            print(f"  {i}. {action}")
    else:
        print(f"\n{Colors.GREEN}✓ No action items - Business is well optimized!{Colors.RESET}")
    
    print()


def main():
    """Main execution block"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Calculate MGO Visibility Score for a local business')
    parser.add_argument('--business-name', required=True, help='Business name')
    parser.add_argument('--target-address', required=True, help='Target address')
    parser.add_argument('--website-url', help='Website URL (optional but recommended)')
    parser.add_argument('--place-id', required=True, help='Google Place ID')
    
    args = parser.parse_args()
    
    print(f"{Colors.BLUE}Calculating MGO Visibility Score for: {args.business_name}{Colors.RESET}")
    print(f"Location: {args.target_address}")
    if args.website_url:
        print(f"Website: {args.website_url}")
    print()
    
    # Calculate MEO Score
    print(f"{Colors.BLUE}[1/2] Calculating MEO Score...{Colors.RESET}")
    try:
        meo_score, meo_details = calculate_meo_score(args.place_id, args.website_url)
        print(f"{Colors.GREEN}✓ MEO Score calculated: {meo_score}/100{Colors.RESET}")
    except Exception as e:
        print(f"{Colors.RED}✗ Error calculating MEO score: {e}{Colors.RESET}", file=sys.stderr)
        meo_score, meo_details = 0, {
            'nap_consistency': {'score': 0, 'max': 40, 'details': f'Error: {str(e)}'},
            'review_volume': {'score': 0, 'max': 20, 'details': 'Error'},
            'star_rating': {'score': 0, 'max': 20, 'details': 'Error'},
            'listing_completeness': {'score': 0, 'max': 20, 'details': 'Error'}
        }
    
    # Calculate GEO Score
    print(f"{Colors.BLUE}[2/2] Calculating GEO Score...{Colors.RESET}")
    try:
        geo_score, geo_details = calculate_geo_score(
            args.website_url or '', 
            args.business_name, 
            args.target_address
        )
        print(f"{Colors.GREEN}✓ GEO Score calculated: {geo_score}/100{Colors.RESET}")
    except Exception as e:
        print(f"{Colors.RED}✗ Error calculating GEO score: {e}{Colors.RESET}", file=sys.stderr)
        geo_score, geo_details = 0, {
            'schema_architecture': {'score': 0, 'max': 30, 'details': f'Error: {str(e)}'},
            'trust_signals': {'score': 0, 'max': 20, 'details': 'Error'},
            'ai_recommendation': {'score': 0, 'max': 50, 'details': 'Error'}
        }
    
    # Generate action plan
    action_plan = generate_action_plan(meo_details, geo_details)
    
    # Print report
    print_report(args.business_name, meo_score, geo_score, meo_details, geo_details, action_plan)


if __name__ == '__main__':
    main()

