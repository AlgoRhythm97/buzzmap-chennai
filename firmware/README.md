# BuzzMap sensing node firmware (ESP32)

`buzzmap_node/` is an Arduino sketch for an ESP32 optical wingbeat sensor. It samples a
photodiode at 8 kHz, waits for a beam crossing, and uploads the raw capture (100 ms of
pre-trigger baseline + 400 ms after the trigger) to the backend's
`POST /api/ingest/waveform`. Detection, feature extraction and classification all run
on the server, so the firmware stays small and the DSP stays in one place.

## Hardware

| Part | Notes |
|---|---|
| ESP32 dev board (ESP32-WROOM-32) | Any board with the classic ESP32 works |
| 940 nm IR LED + current-limiting resistor | Shines across the flight tunnel |
| IR photodiode or phototransistor | Opposite the LED; a wing shadow modulates the light |
| Op-amp stage (e.g. MCP6002) | AC-couple the sensor, amplify roughly 50-200x, bias the output to ~1.65 V |
| Tunnel / funnel | Opaque, so ambient light doesn't swamp the IR signal |

Connect the amplifier output to **GPIO34**. Keep the signal inside 0-3.3 V. GPIO34 is
on ADC1; ADC2 pins stop working while Wi-Fi is on.

```
IR LED ──► tunnel ──► photodiode ──► AC couple + gain + 1.65 V bias ──► GPIO34
```

## Configure

```bash
cd firmware/buzzmap_node
cp config.example.h config.h   # git-ignored
```

Edit `config.h`:

- **Wi-Fi**: `WIFI_SSID`, `WIFI_PASSWORD` (2.4 GHz only).
- **Backend**: `API_BASE_URL` must be your computer's LAN IP, e.g. `http://192.168.1.10:8000`,
  not `localhost`. Start the backend so it listens on the network:
  `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
- **Node identity**: `NODE_ID` (uppercase letters, digits, dashes), name, locality and
  coordinates. The node registers itself on boot; an existing id is kept as it is.

## Build and flash with Arduino CLI

One-time setup:

```bash
arduino-cli config init
arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json
arduino-cli core update-index
arduino-cli core install esp32:esp32
```

Compile, upload and watch the serial log (replace the port; `arduino-cli board list` shows it):

```bash
cd firmware
arduino-cli compile --fqbn esp32:esp32:esp32 buzzmap_node
arduino-cli upload  --fqbn esp32:esp32:esp32 -p /dev/ttyUSB0 buzzmap_node
arduino-cli monitor -p /dev/ttyUSB0 -c baudrate=115200
```

On Linux, if the upload is denied, add yourself to the serial group
(`sudo usermod -aG dialout $USER`, or `uucp` on some distributions) and log in again.

A healthy node logs something like:

```
BuzzMap node CHN-ADYAR-01, 8000 Hz, 4000-sample captures
Connected, IP 192.168.1.42
Register CHN-ADYAR-01 -> HTTP 201
Trigger: fast 5120 vs background 210 (timing overruns so far: 0)
Upload 4000 samples -> HTTP 200 {"events_detected":1,"detections":[...]}
```

## Tuning

| Constant | Default | Raise it when… |
|---|---|---|
| `TRIGGER_RATIO` | 8 | noise or flicker causes uploads with `events_detected: 0` |
| `ENERGY_FLOOR` | 4 | a very quiet sensor triggers on ADC noise |
| `POSTTRIGGER_SAMPLES` | 400 ms | slow insects leave the beam after the capture ends |

A growing "timing overruns" count means `analogRead` can't keep up with 8 kHz on your
board; lower `SAMPLE_RATE_HZ` (the backend reads the rate from each upload).

## Expect UNKNOWN until the model sees real data

The bundled classifier is trained on **synthetic** wingbeats. Real captures have a
different amplitude scale (LED power, gain, distance), so amplitude features land
outside the trained range and the open-set check answers `UNKNOWN` instead of guessing.
Wingbeat frequency is still measured correctly. To get species labels from real
hardware, record labelled insects with your nodes and retrain on those captures.
