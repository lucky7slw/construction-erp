UPDATE SYSTEM SETUP
===================

ON THE MACBOOK (SERVER):
------------------------
1. Edit update_server.py and change "localhost" to your MacBook's IP in version.json
2. Run: python3 update_server.py
3. Keep it running (or set it up as a service)


ON THE CLIENT MACHINE (WHERE YOUR APP RUNS):
---------------------------------------------
1. Edit auto_updater.py:
   - Change CURRENT_VERSION to match your app version
   - Change UPDATE_SERVER to your MacBook's IP address
   - Change SERVICE_NAME to your actual service name
   - Update the download/install paths

2. Run setup:
   bash setup_auto_update.sh

3. Done! It will check for updates at 3:00 AM every day


MANUAL UPDATE CHECK:
--------------------
Run anytime: python3 auto_updater.py


WHEN YOU RELEASE A NEW VERSION:
--------------------------------
1. On dev computer: python3 bump_version.py
2. Copy version.json to MacBook
3. Package your app and put it at the download_url location
4. Client will auto-update at 3 AM (or run manual check)


LOGS:
-----
Check update.log to see what happened
