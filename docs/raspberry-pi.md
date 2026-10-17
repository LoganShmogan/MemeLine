# Raspberry Pi deployment

> **Status:** nothing here has been tried on the real hardware yet. The
> steps are the intended setup. Items marked ⚠ are likely to need adjustment
> on first boot; see [known-issues.md](known-issues.md).

## Hardware

- Raspberry Pi 3B+ (1 GB RAM)
- Official Raspberry Pi Touch Display 2 (7", 720x1280, **portrait** native),
  on the DSI connector
- A keyboard and mouse can also be plugged in, so the app doesn't have to be
  a locked-down kiosk.
- The 3D-printable enclosure in the repo root: `caseBack.stl`,
  `caseBackv2.stl` (revised back), `caseTop.stl`, `copy of Basic Hinge.stl`
- **SD card:** the library is about 25.6 GB (25 GB media, 577 MB covers,
  48 MB thumbnails), so use a 64 GB card or larger, or keep `data/` on a USB
  drive. `data/covers/` isn't used by the UI and can be left behind to save
  space.

## OS packages (Raspberry Pi OS Lite)

```
sudo apt update
sudo apt install -y python3-venv python3-tk vlc ffmpeg \
                    xserver-xorg xinit x11-xserver-utils unclutter fontconfig
```

| Package | Why |
|---|---|
| `python3-tk` | Tkinter (not included with Pi OS's Python by default) |
| `vlc` | libVLC, which `python-vlc` loads at runtime |
| `ffmpeg` | thumbnails for videos added via "+ Add"; yt-dlp also uses it to merge formats |
| `xserver-xorg xinit` | a bare X server and `startx`; Lite has no display server |
| `x11-xserver-utils` | `xset`, to turn off screen blanking |
| `unclutter` | hides the mouse cursor when idle |
| `fontconfig` | `fc-cache`, to register the bundled fonts |

## App install

The repo is private, so the Pi needs GitHub credentials to clone it. The
easiest way is `sudo apt install gh && gh auth login`, or use a personal
access token as the password when git asks.

```
git clone https://github.com/LoganShmogan/memeBrowser.git ~/memeBrowser
cd ~/memeBrowser
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
mkdir -p ~/.local/share/fonts && cp assets/fonts/*.ttf ~/.local/share/fonts/ && fc-cache -f
```

### Getting the library onto the Pi
Copy `data/` from the dev machine into the repo on the Pi. Paths in the
database are relative to `data/`, so it works wherever the repo lives:

```
rsync -a --info=progress2 --exclude covers/ data/ <user>@<pi>:memeBrowser/data/
```

Or rerun the import and download on the Pi itself, which is much slower.

If you copy an older library whose thumbnails are still full size, run
`.venv/bin/python scripts/rebuild_thumbnails.py` once.

## Display configuration

`memebrowser/config.py` currently assumes **1280x720 landscape**, but the
panel is natively 720x1280 portrait. Either:
- **Mount it portrait:** set `SCREEN_WIDTH = 720`, `SCREEN_HEIGHT = 1280`.
  The gallery fits 3 columns automatically. The nav bar's six tabs plus
  "+ Add" need about 740px, so trim `COLLECTIONS` (e.g. drop the empty
  Posts/Reposts tabs) or the "+ Add" button gets cut off.
- **Mount it landscape:** rotate the panel in the OS and keep 1280x720. ⚠
  Current Pi OS uses the KMS display driver, which ignores the old
  `display_rotate` / `lcd_rotate` settings. Use the rotation option from
  Raspberry Pi's Touch Display 2 documentation (a `rotation=` parameter on
  the display's `dtoverlay` line in `/boot/firmware/config.txt`) and check
  that touch input rotates with it.

Then set `FULLSCREEN = True`.

## Boot straight into the app

`pi-setup/memebrowser.service` runs `startx pi-setup/xinitrc -- -nocursor`
at boot. `xinitrc` turns off blanking and DPMS, starts `unclutter`, and
`exec`s `.venv/bin/python main.py` as the only X client. If the app exits
with an error, systemd restarts it after 3 seconds.

```
sudo cp pi-setup/memebrowser.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now memebrowser.service
journalctl -u memebrowser -f        # logs
```

⚠ Things to check first:
- **User and paths.** The unit and `xinitrc` hard-code the user `pi` and
  `/home/pi/memeBrowser`. Pi OS images since 2022 have no default `pi`
  user; you choose a username in Raspberry Pi Imager. Change `User=` and both
  paths to match.
- **Starting X from a service.** Xorg's wrapper normally only lets a user
  logged in at the console start X. If the service fails with an error like
  "Only console users are allowed to run the X server", the usual fixes are
  `allowed_users=anybody` in `/etc/X11/Xwrapper.config`, or giving the unit
  a TTY (`TTYPath=/dev/tty1`, `StandardInput=tty`, `PAMName=login`). This
  hasn't been tested on this setup.

## Updating

```
cd ~/memeBrowser && git pull && .venv/bin/pip install -r requirements.txt
sudo systemctl restart memebrowser
```

TikTok breaks yt-dlp from time to time. If downloads start failing across
the board, `.venv/bin/pip install -U "yt-dlp[default,curl-cffi]"` is the
first thing to try.
