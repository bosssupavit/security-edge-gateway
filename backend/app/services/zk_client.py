"""
ZKBio Access / BioTime HTTP API Client
=======================================
Polls the management server for access controller device status.

API response format (terminal list):
  GET /api/v3/iclock/terminal/?format=json&page_size=100
  {
    "code": 0,
    "msg": "",
    "count": 3,
    "data": [
      {
        "id": "7",
        "alias": "FSN-B",
        "sn": "CQ44232960018",
        "area": "เช็คอินที่ออฟฟิศตึกB",
        "ip_address": "192.168.4.34",
        "real_ip": "192.168.4.34",
        "terminal_name": "SpeedFace-V3L",
        "fw_ver": "ZMM510-NF24VB-Ver1.3.6",
        "terminal_state": "<div ...><img ... alt=\"1\" /></div>",
        "last_activity": "2026-05-07 22:28:17",
        "user_count": "49",
        "transaction_count": "123918",
        ...
      }
    ]
  }

terminal_state values (parsed from alt attribute):
  1 = Online
  2 = Disabled
  3 = Offline
"""

import re
import logging
import requests

logger = logging.getLogger(__name__)

_STATE_RE = re.compile(r'alt=["\'](\d+)["\']')


def _parse_state(terminal_state_html: str) -> int:
    """Extract numeric state from HTML img alt attribute. Returns 0 if unparseable."""
    m = _STATE_RE.search(terminal_state_html)
    return int(m.group(1)) if m else 0


class ZkBioClient:
    def __init__(self, base_url: str, username: str, password: str, page_size: int = 100):
        self._base = base_url.rstrip('/')
        self._username = username
        self._password = password
        self._page_size = page_size
        self._session = requests.Session()
        self._logged_in = False

    def _ensure_login(self):
        """Authenticate against BioTime JWT endpoint if not yet logged in."""
        if self._logged_in:
            return
        url = f'{self._base}/jwt-api-token-auth/'
        try:
            resp = self._session.post(
                url,
                json={'username': self._username, 'password': self._password},
                timeout=10,
            )
            resp.raise_for_status()
            token = resp.json().get('token', '')
            if token:
                self._session.headers.update({'Authorization': f'JWT {token}'})
                self._logged_in = True
                logger.info('[zk-client] authenticated against %s', self._base)
            else:
                logger.warning('[zk-client] login response had no token: %s', resp.text[:200])
        except Exception as exc:
            logger.error('[zk-client] login failed: %s', exc)
            self._logged_in = False

    def get_terminals(self) -> list[dict]:
        """
        Fetch all access controller terminals with pagination.
        Returns list of parsed device dicts with numeric terminal_state.
        """
        self._ensure_login()
        results = []
        page = 1
        while True:
            url = f'{self._base}/api/v3/iclock/terminal/'
            try:
                resp = self._session.get(
                    url,
                    params={'format': 'json', 'page_size': self._page_size, 'page': page},
                    timeout=15,
                )
                if resp.status_code == 401:
                    # Token expired — force re-login once
                    self._logged_in = False
                    self._ensure_login()
                    resp = self._session.get(
                        url,
                        params={'format': 'json', 'page_size': self._page_size, 'page': page},
                        timeout=15,
                    )
                resp.raise_for_status()
                body = resp.json()
            except Exception as exc:
                logger.error('[zk-client] get_terminals page=%d error: %s', page, exc)
                break

            data = body.get('data', [])
            for raw in data:
                results.append(_normalize(raw))

            # Pagination: stop if we got fewer than page_size or no next page
            if len(data) < self._page_size:
                break
            page += 1

        logger.info('[zk-client] fetched %d terminals', len(results))
        return results


def _normalize(raw: dict) -> dict:
    """Convert raw API row to clean dict with typed fields."""
    state = _parse_state(raw.get('terminal_state', ''))
    return {
        'sn':               raw.get('sn', ''),
        'alias':            raw.get('alias', ''),
        'area':             raw.get('area', ''),
        'ip_address':       raw.get('real_ip') or raw.get('ip_address', ''),
        'terminal_name':    raw.get('terminal_name', ''),
        'fw_ver':           raw.get('fw_ver', ''),
        'terminal_state':   state,              # int: 1=online, 2=disabled, 3=offline
        'online':           state == 1,
        'last_activity':    raw.get('last_activity', ''),
        'user_count':       int(raw.get('user_count', 0) or 0),
        'transaction_count': int(raw.get('transaction_count', 0) or 0),
    }
