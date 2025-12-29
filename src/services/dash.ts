import { getVideoInfo } from './ffmpeg';
import { transcodeOptions, TranscodeOptions } from './transcoder';
import { parseInt } from 'lodash';

export async function generateDashManifest(file: string, host: string, pathParam: string, captions: string[] = [], options: TranscodeOptions = transcodeOptions): Promise<string> {
  const info = await getVideoInfo(file);
  const duration = info.duration;
  const segmentDuration = options.segmentDuration;

  const durationStr = `PT${duration.toFixed(2)}S`;
  const minBufferTime = `PT${segmentDuration}S`;

  const videoStreams = info.streams.filter(s => s.codec_type === 'video');

  let mpd = `<?xml version="1.0" encoding="utf-8"?>
<MPD xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
	xmlns="urn:mpeg:dash:schema:mpd:2011"
	xmlns:xlink="http://www.w3.org/1999/xlink"
	xsi:schemaLocation="urn:mpeg:DASH:schema:MPD:2011 http://standards.iso.org/ittf/PubliclyAvailableStandards/MPEG-DASH_schema_files/DASH-MPD.xsd"
	profiles="urn:mpeg:dash:profile:isoff-live:2011"
	type="static"
	mediaPresentationDuration="${durationStr}"
	minBufferTime="${minBufferTime}">
	<Period>
`;

  // Video Adaptations
  options.variants.forEach((v, index: number) => {
    let bandwidth: number;
    let width: number;
    let height: number;

    // Determine which video stream to use
    const videoStreamIndex = v.videoStreamIndex ?? 0;
    const videoStream = videoStreams[videoStreamIndex];

    if (!videoStream) {
      console.warn(`Video stream index ${videoStreamIndex} not found, skipping DASH variant ${index}`);
      return;
    }

    if (v.original) {
      // For original variant, use the specific video stream's properties
      bandwidth = (videoStream.bit_rate ? parseInt(videoStream.bit_rate) : (v.bitrate ? parseInt(v.bitrate) * 1000 : 0));
      width = videoStream.width || info.width;
      height = videoStream.height || info.height;
    } else {
      // For transcoded variants, scale based on the specific video stream
      const sourceHeight = videoStream.height || info.height;
      const sourceWidth = videoStream.width || info.width;
      const aspect = sourceWidth / sourceHeight;
      bandwidth = parseInt(v.bitrate.replace('k', '000'));
      width = Math.round(v.height * aspect / 2) * 2;
      height = v.height;
    }

    // Use the frame rate from the specific video stream if available
    const streamFrameRate = videoStream.r_frame_rate ?
      parseFloat(videoStream.r_frame_rate.split('/')[0]) / parseFloat(videoStream.r_frame_rate.split('/')[1]) :
      info.frameRate;

    mpd += `		<AdaptationSet mimeType="video/mp4" contentType="video" segmentAlignment="true" startWithSAP="1">
			<Representation id="v${index}" bandwidth="${bandwidth}" width="${width}" height="${height}" frameRate="${streamFrameRate || 30}">
				<SegmentTemplate timescale="1000" duration="${segmentDuration * 1000}" initialization="${host}/api/dash/init/v${index}/${pathParam}" media="${host}/api/dash/chunk/v${index}/$Number$/${pathParam}" />
			</Representation>
		</AdaptationSet>
`;
  });

  // Audio Adaptation
  const audioBandwidth = parseInt(options.audio.bitrate.replace('k', '000'));
  mpd += `		<AdaptationSet mimeType="audio/mp4" contentType="audio" segmentAlignment="true" startWithSAP="1">
			<Representation id="a0" bandwidth="${audioBandwidth}" audioSamplingRate="48000">
				<AudioChannelConfiguration schemeIdUri="urn:mpeg:dash:23003:3:audio_channel_configuration:2011" value="${options.audio.channels}" />
				<SegmentTemplate timescale="1000" duration="${segmentDuration * 1000}" initialization="${host}/api/dash/init/a0/${pathParam}" media="${host}/api/dash/chunk/a0/$Number$/${pathParam}" />
			</Representation>
		</AdaptationSet>
`;

  // Subtitle Adaptations
  if (captions.length > 0) {
    captions.forEach((url, index) => {
      mpd += `		<AdaptationSet mimeType="text/vtt" contentType="text" lang="en">
			<Role schemeIdUri="urn:mpeg:dash:role:2011" value="subtitle" />
			<Representation id="s${index}" bandwidth="1000">
				<BaseURL>${url}</BaseURL>
			</Representation>
		</AdaptationSet>
`;
    });
  }

  mpd += `	</Period>
</MPD>`;

  return mpd;
}
