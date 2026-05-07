import threading
import uvicorn

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
    )
