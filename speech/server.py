import asyncio
import io
import os
import threading
import wave
from pathlib import Path
from pydantic import BaseModel, Field
from fastapi.responses import Response
from huggingface_hub import hf_hub_download
from piper import PiperVoice
from contextlib import asynccontextmanager
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from faster_whisper import WhisperModel

model = None
failure = None
lock = threading.Lock()
voices = {}
tts_lock = threading.Lock()


def load_model():
    global model, failure
    try:
        model = WhisperModel(os.getenv("WHISPER_MODEL", "base"), device="cpu", compute_type="int8", download_root="/models", cpu_threads=2, num_workers=1)
    except Exception as exc:
        failure = type(exc).__name__
        print("Speech model startup failed:", failure, flush=True)


@asynccontextmanager
async def lifespan(app):
    task = asyncio.create_task(asyncio.to_thread(load_model))
    yield
    if not task.done():
        task.cancel()


app = FastAPI(lifespan=lifespan)


@app.get("/health")
def health():
    return {"status": "ready" if model else "failed" if failure else "loading", "model": "faster-whisper:" + os.getenv("WHISPER_MODEL", "base")}


def transcribe_audio(data, language):
    with lock:
        segments, info = model.transcribe(io.BytesIO(data), language=language, beam_size=5, vad_filter=True, condition_on_previous_text=False, initial_prompt="नमस्ते। यह हिंदी बातचीत है। देवनागरी लिपि में लिखें। कृषि साथी, आवेदन, दस्तावेज़, स्थिति, खेत, फसल, सत्यापन।" if language == "hi" else None)
        if info.duration > 65:
            raise HTTPException(413, "Audio must be at most 60 seconds.")
        text = " ".join(segment.text.strip() for segment in segments).strip()
        if not text:
            raise HTTPException(422, "No clear speech detected. Please record again closer to the microphone.")
        return {"text": text, "language": info.language, "duration": round(info.duration, 2), "provider": "faster-whisper:" + os.getenv("WHISPER_MODEL", "base")}


@app.post("/transcribe")
async def transcribe(file: UploadFile = File(...), language: str = Form("hi")):
    if language not in ("hi", "en"):
        raise HTTPException(400, "Unsupported language.")
    data = await file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise HTTPException(413, "Audio is too large.")
    if not model:
        raise HTTPException(503, "Speech model is loading. Please try again shortly." if not failure else "Speech model could not be loaded.")
    try:
        return await asyncio.to_thread(transcribe_audio, data, language)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(422, "The audio could not be decoded. Try WAV, MP3, M4A, OGG or WebM.")


class SpeakRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    language: str = "hi"


def synthesize(text, language):
    key = "hi_IN-pratham-medium" if language == "hi" else "en_US-lessac-medium"
    folder = "hi/hi_IN/pratham/medium" if language == "hi" else "en/en_US/lessac/medium"
    with tts_lock:
        if key not in voices:
            model_path = hf_hub_download(repo_id="rhasspy/piper-voices", filename=f"{folder}/{key}.onnx", cache_dir="/models/piper")
            hf_hub_download(repo_id="rhasspy/piper-voices", filename=f"{folder}/{key}.onnx.json", cache_dir="/models/piper")
            voices[key] = PiperVoice.load(model_path)
        buffer = io.BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            voices[key].synthesize_wav(text, wav_file)
        return buffer.getvalue(), key


@app.post("/speak")
async def speak(request: SpeakRequest):
    if request.language not in ("hi", "en"):
        raise HTTPException(400, "Unsupported language.")
    try:
        audio, key = await asyncio.to_thread(synthesize, request.text, request.language)
        return Response(audio, media_type="audio/wav", headers={"Cache-Control": "no-store", "X-Speech-Provider": "piper:" + key})
    except Exception as exc:
        print("Speech synthesis failed:", type(exc).__name__, flush=True)
        raise HTTPException(503, "Local voice is unavailable or downloading. Try again shortly.")
