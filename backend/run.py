import threading
import warnings
import logging
import urllib3
import uvicorn

# Suppress InsecureRequestWarning from requests/httpx when verify=False
warnings.filterwarnings('ignore', category=urllib3.exceptions.InsecureRequestWarning)
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# ── Logging configuration ─────────────────────────────────────────────────────
LOG_FILE = 'gateway.log'

_fmt = logging.Formatter(
    fmt='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%H:%M:%S',
)

_file_handler = logging.FileHandler(LOG_FILE, encoding='utf-8')
_file_handler.setFormatter(_fmt)
_file_handler.setLevel(logging.INFO)

_stream_handler = logging.StreamHandler()
_stream_handler.setFormatter(_fmt)
_stream_handler.setLevel(logging.CRITICAL)   # terminal: silent (all logs go to file)

logging.root.setLevel(logging.WARNING)
logging.root.addHandler(_file_handler)
logging.root.addHandler(_stream_handler)

# File gets INFO+, terminal silent
logging.getLogger('app').setLevel(logging.INFO)
logging.getLogger('pymodbus').setLevel(logging.ERROR)
logging.getLogger('uvicorn').setLevel(logging.WARNING)
logging.getLogger('uvicorn.access').setLevel(logging.WARNING)  # disabled, using app.access middleware

from app.main import app
from app.services.poller import start_polling
from app.services.modbus_server import start_modbus_server
from app.config import settings


if __name__ == '__main__':
    start_polling()

    modbus_thread = threading.Thread(
        target=start_modbus_server,
        daemon=True,
        name='modbus-server',
    )
    modbus_thread.start()

    uvicorn.run(
        'app.main:app',
        host=settings.app.host,
        port=settings.app.port,
        reload=False,
        access_log=False,
    )
