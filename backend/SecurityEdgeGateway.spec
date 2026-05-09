# -*- mode: python ; coding: utf-8 -*-
# Security Edge Gateway — PyInstaller spec
# Windows build:  pyinstaller SecurityEdgeGateway.spec
# config.yaml and gateway.db live NEXT TO the exe (not bundled).

from PyInstaller.utils.hooks import collect_all

datas = [
    ('app/templates',   'app/templates'),
    ('static/frontend', 'static/frontend'),
]
binaries = []
hiddenimports = [
    # SQLAlchemy
    'sqlalchemy.dialects.sqlite',
    'sqlalchemy.dialects.sqlite.pysqlite',
    'sqlalchemy.orm',
    'sqlalchemy.ext.declarative',
    # Auth
    'passlib.handlers.bcrypt',
    'jose', 'jose.jwt',
    # Uvicorn
    'uvicorn.logging',
    'uvicorn.loops', 'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
    'uvicorn.protocols.http.h11_impl',
    'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan', 'uvicorn.lifespan.on',
    # Other
    'multipart', 'xmltodict', 'yaml',
]

for _pkg in ('sqlalchemy', 'passlib', 'jose', 'pymodbus', 'bac0'):
    _d, _b, _h = collect_all(_pkg)
    datas += _d; binaries += _b; hiddenimports += _h


a = Analysis(
    ['run.py'],
    pathex=[],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='SecurityEdgeGateway',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
)
