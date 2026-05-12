"""
HikCentral OpenAPI Client (Artemis API)
========================================
Authentication: HMAC-SHA256 signature

StringToSign format (from official Postman pre-request script):
  HTTP_METHOD\n
  Accept\n
  Content-Type\n
  x-ca-key:KEY\n
  x-ca-nonce:NONCE\n
  x-ca-timestamp:TIMESTAMP_MS\n
  /artemis/path
"""

import hashlib
import hmac
import base64
import uuid
import logging
from datetime import datetime, timezone

import httpx

logger = logging.getLogger(__name__)


class HikCentralClient:
    def __init__(self, base_url: str, app_key: str, app_secret: str):
        self.base_url = base_url.rstrip('/')
        self.app_key = app_key
        self.app_secret = app_secret

    # ── signature helpers ────────────────────────────────────────────────────

    def _build_headers(self, method: str, path: str, body: dict = None) -> dict:
        timestamp = str(int(datetime.now(timezone.utc).timestamp() * 1000))
        nonce = uuid.uuid4().hex
        accept = '*/*'
        content_type = 'application/json' if body else ''

        string_to_sign = '\n'.join([
            method.upper(),
            accept,
            content_type,
            f'x-ca-key:{self.app_key}',
            f'x-ca-nonce:{nonce}',
            f'x-ca-timestamp:{timestamp}',
            path,
        ])

        logger.debug('[hikcentral] StringToSign:\n%s', string_to_sign)

        signature = base64.b64encode(
            hmac.new(
                self.app_secret.encode('utf-8'),
                string_to_sign.encode('utf-8'),
                hashlib.sha256,
            ).digest()
        ).decode('utf-8')

        headers = {
            'Accept': accept,
            'X-Ca-Key': self.app_key,
            'X-Ca-Nonce': nonce,
            'X-Ca-Timestamp': timestamp,
            'X-Ca-Signature': signature,
            'X-Ca-Signature-Headers': 'x-ca-key,x-ca-nonce,x-ca-timestamp',
        }

        if body is not None:
            headers['Content-Type'] = 'application/json'

        return headers

    def _post(self, path: str, body: dict) -> dict:
        headers = self._build_headers('POST', path, body)
        url = f'{self.base_url}{path}'

        logger.debug('[hikcentral] POST %s body=%s', url, body)

        try:
            resp = httpx.post(url, headers=headers, json=body, timeout=100, verify=False)
            logger.debug('[hikcentral] ← %s %s', resp.status_code, resp.text[:500])
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error('[hikcentral] POST %s → HTTP %s\nbody: %s',
                         path, e.response.status_code, e.response.text[:1000])
            raise
        except Exception as e:
            logger.error('[hikcentral] POST %s error: %s', path, e)
            raise

    def _get(self, path: str) -> dict:
        headers = self._build_headers('GET', path)
        url = f'{self.base_url}{path}'

        logger.debug('[hikcentral] GET %s', url)

        try:
            resp = httpx.get(url, headers=headers, timeout=100, verify=False)
            logger.debug('[hikcentral] ← %s %s', resp.status_code, resp.text[:500])
            resp.raise_for_status()
            return resp.json()
        except httpx.HTTPStatusError as e:
            logger.error('[hikcentral] GET %s → HTTP %s\nbody: %s',
                         path, e.response.status_code, e.response.text[:1000])
            raise
        except Exception as e:
            logger.error('[hikcentral] GET %s error: %s', path, e)
            raise

    # ── API methods ──────────────────────────────────────────────────────────

    def get_cameras(self, page_no: int = 1, page_size: int = 199) -> list[dict]:
        path = '/artemis/api/resource/v1/cameras'
        body = {'pageNo': page_no, 'pageSize': page_size}
        data = self._post(path, body)
        return data.get('data', {}).get('list', [])

    def get_encode_devices(self, page_no: int = 1, page_size: int = 199,
                           include_device_info: bool = True) -> list[dict]:
        """
        POST /artemis/api/resource/v1/encodeDevice/advance/encodeDeviceList
        Returns NVR/DVR/encoder devices with IP, port, status, etc.
        """
        path = '/artemis/api/resource/v1/encodeDevice/advance/encodeDeviceList'
        body = {'pageNo': page_no, 'pageSize': page_size, 'bIncludeDeviceInfo': include_device_info}
        data = self._post(path, body)
        return data.get('data', {}).get('list', [])

    def get_doors(self, page_no: int = 1, page_size: int = 199) -> list[dict]:
        path = '/artemis/api/acs/v1/door/advance/doorList'
        body = {'pageNo': page_no, 'pageSize': page_size}
        data = self._post(path, body)
        return data.get('data', {}).get('list', [])

    def get_access_events(self, start_time: str, end_time: str,
                          page_no: int = 1, page_size: int = 199) -> list[dict]:
        path = '/artemis/api/acs/v1/door/events'
        body = {
            'startTime': start_time,
            'endTime': end_time,
            'pageNo': page_no,
            'pageSize': page_size,
        }
        data = self._post(path, body)
        return data.get('data', {}).get('list', [])

    def get_camera_preview_url(self, camera_index_code: str,
                               stream_type: int = 0, protocol: str = 'rtsp') -> str:
        path = '/artemis/api/video/v2/cameras/previewURLs'
        body = {
            'cameraIndexCode': camera_index_code,
            'streamType': stream_type,
            'protocol': protocol,
        }
        data = self._post(path, body)
        return data.get('data', {}).get('url', '')

    def remote_unlock_door(self, door_index_code: str) -> bool:
        path = '/artemis/api/acs/v1/door/doAction/door/unlock'
        body = {'doorIndexCodes': [door_index_code]}
        data = self._post(path, body)
        return data.get('code') == '0'

