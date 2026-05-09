"""
ZKBio CVSecurity 3rd Party API Client
======================================
Communicates with ZKBio CVSecurity 5.2+ via the official 3rd-party REST API.
Covers Access Control only (§2.9, §2.11, §2.18).

Authentication
--------------
All requests append ``?access_token={token}`` as a query parameter.
The token is obtained from CVSecurity → System Management → API Authorization
and stored in config.yaml (``zkbio.access_token``).

Base URL pattern:
  http://{serverIP}:{serverPort}/api/{endpoint}?access_token={token}

Endpoints used
--------------
Device list      GET  /api/device/accList           (§2.9.1)
Door list        GET  /api/door/list                (§2.11.5)
All door state   GET  /api/door/allDoorState        (§2.11.1)
Door state by SN GET  /api/door/doorStateBySn       (§2.11.3)
Transactions     GET  /api/transaction/list         (§2.18.2)
Tx by device     GET  /api/transaction/device/{sn}  (§2.18.1)

Public response envelope:
  { "code": 0,        # 0 = success
    "message": "...",
    "data": ...       # list or object
  }
"""

import logging
import requests

logger = logging.getLogger(__name__)


class ZkBioClient:
    """
    Client for ZKBio CVSecurity 3rd-party REST API.

    Parameters
    ----------
    base_url : str
        e.g. ``http://192.168.1.100:8088``
    access_token : str
        API token from CVSecurity → System Management → API Authorization.
    page_size : int
        Records per page for paginated endpoints (default 100, max 1000).
    """

    def __init__(self, base_url: str, access_token: str, page_size: int = 100):
        self._base = base_url.rstrip('/')
        self._token = access_token
        self._page_size = page_size
        self._session = requests.Session()
        self._session.headers.update({'Content-Type': 'application/json'})
        self._session.verify = False

    # ─── internal helpers ────────────────────────────────────────────────────

    def _params(self, extra: dict | None = None) -> dict:
        """Build query-param dict with access_token prepended."""
        p = {'access_token': self._token}
        if extra:
            p.update(extra)
        return p

    def _get(self, path: str, params: dict | None = None, timeout: int = 15) -> dict:
        """GET wrapper — returns parsed JSON body or raises on error."""
        url = f'{self._base}/api/{path.lstrip("/")}'
        resp = self._session.get(url, params=self._params(params), timeout=timeout)
        resp.raise_for_status()
        return resp.json()

    def _paginate(self, path: str, extra_params: dict | None = None) -> list[dict]:
        """Fetch all pages of a list endpoint and return combined data list."""
        results = []
        page = 1
        while True:
            p = {'pageNo': page, 'pageSize': self._page_size}
            if extra_params:
                p.update(extra_params)
            try:
                body = self._get(path, params=p)
            except Exception as exc:
                logger.error('[zk-client] GET %s page=%d error: %s', path, page, exc)
                break

            if body.get('code', -1) != 0:
                logger.warning('[zk-client] %s returned code=%s msg=%s',
                               path, body.get('code'), body.get('message'))
                break

            data = body.get('data') or []
            if not isinstance(data, list):
                # Some endpoints return a single object in data
                data = [data] if data else []

            results.extend(data)

            if len(data) < self._page_size:
                break
            page += 1

        return results

    # ─── Device endpoints ────────────────────────────────────────────────────

    def get_devices(self) -> list[dict]:
        """
        §2.9.1  GET /api/device/accList
        Returns list of access control devices with id, sn, name, type, state.
        state: "1" = enabled, "0" = disabled.
        """
        raw = self._paginate('device/accList')
        logger.info('[zk-client] fetched %d devices', len(raw))
        return [_normalize_device(d) for d in raw]

    # ─── Door endpoints ───────────────────────────────────────────────────────

    def get_doors(self) -> list[dict]:
        """
        §2.11.5  GET /api/door/list
        Returns list of doors with id, name, deviceId.
        """
        raw = self._paginate('door/list')
        logger.info('[zk-client] fetched %d doors', len(raw))
        return raw

    def get_all_door_states(self) -> list[dict]:
        """
        §2.11.1  GET /api/door/allDoorState
        Returns current sensor/alarm/relay state for every door.

        Real API supports pageNo/pageSize — uses _paginate to handle >100 doors.
        Raw fields per door:
          id       : door's CVSecurity internal ID
          name     : door display name
          deviceId : owning device's CVSecurity internal ID (matches accList.id / zk_id)
          connect  : "1"=controller connected, "0"=offline
          sensor   : "1"=door physically open, "0"=door physically closed
          alarm    : "0"=normal, "2"=alarm active
          relay    : "1"=unlocked (relay energised), "0"=locked
        """
        raw = self._paginate('door/allDoorState')
        logger.info('[zk-client] fetched %d door states', len(raw))
        return [_parse_door_state(d) for d in raw]

    def get_door_states_by_sn(self, device_sn: str, timestamp: int = 0) -> list[dict]:
        """
        §2.11.3  GET /api/door/doorStateBySn
        Returns door state(s) for all doors on the given device.
        """
        try:
            body = self._get('door/doorStateBySn',
                             params={'deviceSn': device_sn, 'timestamp': timestamp})
        except Exception as exc:
            logger.error('[zk-client] get_door_states_by_sn sn=%s error: %s', device_sn, exc)
            return []

        if body.get('code', -1) != 0:
            return []

        data = body.get('data') or []
        return data if isinstance(data, list) else [data]

    # ─── Transaction endpoints ───────────────────────────────────────────────

    def get_transactions(self, start_date: str | None = None,
                         end_date: str | None = None,
                         person_pin: str | None = None) -> list[dict]:
        """
        §2.18.2  GET /api/transaction/list
        Returns access transaction records.  Dates: ``'YYYY-MM-DD'`` format.
        Max 1000 per page.
        """
        extra: dict = {}
        if start_date:
            extra['startDate'] = start_date
        if end_date:
            extra['endDate'] = end_date
        if person_pin:
            extra['personPin'] = person_pin

        raw = self._paginate('transaction/list', extra_params=extra)
        logger.info('[zk-client] fetched %d transactions', len(raw))
        return raw

    def get_transactions_by_device(self, device_sn: str,
                                   start_date: str | None = None,
                                   end_date: str | None = None) -> list[dict]:
        """
        §2.18.1  GET /api/transaction/device/{deviceSn}
        Returns transactions for a specific device.
        """
        path = f'transaction/device/{device_sn}'
        extra: dict = {}
        if start_date:
            extra['startDate'] = start_date
        if end_date:
            extra['endDate'] = end_date

        raw = self._paginate(path, extra_params=extra)
        logger.info('[zk-client] fetched %d transactions for sn=%s', len(raw), device_sn)
        return raw


# ─── Normalizers ─────────────────────────────────────────────────────────────

def _normalize_device(raw: dict) -> dict:
    """Normalise §2.9.1 accList device object to a clean typed dict.

    Actual API fields (verified against real response):
      id     : internal CVSecurity device ID  → zk_id  (used to match allDoorState.deviceId)
      sn     : hardware serial number         → sn
      name   : device label e.g. "ACC041-ACC-01-PD"
      type   : model name e.g. "SenseFace 3A"
      status : "1"=enabled/online, "0"=disabled
      module : always "acc"
    """
    status_str = str(raw.get('status', '0'))
    return {
        'zk_id':       raw.get('id', ''),
        'sn':          raw.get('sn', ''),
        'name':        raw.get('name', ''),
        'device_type': raw.get('type', ''),
        'online':      status_str == '1',
        'module':      raw.get('module', 'acc'),
    }


def _parse_door_state(raw: dict) -> dict:
    """Parse a door-state object from allDoorState response.

    Actual API fields (verified against real response):
      id       : door's CVSecurity internal ID
      name     : door display name e.g. "Corridoor-Mixing"
      deviceId : owning device's CVSecurity ID  (matches accList.id = zk_id)
      connect  : "1"=controller connected, "0"=offline
      sensor   : "1"=door physically OPEN, "0"=door physically CLOSED
      alarm    : "0"=normal, "2"=alarm active
      relay    : "1"=relay energised (unlocked), "0"=relay off (locked)

    Note: door_opened/door_closed are derived from `sensor`, NOT relay.
          relay reflects lock command state, not physical door position.
    """
    connect = str(raw.get('connect', '0'))
    sensor  = str(raw.get('sensor',  '0'))
    relay   = str(raw.get('relay',   '0'))
    alarm   = str(raw.get('alarm',   '0'))

    door_opened = sensor == '1'

    return {
        'id':           raw.get('id', ''),
        'name':         raw.get('name', ''),
        'zk_device_id': raw.get('deviceId', ''),
        'connect':      connect,
        'online':       connect == '1',
        'sensor':       sensor,
        'relay':        relay,
        'alarm':        alarm,
        'door_opened':  door_opened,
        'door_closed':  not door_opened,   # sensor-based, not relay-based
        'unlocked':     relay == '1',      # lock command state
    }
