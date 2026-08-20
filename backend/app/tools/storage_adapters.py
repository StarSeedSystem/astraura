"""
Universal Storage & Multi-Format Adapters for StarSeed OS / Astraura 1.58-Bit
Provides comprehensive file system and storage device discovery across macOS, Windows, Linux, and mobile/Termux.
Handles all storage types: NVMe, SSD, HDD, APFS, NTFS, EXT4, Btrfs, ZFS, FAT32, exFAT, USB, SD, SMB, NFS, Cloud Drives.
"""

import os
import sys
import platform
import shutil
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional

# Supported file formats mapped to categories
FORMAT_CATEGORIES = {
    "code": [
        ".py", ".js", ".jsx", ".ts", ".tsx", ".cpp", ".c", ".cc", ".h", ".hpp", ".rs", ".go",
        ".java", ".kt", ".swift", ".m", ".sh", ".bash", ".zsh", ".ps1", ".bat", ".cmd",
        ".glsl", ".vert", ".frag", ".comp", ".wgsl", ".hlsl", ".metal", ".cu",
        ".html", ".htm", ".css", ".scss", ".sass", ".less", ".json", ".yaml", ".yml",
        ".toml", ".ini", ".conf", ".cfg", ".xml", ".sql", ".graphql", ".proto", ".cmake"
    ],
    "documents": [
        ".md", ".markdown", ".txt", ".rtf", ".pdf", ".epub", ".docx", ".doc", ".xlsx", ".xls",
        ".pptx", ".ppt", ".odt", ".ods", ".odp", ".csv", ".tsv", ".parquet", ".arrow",
        ".feather", ".sqlite", ".sqlite3", ".db", ".log", ".jsonl"
    ],
    "neural_models": [
        ".gguf", ".safetensors", ".bin", ".onnx", ".pt", ".pth", ".ckpt", ".h5",
        ".tflite", ".mlmodel", ".engine", ".weights", ".pb", ".pkl"
    ],
    "media_visual": [
        ".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".bmp", ".ico", ".tiff", ".tif",
        ".heic", ".avif", ".raw", ".psd", ".ai"
    ],
    "media_audio": [
        ".mp3", ".wav", ".ogg", ".flac", ".aac", ".m4a", ".wma", ".opus", ".mid", ".midi", ".aiff"
    ],
    "media_video": [
        ".mp4", ".webm", ".mkv", ".mov", ".avi", ".wmv", ".flv", ".m4v", ".3gp"
    ],
    "archives": [
        ".zip", ".tar", ".gz", ".tgz", ".bz2", ".tbz2", ".xz", ".txz", ".7z", ".rar",
        ".iso", ".dmg", ".pkg", ".deb", ".rpm", ".apk", ".jar"
    ]
}

class UniversalStorageManager:
    """
    Administrador Universal de Almacenamiento Soberano.
    Detecta automáticamente todas las unidades físicas, extraíbles, de red y en la nube
    en macOS, Windows, Linux y Android/Termux, verificando permisos de lectura y escritura.
    """
    def __init__(self):
        self.os_type = platform.system().lower()
        self.is_macos = self.os_type == "darwin"
        self.is_windows = self.os_type == "windows"
        self.is_linux = self.os_type == "linux"
        self.is_android = "android" in sys.platform.lower() or os.path.exists("/data/data/com.termux")

    def get_all_storage_drives(self) -> List[Dict[str, Any]]:
        """
        Escanea y lista todas las unidades de almacenamiento accesibles en el sistema.
        """
        drives: List[Dict[str, Any]] = []
        seen_paths = set()

        # 1. macOS Storage Scanner
        if self.is_macos:
            # Root & Home
            drives.append(self._build_drive_info("Macintosh HD (Raíz del Sistema)", "/", "APFS / HFS+", "system_internal"))
            home_dir = str(Path.home())
            drives.append(self._build_drive_info("Directorio de Usuario (~)", home_dir, "APFS (Home)", "user_home"))

            # Volumes directory (/Volumes/*)
            volumes_dir = Path("/Volumes")
            if volumes_dir.exists():
                try:
                    for vol in volumes_dir.iterdir():
                        if vol.is_dir() and vol.name not in ["Macintosh HD", ".timemachine"]:
                            vpath = str(vol)
                            if vpath not in seen_paths:
                                seen_paths.add(vpath)
                                drive_type = "removable_usb"
                                if "Time Machine" in vol.name:
                                    drive_type = "backup"
                                elif os.path.ismount(vpath):
                                    drive_type = "mounted_volume"
                                drives.append(self._build_drive_info(f"Volumen: {vol.name}", vpath, "APFS / exFAT / HFS+ / NTFS", drive_type))
                except Exception as e:
                    print(f"⚠️ [StorageManager] Error escaneando /Volumes: {e}")

            # iCloud Drive
            icloud_path = Path.home() / "Library" / "Mobile Documents" / "com~apple~CloudDocs"
            if icloud_path.exists():
                drives.append(self._build_drive_info("iCloud Drive Soberano", str(icloud_path), "Cloud / APFS", "cloud_storage"))

        # 2. Windows Storage Scanner
        elif self.is_windows:
            import string
            for letter in string.ascii_uppercase:
                drive_path = f"{letter}:\\"
                if os.path.exists(drive_path):
                    dtype = "system_internal" if letter == "C" else "secondary_drive"
                    drives.append(self._build_drive_info(f"Unidad Local ({letter}:)", drive_path, "NTFS / exFAT / FAT32", dtype))

            # User Home
            home_dir = str(Path.home())
            drives.append(self._build_drive_info("Directorio de Usuario (Windows Home)", home_dir, "NTFS", "user_home"))

            # WSL Shares (\\wsl$)
            wsl_path = r"\\wsl$"
            if os.path.exists(wsl_path):
                drives.append(self._build_drive_info("Subsistema Linux (WSL)", wsl_path, "EXT4 via Plan9/P9", "wsl_storage"))

        # 3. Linux Storage Scanner
        elif self.is_linux:
            # Root & Home
            drives.append(self._build_drive_info("Raíz de Linux (/)", "/", "EXT4 / Btrfs / ZFS", "system_internal"))
            home_dir = str(Path.home())
            drives.append(self._build_drive_info("Directorio de Usuario (~)", home_dir, "EXT4 / Btrfs", "user_home"))

            # /media, /mnt, /run/media
            for mount_root in ["/media", "/mnt", "/run/media"]:
                mpath = Path(mount_root)
                if mpath.exists():
                    try:
                        for entry in mpath.rglob("*"):
                            if entry.is_dir() and os.path.ismount(str(entry)):
                                sp = str(entry)
                                if sp not in seen_paths:
                                    seen_paths.add(sp)
                                    drives.append(self._build_drive_info(f"Montaje: {entry.name}", sp, "EXT4 / Btrfs / NTFS / exFAT", "removable_usb"))
                    except Exception:
                        pass

        # 4. Android / Termux Storage Scanner
        if self.is_android or os.path.exists("/sdcard"):
            sdcard = "/sdcard"
            if os.path.exists(sdcard):
                drives.append(self._build_drive_info("Almacenamiento Interno (/sdcard)", sdcard, "F2FS / ext4 / sdcardfs", "mobile_internal"))
            storage_dir = Path("/storage")
            if storage_dir.exists():
                try:
                    for s in storage_dir.iterdir():
                        if s.is_dir() and s.name not in ["emulated", "self"]:
                            drives.append(self._build_drive_info(f"Tarjeta SD / USB OTG: {s.name}", str(s), "FAT32 / exFAT", "removable_sd"))
                except Exception:
                    pass

        return drives

    def _build_drive_info(self, name: str, path: str, fs_type: str, drive_type: str) -> Dict[str, Any]:
        """
        Construye la información detallada y permisos de una unidad de almacenamiento.
        """
        total_gb = 0.0
        used_gb = 0.0
        free_gb = 0.0
        percent_used = 0.0
        is_readable = False
        is_writable = False

        try:
            is_readable = os.access(path, os.R_OK)
            is_writable = os.access(path, os.W_OK)
        except Exception:
            pass

        try:
            usage = shutil.disk_usage(path)
            total_gb = round(usage.total / (1024 ** 3), 2)
            used_gb = round(usage.used / (1024 ** 3), 2)
            free_gb = round(usage.free / (1024 ** 3), 2)
            if usage.total > 0:
                percent_used = round((usage.used / usage.total) * 100, 1)
        except Exception:
            pass

        return {
            "name": name,
            "path": path,
            "filesystem": fs_type,
            "type": drive_type,
            "total_gb": total_gb,
            "used_gb": used_gb,
            "free_gb": free_gb,
            "percent_used": percent_used,
            "permissions": {
                "readable": is_readable,
                "writable": is_writable,
                "full_disk_access": is_readable and is_writable
            },
            "status": "online" if is_readable else "restricted_permission"
        }

    def classify_file_format(self, file_path: str) -> Dict[str, Any]:
        """
        Clasifica cualquier archivo en su formato nativo, detectando categoría y capacidad de procesamiento.
        """
        p = Path(file_path)
        ext = p.suffix.lower()
        
        category = "unknown"
        for cat, ext_list in FORMAT_CATEGORIES.items():
            if ext in ext_list:
                category = cat
                break

        exists = p.exists()
        size_bytes = p.stat().st_size if exists else 0
        size_formatted = self._format_bytes(size_bytes)

        return {
            "filename": p.name,
            "path": str(p.resolve() if exists else p),
            "extension": ext,
            "category": category,
            "exists": exists,
            "size_bytes": size_bytes,
            "size_formatted": size_formatted,
            "is_code": category == "code",
            "is_document": category == "documents",
            "is_neural_model": category == "neural_models",
            "is_media": category in ["media_visual", "media_audio", "media_video"],
            "is_archive": category == "archives",
            "supported_viewers": self._get_supported_viewers(category, ext)
        }

    def _get_supported_viewers(self, category: str, ext: str) -> List[str]:
        viewers = ["hex_raw", "metadata_inspector"]
        if category == "code" or ext in [".txt", ".md", ".json", ".yaml", ".yml", ".xml", ".sql", ".sh", ".ps1"]:
            viewers.extend(["hot_code_editor", "syntax_highlighter", "ast_parser"])
        if category == "media_visual":
            viewers.extend(["image_canvas_viewer", "glsl_texture_renderer"])
        if category == "media_audio":
            viewers.extend(["waveform_audio_player", "omnivox_frequency_analyzer"])
        if category == "documents" and ext == ".pdf":
            viewers.extend(["pdf_document_reader", "vector_embeddings_indexer"])
        if category == "neural_models":
            viewers.extend(["gguf_tensor_inspector", "bitnet_158_layer_profiler"])
        if category == "archives":
            viewers.extend(["archive_tree_extractor", "bundle_manifest_reader"])
        return viewers

    def _format_bytes(self, size_bytes: int) -> str:
        if size_bytes < 1024:
            return f"{size_bytes} B"
        elif size_bytes < 1024 ** 2:
            return f"{size_bytes / 1024:.1f} KB"
        elif size_bytes < 1024 ** 3:
            return f"{size_bytes / (1024 ** 2):.1f} MB"
        else:
            return f"{size_bytes / (1024 ** 3):.2f} GB"

universal_storage_manager = UniversalStorageManager()
