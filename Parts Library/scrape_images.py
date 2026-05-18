"""
Phoenix Contact - Product Image Downloader
==========================================
Downloads product images for all 21 parts in the Parts Library.
Image URLs were resolved from the Phoenix Contact website.

Usage:
    python scrape_images.py

Requirements:
    pip install requests
"""

import os
import sys
import time

try:
    import requests
except ImportError:
    print("Missing dependency. Run:  pip install requests")
    sys.exit(1)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
IMAGE_NAME = "image.jpg"
DELAY      = 0.8   # seconds between downloads

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Referer": "https://www.phoenixcontact.com/",
}

# Direct CaaS CDN URLs resolved from the Phoenix Contact website.
# Part 1019943 (TMC 7 2B 20A) is no longer listed on the current site;
# its URL is a best-guess and may need manual download.
PARTS = [
    ("0800886", "0800886_E_NS_35_N",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/239820/full/b1500?format=jpg"),
    ("0801733", "0801733_NS_35__7.5_PERF_2000MM",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/124504/full/b1500?format=jpg"),
    ("0810009", "0810009_ZBF_10.LGS_FORTL.ZAHLEN",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/252538/full/b1500?format=jpg"),
    ("1019943", "1019943_TMC_7_2B_20A",
     "https://eshop.phoenixcontact.com/is/image/phoenixcontact/1019943?wid=1500&hei=1500&fit=constrain,1"),
    ("1051016", "1051016_ZB_6.LGS_FORTL.ZAHLEN",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/219732/full/b1500?format=jpg"),
    ("1207650", "1207650_NS_35__7.5_PERF_500MM",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/124504/full/b1500?format=jpg"),
    ("2907918", "2907918_PLT-SEC-T3-120-FM-UT",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/257432/full/b1500?format=jpg"),
    ("3009299", "3009299_EB_56-18",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/218832/full/b1500?format=jpg"),
    ("3030336", "3030336_FBS_2-6",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/124786/full/b1500?format=jpg"),
    ("3032224", "3032224_FBS_50-6",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/230348/full/b1500?format=jpg"),
    ("3044102", "3044102_UT_4",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/195454/full/b1500?format=jpg"),
    ("3044128", "3044128_UT_4-PE",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/253902/full/b1500?format=jpg"),
    ("3046032", "3046032_UT_4-HESI_(5X20)",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/108038/full/b1500?format=jpg"),
    ("3046139", "3046139_UT_4-MT",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/222934/full/b1500?format=jpg"),
    ("3046401", "3046401_UT_6-HESI_(6.3X32)",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/251650/full/b1500?format=jpg"),
    ("3047028", "3047028_D-UT_2.5_10",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/262506/full/b1500?format=jpg"),
    ("3047141", "3047141_D-UT_2.5_4-TWIN",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/194918/full/b1500?format=jpg"),
    ("3047701", "3047701_UT_4-MTD_WH",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/240026/full/b1500?format=jpg"),
    ("3048386", "3048386_UK_10.3-HESI_N",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/228424/full/b1500?format=jpg"),
    ("3214259", "3214259_UT_2.5-3L",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/266986/full/b1500?format=jpg"),
    ("3214314", "3214314_D-UT_2.5-3L",
     "https://caas.phoenixcontact.com/caas/v1/stable/media/236470/full/b1500?format=jpg"),

    # ── Added / confirmed from photo batch (May 2026) ────────────────────────
    # All use the eshop fallback URL which only requires the part number.
    # Run this script once phoenixcontact.com is added to the network allowlist
    # (Settings → Capabilities → Network access).
    ("3044131", "Feed_Thru_Terminal_6mm2_3044131",
     "https://eshop.phoenixcontact.com/is/image/phoenixcontact/3044131?wid=1500&hei=1500&fit=constrain,1"),
    ("3045198", "Feed_Thru_Terminal_6mm2_White_3045198",
     "https://eshop.phoenixcontact.com/is/image/phoenixcontact/3045198?wid=1500&hei=1500&fit=constrain,1"),
    ("3046171", "Knife_Disconnect_Terminal_UT4-MT-PP_3046171",
     "https://eshop.phoenixcontact.com/is/image/phoenixcontact/3046171?wid=1500&hei=1500&fit=constrain,1"),
    ("3046223", "Ground_Terminal_UT4-MTD-PE_3046223",
     "https://eshop.phoenixcontact.com/is/image/phoenixcontact/3046223?wid=1500&hei=1500&fit=constrain,1"),
    ("3004430", "Knife_Disconnect_Terminal_UK5-MTK_3004430",
     "https://eshop.phoenixcontact.com/is/image/phoenixcontact/3004430?wid=1500&hei=1500&fit=constrain,1"),
    # Eaton FAZ-NA and Connectwell CGT4U are not Phoenix Contact — source images manually.
]


def download(pn, folder_name, url):
    dest = os.path.join(SCRIPT_DIR, folder_name, IMAGE_NAME)

    if os.path.exists(dest):
        return "skipped (already exists)"

    folder_path = os.path.join(SCRIPT_DIR, folder_name)
    if not os.path.isdir(folder_path):
        return f"folder not found: {folder_name}"

    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        if r.status_code == 200 and r.headers.get("Content-Type", "").startswith("image"):
            with open(dest, "wb") as f:
                f.write(r.content)
            return f"saved {len(r.content)/1024:.1f} KB"
        else:
            return f"HTTP {r.status_code} / {r.headers.get('Content-Type')}"
    except Exception as e:
        return f"error: {e}"


def main():
    print(f"\n{'═'*62}")
    print(f"  Phoenix Contact Image Downloader  —  {len(PARTS)} parts")
    print(f"{'═'*62}\n")

    ok = skipped = failed = 0

    for i, (pn, folder, url) in enumerate(PARTS, 1):
        print(f"[{i:>2}/{len(PARTS)}]  {pn}  ", end="", flush=True)
        result = download(pn, folder, url)
        print(result)

        if result.startswith("saved"):
            ok += 1
        elif "skipped" in result:
            skipped += 1
        else:
            failed += 1

        if i < len(PARTS):
            time.sleep(DELAY)

    print(f"\n{'─'*62}")
    print(f"  Downloaded: {ok}  |  Already had: {skipped}  |  Failed: {failed}")
    print(f"{'─'*62}\n")


if __name__ == "__main__":
    main()
