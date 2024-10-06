const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const upload = multer();
const PORT = 3000;

app.use(express.static('public'));

app.use(express.json());

app.use((req, res, next) => {
  if (req.body.text && req.body.text.length > 2000) {
    return res.status(400).send('Text exceeds the 2000 character limit.');
  }
  next();
});

app.post('/generate', upload.none(), (req, res) => {
  const { text, videoType } = req.body;

  const videoPaths = {
    minecraft: path.join(__dirname, 'assets/minecraft.mp4'),
    subway: path.join(__dirname, 'assets/subway.mp4'),
    gta: path.join(__dirname, 'assets/gta.mp4')
  };

  const selectedVideo = videoPaths[videoType];

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-gen-'));

  const ttsFilePath = path.join(tempDir, `output_${Date.now()}.mp3`);
  const outputFilePath = path.join(tempDir, `output_${Date.now()}.mp4`);
  const srtFilePath = path.join(tempDir, `output_${Date.now()}.srt`);

  exec(`python3 generate_tts.py "${text}" ${ttsFilePath} cs`, (error) => {
    if (error) {
      console.error(`Error generating TTS: ${error}`);
      return res.status(500).send('Failed to generate TTS');
    }

    ffmpeg.ffprobe(ttsFilePath, (err, metadata) => {
      if (err) {
        console.error('Error retrieving TTS metadata:', err);
        return res.status(500).send('Failed to process TTS');
      }

      const ttsDuration = metadata.format.duration;
      const videoDuration = ttsDuration + 3;

      const randomStart = Math.random() * 30;

      const mergedVideoPath = path.join(tempDir, `merged_${Date.now()}.mp4`);
      ffmpeg()
        .input(selectedVideo)
        .inputOptions([`-ss ${randomStart}`])
        .input(ttsFilePath)
        .outputOptions([
          `-t ${videoDuration}`,
          '-c:v libx264',
          '-c:a aac',
          '-shortest',
          '-y'
        ])
        .save(mergedVideoPath)
        .on('end', () => {
          generateSubtitles(text, srtFilePath);

          ffmpeg()
            .input(mergedVideoPath)
            .input(srtFilePath)
            .outputOptions([
              `-vf subtitles='${srtFilePath}'`,
              '-c:v libx264',
              '-c:a copy',
              '-y'
            ])
            .save(outputFilePath)
            .on('end', () => {
              res.download(outputFilePath, (err) => {
                fs.unlinkSync(ttsFilePath);
                fs.unlinkSync(srtFilePath);
                fs.unlinkSync(mergedVideoPath);
                fs.unlinkSync(outputFilePath);
                fs.rmdirSync(tempDir);
              });
            })
            .on('error', (err) => {
              console.error('Error generating video with subtitles:', err);
              res.status(500).send('Failed to generate final video with subtitles');
            });
        })
        .on('error', (err) => {
          console.error('Error generating merged video:', err);
          res.status(500).send('Failed to generate merged video');
        });
    });
  });
});

function generateSubtitles(text, outputPath) {
  const words = text.split(' ');
  let srtContent = '';
  let startTime = 0;
  let currentLine = '';

  words.forEach((word, index) => {
    if (currentLine.length + word.length + 1 <= 25) {
      currentLine += (currentLine.length ? ' ' : '') + word;
    } else {
      const endTime = startTime + 1.5;
      const start = new Date(startTime * 1000).toISOString().substr(11, 8);
      const end = new Date(endTime * 1000).toISOString().substr(11, 8);
      srtContent += `${index + 1}\n${start},000 --> ${end},000\n${currentLine}\n\n`;

      startTime = endTime;
      currentLine = word;
    }
  });

  if (currentLine) {
    const endTime = startTime + 1.5;
    const start = new Date(startTime * 1000).toISOString().substr(11, 8);
    const end = new Date(endTime * 1000).toISOString().substr(11, 8);
    srtContent += `${words.length}\n${start},000 --> ${end},000\n${currentLine}\n\n`;
  }

  fs.writeFileSync(outputPath, srtContent);
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
