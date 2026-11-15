"""Makes a music WAV loop seamlessly: crossfades its last XF seconds into its first XF seconds.
Usage: python3 tools/audio/loop.py in.wav out.wav [xf_seconds=2]"""
import sys
import numpy as np
import soundfile as sf

src, dst = sys.argv[1], sys.argv[2]
xf = float(sys.argv[3]) if len(sys.argv) > 3 else 2.0
a, sr = sf.read(src, always_2d=True)
n = int(xf * sr)
head, body, tail = a[:n], a[n:-n], a[-n:]
t = np.linspace(0, 1, n)[:, None]
fade = tail * np.cos(t * np.pi / 2) + head * np.sin(t * np.pi / 2)  # equal-power
sf.write(dst, np.concatenate([body, fade]), sr)
