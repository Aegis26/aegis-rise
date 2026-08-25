import { randomUUID } from "node:crypto";
import { Router, type IRouter, type RequestHandler } from "express";
import multer from "multer";
import sharp from "sharp";
import { uploadObjectToR2 } from "../lib/r2";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../utils/errors";

const router: IRouter = Router();
const fiveMegabytes = 5 * 1024 * 1024;
const maxUploadBytes = fiveMegabytes - 1;
const maxDecodedPixels = 16_000_000;
const maxConcurrentUploads = 2;
const maxUploadsPerMinute = 10;
type SupportedImageFormat = "jpeg" | "png" | "gif";

const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/gif"]);
const allowedFormats = new Set<SupportedImageFormat>(["jpeg", "png", "gif"]);
const wallpaperMimeTypes = new Set(["image/jpeg", "image/png"]);
const wallpaperFormats = new Set<SupportedImageFormat>(["jpeg", "png"]);
let activeUploads = 0;

interface UploadRateWindow {
  count: number;
  resetsAt: number;
}

const uploadRateWindows = new Map<string, UploadRateWindow>();

sharp.concurrency(1);

function createImageUpload(
  acceptedMimeTypes: Set<string>,
  acceptedTypeMessage: string,
) {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      files: 1,
      fields: 0,
      fileSize: maxUploadBytes,
      fieldNameSize: 100,
      fieldSize: 1_024,
      headerPairs: 20,
    },
    fileFilter: (_request, file, callback) => {
      if (!acceptedMimeTypes.has(file.mimetype)) {
        callback(new HttpError(415, acceptedTypeMessage));
        return;
      }

      callback(null, true);
    },
  });
}

const enforceUploadRateLimit: RequestHandler = (request, response, next) => {
  const now = Date.now();

  for (const [memberId, window] of uploadRateWindows) {
    if (window.resetsAt <= now) {
      uploadRateWindows.delete(memberId);
    }
  }

  const memberId = request.user!.id;
  const currentWindow = uploadRateWindows.get(memberId);

  if (currentWindow && currentWindow.count >= maxUploadsPerMinute) {
    response.setHeader(
      "Retry-After",
      Math.max(1, Math.ceil((currentWindow.resetsAt - now) / 1_000)),
    );
    next(new HttpError(429, "Too many image uploads. Please try again later."));
    return;
  }

  if (currentWindow) {
    currentWindow.count += 1;
  } else {
    uploadRateWindows.set(memberId, {
      count: 1,
      resetsAt: now + 60_000,
    });
  }

  next();
};

const enforceUploadConcurrency: RequestHandler = (
  _request,
  response,
  next,
) => {
  if (activeUploads >= maxConcurrentUploads) {
    next(
      new HttpError(
        429,
        "Image processing is busy. Please try again in a moment.",
      ),
    );
    return;
  }

  activeUploads += 1;
  let released = false;
  const release = () => {
    if (!released) {
      activeUploads -= 1;
      released = true;
    }
  };

  response.once("finish", release);
  response.once("close", release);
  next();
};

function createImageParser(
  acceptedMimeTypes: Set<string>,
  acceptedTypeMessage: string,
): RequestHandler {
  const upload = createImageUpload(acceptedMimeTypes, acceptedTypeMessage);

  return (request, response, next) => {
    upload.single("image")(request, response, (error) => {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_SIZE") {
          next(new HttpError(413, "Images must be smaller than 5 MB."));
          return;
        }

        if (error.code === "LIMIT_FIELD_COUNT") {
          next(
            new HttpError(
              400,
              'Only the multipart file field named "image" is allowed.',
            ),
          );
          return;
        }

        if (
          error.code === "LIMIT_FILE_COUNT" ||
          error.code === "LIMIT_UNEXPECTED_FILE"
        ) {
          next(new HttpError(400, "Upload exactly one image file."));
          return;
        }

        next(new HttpError(400, "Invalid multipart image upload."));
        return;
      }

      next(error);
    });
  };
}

const parseImageUpload = createImageParser(
  allowedMimeTypes,
  "Only JPG, PNG, and GIF images are allowed.",
);
const parseWallpaperUpload = createImageParser(
  wallpaperMimeTypes,
  "Only JPG and PNG wallpapers are allowed.",
);

interface ProcessedImage {
  buffer: Buffer;
  extension: "jpg" | "png" | "gif";
  format: "jpeg" | "png" | "gif";
  contentType: "image/jpeg" | "image/png" | "image/gif";
}

interface ImageProcessingOptions {
  acceptedFormats: Set<SupportedImageFormat>;
  acceptedTypeMessage: string;
  width: number;
  height: number;
}

async function processImage(
  input: Buffer,
  options: ImageProcessingOptions,
): Promise<ProcessedImage> {
  try {
    const metadata = await sharp(input, {
      pages: 1,
      limitInputPixels: false,
    }).metadata();

    const format = metadata.format as SupportedImageFormat | undefined;
    if (!format || !options.acceptedFormats.has(format)) {
      throw new HttpError(415, options.acceptedTypeMessage);
    }

    const decodedWidth = metadata.width;
    const decodedHeight = metadata.pageHeight ?? metadata.height;
    if (
      !decodedWidth ||
      !decodedHeight ||
      decodedWidth * decodedHeight > maxDecodedPixels
    ) {
      throw new HttpError(413, "Image dimensions are too large.");
    }

    let pipeline = sharp(input, {
      pages: 1,
      limitInputPixels: maxDecodedPixels,
    })
      .rotate()
      .resize({
        width: options.width,
        height: options.height,
        withoutEnlargement: true,
        fit: "inside",
      });

    if (format === "jpeg") {
      pipeline = pipeline.jpeg({ quality: 85, mozjpeg: true });
    } else if (format === "png") {
      pipeline = pipeline.png({ compressionLevel: 9 });
    } else {
      // Multi-frame GIFs are intentionally flattened to their first frame so a
      // small compressed upload cannot trigger unbounded frame decoding.
      pipeline = pipeline.gif({ effort: 3 });
    }

    const buffer = await pipeline.toBuffer();
    if (buffer.byteLength >= fiveMegabytes) {
      throw new HttpError(
        413,
        "The processed image must be smaller than 5 MB.",
      );
    }

    if (format === "jpeg") {
      return {
        buffer,
        extension: "jpg",
        format: "jpeg",
        contentType: "image/jpeg",
      };
    }

    if (format === "png") {
      return {
        buffer,
        extension: "png",
        format: "png",
        contentType: "image/png",
      };
    }

    return {
      buffer,
      extension: "gif",
      format: "gif",
      contentType: "image/gif",
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError(
      415,
      options.acceptedTypeMessage,
    );
  }
}

router.post(
  "/upload/image",
  requireAuth,
  enforceUploadRateLimit,
  enforceUploadConcurrency,
  parseImageUpload,
  async (request, response, next) => {
    try {
      if (!request.file) {
        throw new HttpError(
          400,
          'Attach an image using the multipart field named "image".',
        );
      }

      const image = await processImage(request.file.buffer, {
        acceptedFormats: allowedFormats,
        acceptedTypeMessage: "Only JPG, PNG, and GIF images are allowed.",
        width: 800,
        height: 800,
      });
      const key = `images/${randomUUID()}.${image.extension}`;
      let url: string;

      try {
        url = await uploadObjectToR2({
          key,
          body: image.buffer,
          contentType: image.contentType,
        });
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }

        throw new HttpError(
          502,
          "Image storage is unavailable. Please try again.",
        );
      }

      response.status(201).json({
        url,
        size: image.buffer.byteLength,
        format: image.format,
      });
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/upload/profile-wallpaper",
  requireAuth,
  enforceUploadRateLimit,
  enforceUploadConcurrency,
  parseWallpaperUpload,
  async (request, response, next) => {
    try {
      if (!request.file) {
        throw new HttpError(
          400,
          'Attach a wallpaper using the multipart field named "image".',
        );
      }

      const image = await processImage(request.file.buffer, {
        acceptedFormats: wallpaperFormats,
        acceptedTypeMessage: "Only JPG and PNG wallpapers are allowed.",
        width: 1_600,
        height: 900,
      });
      const key = `profile-wallpapers/${request.user!.id}/${randomUUID()}.${image.extension}`;
      let url: string;

      try {
        url = await uploadObjectToR2({
          key,
          body: image.buffer,
          contentType: image.contentType,
        });
      } catch (error) {
        if (error instanceof HttpError) {
          throw error;
        }

        throw new HttpError(
          502,
          "Image storage is unavailable. Please try again.",
        );
      }

      response.status(201).json({
        url,
        size: image.buffer.byteLength,
        format: image.format,
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;