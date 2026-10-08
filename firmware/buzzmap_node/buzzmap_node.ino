/*
 * BuzzMap Chennai sensing node (ESP32).
 *
 * An IR LED shines across a tunnel onto a photodiode/phototransistor. A flying
 * insect's wings modulate the light; this sketch samples that signal, waits for a
 * sudden rise in short-term energy (a beam crossing), and uploads the raw capture,
 * including ~100 ms of pre-trigger baseline, to POST /api/ingest/waveform.
 * The backend does detection, feature extraction and classification.
 *
 * Sampling runs in loop() on core 1 while Wi-Fi runs on core 0. Sampling pauses
 * while a capture uploads (a few hundred ms of dead time per event).
 */
#if __has_include("config.h")
#include "config.h"
#else
#error "Missing config.h: copy config.example.h to config.h and fill in Wi-Fi, backend and node settings."
#endif

#include <WiFi.h>
#include <HTTPClient.h>

// ---- Acquisition -----------------------------------------------------------
const int SENSOR_PIN = 34;                 // ADC1 pin (ADC2 is unusable while Wi-Fi is on)
const int LED_PIN = 2;                     // on-board LED: lit while recording/uploading
const uint32_t SAMPLE_RATE_HZ = 8000;      // Nyquist 4 kHz covers wingbeats and harmonics
const uint32_t SAMPLE_PERIOD_US = 1000000 / SAMPLE_RATE_HZ;

const size_t PRETRIGGER_SAMPLES = SAMPLE_RATE_HZ / 10;     // 100 ms baseline (backend needs >= 50 ms)
const size_t POSTTRIGGER_SAMPLES = SAMPLE_RATE_HZ * 4 / 10; // 400 ms after the trigger
const size_t CAPTURE_SAMPLES = PRETRIGGER_SAMPLES + POSTTRIGGER_SAMPLES;

// ---- Trigger: fast vs slow energy, the firmware twin of the backend detector ----
const float FAST_ALPHA = 1.0f / 16;        // ~2 ms energy average
const float SLOW_ALPHA = 1.0f / 4096;      // ~0.5 s background energy
const float MEAN_ALPHA = 1.0f / 1024;      // DC tracking
const float TRIGGER_RATIO = 8.0f;          // fast energy must exceed 8x background
const float ENERGY_FLOOR = 4.0f;           // ADC counts^2; ignores a near-silent background
const uint32_t WARMUP_SAMPLES = SAMPLE_RATE_HZ;  // 1 s to settle after boot or an upload

uint16_t ring[PRETRIGGER_SAMPLES];
uint16_t capture[CAPTURE_SAMPLES];

float dcMean = 2048, fastEnergy = 0, slowEnergy = 0;
uint32_t overruns = 0;

// ---- Networking ------------------------------------------------------------

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.printf("Connecting to Wi-Fi \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print('.');
  }
  Serial.printf("\nConnected, IP %s\n", WiFi.localIP().toString().c_str());
}

int postJson(const char *path, const String &body, String *response = nullptr) {
  connectWiFi();
  HTTPClient http;
  http.begin(String(API_BASE_URL) + path);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(15000);
  int status = http.POST(body);
  if (response) *response = http.getString();
  http.end();
  return status;
}

bool registerNode() {
  char body[256];
  snprintf(body, sizeof(body),
           "{\"id\":\"%s\",\"name\":\"%s\",\"locality\":\"%s\",\"latitude\":%.6f,\"longitude\":%.6f}",
           NODE_ID, NODE_NAME, NODE_LOCALITY, NODE_LAT, NODE_LON);
  int status = postJson("/api/nodes/", body);
  Serial.printf("Register %s -> HTTP %d%s\n", NODE_ID, status, status == 409 ? " (already registered)" : "");
  return status == 201 || status == 409;
}

void uploadCapture() {
  // Samples are sent as 0..1 fractions of the ADC range; the backend removes DC itself
  String body;
  body.reserve(CAPTURE_SAMPLES * 7 + 96);
  body += "{\"node_id\":\"" NODE_ID "\",\"sample_rate\":";
  body += SAMPLE_RATE_HZ;
  body += ",\"samples\":[";
  char value[8];
  for (size_t i = 0; i < CAPTURE_SAMPLES; i++) {
    snprintf(value, sizeof(value), i ? ",%.4f" : "%.4f", capture[i] / 4095.0f);
    body += value;
  }
  body += "]}";

  String response;
  int status = postJson("/api/ingest/waveform", body, &response);
  if (status == 422 && response.indexOf("Unknown node_id") >= 0 && registerNode()) {
    status = postJson("/api/ingest/waveform", body, &response);  // backend was reset; retry once
  }
  Serial.printf("Upload %u samples -> HTTP %d %s\n", (unsigned)CAPTURE_SAMPLES, status, response.c_str());
}

// ---- Acquisition -----------------------------------------------------------

/** Updates the trigger statistics; returns true when a beam crossing starts. */
bool updateTrigger(uint16_t raw, bool armed) {
  float d = raw - dcMean;
  float energy = d * d;
  fastEnergy += FAST_ALPHA * (energy - fastEnergy);
  bool triggered = armed && fastEnergy > TRIGGER_RATIO * slowEnergy + ENERGY_FLOOR;
  if (!triggered) {
    // Background statistics only learn from quiet signal
    dcMean += MEAN_ALPHA * d;
    slowEnergy += SLOW_ALPHA * (energy - slowEnergy);
  }
  return triggered;
}

/** Samples at a fixed rate until a crossing is captured; fills `capture` oldest-first. */
void acquireCapture() {
  size_t head = 0;
  uint32_t seen = 0;
  uint32_t next = micros();

  while (true) {
    while ((int32_t)(micros() - next) < 0) {}
    if ((int32_t)(micros() - next) > (int32_t)SAMPLE_PERIOD_US) overruns++;
    next += SAMPLE_PERIOD_US;

    uint16_t raw = analogRead(SENSOR_PIN);
    ring[head] = raw;
    head = (head + 1) % PRETRIGGER_SAMPLES;
    seen++;

    if (updateTrigger(raw, seen > WARMUP_SAMPLES)) break;
  }

  digitalWrite(LED_PIN, HIGH);
  // Pre-trigger history, oldest first (the triggering sample is the last one)
  for (size_t i = 0; i < PRETRIGGER_SAMPLES; i++) {
    capture[i] = ring[(head + i) % PRETRIGGER_SAMPLES];
  }
  for (size_t i = PRETRIGGER_SAMPLES; i < CAPTURE_SAMPLES; i++) {
    while ((int32_t)(micros() - next) < 0) {}
    next += SAMPLE_PERIOD_US;
    capture[i] = analogRead(SENSOR_PIN);
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  analogReadResolution(12);
  analogSetPinAttenuation(SENSOR_PIN, ADC_11db);  // full 0-3.3 V input range

  Serial.printf("\nBuzzMap node %s, %u Hz, %u-sample captures\n",
                NODE_ID, (unsigned)SAMPLE_RATE_HZ, (unsigned)CAPTURE_SAMPLES);
  connectWiFi();
  while (!registerNode()) {
    Serial.println("Backend unreachable; retrying in 5 s");
    delay(5000);
  }
}

void loop() {
  acquireCapture();
  Serial.printf("Trigger: fast %.0f vs background %.0f (timing overruns so far: %u)\n",
                fastEnergy, slowEnergy, (unsigned)overruns);
  uploadCapture();
  digitalWrite(LED_PIN, LOW);
  fastEnergy = slowEnergy;  // let the burst decay before re-arming
}
