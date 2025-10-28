const fs = require("fs");
const { tmpdir } = require("os");
const Crypto = require("crypto");
const ff = require("fluent-ffmpeg");
const webp = require("node-webpmux");
const path = require("path");

const generateTmp = (ext) =>
  path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`);

async function imageToWebp(media) {
  const tmpFileIn = generateTmp("jpg");
  const tmpFileOut = generateTmp("webp");

  fs.writeFileSync(tmpFileIn, media);

  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15," +
        "pad=320:320:-1:-1:color=white@0.0,split [a][b];" +
        "[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];" +
        "[b][p] paletteuse"
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });

  const buffer = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileIn);
  fs.unlinkSync(tmpFileOut);
  return buffer;
}

async function videoToWebp(media) {
  const tmpFileIn = generateTmp("mp4");
  const tmpFileOut = generateTmp("webp");

  fs.writeFileSync(tmpFileIn, media);

  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec", "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15," +
        "pad=320:320:-1:-1:color=white@0.0,split [a][b];" +
        "[a] palettegen=reserve_transparent=on:transparency_color=ffffff [p];" +
        "[b][p] paletteuse",
        "-loop", "0",
        "-ss", "00:00:00",
        "-t", "00:00:05",
        "-preset", "default",
        "-an",
        "-vsync", "0"
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });

  const buffer = fs.readFileSync(tmpFileOut);
  fs.unlinkSync(tmpFileIn);
  fs.unlinkSync(tmpFileOut);
  return buffer;
}

async function injectExif(inputBuffer, metadata) {
  const img = new webp.Image();
  const tmpFile = generateTmp("webp");
  fs.writeFileSync(tmpFile, inputBuffer);

  const exifData = {
    "sticker-pack-id": "https://github.com/ParkyBot",
    "sticker-pack-name": metadata.packname || "PARKY",
    "sticker-pack-publisher": metadata.author || "ParkyDev",
    "emojis": metadata.categories || [""]
  };

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00,
    0x00, 0x00
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(exifData), "utf-8");
  const exif = Buffer.concat([exifAttr, jsonBuff]);
  exif.writeUIntLE(jsonBuff.length, 14, 4);

  await img.load(tmpFile);
  fs.unlinkSync(tmpFile);

  img.exif = exif;

  const outputFile = generateTmp("webp");
  await img.save(outputFile);

  const result = fs.readFileSync(outputFile);
  fs.unlinkSync(outputFile);
  return result;
}

async function writeExifImg(media, metadata) {
  const buffer = await imageToWebp(media);
  return await injectExif(buffer, metadata);
}

async function writeExifVid(media, metadata) {
  const buffer = await videoToWebp(media);
  return await injectExif(buffer, metadata);
}

// pour les cas génériques
async function writeExif(media, metadata) {
  let buffer;
  if (/webp/.test(media.mimetype)) {
    buffer = media.data;
  } else if (/image/.test(media.mimetype)) {
    buffer = await imageToWebp(media.data);
  } else if (/video/.test(media.mimetype)) {
    buffer = await videoToWebp(media.data);
  } else {
    throw new Error("⛔ Format non supporté pour les stickers.");
  }

  return await injectExif(buffer, metadata);
}

module.exports = {
  imageToWebp,
  videoToWebp,
  writeExifImg,
  writeExifVid,
  writeExif
};