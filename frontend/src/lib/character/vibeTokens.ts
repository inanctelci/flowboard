/**
 * Vibe token arrays for character prompt assembly.
 * Inlined from the (deleted) constants/character.ts CHARACTER_VIBES export.
 * Keep tokens stable — they drive A/B prompt parity with v1.0.
 */
export const VIBE_TOKENS: Record<string, readonly string[]> = {
  clean: [
    "Clean Girl makeup styling, fresh dewy skin with sheer skin-tint coverage, healthy natural radiance, peachy cream blush on the cheek apples",
    "brushed-up laminated brows with clear brow gel finish, minimal eye makeup, glossy plump lips with lip-oil sheen",
    "slicked-back low bun or polished sleek hair, simple modern minimalist outfit, delicate gold hoop earrings",
    "relaxed friendly expression with a gentle subtle smile, soft natural gaze, soft natural daylight, airy bright tone, clean minimalist backdrop",
  ],
  douyin: [
    "Douyin makeup styling, porcelain-smooth flawless complexion, glossy ethereal skin with subtle pearl glow",
    "shimmery glittery eyeshadow with light-catching pearl highlights, defined aegyo sal under-eye accent, individual cluster false lashes",
    "blurred-edge gradient lip in soft berry or muted red tone with diffused outline, delicate styled hair with face-framing strands, refined feminine outfit",
    "soft alluring expression with a composed sultry gaze, soft beauty lighting with subtle ethereal glow, clean pale studio backdrop, dreamy atmosphere",
  ],
  oldmoney: [
    "Old Money makeup styling, polished neutral palette in earth tones (taupe, nude, soft coral), matte refined skin finish",
    "softly contoured eyes with warm matte brown shadow, groomed defined brows, classic red or elegant nude-pink lip",
    "polished sleek hair, timeless tailored outfit, understated gold or pearl jewelry",
    "composed dignified expression with a calm refined gaze, soft directional studio lighting, warm neutral backdrop, timeless heritage atmosphere",
  ],
  coldgirl: [
    "Cool-tone makeup styling, ash-pink, mauve and cool grey-brown palette, matte velvety skin finish",
    "cool-toned smoky eye, ash-pink blush, soft mauve lip, subtle high-point highlight on cheekbones, brow bone and cupid's bow",
    "sleek modern hair, edgy contemporary outfit, minimalist silver accessories",
    "cool composed expression with a confident detached gaze, cool-toned cinematic lighting, muted soft blue-grey backdrop, modern moody atmosphere",
  ],
  kpop: [
    "K-pop idol styling, glossy plump lips, soft sculpted contour, glittery inner-corner highlight, dewy skin",
    "glossy hair with face-framing layers, trendy stylish outfit, delicate accessories",
    "soft confident expression, gentle closed-lip smile",
    "soft beauty lighting, clean studio glow, smooth pastel backdrop",
  ],
  casual: [
    "minimal natural styling, fresh clear skin, soft tinted lips",
    "relaxed natural hair, simple everyday outfit",
    "warm friendly soft smile, gentle natural gaze",
    "soft natural daylight, airy bright tone, clean light backdrop",
  ],
} as const;
