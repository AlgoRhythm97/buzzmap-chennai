// Copy to config.h (git-ignored) and fill in for each node.
#pragma once

// Wi-Fi (2.4 GHz only)
#define WIFI_SSID     "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"

// Backend reachable from the ESP32: use the computer's LAN IP, not localhost,
// and start uvicorn with --host 0.0.0.0
#define API_BASE_URL  "http://192.168.1.10:8000"

// Node identity; registered with the backend on boot (existing ids are kept)
#define NODE_ID       "CHN-ADYAR-01"   // uppercase letters, digits and dashes
#define NODE_NAME     "Adyar Riverside"
#define NODE_LOCALITY "Adyar"
#define NODE_LAT      13.0012
#define NODE_LON      80.2565
