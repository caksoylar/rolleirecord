# 🔴rollei(re)cord

Simple metadata recorder companion for film camera users. Access at https://caksoylar.github.io/rolleirecord/.

Open the web app and record a new frame in your current roll in only seconds. Easily export recorded metadata to embed to your photos using open tools.

## Features

- **Web app optimized for mobile.** Add to your home screen and use _completely offline_. No installation process, no network communication after initial fetching[^1]
- Track **multiple rolls** at a time
- Automatically record **GPS location** and **date** on adding a new frame, default other fields from the previously recorded frame
- **Add your camera** or choose from existing list, **customize** available shutter speeds, apertures, focal lengths, lenses, filters...
- **Back-up your roll** and restore, **export metadata** to easily embed to photos using [`exiftool`](https://exiftool.org/)
- **No artificial limitations;** no limit on number of rolls stored, exporting, etc.

## Screenshots

<img width="375" height="812" alt="light" src="https://github.com/user-attachments/assets/92051acf-50d9-4fdb-8744-971d8775fa0c" />
<img width="375" height="812" alt="dark" src="https://github.com/user-attachments/assets/342c9d84-2708-43fa-8308-1a384f423495" />

<img width="375" height="812" alt="settings" src="https://github.com/user-attachments/assets/cd80b341-da3f-40e9-9726-558edd7d95bf" />
<img width="375" height="812" alt="cameras" src="https://github.com/user-attachments/assets/d3b07a15-0ced-45fd-a206-96bad551fc8d" />

## Development notes

This app has zero external dependencies -- all assets are loaded from under the same path. There are no vendored dependencies either. It's pure Javascript, HTML, CSS.

Caveat emptor: While this is not a vibe-coded app, LLMs were used in the development.

SVG icons from https://phosphoricons.com/.

[^1]: Except for the opt-in reverse geocoding support using [Nominatim](https://nominatim.org/).
