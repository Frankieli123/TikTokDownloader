from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from src.custom import PROJECT_ROOT as VOLUME_ROOT


@dataclass(frozen=True, slots=True)
class KuaishouPaths:
    root: Path

    @property
    def config_file(self) -> Path:
        return self.root.joinpath("config.yaml")

    @property
    def db_file(self) -> Path:
        return self.root.joinpath("Kuaishou.db")

    @property
    def download_root(self) -> Path:
        return self.root.joinpath("Download")

    @property
    def data_root(self) -> Path:
        return self.root.joinpath("Data")

    @property
    def detail_db_file(self) -> Path:
        return self.data_root.joinpath("DetailData.db")

    @property
    def temp_root(self) -> Path:
        return self.root.joinpath("Temp")

    def ensure_dirs(self) -> None:
        self.root.mkdir(parents=True, exist_ok=True)
        self.download_root.mkdir(parents=True, exist_ok=True)
        self.data_root.mkdir(parents=True, exist_ok=True)
        self.temp_root.mkdir(parents=True, exist_ok=True)


def default_paths() -> KuaishouPaths:
    return KuaishouPaths(VOLUME_ROOT.joinpath("Kuaishou"))
