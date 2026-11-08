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

// Full figure as a <g> in OTTO_VIEWBOX space. Paint order is back to front. No ground shadow and
// no idle bob: he stands still and blinks, unless he's lively (dashboard home), when the parts
// his pose uses move a little.
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
