"""GFPGAN restoration service used by the FastAPI backend."""

import os
import threading
from typing import Optional, Tuple

import cv2
import numpy as np
import torch
from gfpgan import GFPGANer

# Project root (parent of backend/)
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

VERSION_CONFIG = {
    '1': {
        'arch': 'original',
        'channel_multiplier': 1,
        'model_name': 'GFPGANv1',
        'url': 'https://github.com/TencentARC/GFPGAN/releases/download/v0.1.0/GFPGANv1.pth',
    },
    '1.2': {
        'arch': 'clean',
        'channel_multiplier': 2,
        'model_name': 'GFPGANCleanv1-NoCE-C2',
        'url': 'https://github.com/TencentARC/GFPGAN/releases/download/v0.2.0/GFPGANCleanv1-NoCE-C2.pth',
    },
    '1.3': {
        'arch': 'clean',
        'channel_multiplier': 2,
        'model_name': 'GFPGANv1.3',
        'url': 'https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.3.pth',
    },
    '1.4': {
        'arch': 'clean',
        'channel_multiplier': 2,
        'model_name': 'GFPGANv1.4',
        'url': 'https://github.com/TencentARC/GFPGAN/releases/download/v1.3.0/GFPGANv1.4.pth',
    },
    'RestoreFormer': {
        'arch': 'RestoreFormer',
        'channel_multiplier': 2,
        'model_name': 'RestoreFormer',
        'url': 'https://github.com/TencentARC/GFPGAN/releases/download/v1.3.4/RestoreFormer.pth',
    },
}


def _resolve_model_path(model_name: str, url: str) -> str:
    candidates = [
        os.path.join(PROJECT_ROOT, 'experiments', 'pretrained_models', f'{model_name}.pth'),
        os.path.join(PROJECT_ROOT, 'gfpgan', 'weights', f'{model_name}.pth'),
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return url


def _build_bg_upsampler(bg_tile: int = 400):
    """Build RealESRGAN background upsampler when CUDA is available."""
    if not torch.cuda.is_available():
        return None

    try:
        from basicsr.archs.rrdbnet_arch import RRDBNet
        from realesrgan import RealESRGANer
    except ImportError:
        return None

    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
    return RealESRGANer(
        scale=2,
        model_path='https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth',
        model=model,
        tile=bg_tile,
        tile_pad=10,
        pre_pad=0,
        half=True,
    )


class GFPGANService:
    """Loads and runs GFPGAN with defaults matching:
    python inference_gfpgan.py -i <img> -o results -v 1.3 -s 2
    """

    def __init__(self, version: str = '1.3', upscale: int = 2, weight: float = 0.5):
        if version not in VERSION_CONFIG:
            raise ValueError(f'Unsupported version {version}. Choose from: {list(VERSION_CONFIG)}')

        # FaceRestoreHelper uses relative path 'gfpgan/weights'
        os.chdir(PROJECT_ROOT)

        cfg = VERSION_CONFIG[version]
        model_path = _resolve_model_path(cfg['model_name'], cfg['url'])
        bg_upsampler = _build_bg_upsampler()

        self.version = version
        self.upscale = upscale
        self.weight = weight
        self._lock = threading.Lock()
        self.restorer = GFPGANer(
            model_path=model_path,
            upscale=upscale,
            arch=cfg['arch'],
            channel_multiplier=cfg['channel_multiplier'],
            bg_upsampler=bg_upsampler,
        )

    def enhance_image(
        self,
        image_bytes: bytes,
        only_center_face: bool = False,
        weight: Optional[float] = None,
    ) -> Tuple[bytes, str]:
        """Enhance an uploaded image and return (png_bytes, media_type)."""
        arr = np.frombuffer(image_bytes, dtype=np.uint8)
        input_img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if input_img is None:
            raise ValueError('Could not decode image. Upload a valid PNG or JPEG.')

        with self._lock:
            _, _, restored_img = self.restorer.enhance(
                input_img,
                has_aligned=False,
                only_center_face=only_center_face,
                paste_back=True,
                weight=self.weight if weight is None else weight,
            )

        if restored_img is None:
            raise RuntimeError('GFPGAN did not produce a restored image.')

        ok, encoded = cv2.imencode('.png', restored_img)
        if not ok:
            raise RuntimeError('Failed to encode restored image.')

        return encoded.tobytes(), 'image/png'


# Singleton loaded at app startup
_service: Optional[GFPGANService] = None


def get_service() -> GFPGANService:
    if _service is None:
        raise RuntimeError('GFPGAN service is not initialized.')
    return _service


def init_service(version: str = '1.3', upscale: int = 2) -> GFPGANService:
    global _service
    _service = GFPGANService(version=version, upscale=upscale)
    return _service
