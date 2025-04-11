import re
import requests
import json
from typing import List, Dict, Tuple, Optional
import logging

# Set up logging
logger = logging.getLogger(__name__)

class CanLIICitationLinker:
    """
    Enhanced version to handle Canadian legal citations and link them to CanLII resources.
    For known case citations, the final link (e.g. https://canlii.ca/t/1fs7v) is returned.
    For cases not in the hardcoded mapping, it attempts to look up the URL via the API.
    """
    
    def __init__(self, api_key: str):
        """Initialize with your CanLII API key."""
        self.api_key = api_key
        self.base_url = "https://api.canlii.org/v1"
        self.court_mapping = {
            'SCC': 'csc-scc',
            'SCR': 'csc-scc',  # Supreme Court Reports map to Supreme Court of Canada
        }
        # Cache to avoid repeated API calls for the same citation
        self.citation_cache = {}
        
        # Hardcoded mappings: key is the SCR citation constructed, value is the known case identifier.
        self.scr_mapping = {
            '[1992] 3 S.C.R. 813': '1992canlii25',
            '[2007] 2 S.C.R. 306': '2007canlii115',
            '[2009] 1 S.C.R. 295': '2009canlii10'
        }
        # Set of known case identifiers (from the above mapping) for which we return the final URL.
        self.known_case_ids = {"1992canlii25", "2007canlii115", "2009canlii10"}
        # Hardcoded final URL mapping for known cases.
        self.known_case_url_mapping = {
            "1992canlii25": "https://canlii.ca/t/1fs7v",
            "2007canlii115": "https://canlii.ca/t/1q7f7",
            "2009canlii10": "https://canlii.ca/t/22197"
        }
        
    def extract_citations(self, text: str) -> List[str]:
        """
        Extract case and legislative citations from text using regex patterns.
        The patterns include variants found in your LLM output.
        """
        patterns = [
            # Pattern for case citations like "Moge v. Moge, [1992] 3 S.C.R. 813"
            r'\b[\w\(\)\.\-]+\s+v\.\s+[\w\(\)\.\-]+,\s+\[\d{4}\]\s+\d+\s+S\.C\.R\.\s+\d+\b',
            # Variant for SCR citations without case name preamble
            r'\[\d{4}\]\s+\d+\s+S\.C\.R\.\s+\d+',
            # Pattern for legislative citations like "Divorce Act, R.S.C. 1985, c. 3 (2)"
            r'\b[\w\s]+Act,\s+R\.SC\.\s+\d{4},\s+c\.\s+\d+\s+\(\d+\)',
            # Pattern for legislative citations like "Family Law Act, R.S.B.C. 2013, c. 29"
            r'\b[\w\s]+Act,\s+R\.S\.[A-Z]{2,3}\.\s+\d{4},\s+c\.\s+\d+'
        ]
        
        citations = []
        for pattern in patterns:
            for match in re.finditer(pattern, text):
                match_str = match.group(0).strip()
                citations.append(match_str)
        print(f"[DEBUG] Extracted citations: {citations}")
        logger.info(f"Extracted {len(citations)} citations")
        return citations
    
    def parse_citation(self, citation: str) -> Optional[Dict]:
        """
        Parse citation format to extract details.
        Returns a dictionary with year, court, case number, etc.
        Handles case citations in SCR format.
        """
        # Try to match the case citation format "Moge v. Moge, [1992] 3 S.C.R. 813"
        case_match = re.search(r'([\w\(\)\.\-]+\s+v\.\s+[\w\(\)\.\-]+),\s+\[(\d{4})\]\s+(\d+)\s+S\.C\.R\.\s+(\d+)', citation)
        if case_match:
            case_name, year, volume, page = case_match.groups()
            parsed = {
                'type': 'scr',
                'case_name': case_name,
                'year': year,
                'reporter': 'SCR',
                'volume': volume,
                'page': page
            }
            print(f"[DEBUG] Parsed case citation '{citation}' as: {parsed}")
            return parsed
        
        # Alternatively, check standard format for cases.
        standard_match = re.search(r'(\d{4})\s+([A-Z]{2,4})\s+(\d+)', citation)
        if standard_match:
            year, court, number = standard_match.groups()
            parsed = {
                'type': 'standard',
                'year': year,
                'court': court,
                'number': number
            }
            print(f"[DEBUG] Parsed standard citation '{citation}' as: {parsed}")
            return parsed

        print(f"[DEBUG] Could not parse citation: {citation}")
        return None
    
    def construct_case_id(self, citation_info: Dict) -> Optional[Tuple[str, str]]:
        """
        Construct a database ID and case ID from citation information.
        Returns (database_id, case_id) if possible.
        """
        if citation_info['type'] == 'standard':
            year = citation_info['year']
            court = citation_info['court']
            number = citation_info['number']
            if court in self.court_mapping:
                database_id = self.court_mapping[court]
                case_id = f"{year}{court.lower()}{number}"
                print(f"[DEBUG] Constructed standard case ID: database_id={database_id}, case_id={case_id}")
                return database_id, case_id
                
        elif citation_info['type'] == 'scr':
            year = citation_info['year']
            volume = citation_info['volume']
            page = citation_info['page']
            # Build the citation pattern in our format.
            citation_pattern = f"[{year}] {volume} S.C.R. {page}"
            if citation_pattern in self.scr_mapping:
                mapped_case_id = self.scr_mapping[citation_pattern]
                print(f"[DEBUG] Using hardcoded mapping: {citation_pattern} -> {mapped_case_id}")
                return 'csc-scc', mapped_case_id
            print(f"[DEBUG] No hardcoded mapping for {citation_pattern}, attempting API lookup")
            return self.find_case_by_scr_citation(citation_info)
                
        print(f"[DEBUG] Unable to construct case ID for citation info: {citation_info}")
        return None, None
    
    def find_case_by_scr_citation(self, citation_info: Dict) -> Optional[Tuple[str, str]]:
        """
        For cases not in the hardcoded mapping, try to find the case ID via the API.
        """
        database_id = 'csc-scc'
        year = citation_info['year']
        volume = citation_info['volume']
        page = citation_info['page']
        
        citation_pattern = f"[{year}] {volume} S.C.R. {page}"
        print(f"[DEBUG] Looking for SCR citation via API: {citation_pattern}")
        
        search_url = f"{self.base_url}/search/en/?q={citation_pattern}&api_key={self.api_key}"
        print(f"[DEBUG] Using search URL: {search_url}")
        
        try:
            response = requests.get(search_url)
            response.raise_for_status()
            search_data = response.json()
            print(f"[DEBUG] Search API response: {json.dumps(search_data, indent=2)}")
            
            if 'results' in search_data and search_data['results']:
                for result in search_data.get('results', []):
                    if citation_pattern in result.get('citation', ''):
                        case_id = result.get('caseId', {}).get('en')
                        if case_id:
                            print(f"[DEBUG] Found case ID: {case_id}")
                            return database_id, case_id
            browse_url = f"{self.base_url}/caseBrowse/en/{database_id}/?offset=0&resultCount=100&publishedAfter={year}-01-01&publishedBefore={year}-12-31&api_key={self.api_key}"
            print(f"[DEBUG] No match in search; browsing using URL: {browse_url}")
            response = requests.get(browse_url)
            response.raise_for_status()
            data = response.json()
            print(f"[DEBUG] Browse API response: {json.dumps(data, indent=2)}")
            
            for case in data.get('cases', []):
                if citation_pattern in case.get('citation', ''):
                    case_id = case.get('caseId', {}).get('en')
                    if case_id:
                        print(f"[DEBUG] Found case ID from browse API: {case_id}")
                        return database_id, case_id
            
            print(f"[DEBUG] Could not find SCR case with pattern: {citation_pattern}")
            return None, None
            
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Error fetching SCR case: {e}")
            return None, None
        except Exception as e:
            print(f"[ERROR] Unexpected error processing SCR citation: {e}")
            return None, None
    
    def get_case_url(self, database_id: str, case_id: str) -> Optional[str]:
        """
        Return the final CanLII URL for a case.
        For known cases, return the hardcoded final URL.
        Otherwise, attempt an API lookup.
        """
        cache_key = f"{database_id}:{case_id}"
        if cache_key in self.citation_cache:
            print(f"[DEBUG] Cache hit for key: {cache_key}")
            return self.citation_cache[cache_key]
        
        # For known cases, return the final URL from the mapping.
        if case_id in self.known_case_ids:
            final_url = self.known_case_url_mapping.get(case_id)
            if final_url:
                print(f"[DEBUG] Returning known final URL for {case_id}: {final_url}")
                self.citation_cache[cache_key] = final_url
                return final_url
            
        # Otherwise, attempt API lookup.
        api_url = f"{self.base_url}/caseBrowse/en/{database_id}/{case_id}/?api_key={self.api_key}"
        print(f"[DEBUG] Fetching case URL via API: {api_url}")
        try:
            response = requests.get(api_url)
            response.raise_for_status()
            case_data = response.json()
            print(f"[DEBUG] API response: {json.dumps(case_data, indent=2)}")
            
            case_url = case_data.get('url')
            if case_url:
                self.citation_cache[cache_key] = case_url
                print(f"[DEBUG] Retrieved case URL: {case_url}")
                return case_url
            
            print(f"[DEBUG] No URL in API response for {database_id}/{case_id}")
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Error fetching case URL: {e}")
            return None
        except Exception as e:
            print(f"[ERROR] Unexpected error fetching case URL: {e}")
            return None
    
    def construct_direct_canlii_url(self, citation_info: Dict) -> Optional[str]:
        """
        As a fallback, construct a direct CanLII URL for SCR citations.
        """
        if citation_info['type'] == 'scr':
            year = citation_info['year']
            direct_url = f"https://www.canlii.org/en/ca/scc/#y{year}"
            print(f"[DEBUG] Constructed fallback URL: {direct_url}")
            return direct_url
        return None
    
    def add_legislation_links(self, text: str) -> str:
        """
        Replace legislative references with hyperlinks.
        """
        cc_pattern = r'section\s+(\d+(?:\.\d+)?)\s+of\s+the\s+Criminal\s+Code'
        def replace_cc_reference(match):
            section = match.group(1)
            url = f"https://www.canlii.org/en/ca/laws/stat/rsc-1985-c-c-46/latest/rsc-1985-c-c-46.html#sec{section}"
            print(f"[DEBUG] Adding legislative link for section {section}: {url}")
            return f"{url}"
        return re.sub(cc_pattern, replace_cc_reference, text, flags=re.IGNORECASE)
    
    def enhance_response(self, llm_response: str) -> str:
        """
        Enhance the LLM response by replacing legal citation text with only the final URL.
        """
        if not self.api_key:
            print("[DEBUG] No CanLII API key provided; skipping enhancement.")
            logger.warning("No CanLII API key provided; skipping enhancement.")
            return llm_response
            
        enhanced_response = llm_response
        citations = self.extract_citations(llm_response)
        print(f"[DEBUG] Beginning enhancement. Found citations: {citations}")
        
        for citation in citations:
            citation_info = self.parse_citation(citation)
            if citation_info:
                database_id, case_id = self.construct_case_id(citation_info)
                if database_id and case_id:
                    print(f"[DEBUG] Processing '{citation}' with database_id={database_id} and case_id={case_id}")
                    case_url = self.get_case_url(database_id, case_id)
                    if case_url:
                        print(f"[DEBUG] Replacing '{citation}' with URL: {case_url}")
                        # Replace the citation text with the final URL.
                        enhanced_response = enhanced_response.replace(citation, case_url)
                        logger.info(f"Replaced citation with URL: {citation} -> {case_url}")
                    else:
                        direct_url = self.construct_direct_canlii_url(citation_info)
                        if direct_url:
                            print(f"[DEBUG] Using fallback URL for '{citation}': {direct_url}")
                            enhanced_response = enhanced_response.replace(citation, direct_url)
                            logger.info(f"Used fallback URL for citation: {citation} -> {direct_url}")
                        else:
                            print(f"[DEBUG] Could not construct URL for citation: {citation}")
                            logger.warning(f"Could not construct URL for citation: {citation}")
            else:
                print(f"[DEBUG] Could not parse citation: {citation}")
                logger.warning(f"Could not parse citation: {citation}")
        
        enhanced_response = self.add_legislation_links(enhanced_response)
        print("[DEBUG] Finished enhancement with citation links.")
        return enhanced_response
