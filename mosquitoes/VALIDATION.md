# Version 3 verification — 8 October 2026

Browser checks passed for all six high-detail models.

| Species | Triangles | Meshes | Exported GLB size |
|---|---:|---:|---:|
| Aedes aegypti | 217,350 | 196 | 17.62 MB |
| Aedes albopictus | 217,350 | 196 | 17.57 MB |
| Anopheles arabiensis | 216,390 | 166 | 17.59 MB |
| Anopheles gambiae | 216,390 | 166 | 17.61 MB |
| Culex pipiens | 216,390 | 166 | 17.62 MB |
| Culex quinquefasciatus | 216,390 | 166 | 17.65 MB |

Checks: all geometry attributes finite; binary GLB exported and loaded successfully with embedded textures; one WingBeat clip with two quaternion tracks; both wing pivots moved by 0.612 radians at quarter-cycle; loop returned to its starting orientation; folded pose remained valid. Viewer rendered without browser errors. Aedes and Culex close-ups were visually inspected.

This verifies technical behavior, not taxonomic accuracy or a photorealism certification. Regenerate these checks using verify.html. The source package generates GLBs on demand; it does not include six pre-exported GLB files.
