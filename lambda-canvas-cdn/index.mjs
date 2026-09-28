import Jimp from "jimp";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: "us-east-1" });
const BUCKET_NAME = "kel-d-puisi-stateful-2026";

const VALID_TEMPLATES = ["latar1", "latar2", "latar3", "latar5"];

// Template asli kecil (200x112), jadi hasil gambar diperbesar dulu
// supaya teks muat dan tajam. File template di S3 tidak diubah.
const OUTPUT_WIDTH = 800;

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export const handler = async (event) => {
  try {
    const params = event.queryStringParameters || {};
    const judul = (params.judul || "Tanpa Judul").slice(0, 60);
    const penulis = (params.penulis || "Anonim").slice(0, 40);
    let bait = params.bait || "...";
    if (bait.length > 180) bait = bait.slice(0, 177) + "...";

    let template = params.template || "latar1";
    if (!VALID_TEMPLATES.includes(template)) {
      template = "latar1";
    }
    const IMAGE_KEY = `${template}.jpeg`;

    const s3Res = await s3.send(
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: IMAGE_KEY }),
    );
    const buffer = await streamToBuffer(s3Res.Body);
    const image = await Jimp.read(buffer);

    // Perbesar gambar (tinggi mengikuti proporsi)
    image.resize(OUTPUT_WIDTH, Jimp.AUTO);

    const font64 = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
    const font16 = await Jimp.loadFont(Jimp.FONT_SANS_16_BLACK);

    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const margin = 50;
    const textWidth = width - margin * 2;

    // Judul pendek pakai font besar, judul panjang pakai font sedang
    const fontJudul = judul.length <= 18 ? font64 : font32;
    // Bait pendek pakai font sedang, bait panjang pakai font kecil
    const fontBait = bait.length <= 90 ? font32 : font16;

    image.print(
      fontJudul,
      margin,
      height * 0.08,
      {
        text: judul,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
      },
      textWidth,
      height * 0.27,
    );

    image.print(
      font32,
      margin,
      height * 0.38,
      {
        text: `by ${penulis}`,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
      },
      textWidth,
      height * 0.1,
    );

    image.print(
      fontBait,
      margin,
      height * 0.55,
      {
        text: bait,
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE,
      },
      textWidth,
      height * 0.38,
    );

    const outputBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    return {
      statusCode: 200,
      headers: {
        "content-type": "image/jpeg",
        "cache-control": "public, max-age=86400",
      },
      body: outputBuffer.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (err) {
    console.error("Processing error:", err);
    return {
      statusCode: 500,
      headers: { "content-type": "text/plain" },
      body: "Error: " + err.message,
    };
  }
};
