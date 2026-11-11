import {
  type DrawOptions,
  drawBody,
  drawGlasses,
  drawHead,
  drawMuzzle,
  drawNose,
  drawTail,
} from "./otto-body";
import { drawFace } from "./otto-face";
import { moving, type OttoPose, POSE_ART } from "./otto-poses";

// Back to front. He only blinks, unless lively (dashboard home), when his pose's parts move.
export function drawOtto(pose: OttoPose, options: DrawOptions) {
  const art = POSE_ART[pose];
  return (
    <g>
      {art.headOnly ? null : drawTail(options)}
      {art.headOnly ? null : drawBody(options)}
      {art.behind(options)}
      {moving(
        options,
        art.head,
        <g>
          {drawHead(options)}
          {drawMuzzle(options)}
          {drawFace(art.expression, options)}
          {drawNose()}
          {drawGlasses()}
        </g>,
      )}
      {art.front?.(options)}
    </g>
  );
}
