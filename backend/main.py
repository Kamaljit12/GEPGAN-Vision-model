"""FastAPI backend for GFPGAN face restoration.

Run from project root:
    uvicorn backend.main:app --host 0.0.0.0 --port 8000

Or:
    python -m backend.main
"""

import io
import os
import re
import sys
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

# Ensure project root is on sys.path so `gfpgan` package imports work
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from backend.gfpgan_service import get_service, init_service  # noqa: E402

ALLOWED_CONTENT_TYPES = {
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'application/octet-stream',
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Same defaults as: python inference_gfpgan.py -i ... -o results -v 1.3 -s 2
    init_service(version='1.3', upscale=2)
    yield


app = FastAPI(
    title='GFPGAN API',
    description='Upload an image to restore/enhance faces with GFPGAN v1.3 (upscale x2).',
    version='1.0.0',
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)


def _safe_basename(filename: Optional[str]) -> str:
    name = os.path.basename(filename or 'restored')
    stem = os.path.splitext(name)[0]
    stem = re.sub(r'[^A-Za-z0-9._-]+', '_', stem).strip('._') or 'restored'
    return stem[:80]


@app.get('/')
def root():
    return {
        'message': 'GFPGAN FastAPI backend',
        'docs': '/docs',
        'endpoints': {
            'health': 'GET /health',
            'restore': 'POST /restore',
        },
    }


@app.get('/health')
def health():
    service = get_service()
    return {
        'status': 'ok',
        'version': service.version,
        'upscale': service.upscale,
    }


@app.post(
    '/restore',
    summary='Restore faces in an uploaded image',
    response_description='Restored PNG image',
)
def restore(
    file: UploadFile = File(..., description='Input image (PNG/JPEG)'),
    only_center_face: bool = Query(False, description='Only restore the center face'),
    weight: Optional[float] = Query(
        None,
        ge=0.0,
        le=1.0,
        description='GFPGAN blending weight (default 0.5)',
    ),
):
    """Accept an image upload, run GFPGAN inference, and return the restored image.

    Equivalent to::

        python inference_gfpgan.py -i <upload> -o results -v 1.3 -s 2
    """
    if file.content_type and file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f'Unsupported content type: {file.content_type}. Use PNG or JPEG.',
        )

    image_bytes = file.file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail='Empty file uploaded.')

    try:
        service = get_service()
        restored_bytes, media_type = service.enhance_image(
            image_bytes,
            only_center_face=only_center_face,
            weight=weight,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f'Restoration failed: {exc}') from exc

    basename = _safe_basename(file.filename)
    return StreamingResponse(
        io.BytesIO(restored_bytes),
        media_type=media_type,
        headers={'Content-Disposition': f'attachment; filename="{basename}_restored.png"'},
    )


if __name__ == '__main__':
    import uvicorn

    uvicorn.run('backend.main:app', host='0.0.0.0', port=8000, reload=False)
