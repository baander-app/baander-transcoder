import * as process from "process";
import * as child_process from 'child_process';

type Quality = { /* describe your Quality type here */ };
type MapData = { /* describe your MapData here */ };

class HwAccelT {
  name: string;
  decodeFlags: string[];
  encodeFlags: string[];
  scaleFilter: string;

  getEnvOr = (envVar: string, defaultValue: string): string => {
    const value = process.env[envVar];
    return value !== undefined ? value : defaultValue;
  }

  constructor(name: string, scaleFilter: string, decodeFlags?: string[], encodeFlags?: string[]) {
    this.name = name;
    this.decodeFlags = decodeFlags ? decodeFlags : [];
    this.encodeFlags = encodeFlags ? encodeFlags : [];
    this.scaleFilter = scaleFilter;
  }
}

export function detectHardwareAccel(): HwAccelT {
  let name: string = process.env['GOCODER_HWACCEL'] || "disabled";
  if (name === "disabled") {
    name = process.env['GOTRANSCODER_HWACCEL'] || "disabled";
  }
  console.log(`Using hardware acceleration: ${name}`);

  let preset = process.env['GOCODER_PRESET'] || "fast";

  switch (name) {
    case "disabled":
      return new HwAccelT(
        "disabled",
        "scale=%d:%d",
        [],
        ["-c:v", "libx264",
          "-preset", preset,
          "-sc_threshold", "0",
          "-pix_fmt", "yuv420p"
        ]
      );
    case "vaapi":
      return new HwAccelT(
        "vaapi",
        "format=nv12|vaapi, hwupload, scale_vaapi=%d:%d:format=nv12",
        ["-hwaccel", "vaapi",
          "-hwaccel_device", process.env("GOCODER_VAAPI_RENDERER", "/dev/dri/renderD128"),
          "-hwaccel_output_format", "vaapi"
        ],
        ["-c:v", "h264_vaapi"]
      );
    case "qsv":
    case "intel":
      return new HwAccelT(
        "intel",
        "format=nv12|qsv, hwupload,scale_qsv=%d:%d:format=nv12",
        ["-hwaccel", "qsv",
          "-qsv_device", process.env("GOCODER_QSV_RENDERER", "/dev/dri/renderD128"),
          "-hwaccel_output_format", "qsv"
        ],
        ["-c:v", "h264_qsv",
          "-preset", preset
        ]
      );
    case "nvidia":
      return new HwAccelT(
        "cuda",
        "format=nv12|cuda, hwupload, scale_cuda=%d:%d:format=nv12",
        ["-hwaccel", "cuda",
          "-hwaccel_output_format", "cuda"
        ],
        ["-c:v", "h264_nvenc",
          "-preset", preset,
          "-no-scenecut", "1"
        ]
      );
    default:
      console.log(`No hardware accelerator named: ${name}`);
      process.exit(2);
  }
}