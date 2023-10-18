import axios from "axios";
import fs from "fs-extra";
const elevenLabsAPI = "https://api.elevenlabs.io/v1";

export const textToMp3 = async (fileName, text) => {
  try {
    const url = `https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM?optimize_streaming_latency=0&output_format=mp3_44100_128`;
    const headers = {
      accept: "audio/mpeg",
      "Content-Type": "application/json",
      "xi-api-key": process.env.ELEVEN_LABS_API_KEY,
    };

    const data = {
      text,
      model_id: "eleven_monolingual_v1",
      voice_settings: {
        stability: 0,
        similarity_boost: 0,
        style: 0,
        use_speaker_boost: true,
      },
    };

    const response = await axios({
      method: "POST",
      url,
      data: JSON.stringify(data),
      headers,
      responseType: "stream",
    });
    console.log("response.data", response.data);
    response.data.pipe(fs.createWriteStream(fileName));
    const writeStream = fs.createWriteStream(fileName);
    response.data.pipe(writeStream);
    return new Promise((resolve, reject) => {
      const responseJson = { status: "ok", fileName: fileName };
      writeStream.on("finish", () => resolve(responseJson));
      writeStream.on("error", reject);
    });
  } catch (error) {
    console.log(error);
  }
};
