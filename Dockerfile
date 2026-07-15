# Photo Repair API — GFPGAN FastAPI backend with CUDA GPU support
FROM nvidia/cuda:12.1.1-cudnn8-runtime-ubuntu22.04

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    NVIDIA_VISIBLE_DEVICES=all \
    NVIDIA_DRIVER_CAPABILITIES=compute,utility

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.10 \
    python3-pip \
    python3.10-venv \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    curl \
    && ln -sf /usr/bin/python3.10 /usr/bin/python \
    && ln -sf /usr/bin/pip3 /usr/bin/pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# backend/requirements.txt lands as /app/requirements.txt (basename)
COPY requirements-docker.txt backend/requirements.txt ./

# Install numpy first (pinned), then CUDA PyTorch, then the rest.
# Re-pin numpy afterward so basicsr/facexlib cannot upgrade it to 2.x.
# Patch basicsr for newer torchvision (functional_tensor was relocated).
RUN pip install --upgrade pip && \
    pip install "numpy==1.26.4" && \
    pip install torch==2.2.2 torchvision==0.17.2 \
      --index-url https://download.pytorch.org/whl/cu121 && \
    pip install -r requirements-docker.txt && \
    pip install -r requirements.txt && \
    pip install --force-reinstall "numpy==1.26.4" && \
    python - <<'PY'
from pathlib import Path
p = Path("/usr/local/lib/python3.10/dist-packages/basicsr/data/degradations.py")
text = p.read_text()
old = "from torchvision.transforms.functional_tensor import rgb_to_grayscale"
new = "from torchvision.transforms.functional import rgb_to_grayscale"
if old in text:
    p.write_text(text.replace(old, new))
    print("patched basicsr.data.degradations")
else:
    print("basicsr patch not needed or already applied")
PY


COPY gfpgan ./gfpgan
COPY backend ./backend

RUN mkdir -p /app/experiments/pretrained_models /app/gfpgan/weights && \
    printf '%s\n' \
      '# GENERATED VERSION FILE' \
      "__version__ = '1.3.8'" \
      "__gitsha__ = 'docker'" \
      'version_info = (1, 3, 8)' \
      > /app/gfpgan/version.py

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=10 \
  CMD curl -fsS http://127.0.0.1:8000/health || exit 1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
