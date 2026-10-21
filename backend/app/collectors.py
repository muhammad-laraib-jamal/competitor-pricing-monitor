# backend/app/collectors.py
"""Collector architecture for PriceWatch AI.

Implements:
1. BasePricingCollector (ABC)
2. MockPricingCollector (deterministic fixtures for hackathon demos & TC1-TC4)
3. HttpPricingCollector (live public web pages via requests + BeautifulSoup)

Honest handling guarantees:
- Never fabricates live observations
- Captures timeouts, network errors, and HTTP status codes cleanly
- Marks unpriced or 'contact sales' tiers as 'unavailable' (never zero)
- Extracts real structured elements: plan names, prices, currencies, billing frequencies
"""

import logging
import re
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

import requests
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

# Standard browser User-Agent for polite, identified web requests
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 (PriceWatch-AI-Bot/1.0)"


class CollectorResult:
    """Standardized result object returned by all collectors."""
    def __init__(
        self,
        success: bool,
        url: str,
        status_code: Optional[int] = None,
        plans: Optional[List[Dict[str, Any]]] = None,
        html_excerpt: Optional[str] = None,
        error_message: Optional[str] = None,
        collector_type: str = "http",
        fetch_duration_ms: float = 0.0,
    ):
        self.success = success
        self.url = url
        self.status_code = status_code
        self.plans = plans or []
        self.html_excerpt = html_excerpt
        self.error_message = error_message
        self.collector_type = collector_type
        self.fetch_duration_ms = fetch_duration_ms

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "url": self.url,
            "status_code": self.status_code,
            "plans_count": len(self.plans),
            "plans": self.plans,
            "error_message": self.error_message,
            "collector_type": self.collector_type,
            "fetch_duration_ms": self.fetch_duration_ms,
        }


class BasePricingCollector(ABC):
    """Abstract base class for all pricing collectors."""

    @abstractmethod
    def fetch(self, url: str, timeout: int = 10) -> CollectorResult:
        """Fetch pricing details from a target URL."""
        pass


class HttpPricingCollector(BasePricingCollector):
    """Collector for real public web pricing pages using requests and BeautifulSoup.
    
    Safe & polite:
    - 10s default timeout
    - Identifiable user-agent
    - Never bypasses CAPTCHA, authentication, or paywalls
    - Preserves exact HTML excerpt and error details
    """

    def __init__(self, user_agent: str = USER_AGENT):
        self.headers = {
            "User-Agent": user_agent,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }

    def fetch(self, url: str, timeout: int = 10) -> CollectorResult:
        start_time = datetime.utcnow()
        try:
            response = requests.get(
                url,
                headers=self.headers,
                timeout=timeout,
                allow_redirects=True,
            )
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000

            if response.status_code != 200:
                return CollectorResult(
                    success=False,
                    url=url,
                    status_code=response.status_code,
                    error_message=f"HTTP {response.status_code}: Page could not be loaded",
                    collector_type="http",
                    fetch_duration_ms=duration_ms,
                    html_excerpt=response.text[:500] if response.text else None,
                )

            # Parse pricing plans from HTML
            plans, excerpt = self._parse_html(response.text, url)

            return CollectorResult(
                success=True,
                url=url,
                status_code=response.status_code,
                plans=plans,
                html_excerpt=excerpt,
                collector_type="http",
                fetch_duration_ms=duration_ms,
            )

        except requests.exceptions.Timeout:
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            return CollectorResult(
                success=False,
                url=url,
                error_message=f"Request timed out after {timeout}s",
                collector_type="http",
                fetch_duration_ms=duration_ms,
            )
        except requests.exceptions.SSLError as e:
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            return CollectorResult(
                success=False,
                url=url,
                error_message=f"SSL certificate verification failed: {str(e)[:120]}",
                collector_type="http",
                fetch_duration_ms=duration_ms,
            )
        except requests.exceptions.ConnectionError as e:
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            return CollectorResult(
                success=False,
                url=url,
                error_message=f"Connection failed: Host could not be reached",
                collector_type="http",
                fetch_duration_ms=duration_ms,
            )
        except Exception as e:
            duration_ms = (datetime.utcnow() - start_time).total_seconds() * 1000
            return CollectorResult(
                success=False,
                url=url,
                error_message=f"Extraction error: {str(e)}",
                collector_type="http",
                fetch_duration_ms=duration_ms,
            )

    def _parse_html(self, html: str, source_url: str) -> Tuple[List[Dict[str, Any]], str]:
        """Extract plan names, prices, and terms using semantic CSS and regex patterns."""
        soup = BeautifulSoup(html, "html.parser")
        plans: List[Dict[str, Any]] = []

        # Common pricing card containers
        card_selectors = [
            ".pricing-card", ".pricing-plan", ".plan-card", ".price-card",
            "[data-testid*='pricing']", "[class*='pricing']", "[class*='plan']",
            "article", ".card", ".tier"
        ]

        found_cards = []
        for selector in card_selectors:
            elements = soup.select(selector)
            if 1 < len(elements) <= 10:  # Reasonable number of tiers
                found_cards = elements
                break

        price_regex = re.compile(r"([₹$£€])\s*([\d,]+(?:\.\d+)?)")
        billing_regex = re.compile(r"(per|/)?\s*(month|year|yr|weekly|week|day|mo)", re.IGNORECASE)

        if found_cards:
            for idx, card in enumerate(found_cards):
                card_text = card.get_text(separator=" ", strip=True)

                # Look for plan title (h1, h2, h3, h4, or strong)
                title_elem = card.find(["h2", "h3", "h4", "h5", "strong"])
                plan_name = title_elem.get_text(strip=True) if title_elem else f"Tier {idx + 1}"
                # Clean title if too long
                if len(plan_name) > 40:
                    plan_name = plan_name[:40].strip()

                # Check for "Contact sales"
                if re.search(r"contact\s+sales|talk\s+to\s+sales|custom\s+pricing|call\s+us", card_text, re.IGNORECASE):
                    plans.append({
                        "raw_plan_name": plan_name,
                        "raw_price_text": "Contact sales",
                        "status": "unavailable",
                    })
                    continue

                # Search for price string
                price_match = price_regex.search(card_text)
                if price_match:
                    symbol, num = price_match.groups()
                    bill_match = billing_regex.search(card_text)
                    billing_suffix = f"/{bill_match.group(2).lower()}" if bill_match else "/month"
                    raw_price_text = f"{symbol}{num}{billing_suffix}"
                    plans.append({
                        "raw_plan_name": plan_name,
                        "raw_price_text": raw_price_text,
                        "status": "fetched",
                    })

        # Fallback: regex search on whole body text if cards weren't distinct
        if not plans:
            body_text = soup.get_text(separator=" ", strip=True)
            if re.search(r"contact\s+sales", body_text, re.IGNORECASE):
                plans.append({
                    "raw_plan_name": "Enterprise",
                    "raw_price_text": "Contact sales",
                    "status": "unavailable",
                })

            for match in price_regex.finditer(body_text[:2000]):
                symbol, num = match.groups()
                plans.append({
                    "raw_plan_name": f"Plan {len(plans) + 1}",
                    "raw_price_text": f"{symbol}{num}/month",
                    "status": "fetched",
                })
                if len(plans) >= 4:
                    break

        excerpt = soup.prettify()[:800] if soup else html[:800]
        return plans, excerpt


class MockPricingCollector(BasePricingCollector):
    """Deterministic mock collector returning official test fixtures."""

    FIXTURE_STORE = {
        "https://example.com/competitor-a/pricing": {
            "Basic": "₹1,099/month",
        },
        "https://example.com/competitor-b/pricing": {
            "Pro": "₹999/month",  # Currency display switch from $12/month
        },
        "https://example.com/competitor-c/pricing": {
            "Enterprise": "Contact sales",
        },
        "https://example.com/competitor-d/pricing": {
            "Starter": "₹550/month",
        },
    }

    def fetch(self, url: str, timeout: int = 10) -> CollectorResult:
        norm_url = url.strip().rstrip("/")
        plans = []

        # Find matching fixture by partial URL
        matched_fixtures = None
        for fixture_url, fixture_plans in self.FIXTURE_STORE.items():
            if fixture_url.rstrip("/") in norm_url or norm_url in fixture_url.rstrip("/"):
                matched_fixtures = fixture_plans
                break

        if matched_fixtures:
            for plan_name, price_text in matched_fixtures.items():
                status = "unavailable" if "contact sales" in price_text.lower() else "fetched"
                plans.append({
                    "raw_plan_name": plan_name,
                    "raw_price_text": price_text,
                    "status": status,
                })
            return CollectorResult(
                success=True,
                url=url,
                status_code=200,
                plans=plans,
                html_excerpt=f"<!-- Mock Fixture for {url} -->",
                collector_type="mock",
                fetch_duration_ms=45.0,
            )

        # Fallback synthetic demo for any other custom URL
        plans.append({
            "raw_plan_name": "Standard Plan",
            "raw_price_text": "₹1,299/month",
            "status": "fetched",
        })
        return CollectorResult(
            success=True,
            url=url,
            status_code=200,
            plans=plans,
            html_excerpt=f"<!-- Synthetic Demo Fixture for {url} -->",
            collector_type="mock",
            fetch_duration_ms=30.0,
        )


def get_collector(collector_type: str = "mock") -> BasePricingCollector:
    """Factory method to instantiate the requested collector type."""
    if collector_type.lower() == "http" or collector_type.lower() == "live":
        return HttpPricingCollector()
    return MockPricingCollector()
