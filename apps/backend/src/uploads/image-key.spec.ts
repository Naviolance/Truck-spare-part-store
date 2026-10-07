import { IMAGE_KEY_RE, imageKey } from "./image-key";

describe("imageKey", () => {
  it("builds a readable, unique key from the product", () => {
    const key = imageKey("Plaquettes de frein avant Bosch BP-29087");
    expect(key).toMatch(/^products\/plaquettes-de-frein-avant-bosch-bp-29087-[0-9a-f]{8}\.webp$/);
    expect(imageKey("Plaquettes")).not.toBe(imageKey("Plaquettes"));
  });

  it("keeps accented words readable", () => {
    expect(imageKey("Filtre à huile détaché")).toMatch(/^products\/filtre-a-huile-detache-[0-9a-f]{8}\.webp$/);
  });

  it("falls back to a UUID when there is no usable name", () => {
    expect(imageKey()).toMatch(/^products\/[0-9a-f-]{36}\.webp$/);
    expect(imageKey("¿¿ ??")).toMatch(/^products\/[0-9a-f-]{36}\.webp$/);
  });

  it("keeps long names short", () => {
    const key = imageKey("a very long product name ".repeat(20));
    expect(key.length).toBeLessThan(110);
    expect(IMAGE_KEY_RE.test(key)).toBe(true);
  });
});

describe("IMAGE_KEY_RE (keys the public file route serves)", () => {
  it.each([
    imageKey("Filtre à huile Mann W 950/26"),
    imageKey(),
    "products/374af3f5-f23f-43b0-8d08-4ef8b2b956d3.webp",
    // Uploads from before WebP conversion kept the sent file's extension.
    "products/374af3f5-f23f-43b0-8d08-4ef8b2b956d3.jpeg",
    "products/374af3f5-f23f-43b0-8d08-4ef8b2b956d3.JPG",
    "products/374af3f5-f23f-43b0-8d08-4ef8b2b956d3.png",
  ])("serves %s", (key) => expect(IMAGE_KEY_RE.test(key)).toBe(true));

  it.each([
    "products/../secrets.txt",
    "other/374af3f5-f23f-43b0-8d08-4ef8b2b956d3.webp",
    "products/374af3f5-f23f-43b0-8d08-4ef8b2b956d3.webp/extra",
    "products/name-without-suffix.webp",
    "products/Upper-Case-1a2b3c4d.webp",
    "products/374af3f5-f23f-43b0-8d08-4ef8b2b956d3.php.jpeg",
  ])("refuses %s", (key) => expect(IMAGE_KEY_RE.test(key)).toBe(false));
});
