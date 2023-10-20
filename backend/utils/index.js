import axios from "axios";
import fs from "fs-extra";
import OpenAI from "openai";
import dotenv from "dotenv";
import { exec } from "child_process";

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Your OpenAI API key here, I used "-" to avoid errors when the key is not set but you should not do that
});

export const textToMp3 = async (fileName, text) => {
  try {
    const maleVoiceId = "ut8zfZ3npWq3NeQ4h8KE";
    const femaleVoiceId = "21m00Tcm4TlvDq8ikWAM";

    const url = `${process.env.ELEVEN_LABS_API}/text-to-speech/${femaleVoiceId}?optimize_streaming_latency=0&output_format=mp3_44100_128`;
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
    // delete the file with filname fileName if it exists
    if (fs.existsSync(fileName)) {
      await fs.unlink(fileName);
    }
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

function isJsonString(str) {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
}

export const handleAssitantResponse = async (chatMsg) => {
  const time = new Date().getTime();

  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    max_tokens: 1000,
    temperature: 0.6,
    messages: [
      {
        role: "system",
        content: `
        You are a virtual assistant.
        You will always reply with a JSON array of messages. With a maximum of 3 messages.
        Each message has a text, facialExpression, and animation property.
        The different facial expressions are: smile, sad, angry, surprised, funnyFace, and default.
        The different animations are: Talking_0, Talking_1, Talking_2, Crying, Laughing, Rumba, Idle, Terrified, and Angry.
        `,
      },
      {
        role: "user",
        content: chatMsg || "Hello",
      },
    ],
  });

  console.log(`ChatGPT response time: ${new Date().getTime() - time}ms`);
  console.log(
    "completion.choices[0].message.content",
    completion.choices[0].message
  );
  let messages;
  console.log(
    "Is Parsable",
    isJsonString(completion.choices[0].message.content)
  );
  if (
    completion.choices[0].message.content.includes("facialExpression") &&
    completion.choices[0].message.content.includes("animation")
  ) {
    console.log(
      "here",
      JSON.stringify(completion.choices[0].message.content).replace(/\n/g, "")
    );
    messages = JSON.parse(
      completion.choices[0].message.content.replace(/[\r\n]/gm, "")
    );
    console.log(messages.messages);
    if (messages["messages"]) {
      messages = messages.messages; // ChatGPT is not 100% reliable, sometimes it directly returns an array and sometimes a JSON object with a messages property
    }
  } else {
    messages = [
      {
        text: completion.choices[0].message.content,
        facialExpression: "smile",
        animation: "Talking_1",
      },
    ];
  }
  return messages;
};

const execCommand = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      resolve(stdout);
    });
  });
};

export const lipSyncMessage = async (message) => {
  const time = new Date().getTime();
  console.log(`Starting conversion for message ${message}`);
  // To convert mp3 to wav
  await execCommand(
    `ffmpeg -y -i audios/message_${message}.mp3 audios/message_${message}.wav`
    // -y to overwrite the file
  );
  // wav to morph targets json
  await execCommand(
    `Rhubarb\\rhubarb.exe -f json -o audios\\message_${message}.json audios\\message_${message}.wav -r phonetic`
  );
  console.log(`Lip sync conversion time: ${new Date().getTime() - time}ms`);
};
