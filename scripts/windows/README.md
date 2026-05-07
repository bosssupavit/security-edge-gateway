# Windows Auto-start Setup

วิธีติดตั้งและตั้งค่าให้ Security Edge Gateway รันอัตโนมัติเมื่อ Windows เปิดเครื่อง

## Requirements

| Software | Version | Download |
|----------|---------|----------|
| Python | 3.11+ | https://python.org (เลือก "Add Python to PATH") |
| Node.js | 18+ | https://nodejs.org |

---

## ขั้นตอน (ทำครั้งแรกครั้งเดียว)

### 1. Clone / วางโปรเจกต์

```
C:\security-edge-gateway\
```

> ตำแหน่งโฟลเดอร์ไม่ตาย ใส่ที่ไหนก็ได้ script จะหาเองอัตโนมัติ

---

### 2. รัน setup.bat

```
scripts\windows\setup.bat
```

Script จะทำให้อัตโนมัติ:
- สร้าง Python virtual environment (`backend\venv`)
- ติดตั้ง Python packages จาก `requirements.txt`
- รัน database migration (`migrate.py`)
- ติดตั้ง npm packages
- Build frontend

---

### 3. แก้ไข config.yaml

```
backend\config.yaml
```

เปลี่ยนค่าที่ต้องแก้:

```yaml
hikcentral:
  base_url: https://<ip-หรือ-domain-ของ-HikCentral>
  app_key: "<app-key>"
  app_secret: "<app-secret>"

zkbio:
  base_url: https://<ip-หรือ-domain-ของ-BioTime>
  username: admin
  password: <password>
```

---

### 4. ลงทะเบียน Auto-start (ต้อง Administrator)

Right-click ไฟล์ → **Run as administrator**

```
scripts\windows\setup_autostart.bat
```

สิ่งที่ script ทำ:
- สร้าง 2 tasks ใน Windows Task Scheduler:
  - `SecurityGateway-Backend` — trigger: system startup, delay 30 วินาที
  - `SecurityGateway-Frontend` — trigger: system startup, delay 60 วินาที

ตรวจสอบใน Task Scheduler Manager (`taskschd.msc`):

![Task Scheduler](https://i.imgur.com/placeholder.png)

---

## รัน Manual (ไม่ต้อง reboot)

เปิด 2 หน้าต่าง Command Prompt แยกกัน:

```bat
rem หน้าต่างที่ 1
scripts\windows\start_backend.bat

rem หน้าต่างที่ 2
scripts\windows\start_frontend.bat
```

---

## Port ที่ใช้

| Service | URL |
|---------|-----|
| Backend API | http://localhost:8080 |
| API Docs (Swagger) | http://localhost:8080/docs |
| Frontend | http://localhost:4173 |
| Modbus TCP | localhost:5020 |

---

## ลบ Auto-start

Right-click → **Run as administrator**

```
scripts\windows\remove_autostart.bat
```

---

## ไฟล์ Scripts

| ไฟล์ | ใช้เมื่อ |
|------|---------|
| `setup.bat` | ติดตั้งครั้งแรก |
| `start_backend.bat` | รัน backend ด้วยมือ |
| `start_frontend.bat` | รัน frontend ด้วยมือ |
| `setup_autostart.bat` | ลงทะเบียน auto-start (Admin) |
| `remove_autostart.bat` | ถอด auto-start (Admin) |

---

## Troubleshooting

**Python not found**
> ติดตั้ง Python ใหม่และเลือก ☑ "Add Python to PATH"

**venv not found error ตอน start_backend.bat**
> รัน `setup.bat` ก่อน

**Task Scheduler ไม่ start**
> ตรวจสอบว่า Task Scheduler service เปิดอยู่: `services.msc` → Task Scheduler → Start

**Port 8080 หรือ 5020 ถูกใช้อยู่**
> แก้ไขใน `backend\config.yaml`:
> ```yaml
> app:
>   port: 8081         # เปลี่ยน API port
>   modbus_port: 5021  # เปลี่ยน Modbus port
> ```

**ต้องการดู log**
> Task Scheduler จะรัน process แบบ headless ให้เพิ่ม output redirect ใน start script:
> ```bat
> venv\Scripts\python.exe run.py >> logs\backend.log 2>&1
> ```
