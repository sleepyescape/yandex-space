"""Звук для заставки: эффекты под анимацию, джингл и озвучка названия.

Синтезирует всё с нуля (нужен только numpy и ffmpeg) и подмешивает дорожку
к видео, которое сделал render.js:

    node intro/render.js && python3 intro/sound.py

Тайминги повторяют таймлайн из index.html (ENTER, F, SHUFFLE*, COLLAPSE, финал).
"""
import os
import subprocess
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VIDEO = os.path.join(HERE, 'yandex-space-intro.mp4')
VOICE = os.path.join(HERE, 'voice-yandex-space.mp3')
SR = 44100
DURATION = 7.8

# ---------- таймлайн (как в index.html) ----------
ENTER = [0.10, 0.90, 1.70, 2.50]
F = 2.7
SHUFFLE = [F + 1.90, F + 2.20]
COLLAPSE = F + 2.50
IMPACT = F + 2.74          # жёлтая волна и разлёт кружков
LOGO_ICON = F + 2.86
LETTERS = F + 2.96         # 11 букв, шаг 0.03
ROW = F + 3.08             # 5 персонажей, шаг 0.06
VOICE_AT = F + 3.25
VOICE_TRIM = 0.68          # в начале файла вдох, режем

rng = np.random.default_rng(7)
mix = np.zeros((int(SR * DURATION) + SR, 2))


def tt(dur):
    return np.arange(int(SR * dur)) / SR


def add(sig, at, gain=1.0, pan=0.0):
    """Кладёт моно-сигнал в стерео-микс; pan от -1 (лево) до 1 (право)."""
    i = int(at * SR)
    sig = sig[: max(0, len(mix) - i)]
    left, right = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    mix[i:i + len(sig), 0] += sig * gain * left * 1.414
    mix[i:i + len(sig), 1] += sig * gain * right * 1.414


def sweep(f0, f1, dur, curve=1.0):
    t = tt(dur)
    f = f0 + (f1 - f0) * (t / dur) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR), t


def bandpass(sig, lo, hi):
    spec = np.fft.rfft(sig)
    freqs = np.fft.rfftfreq(len(sig), 1 / SR)
    spec[(freqs < lo) | (freqs > hi)] = 0
    return np.fft.irfft(spec, len(sig))


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---------- инструменты эффектов ----------
def pop(f0=900, f1=260, dur=0.07):
    s, t = sweep(f0, f1, dur, 0.5)
    return s * np.exp(-t * 45)


def boing(base=260, dur=0.22):
    t = tt(dur)
    f = base + base * 0.9 * (1 - np.exp(-t * 28)) + base * 0.12 * np.sin(2 * np.pi * 22 * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14) * np.minimum(1, t * 300)


def bell(f, dur=0.6, decay=7):
    t = tt(dur)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 20)) * np.exp(-t * decay)


def tick(f=2200, dur=0.03):
    t = tt(dur)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 160)


def click(dur=0.025):
    t = tt(dur)
    return bandpass(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 220)


def whoosh(dur=0.3, lo=300, hi=3000, rise=True):
    """Шум, полоса которого едет вверх или вниз; огибающая «туда-обратно»."""
    n = int(SR * dur)
    out = np.zeros(n)
    chunks = 12
    for k in range(chunks):
        a, b = k * n // chunks, (k + 1) * n // chunks
        x = (k + 0.5) / chunks
        c = lo * (hi / lo) ** (x if rise else 1 - x)
        seg = bandpass(rng.standard_normal(b - a + 400), c * 0.6, c * 1.6)[200:200 + b - a]
        out[a:b] = seg
    t = tt(dur)
    return out * np.sin(np.pi * t / dur) ** 1.5


def boom(dur=0.5):
    s, t = sweep(110, 45, dur, 0.4)
    return s * np.exp(-t * 7)


def sparkle(dur=0.6, n=10):
    out = np.zeros(int(SR * dur))
    for _ in range(n):
        st = rng.uniform(0, dur * 0.6)
        b = bell(rng.uniform(2500, 5000), 0.25, 20)
        i = int(st * SR)
        out[i:i + len(b)] += b[: len(out) - i] * rng.uniform(0.3, 0.7)
    return out


# ---------- эффекты по таймлайну ----------
add(whoosh(0.4, 400, 2500), 0.0, 0.25, -0.6)                     # шапка с логотипом въезжает слева
add(pop(1200, 400), 0.12, 0.25, -0.6)

PANS = [-0.6, -0.2, 0.2, 0.6]                                     # карточки слева направо
for i, t0 in enumerate(ENTER):
    pan = PANS[i]
    add(pop(), t0, 0.55, pan)                                     # карточка выпрыгивает
    chars = 2 if i == 2 else 1
    for k in range(chars):
        add(boing(240 + 60 * k), t0 + 0.08 + k * 0.06, 0.35, pan)  # персонаж из-за столика
    add(tick(2600), t0 + 0.16, 0.25, pan)                         # значок цели
    if i == 0:                                                    # телефон: «бронь подтверждена»
        add(bell(midi(88), 0.5), t0 + 0.22, 0.22, pan)
        add(bell(midi(93), 0.6), t0 + 0.30, 0.22, pan)
    elif i == 1:                                                  # метка на карте + «сонар»
        add(sweep(500, 1300, 0.08)[0] * np.exp(-tt(0.08) * 30), t0 + 0.2, 0.3, pan)
        for k in range(3):
            add(bell(1180, 0.35, 12), t0 + 0.42 + k * 0.3, 0.12 * (1 - k * 0.25), pan)
    elif i == 2:                                                  # конфетти
        for k in range(6):
            add(pop(rng.uniform(1400, 2200), 700, 0.04), t0 + 0.25 + k * 0.05, 0.25, pan + rng.uniform(-0.2, 0.2))
    else:                                                         # ноутбук: клавиатура
        for k in range(6):
            add(click(), t0 + 0.5 + k * 0.09 + rng.uniform(0, 0.03), 0.2, pan)

for k, st in enumerate(SHUFFLE):                                 # перемешивание
    add(whoosh(0.32, 300, 2800, rise=k == 0), st, 0.45, -0.5 if k == 0 else 0.5)
add(whoosh(0.32, 200, 3500, rise=False), COLLAPSE, 0.5)          # схлопывание в центр
add(sweep(900, 150, 0.3, 0.7)[0] * np.sin(np.pi * tt(0.3) / 0.3), COLLAPSE, 0.15)

add(boom(), IMPACT, 0.6)                                          # удар и разлёт
add(sparkle(0.7, 14), IMPACT, 0.35)
add(whoosh(0.35, 500, 4000), LOGO_ICON - 0.05, 0.3)              # иконка влетает с вращением
add(pop(700, 1400, 0.09), LOGO_ICON + 0.25, 0.4)

PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96]             # буквы — маримба вверх по пентатонике
for k, n in enumerate(PENTA):
    add(bell(midi(n), 0.3, 14), LETTERS + k * 0.03, 0.12, -0.5 + k * 0.1)
for k in range(5):                                                # компания за общим столом
    add(boing(300 + 40 * k, 0.18), ROW + k * 0.06, 0.18, -0.6 + k * 0.3)

# ---------- джингл: 150 bpm, C – Am – F – G, потом финальный аккорд ----------
BEAT = 0.4
START = ENTER[0]
CHORDS = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]]
BASS = [36, 33, 29, 31]
music = np.zeros_like(mix[:, 0])


def mput(sig, at, gain):
    i = int(at * SR)
    sig = sig[: max(0, len(music) - i)]
    music[i:i + len(sig)] += sig * gain


def marimba(f, dur=0.35):
    t = tt(dur)
    return (np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 40)) * np.exp(-t * 9)


def kick():
    s, t = sweep(140, 45, 0.18, 0.5)
    return s * np.exp(-t * 18)


def shaker():
    t = tt(0.05)
    return bandpass(rng.standard_normal(len(t)), 5000, 12000) * np.exp(-t * 70)


groove_end = COLLAPSE + 0.2
arp = [0, 1, 2, 1, 0, 2, 1, 2]                                    # восьмые по аккорду
step = 0
t = START
while t < groove_end:
    bar = int((t - START) / (BEAT * 4)) % 4
    chord = CHORDS[bar]
    eighth = step % 8
    note = chord[arp[eighth]] + 12
    mput(marimba(midi(note)), t, 0.32 if eighth % 2 == 0 else 0.22)
    if eighth in (0, 4):
        mput(marimba(midi(BASS[bar]), 0.5) * 1.3, t, 0.4)
        mput(kick(), t, 0.3)
    if eighth % 2 == 1:
        mput(shaker(), t, 0.18)
    if eighth in (2, 6):
        mput(click() * 0.8, t, 0.25)
    step += 1
    t += BEAT / 2

# подъём перед ударом и финальный аккорд, на котором держится логотип
mput(whoosh(0.5, 200, 2000) * 0.6, IMPACT - 0.5, 0.5)
final = [48, 60, 64, 67, 72, 76]
for k, n in enumerate(final):
    mput(bell(midi(n), DURATION - IMPACT, 1.3), IMPACT + k * 0.015, 0.16)
    mput(marimba(midi(n + 12), 0.4), IMPACT + 0.12 + k * 0.06, 0.12)
mput(kick(), IMPACT, 0.4)

music_gain = np.ones_like(music)
# под голосом музыку приглушаем (ducking)
vi, ve = int((VOICE_AT - 0.1) * SR), int((VOICE_AT + 1.5) * SR)
music_gain[vi:ve] = 0.4
mix[:, 0] += music * music_gain * 0.8
mix[:, 1] += music * music_gain * 0.8

# ---------- озвучка ----------
raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-ss', str(VOICE_TRIM), '-i', VOICE,
                      '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
voice = np.frombuffer(raw, dtype=np.int16).astype(float) / 32768
voice *= np.minimum(1, tt(len(voice) / SR) * 40)                 # мягкая атака после обрезки
voice /= np.abs(voice).max()
add(voice, VOICE_AT, 1.5)

# ---------- мастер ----------
mix = mix[: int(SR * DURATION)]
fade = int(SR * 0.4)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
mix = np.tanh(mix * 1.1)                                         # мягкий лимитер
mix *= 10 ** (-1 / 20) / np.abs(mix).max()

wav = os.path.join(HERE, 'soundtrack.wav')
with wave.open(wav, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())

tmp = VIDEO + '.tmp.mp4'
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', VIDEO, '-i', wav, '-map', '0:v', '-map', '1:a',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', tmp], check=True)
os.replace(tmp, VIDEO)
print('wrote', wav, 'and muxed into', VIDEO)
