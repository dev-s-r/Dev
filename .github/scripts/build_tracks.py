#!/usr/bin/env python3
"""Builds music/tracks.js from the audio files in music/tracks/.

When a NEW song appears in music/tracks/, a block for it is added to music/track-info.json,
already filled in from the song's own tags (ID3 / MP4 / FLAC), or from the file name if it has
no tags. Blocks that already exist are never changed, so whatever you edit there stays.
Then music/tracks.js is built from music/track-info.json:
 - an empty title / artist / cover falls back to the song's tags, file name and DEFAULT_ARTIST
 - a picture in music/covers/ with the same name as the song is used as the cover
   (jpg, png or webp); if there is none, the player shows a colored tile.
"""
import json
import re
from pathlib import Path

DEFAULT_ARTIST = "Dev Singh Rathore"   # <- change this to your name

ROOT = Path(__file__).resolve().parents[2]
MUSIC = ROOT / "music"
TRACKS = MUSIC / "tracks"
COVERS = MUSIC / "covers"
INFO = MUSIC / "track-info.json"
AUDIO = {".mp3", ".m4a", ".mp4", ".aac", ".wav", ".ogg", ".opus", ".flac"}
IMG = (".jpg", ".jpeg", ".png", ".webp")


def pretty(stem):
    s = re.sub(r"^\s*\d+\s*[-_. ]+\s*", "", stem)   # "01 - Song" -> "Song"
    s = re.sub(r"[_]+", " ", s).strip() or stem
    return s.title() if s.islower() else s


def slug(stem):
    return re.sub(r"[^A-Za-z0-9_-]+", "-", stem).strip("-") or "track"


def read_meta(path):
    """Returns (title, artist, picture_bytes, picture_mime). Any of them may be None."""
    title = artist = pic = mime = None
    ext = path.suffix.lower()
    try:
        if ext == ".mp3":
            from mutagen.id3 import ID3
            t = ID3(path)
            title = str(t["TIT2"]) if "TIT2" in t else None
            artist = str(t["TPE1"]) if "TPE1" in t else None
            apic = t.getall("APIC")
            if apic:
                pic, mime = apic[0].data, apic[0].mime
        elif ext in (".m4a", ".mp4"):
            from mutagen.mp4 import MP4, MP4Cover
            t = MP4(path)
            title = (t.get("\xa9nam") or [None])[0]
            artist = (t.get("\xa9ART") or [None])[0]
            covr = t.get("covr")
            if covr:
                pic = bytes(covr[0])
                mime = "image/png" if covr[0].imageformat == MP4Cover.FORMAT_PNG else "image/jpeg"
        elif ext == ".flac":
            from mutagen.flac import FLAC
            t = FLAC(path)
            title = (t.get("title") or [None])[0]
            artist = (t.get("artist") or [None])[0]
            if t.pictures:
                pic, mime = t.pictures[0].data, t.pictures[0].mime
        elif ext in (".ogg", ".opus"):
            from mutagen import File
            t = File(path, easy=True)
            if t is not None:
                title = (t.get("title") or [None])[0]
                artist = (t.get("artist") or [None])[0]
    except Exception as e:  # a bad tag must never break the whole build
        print(f"  (could not read tags of {path.name}: {e})")
    return title, artist, pic, mime


def load_info():
    """Reads your changes from music/track-info.json. A typo there never breaks the build."""
    if not INFO.exists():
        return {}, True
    try:
        data = json.loads(INFO.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            raise ValueError("the file must start with { and end with }")
        return data, True
    except Exception as e:
        print(f"::warning::music/track-info.json was ignored (and left untouched) because of an error: {e}")
        return {}, False


def cover_path(value):
    """Turns 'my-cover.jpg' into 'covers/my-cover.jpg'. Full links (https://...) are kept."""
    c = str(value).strip()
    if c.lower().startswith(("http://", "https://")) or c.startswith("covers/"):
        return c
    return "covers/" + c


def find_cover(stem):
    for name in {stem, slug(stem)}:
        for e in IMG:
            if (COVERS / f"{name}{e}").exists():
                return f"covers/{name}{e}"
    return None


def main():
    TRACKS.mkdir(parents=True, exist_ok=True)
    COVERS.mkdir(parents=True, exist_ok=True)
    files = sorted((p for p in TRACKS.iterdir() if p.suffix.lower() in AUDIO),
                   key=lambda p: p.name.lower())
    info, info_ok = load_info()
    names = {p.name for p in files} | {p.stem for p in files}
    for key in info:
        if key not in names:
            print(f"::warning::track-info.json has '{key}' but there is no song with that name in music/tracks/ (delete that block if the song was removed)")

    out, added = [], 0
    for p in files:
        title, artist, pic, mime = read_meta(p)
        o = info.get(p.name)
        if o is None:
            o = info.get(p.stem)
        is_new = o is None
        if not isinstance(o, dict):
            o = {}

        # cover: your choice in track-info.json > picture named like the song > art inside the file
        mine = str(o.get("cover") or "").strip()
        cover = None
        if mine:
            cover = cover_path(mine)
            if not cover.lower().startswith("http") and not (MUSIC / cover).exists():
                print(f"::warning::cover '{cover}' for {p.name} was not found in music/covers/")
        else:
            cover = find_cover(p.stem)
            if not cover and pic:
                e = ".png" if mime and "png" in mime else ".webp" if mime and "webp" in mime else ".jpg"
                dest = COVERS / f"{slug(p.stem)}{e}"
                dest.write_bytes(pic)
                cover = f"covers/{dest.name}"

        auto_title = (title or "").strip() or pretty(p.stem)
        auto_artist = (artist or "").strip() or DEFAULT_ARTIST

        if is_new and info_ok:
            # first time we see this song: add a block you can edit later
            info[p.name] = {
                "title": auto_title,
                "artist": auto_artist,
                "cover": cover[len("covers/"):] if cover and cover.startswith("covers/") else (cover or ""),
            }
            added += 1

        item = {
            "title": str(o.get("title") or "").strip() or auto_title,
            "artist": str(o.get("artist") or "").strip() or auto_artist,
            "file": f"tracks/{p.name}",
        }
        if cover:
            item["cover"] = cover
        out.append(item)
        print(f"+ {item['title']}  -  {item['artist']}" + ("  [cover]" if cover else "") + ("  (new)" if is_new else ""))

    if info_ok and added:
        INFO.write_text(json.dumps(info, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"{added} new song(s) added to music/track-info.json")

    body = json.dumps(out, indent=2, ensure_ascii=False)
    (MUSIC / "tracks.js").write_text(
        "// AUTO-GENERATED by .github/workflows/music.yml from the files in music/tracks/.\n"
        "// Do not edit by hand: changes are overwritten the next time you upload a song.\n"
        f"window.TRACKS = {body};\n",
        encoding="utf-8",
    )
    print(f"{len(out)} track(s) written to music/tracks.js")


if __name__ == "__main__":
    main()
