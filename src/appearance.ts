// Photo appearance -> avatar, ported from the web sandbox (main.js
// applyPhotoResult / applyMeasuredTemplateColors / recolorIrisTexture).
// Labels map to wardrobe ids; measured pixel hexes (color_sampler.py) tint
// skin / brows / iris / hair / beard / clothing. Meta (toon) bases only —
// the mobile app ships meta bases exclusively.
import { CanvasTexture, Color, Texture } from "three";
import type { Mesh, MeshStandardMaterial, Object3D } from "three";

/* ---- /analyze response types (parameters.appearance) -------------------- */
export type MeasuredColor = { hex: string; coverage_px: number } | null;
export type Appearance = {
  skinTone?: string | null;
  hair?: { style?: string | null; color?: string | null } | null;
  beard?: { style?: string | null; color?: string | null } | null;
  glasses?: string | null;
  colors?: {
    skin?: MeasuredColor; hair?: MeasuredColor; beard?: MeasuredColor;
    brows?: MeasuredColor; iris?: MeasuredColor; cloth?: MeasuredColor;
  } | null;
} | null;

/* ---- label -> catalog id / palette (mirror of the sandbox APPEARANCE_MAP;
   if you change one, change the other) ------------------------------------ */
const HAIR_STYLE: Record<string, string | null> = {
  pigtails: "hair_w01", high_ponytail: "hair_w02", long: "hair_w03",
  side_sweep: "hair_w04", updo: "hair_w05", low_bun: "hair_w06",
  spiky: "hair_w07", pixie: "hair_w08", bob: "hair_w09",
  side_ponytail: "hair_w10", bald: null, short: null, none: null,
};
const BEARD_STYLE: Record<string, string | null> = {
  short: "beard_short", goatee: "goatee", none: null,
};
const GLASSES: Record<string, string | null> = {
  round: "glasses_round", square: "glasses_square", none: null,
};
const HAIR_COLOR: Record<string, string> = {
  black: "#0f0f12", dark_brown: "#3b2a1e", brown: "#6a4a2f",
  chestnut: "#55371f", auburn: "#7a3f24", light_brown: "#8c6239",
  dark_blonde: "#a67c48", blonde: "#c9a06a", platinum: "#e6d6b8",
  gray: "#9a9ea6", white: "#e8e6e2", red: "#a34a26",
};

/** Wardrobe changes implied by the photo. id null = remove the slot
 *  (e.g. male "short" hair — there is no short hair asset, same as sandbox). */
export type EquipPlan = { slot: string; id: string | null; color?: string }[];

export function planEquips(app: Appearance): EquipPlan {
  const plan: EquipPlan = [];
  if (!app) return plan;
  const m = app.colors || {};
  if (app.hair?.style != null) {
    const id = HAIR_STYLE[app.hair.style] ?? null;
    const color = m.hair?.hex || (app.hair.color ? HAIR_COLOR[app.hair.color] : undefined);
    plan.push({ slot: "hair", id, color: id ? color : undefined });
  }
  if (app.beard?.style != null) {
    const id = BEARD_STYLE[app.beard.style] ?? null;
    const color = m.beard?.hex || m.hair?.hex
      || (app.beard.color ? HAIR_COLOR[app.beard.color] : undefined);
    plan.push({ slot: "beard", id, color: id ? color : undefined });
  }
  if (app.glasses != null) plan.push({ slot: "glasses", id: GLASSES[app.glasses] ?? null });
  // clothing color measured from the photo -> tint the top (equip the default
  // tshirt if the slot would otherwise be empty)
  if (m.cloth?.hex) plan.push({ slot: "top", id: "tshirt", color: m.cloth.hex });
  return plan;
}

/* ---- measured template colors (skin / brows / iris) ---------------------- */
export type Look = { skin?: string; brows?: string; iris?: string };

export const lookFromAppearance = (app: Appearance): Look | null => {
  const m = app?.colors;
  if (!m) return null;
  const look: Look = {};
  if (m.skin?.hex) look.skin = m.skin.hex;
  if (m.brows?.hex) look.brows = m.brows.hex;
  if (m.iris?.hex) look.iris = m.iris.hex;
  return Object.keys(look).length ? look : null;
};

// mean sRGB of the meta templates' Std_Skin_* diffuse maps (measured in
// Blender). The live tint = target/mean per channel in LINEAR space — same
// math assemble_avatar.py bakes at generation time. new Color(hex) already
// lands in the linear working space under three's default color management,
// so no extra convertSRGBToLinear (the sandbox double-converts; that's a bug
// we deliberately don't port).
const SKIN_TEX_MEAN = 0xc38a68;

/** JS port of assemble_avatar.py's iris_fn: rewrite hue/sat (and scale
 *  value) of the iris-ring pixels of an eye/cornea texture. */
function recolorIrisTexture(tex: Texture | null, targetHex: string): CanvasTexture | null {
  const img = tex?.image as CanvasImageSource & { width?: number; height?: number };
  if (!img || !img.width) return null;
  const cv = document.createElement("canvas");
  cv.width = img.width as number; cv.height = img.height as number;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, cv.width, cv.height);
  const px = data.data;
  // target HSV (from raw sRGB components — texture pixels are sRGB too)
  const t = new Color(targetHex);
  const [tr, tg, tb] = [t.r, t.g, t.b]; // NOTE: linear, but only ratios of ring V matter for v
  const tmx = Math.max(tr, tg, tb), tmn = Math.min(tr, tg, tb);
  const tv = tmx, ts = tmx > 0 ? (tmx - tmn) / tmx : 0;
  let th = 0;
  if (tmx > tmn) {
    if (tmx === tr) th = (((tg - tb) / (tmx - tmn)) % 6 + 6) % 6;
    else if (tmx === tg) th = (tb - tr) / (tmx - tmn) + 2;
    else th = (tr - tg) / (tmx - tmn) + 4;
    th /= 6;
  }
  const isRing = (r: number, g: number, b: number) => {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const s = mx > 0 ? (mx - mn) / mx : 0;
    let h = 0;
    if (mx > mn) {
      if (mx === r) h = (((g - b) / (mx - mn)) % 6 + 6) % 6;
      else if (mx === g) h = (b - r) / (mx - mn) + 2;
      else h = (r - g) / (mx - mn) + 4;
      h /= 6;
    }
    return s > 0.25 || (h > 0.45 && h < 0.80 && s > 0.06);
  };
  const ringV: number[] = [];
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    if (isRing(r, g, b)) ringV.push(Math.max(r, g, b));
  }
  if (!ringV.length) return null;
  ringV.sort((a, b) => a - b);
  const vScale = tv / Math.max(ringV[ringV.length >> 1], 1e-4);
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i] / 255, g = px[i + 1] / 255, b = px[i + 2] / 255;
    if (!isRing(r, g, b)) continue;
    const v = Math.min(1, Math.max(r, g, b) * vScale);
    const hh = th * 6, ii = Math.floor(hh) % 6, f = hh - Math.floor(hh);
    const p = v * (1 - ts), q = v * (1 - ts * f), tt = v * (1 - ts * (1 - f));
    const rgb = [[v, tt, p], [q, v, p], [p, v, tt], [p, q, v], [tt, p, v], [v, p, q]][ii];
    px[i] = rgb[0] * 255; px[i + 1] = rgb[1] * 255; px[i + 2] = rgb[2] * 255;
  }
  ctx.putImageData(data, 0, 0);
  const out = new CanvasTexture(cv);
  out.colorSpace = tex!.colorSpace;
  out.flipY = tex!.flipY;
  out.wrapS = tex!.wrapS; out.wrapT = tex!.wrapT;
  return out;
}

/** Apply (or, with look=null, restore) the measured photo colors on the
 *  avatar's template materials. Originals are stashed on first touch so a
 *  "Delete avatar" reset brings the stock look back. */
export function applyLook(root: Object3D, look: Look | null) {
  const skin = look?.skin ? new Color(look.skin) : null;       // linear
  const mean = new Color(SKIN_TEX_MEAN);                        // linear
  root.traverse((o) => {
    const mesh = o as Mesh;
    if (!mesh.isMesh || !mesh.material) return;
    for (const mat of (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as MeshStandardMaterial[]) {
      if (!mat) continue;
      if (/^Std_Skin_|^Std_Nails/.test(mat.name)) {
        mat.userData.origColor ??= mat.color.clone();
        if (skin) mat.color.setRGB(
          Math.min(skin.r / Math.max(mean.r, 1e-4), 2),
          Math.min(skin.g / Math.max(mean.g, 1e-4), 2),
          Math.min(skin.b / Math.max(mean.b, 1e-4), 2));
        else mat.color.copy(mat.userData.origColor as Color);
        mat.needsUpdate = true;
      } else if (/^Toon_Eyebrows/.test(mat.name)) {
        mat.userData.origColor ??= mat.color.clone();
        if (mat.userData.origMap === undefined) mat.userData.origMap = mat.map;
        if (look?.brows) { mat.map = null; mat.color.set(look.brows); }
        else { mat.map = mat.userData.origMap as Texture | null; mat.color.copy(mat.userData.origColor as Color); }
        mat.needsUpdate = true;
      } else if (/^Std_Eye_[RL]|^Std_Cornea_/.test(mat.name)) {
        if (look?.iris && !mat.userData.irisRecolored) {
          const orig = (mat.userData.origMap as Texture | undefined) ?? mat.map;
          mat.userData.origMap ??= mat.map;
          const nt = recolorIrisTexture(orig ?? null, look.iris);
          if (nt) { mat.map = nt; mat.userData.irisRecolored = true; mat.needsUpdate = true; }
        } else if (!look?.iris && mat.userData.irisRecolored) {
          mat.map = (mat.userData.origMap as Texture | null) ?? null;
          mat.userData.irisRecolored = false;
          mat.needsUpdate = true;
        }
      }
    }
  });
}
