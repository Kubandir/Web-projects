import sys
from gtts import gTTS

if __name__ == "__main__":
    text = sys.argv[1]
    output_file = sys.argv[2]
    language = sys.argv[3]

    tts = gTTS(text, lang=language)
    tts.save(output_file)
