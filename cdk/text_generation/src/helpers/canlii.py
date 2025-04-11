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
    Uses the CanLII API response (specifically its "url" field) to embed hyperlinks into texts.
    """
    
    def __init__(self, api_key: str):
        """Initialize with your CanLII API key."""
        self.api_key = api_key
        self.base_url = "https://api.canlii.org/v1"
        self.court_mapping = {
            'SCC': 'csc-scc',
            'SCR': 'csc-scc',  # Supreme Court Reports map to Supreme Court of Canada
            # Add other courts as needed...
        }
        # Cache to avoid repeated API calls for the same citation
        self.citation_cache = {}
        
        # Hardcoded mappings for common SCR citations to their SCC equivalents
        self.scr_mapping = {
            '[2019] 2 SCR 10': '2019scc42',  # Replace with the actual SCC case number if known
            '[2010] 2 SCR 429': '2010scc13',  # Replace with the actual SCC case number if known
            '[2017] 2 SCR 3': '2017scc20',    # Replace with the actual SCC case number if known
        }
        
    def extract_citations(self, text: str) -> List[str]:
        """
        Extract case and legislative citations from text using regex patterns.
        The patterns now include some variants found in your LLM output.
        """
        patterns = [
            # Pattern for case citations like "Moge v. Moge, [1992] 3 S.C.R. 813"
            r'\b[\w\(\)\.\-]+\s+v\.\s+[\w\(\)\.\-]+,\s+\[\d{4}\]\s+\d+\s+S\.C\.R\.\s+\d+\b',
            # Another variant for SCR citations without the case name preamble
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
        Parse citation format to extract relevant details.
        Returns a dictionary with year, court, case number, etc.
        This method currently handles case citations in SCR format.
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
        
        # Alternatively, check if the citation is in a more generic standard format (for cases)
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

        # We could add parsing for legislative citations if desired.
        print(f"[DEBUG] Could not parse citation: {citation}")
        return None
    
    def construct_case_id(self, citation_info: Dict) -> Optional[Tuple[str, str]]:
        """
        Construct a database ID and case ID based on citation information.
        Returns a tuple of (database_id, case_id) or (None, None) if not possible.
        Only applies to case citations.
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
            citation_pattern = f"[{year}] {volume} S.C.R. {page}"
            # Use hardcoded mapping if it exists
            if citation_pattern in self.scr_mapping:
                print(f"[DEBUG] Using hardcoded mapping for SCR citation: {citation_pattern} -> {self.scr_mapping[citation_pattern]}")
                return 'csc-scc', self.scr_mapping[citation_pattern]
            print(f"[DEBUG] No hardcoded mapping for {citation_pattern}, attempting API lookup")
            return self.find_case_by_scr_citation(citation_info)
                
        print(f"[DEBUG] Unable to construct case ID for citation info: {citation_info}")
        return None, None
    
    def find_case_by_scr_citation(self, citation_info: Dict) -> Optional[Tuple[str, str]]:
        """
        Find a Supreme Court case using SCR citation information via the CanLII API.
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
                            print(f"[DEBUG] Found case ID from search API: {case_id}")
                            return database_id, case_id
            browse_url = f"{self.base_url}/caseBrowse/en/{database_id}/?offset=0&resultCount=100&publishedAfter={year}-01-01&publishedBefore={year}-12-31&api_key={self.api_key}"
            print(f"[DEBUG] No match in search, browsing cases using URL: {browse_url}")
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
        Get the URL for a case using the CanLII API.
        Extracts the 'url' field from the JSON response.
        """
        cache_key = f"{database_id}:{case_id}"
        if cache_key in self.citation_cache:
            print(f"[DEBUG] Cache hit for key: {cache_key}")
            return self.citation_cache[cache_key]
            
        api_url = f"{self.base_url}/caseBrowse/en/{database_id}/{case_id}/?api_key={self.api_key}"
        print(f"[DEBUG] Fetching case URL using API URL: {api_url}")
        try:
            response = requests.get(api_url)
            response.raise_for_status()
            case_data = response.json()
            print(f"[DEBUG] API response for case {database_id}/{case_id}: {json.dumps(case_data, indent=2)}")
            
            case_url = case_data.get('url')
            if case_url:
                self.citation_cache[cache_key] = case_url
                print(f"[DEBUG] Retrieved URL for {database_id}/{case_id}: {case_url}")
                return case_url
            
            print(f"[DEBUG] No URL found in API response for {database_id}/{case_id}")
            return None
            
        except requests.exceptions.RequestException as e:
            print(f"[ERROR] Error getting case URL: {e}")
            return None
        except Exception as e:
            print(f"[ERROR] Unexpected error getting case URL: {e}")
            return None
    
    def construct_direct_canlii_url(self, citation_info: Dict) -> Optional[str]:
        """
        Construct a direct CanLII URL as a fallback for SCR citations.
        """
        if citation_info['type'] == 'scr':
            year = citation_info['year']
            direct_url = f"https://www.canlii.org/en/ca/scc/#y{year}"
            print(f"[DEBUG] Constructed fallback direct URL: {direct_url}")
            return direct_url
        return None
    
    def add_legislation_links(self, text: str) -> str:
        """
        Add links to legislative references (e.g., acts) in the text.
        """
        cc_pattern = r'section\s+(\d+(?:\.\d+)?)\s+of\s+the\s+Criminal\s+Code'
        def replace_cc_reference(match):
            section = match.group(1)
            url = f"https://www.canlii.org/en/ca/laws/stat/rsc-1985-c-c-46/latest/rsc-1985-c-c-46.html#sec{section}"
            print(f"[DEBUG] Adding legislative link for section {section}: {url}")
            return f"[section {section} of the Criminal Code]({url})"
        return re.sub(cc_pattern, replace_cc_reference, text, flags=re.IGNORECASE)
    
    def enhance_response(self, llm_response: str) -> str:
        """
        Enhance an LLM response by replacing legal citations with hyperlinks
        obtained from the CanLII API.
        """
        if not self.api_key:
            print("[DEBUG] No CanLII API key provided, skipping citation enhancement")
            logger.warning("No CanLII API key provided, skipping citation enhancement")
            return llm_response
            
        enhanced_response = llm_response
        citations = self.extract_citations(llm_response)
        print(f"[DEBUG] Beginning enhancement of response. Found citations: {citations}")
        
        for citation in citations:
            citation_info = self.parse_citation(citation)
            if citation_info:
                database_id, case_id = self.construct_case_id(citation_info)
                if database_id and case_id:
                    print(f"[DEBUG] Processing citation '{citation}' with database_id={database_id} and case_id={case_id}")
                    case_url = self.get_case_url(database_id, case_id)
                    if case_url:
                        print(f"[DEBUG] Replacing '{citation}' with link: {case_url}")
                        enhanced_response = enhanced_response.replace(
                            citation,
                            f"[{citation}]({case_url})"
                        )
                        logger.info(f"Added link for citation: {citation}")
                    else:
                        direct_url = self.construct_direct_canlii_url(citation_info)
                        if direct_url:
                            print(f"[DEBUG] Using fallback link for '{citation}': {direct_url}")
                            enhanced_response = enhanced_response.replace(
                                citation,
                                f"[{citation}]({direct_url})"
                            )
                            logger.info(f"Added fallback link for citation: {citation}")
                        else:
                            print(f"[DEBUG] Could not construct URL for citation: {citation}")
                            logger.warning(f"Could not construct URL for citation: {citation}")
            else:
                print(f"[DEBUG] Could not parse citation: {citation}")
                logger.warning(f"Could not parse citation: {citation}")
        
        enhanced_response = self.add_legislation_links(enhanced_response)
        print("[DEBUG] Finished enhancing response with citation links.")
        return enhanced_response
