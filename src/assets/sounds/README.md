# Sound assets

Playback is implemented with the **Web Audio API** in [`src/services/sound.ts`](../../services/sound.ts) (short, offline, no loading).

The files `correct.mp3`, `wrong.mp3`, `levelup.mp3`, `reward.mp3`, and `success.mp3` are reserved names (placeholders may be empty). You can replace them with real MP3 samples and extend `sound.ts` to use `HTMLAudioElement` if you want recorded audio instead of synthesized tones.
